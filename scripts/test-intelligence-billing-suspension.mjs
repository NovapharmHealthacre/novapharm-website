import assert from "node:assert/strict";
import test from "node:test";
import {
  prepareIntelligenceBillingSuspension, commitIntelligenceBillingSuspension,
} from "../src/core/intelligence-billing-suspension.mjs";

const tenantId = "tenant-owner", subject = "user-owner";
const customer = "cus_Synthetic123", subscription = "sub_Synthetic123";
const eventId = "evt_Synthetic123";
function scenario() {
  return {
    now: "2026-11-11T10:10:00.000Z",
    receipt: {
      verifiedServerSide: true, eventId,
      eventType: "invoice.payment_failed", status: "quarantined_unmapped",
      livemode: true, synthetic: false, signatureVerified: true,
    },
    owner: { verifiedServerSide: true, tenantId, subject, stripeCustomerId: customer },
    mapping: { verifiedServerSide: true, tenantId, subject,
      stripeCustomerId: customer, stripeSubscriptionId: subscription },
    billing: { verifiedServerSide: true, tenantId, subject,
      status: "active", version: 7, stripeCustomerId: customer,
      stripeSubscriptionId: subscription, periodEnd: "2026-12-01T00:00:00.000Z" },
    risk: { verifiedServerSide: true, tenantId, subject,
      stripeSubscriptionId: subscription, version: 12, refundOutstanding: false,
      disputeOutstanding: false, paymentFailureOutstanding: true },
    liveStripe: { verifiedServerSide: true, providerSource: "stripe-live-api",
      livemode: true, stripeCustomerId: customer, stripeSubscriptionId: subscription,
      subscriptionStatus: "past_due", latestInvoicePaid: false,
      cancelAtPeriodEnd: false },
    release: { verifiedServerSide: true, privateWorkerAccepted: true,
      replayAndRevocationTested: true, transactionalWriteVerified: true,
      auditAndRestoreAccepted: true },
  };
}
function reject(key, change, code) {
  const base = scenario();
  const decision = prepareIntelligenceBillingSuspension({
    ...base, [key]: { ...base[key], ...change },
  });
  assert.deepEqual(decision, {
    prepared: false, persisted: false, grantsCustomerAccess: false, code,
  });
}
test("failed payment produces atomic suspension, not an access grant", () => {
  const decision = prepareIntelligenceBillingSuspension(scenario());
  assert.equal(decision.prepared, true);
  assert.equal(decision.persisted, false);
  assert.equal(decision.grantsCustomerAccess, false);
  assert.equal(decision.reason, "payment_failed");
  const [risk, event, billing, audit] = decision.transaction.TransactItems;
  assert.equal(risk.ConditionCheck.Key.SK.S, "RISK#" + subscription);
  assert.match(risk.ConditionCheck.ConditionExpression, /paymentFailureOutstanding = :failed/u);
  assert.match(event.Update.ConditionExpression, /attribute_not_exists\(processed_at\)/u);
  assert.equal(event.Update.ExpressionAttributeValues[":type"].S, "invoice.payment_failed");
  assert.match(billing.Update.ConditionExpression, /version = :priorVersion/u);
  assert.equal(billing.Update.ExpressionAttributeValues[":suspended"].S, "suspended");
  assert.equal(billing.Update.ExpressionAttributeValues[":nextVersion"].N, "8");
  assert.deepEqual(billing.Update.ExpressionAttributeValues[":none"], { L: [] });
  assert.equal(audit.Put.Item.SK.S, "BILLING_ACCESS_SUSPENDED");
});
test("cancellation, refund and disputes suspend only on corroborated live state", () => {
  const base = scenario();
  const cases = [
    ["customer.subscription.deleted", { subscriptionStatus: "canceled" }, {}, "subscription_deleted"],
    ["customer.subscription.updated", { subscriptionStatus: "unpaid" }, {}, "subscription_inactive"],
    ["charge.refunded", { subscriptionStatus: "active" }, { refundOutstanding: true }, "refund"],
    ["charge.dispute.created", { subscriptionStatus: "active" }, { disputeOutstanding: true }, "dispute"],
    ["radar.early_fraud_warning.created", { subscriptionStatus: "active" }, { disputeOutstanding: true }, "fraud_risk"],
  ];
  for (const [eventType, live, flags, reason] of cases) {
    const result = prepareIntelligenceBillingSuspension({
      ...base,
      receipt: { ...base.receipt, eventType },
      risk: { ...base.risk, ...flags },
      liveStripe: { ...base.liveStripe, ...live },
    });
    assert.equal(result.prepared, true, eventType);
    assert.equal(result.reason, reason, eventType);
  }
  reject("liveStripe", { subscriptionStatus: "active", latestInvoicePaid: true },
    "no_verified_revocation_trigger");
  reject("liveStripe", { providerSource: "browser" }, "live_stripe_state_missing");
  reject("risk", { paymentFailureOutstanding: false }, "no_verified_revocation_trigger");
});
test("do not suspend a subscription on tentative end-of-period cancellation", () => {
  const base = scenario();
  const decision = prepareIntelligenceBillingSuspension({
    ...base,
    receipt: { ...base.receipt, eventType: "customer.subscription.updated" },
    risk: { ...base.risk, paymentFailureOutstanding: false },
    liveStripe: { ...base.liveStripe, subscriptionStatus: "active", cancelAtPeriodEnd: true },
  });
  assert.equal(decision.prepared, false);
  assert.equal(decision.code, "no_verified_revocation_trigger");
});
test("wrong tenant, unsigned event, replay, synthetic and missing live evidence are denied", () => {
  reject("receipt", { signatureVerified: false }, "signed_event_not_accepted");
  reject("receipt", { synthetic: true }, "signed_event_not_accepted");
  reject("receipt", { status: "reconciled_access_suspended" }, "signed_event_not_accepted");
  reject("receipt", { eventType: "checkout.session.completed" }, "signed_event_not_accepted");
  reject("mapping", { tenantId: "tenant-attacker" }, "billing_ownership_or_revision_invalid");
  reject("owner", { stripeCustomerId: "cus_otherAccount" }, "billing_ownership_or_revision_invalid");
  reject("billing", { version: 0 }, "billing_ownership_or_revision_invalid");
  reject("billing", { status: "suspended" }, "billing_ownership_or_revision_invalid");
  reject("risk", { version: 0 }, "risk_not_verified");
  reject("liveStripe", { livemode: false }, "live_stripe_state_missing");
});
test("revocation remains allowed if customer launch and source rights are suspended", () => {
  const base = scenario();
  const decision = prepareIntelligenceBillingSuspension({
    ...base,
    release: { ...base.release, customerLaunchAccepted: false, sourceRightsApproved: false },
  });
  assert.equal(decision.prepared, true);
  assert.equal(decision.grantsCustomerAccess, false);
});
test("private worker, audit, replay and durability gates are mandatory", () => {
  for (const flag of [
    "verifiedServerSide", "privateWorkerAccepted", "replayAndRevocationTested",
    "transactionalWriteVerified", "auditAndRestoreAccepted",
  ]) reject("release", { [flag]: false }, "private_revocation_runtime_not_approved");
});
test("no AWS placeholders are missing or unused", () => {
  const prepared = prepareIntelligenceBillingSuspension(scenario());
  assert.equal(prepared.prepared, true);
  for (const action of prepared.transaction.TransactItems) {
    const op = action.Update ?? action.ConditionCheck ?? action.Put;
    const exprs = [op.ConditionExpression ?? "", op.UpdateExpression ?? ""].join(" ");
    const declared = Object.keys(op.ExpressionAttributeValues ?? {});
    for (const key of declared)
      assert.match(exprs, new RegExp(key + "(?![A-Za-z0-9_])", "u"));
    for (const match of exprs.match(/:[A-Za-z][A-Za-z0-9_]*/gu) ?? [])
      assert.equal(declared.includes(match), true, match);
    for (const match of exprs.match(/#[A-Za-z][A-Za-z0-9_]*/gu) ?? [])
      assert.equal(Object.hasOwn(op.ExpressionAttributeNames ?? {}, match), true, match);
  }
});
test("execution persists only after trusted atomic adapter; failures cannot claim success", async () => {
  let committed = 0;
  const positive = await commitIntelligenceBillingSuspension({
    ...scenario(), transactWrite: async (tx) => {
      committed += 1;
      assert.equal(tx.TransactItems.length, 4);
    },
  });
  assert.equal(committed, 1);
  assert.equal(positive.persisted, true);
  assert.equal(positive.grantsCustomerAccess, false);
  assert.equal(positive.code, "subscription_access_suspended");
  const missing = await commitIntelligenceBillingSuspension(scenario());
  assert.equal(missing.code, "private_dynamodb_adapter_missing");
  const failed = await commitIntelligenceBillingSuspension({
    ...scenario(), transactWrite: async () => { throw Error("ConditionCheckFailed"); },
  });
  assert.deepEqual(failed, { prepared: false, persisted: false,
    grantsCustomerAccess: false, code: "suspension_transaction_not_committed" });
});
