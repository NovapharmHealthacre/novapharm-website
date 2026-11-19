import assert from "node:assert/strict";
import test from "node:test";
import {
  buildIntelligenceSubscriptionCheckout,
  createIntelligenceSubscriptionCheckout,
} from "../src/core/intelligence-subscription-checkout.mjs";

const principal = { verifiedServerSide: true, identityProvider: "cognito-oidc", mfaVerified: true, subject: "sub_owner", tenantId: "tenant_owner" };
const release = {
  verifiedServerSide: true, catalogProductsActivated: true, catalogPricesActivated: true,
  verifiedCustomerIdentityAndMfa: true, tenantIsolationAccepted: true,
  serverSideContractAccepted: true, stripeWebhookAndLedgerAccepted: true,
  taxCodeAndRegistrationsAccepted: true, sourceRightsApproved: true,
  productionRuntimeAccepted: true, stripeTaxAutomaticCalculationAccepted: true,
  dedicatedWebhookActiveAndVerified: true,
  stripeAccountId: "acct_1UZUNv2U9Y3sX5I2",
};
const trustedIntent = {
  verifiedServerSide: true, customerAcceptedTerms: true, trustedLedgerReservation: true,
  id: "intent_20261110_test1", stripeCustomerId: "cus_0123456789",
  tenantId: "tenant_owner", subject: "sub_owner",
  stripePriceId: "price_1Uati52U9Y3sX5I2RJuYixR9",
  plan: "starter", cycle: "monthly", currency: "gbp",
  expiresAtMs: Date.now() + 600_000,
};
const valid = {
  plan: "starter", cycle: "monthly", principal, release,
  trustedIntent, approvedOrigin: "https://intelligence.novapharmhealthcare.com/",
};

test("Checkout disabled when release, source, identity, tax, webhook or ledger unapproved", () => {
  for (const key of [
    "catalogPricesActivated", "verifiedCustomerIdentityAndMfa",
    "tenantIsolationAccepted", "sourceRightsApproved",
    "taxCodeAndRegistrationsAccepted", "stripeWebhookAndLedgerAccepted",
    "productionRuntimeAccepted", "dedicatedWebhookActiveAndVerified",
    "stripeTaxAutomaticCalculationAccepted",
  ]) {
    assert.throws(() => buildIntelligenceSubscriptionCheckout({ ...valid, release: { ...release, [key]: false } }));
  }
  assert.throws(() => buildIntelligenceSubscriptionCheckout({ ...valid, principal: { ...principal, mfaVerified: false } }));
  assert.throws(() => buildIntelligenceSubscriptionCheckout({ ...valid, release: { ...release, stripeAccountId: "acct_other" } }));
});

test("does not accept browser prices, foreign tenants, forged origins or expired intents", () => {
  assert.throws(() => buildIntelligenceSubscriptionCheckout({ ...valid, approvedOrigin: "https://evil.example/" }));
  assert.throws(() => buildIntelligenceSubscriptionCheckout({ ...valid, trustedIntent: { ...trustedIntent, tenantId: "tenant_other" } }));
  assert.throws(() => buildIntelligenceSubscriptionCheckout({ ...valid, trustedIntent: { ...trustedIntent, stripePriceId: "price_forged" } }));
  assert.throws(() => buildIntelligenceSubscriptionCheckout({ ...valid, trustedIntent: { ...trustedIntent, expiresAtMs: Date.now() - 1 } }));
  assert.throws(() => buildIntelligenceSubscriptionCheckout({ ...valid, trustedIntent: { ...trustedIntent, customerAcceptedTerms: false } }));
  assert.throws(() => buildIntelligenceSubscriptionCheckout({ ...valid, plan: "__proto__" }));
  assert.throws(() => buildIntelligenceSubscriptionCheckout({ ...valid, cycle: "annual" }));
});

test("invariants of Stripe subscription Checkout params", () => {
  const { params } = buildIntelligenceSubscriptionCheckout(valid);
  assert.equal(params.get("mode"), "subscription");
  assert.equal(params.get("line_items[0][price]"), trustedIntent.stripePriceId);
  assert.equal(params.get("customer"), trustedIntent.stripeCustomerId);
  assert.equal(params.get("automatic_tax[enabled]"), "true");
  assert.equal(params.get("tax_id_collection[enabled]"), "true");
  assert.equal(params.has("payment_method_types[0]"), false);
  assert.equal(params.has("metadata[tenantId]"), false);
  assert.equal(params.get("success_url"), "https://intelligence.novapharmhealthcare.com/account/billing/return?session_id={CHECKOUT_SESSION_ID}");
});

test("transport is strictly guarded; mock-only session cannot grant access", async () => {
  let networkCalls = 0;
  await assert.rejects(createIntelligenceSubscriptionCheckout({
    ...valid, stripeSecretKey: "pk_live_insecure",
    fetchImpl: async () => { ++networkCalls; return {}; },
  }));
  assert.equal(networkCalls, 0);

  const output = await createIntelligenceSubscriptionCheckout({
    ...valid, stripeSecretKey: "rk_live_0123456789abcdefghijkl",
    fetchImpl: async (url, request) => {
      networkCalls++;
      assert.equal(url, "https://api.stripe.com/v1/checkout/sessions");
      assert.equal(request.method, "POST");
      assert.equal(request.redirect, "error");
      assert.equal(request.headers["Idempotency-Key"], "npi-live-subscription-" + trustedIntent.id);
      const form = new URLSearchParams(request.body);
      assert.equal(form.has("integration_identifier"), false);
      assert.equal(form.get("mode"), "subscription");
      assert.equal(form.get("line_items[0][price]"), trustedIntent.stripePriceId);
      return { ok: true, json: async () => ({
        id: "cs_live_0123456789", livemode: true, mode: "subscription", customer: trustedIntent.stripeCustomerId,
        currency: "gbp", url: "https://checkout.stripe.com/c/pay/test123",
      }) };
    },
  });
  assert.equal(networkCalls, 1);
  assert.equal(output.paymentConfirmed, false);
  assert.equal(output.grantsAccess, false);
  assert.equal(output.requiresSignedWebhookAndLedgerReconciliation, true);
});

test("rejects forged mode, Stripe domain and customer return", async () => {
  for (const changed of [
    { livemode: false },
    { mode: "payment" },
    { customer: "cus_abcdefghijk" },
    { url: "https://evil.example/checkout" },
  ]) {
    await assert.rejects(createIntelligenceSubscriptionCheckout({
      ...valid, stripeSecretKey: "rk_live_0123456789abcdefghijkl",
      fetchImpl: async () => ({ ok: true, json: async () => ({
        id: "cs_live_0123456789", livemode: true, mode: "subscription", customer: trustedIntent.stripeCustomerId,
        currency: "gbp", url: "https://checkout.stripe.com/c/pay/test123", ...changed,
      }) }),
    }));
  }
});

test("repeat Checkout request uses the same body and idempotency key", async () => {
  const requests = [];
  const mock = async (url, request) => {
    requests.push({ url, body: request.body, key: request.headers["Idempotency-Key"] });
    return { ok: true, json: async () => ({
      id: "cs_live_0123456789", livemode: true, mode: "subscription",
      customer: trustedIntent.stripeCustomerId, currency: "gbp",
      url: "https://checkout.stripe.com/c/pay/test123",
    }) };
  };
  await createIntelligenceSubscriptionCheckout({
    ...valid, stripeSecretKey: "rk_live_0123456789abcdefghijkl", fetchImpl: mock,
  });
  await createIntelligenceSubscriptionCheckout({
    ...valid, stripeSecretKey: "rk_live_0123456789abcdefghijkl", fetchImpl: mock,
  });
  assert.equal(requests.length, 2);
  assert.equal(requests[0].key, requests[1].key);
  assert.equal(requests[0].body, requests[1].body);
  assert.equal(new URLSearchParams(requests[0].body).has("integration_identifier"), false);
});
