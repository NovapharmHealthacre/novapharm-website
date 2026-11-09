import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { verifyIntelligenceBillingEvent } from "../src/core/intelligence-billing-events.mjs";

const nowMs = Date.parse("2026-11-09T12:00:00.000Z");
const webhookSecret = "whsec_synthetic_example_for_offline_tests_only";
const mapping = Object.freeze({
  verifiedServerSide: true,
  tenantId: "tenant-one",
  subject: "user-one",
  stripeCustomerId: "cus_Synthetic123",
  stripeSubscriptionId: "sub_Synthetic123",
  stripeLiveMode: false,
});
const owner = Object.freeze({
  verifiedServerSide: true,
  tenantId: mapping.tenantId,
  subject: mapping.subject,
  stripeCustomerId: mapping.stripeCustomerId,
});

function event(type = "customer.subscription.updated") {
  const subscription = type.startsWith("customer.subscription.");
  return {
    id: "evt_Synthetic123",
    object: "event",
    livemode: false,
    type,
    data: { object: subscription
      ? { object: "subscription", id: mapping.stripeSubscriptionId, customer: mapping.stripeCustomerId, status: "active", metadata: { tenantId: "tenant-attacker" } }
      : { object: "invoice", id: "in_Synthetic123", customer: mapping.stripeCustomerId, subscription: mapping.stripeSubscriptionId } },
  };
}
function sign(payload, time = Math.floor(nowMs / 1000), key = webhookSecret) {
  const rawBody = JSON.stringify(payload);
  const v1 = createHmac("sha256", key).update(`${time}.${rawBody}`).digest("hex");
  return { rawBody, signatureHeader: `t=${time},v1=${v1}` };
}
function verify(payload = event(), overrides = {}) {
  return verifyIntelligenceBillingEvent({
    ...sign(payload), webhookSecret, expectedLiveMode: false, trustedMapping: mapping, trustedOwner: owner, nowMs, ...overrides,
  });
}
function rejected(overrides, code, payload = event()) {
  assert.throws(() => verify(payload, overrides), error => error.code === code);
}

test("valid signed subscription update maps only to the server-owned tenant and grants nothing", () => {
  const value = verify();
  assert.equal(value.eventId, "evt_Synthetic123");
  assert.equal(value.tenantId, "tenant-one");
  assert.equal(value.subject, "user-one");
  assert.equal(value.receivedInLiveMode, false);
  assert.equal(value.observedStripeSubscriptionStatus, "active");
  assert.equal(value.grantsCustomerAccess, false);
  assert.equal(value.requiresAtomicEventDeduplication, true);
  assert.equal(value.requiresVerifiedInvoiceAndContract, true);
  assert.equal(value.nextAction, "persist_in_authoritative_ledger_then_reconcile");
  assert.equal(Object.isFrozen(value), true);
  assert.doesNotMatch(JSON.stringify(value), /tenant-attacker|whsec_/u);
});

test("subscription cancellations and invoice paid or failed are events, never immediate access", () => {
  for (const type of [
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.paid",
    "invoice.payment_failed",
  ]) {
    const value = verify(event(type));
    assert.equal(value.eventType, type);
    assert.equal(value.grantsCustomerAccess, false);
    assert.equal(value.stripeSubscriptionId, mapping.stripeSubscriptionId);
  }
});

test("signed but unsupported webhook messages can never grant access", () => {
  rejected({}, "billing_event_type_unapproved", event("checkout.session.completed"));
  rejected({}, "billing_event_type_unapproved", event("customer.created"));
});

test("tampered raw body, wrong secret and stale or future signatures fail before mapping", () => {
  const signed = sign(event());
  assert.throws(() => verify(event(), { ...signed, rawBody: signed.rawBody.replace("active", "trialing") }));
  assert.throws(() => verify(event(), { ...signed, webhookSecret: "whsec_wrong_synthetic_key" }));
  const old = sign(event(), Math.floor(nowMs / 1000) - 3600);
  assert.throws(() => verify(event(), old));
  const future = sign(event(), Math.floor(nowMs / 1000) + 3600);
  assert.throws(() => verify(event(), future));
});

test("live/test mode and connected-account events are segregated", () => {
  rejected({ expectedLiveMode: true }, "billing_account_mode_mismatch");
  rejected({ expectedLiveMode: null }, "billing_mode_not_approved");
  rejected({ trustedMapping: { ...mapping, stripeLiveMode: true } }, "billing_tenant_mapping_unverified");
  rejected({}, "billing_account_mode_mismatch", { ...event(), account: "acct_other" });
});

test("tenant, principal, subscription and customer must match the private billing ledger", () => {
  for (const bad of [
    { verifiedServerSide: false },
    { tenantId: "tenant-attacker" },
    { subject: "" },
    { stripeCustomerId: "cus_OtherCustomer1" },
    { stripeSubscriptionId: "sub_OtherSub123" },
  ]) {
    rejected({ trustedMapping: { ...mapping, ...bad } }, "billing_tenant_mapping_unverified");
  }
  rejected({ trustedMapping: {} }, "billing_tenant_mapping_unverified");
  rejected({ trustedOwner: {} }, "billing_tenant_mapping_unverified");
  rejected({ trustedOwner: { ...owner, verifiedServerSide: false } }, "billing_tenant_mapping_unverified");
  rejected({ trustedOwner: { ...owner, tenantId: "tenant-attacker" } }, "billing_tenant_mapping_unverified");
  rejected({ trustedOwner: { ...owner, subject: "user-attacker" } }, "billing_tenant_mapping_unverified");
  rejected({ trustedOwner: { ...owner, stripeCustomerId: "cus_OtherCustomer1" } }, "billing_tenant_mapping_unverified");
});

test("malformed Stripe invoice/subscription identities and untrusted metadata fail closed", () => {
  rejected({}, "billing_object_identity_invalid", { ...event(), data: { object: { object: "subscription", id: "invalid", customer: mapping.stripeCustomerId } } });
  rejected({}, "billing_object_identity_invalid", { ...event(), data: { object: { object: "invoice", id: "in_Synthetic123", customer: mapping.stripeCustomerId } } });
  rejected({}, "billing_object_invalid", { ...event(), data: { object: null } });
  const invoice = event("invoice.paid");
  const nested = { ...invoice, data: { object: { ...invoice.data.object, subscription: null, parent: { subscription_details: { subscription: mapping.stripeSubscriptionId } } } } };
  assert.equal(verify(nested).eventType, "invoice.paid");
});
