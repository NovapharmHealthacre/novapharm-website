import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  buildApprovedCheckoutParameters, createStripeHostedCheckout, reconcileStripeCheckoutEvent,
  validatePaymentActivation, verifyStripeWebhook
} from "../src/core/payments/stripe-checkout.mjs";

const activation = {
  enabled: true, mode: "test", secretKey: "sk_test_valid_key_for_contract_testing",
  webhookSecret: "whsec_testing_secret_123456"
};
function approvedOrder() {
  return {
    approvedForPayment: true, stockReserved: true, taxAndShippingVerified: true,
    orderId: "ord_demo_00001", customerId: "cust_demo_00001", paymentAttemptId: "attempt_demo_001",
    quoteVersion: "quote_v0001", expiresAtMs: Date.now() + 600_000,
    currency: "GBP", destinationCountry: "GB", totalGrossMinor: 2592,
    lines: [{ name: "Approved supplement", quantity: 2, grossMinor: 2592 }]
  };
}

test("default deny, explicit provider test/live credential boundaries", () => {
  assert.throws(() => validatePaymentActivation(), /disabled/);
  assert.throws(() => validatePaymentActivation({ ...activation, mode: "live" }), /sign-off/);
  assert.throws(() => validatePaymentActivation({ ...activation, webhookSecret: "" }), /webhook/);
  assert.throws(() => validatePaymentActivation({ ...activation, secretKey: "sk_live_mismatch" }), /credentials/);
  assert.deepEqual(validatePaymentActivation(activation), { mode: "test" });
});

test("only a verified GBP order produces fixed safe hosted checkout parameters", () => {
  const params = buildApprovedCheckoutParameters({ approvedOrder: approvedOrder(), publicOrigin: "https://portal.novapharmhealthcare.com" });
  assert.equal(params.get("mode"), "payment");
  assert.equal(params.get("line_items[0][price_data][unit_amount]"), "2592");
  assert.equal(params.get("line_items[0][price_data][currency]"), "gbp");
  assert.match(params.get("success_url"), /^https:\/\/portal\.novapharmhealthcare\.com\/portal\/orders\//);
  assert.equal(params.get("automatic_tax[enabled]"), "false");
  assert.equal(params.get("payment_method_types[0]"), "card");
  for (const change of [
    { stockReserved: false }, { taxAndShippingVerified: false }, { approvedForPayment: false },
    { currency: "EUR" }, { destinationCountry: "US" }, { totalGrossMinor: 100 },
    { lines: [{ name: "Fake", quantity: 1, grossMinor: -1 }] }, { expiresAtMs: 0 }
  ]) {
    assert.throws(() => buildApprovedCheckoutParameters({
      approvedOrder: { ...approvedOrder(), ...change }, publicOrigin: "https://portal.novapharmhealthcare.com"
    }));
  }
  assert.throws(() => buildApprovedCheckoutParameters({
    approvedOrder: approvedOrder(), publicOrigin: "https://attacker.example/path"
  }), /origin/);
  assert.throws(() => buildApprovedCheckoutParameters({
    approvedOrder: approvedOrder(), publicOrigin: "http://portal.novapharmhealthcare.com"
  }), /HTTPS/);
});

test("Stripe session transport is server-only, idempotent and test/live verified", async () => {
  let observed;
  const fetchImpl = async (url, options) => {
    observed = { url, options };
    return { ok: true, json: async () => ({
      id: "cs_test_12345", url: "https://checkout.stripe.com/c/pay/cs_test_12345",
      mode: "payment", livemode: false
    }) };
  };
  const session = await createStripeHostedCheckout({
    approvedOrder: approvedOrder(), publicOrigin: "https://portal.novapharmhealthcare.com", activation, fetchImpl
  });
  assert.equal(session.sessionId, "cs_test_12345");
  assert.equal(observed.url, "https://api.stripe.com/v1/checkout/sessions");
  assert.equal(observed.options.headers["Idempotency-Key"], "np-attempt_demo_001-quote_v0001");
  assert.equal(new URLSearchParams(observed.options.body).get("metadata[customer_id]"), "cust_demo_00001");
  await assert.rejects(createStripeHostedCheckout({
    approvedOrder: approvedOrder(), publicOrigin: "https://portal.novapharmhealthcare.com", activation,
    fetchImpl: async () => ({ ok: true, json: async () => ({
      id: "cs_live_12345", url: "https://checkout.stripe.com/c/pay/foo", mode: "payment", livemode: true
    }) })
  }), /environment/);
});

test("signed raw webhook rejects tampering and expiration; only matching paid attempts reconcile", () => {
  const nowMs = Date.now();
  const timestamp = Math.floor(nowMs / 1000);
  const stripeSession = {
    id: "cs_test_12345", client_reference_id: "ord_demo_00001",
    currency: "gbp", amount_total: 2592, payment_status: "paid", livemode: false,
    metadata: { payment_attempt_id: "attempt_demo_001", quote_version: "quote_v0001" }
  };
  const rawBody = JSON.stringify({
    id: "evt_12345", type: "checkout.session.completed", data: { object: stripeSession }
  });
  const hmac = createHmac("sha256", activation.webhookSecret)
    .update(timestamp + "." + rawBody).digest("hex");
  const signatureHeader = "t=" + timestamp + ",v1=" + hmac;
  const event = verifyStripeWebhook({
    rawBody, signatureHeader, webhookSecret: activation.webhookSecret, nowMs
  });
  assert.equal(event.id, "evt_12345");
  assert.throws(() => verifyStripeWebhook({
    rawBody: rawBody + " ", signatureHeader, webhookSecret: activation.webhookSecret, nowMs
  }), /signature/);
  assert.throws(() => verifyStripeWebhook({
    rawBody, signatureHeader, webhookSecret: activation.webhookSecret, nowMs: nowMs + 600_000
  }), /expired/);
  const storedAttempt = {
    sessionId: stripeSession.id, orderId: stripeSession.client_reference_id,
    paymentAttemptId: stripeSession.metadata.payment_attempt_id,
    quoteVersion: stripeSession.metadata.quote_version, totalGrossMinor: 2592, liveMode: false
  };
  assert.equal(reconcileStripeCheckoutEvent(event, storedAttempt).action, "record_verified_payment");
  assert.throws(() => reconcileStripeCheckoutEvent(event, { ...storedAttempt, totalGrossMinor: 10 }), /match/);
  assert.equal(reconcileStripeCheckoutEvent({
    ...event, data: { object: { ...stripeSession, payment_status: "unpaid" } }
  }, storedAttempt).action, "ignore");
  assert.equal(reconcileStripeCheckoutEvent({
    ...event, type: "checkout.session.expired"
  }, storedAttempt).action, "record_unsuccessful_payment");
});
