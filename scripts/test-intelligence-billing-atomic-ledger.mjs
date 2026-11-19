import assert from "node:assert/strict";
import test from "node:test";
import {
  prepareIntelligenceBillingAtomicCommit, commitIntelligenceBillingAtomicLedger,
  INTELLIGENCE_BILLING_ACCESS_TABLE, INTELLIGENCE_BILLING_EVENT_TABLE,
} from "../src/core/intelligence-billing-atomic-ledger.mjs";

const tenantId = "tenant-owner", subject = "user-owner";
const stripeCustomerId = "cus_Synthetic123";
const stripeSubscriptionId = "sub_Synthetic123";
const invoiceId = "in_Synthetic123";
const eventId = "evt_Synthetic123";
const priceId = "price_1Uati52U9Y3sX5I2RJuYixR9";
const now = "2026-11-11T10:05:00.000Z";
function scenario() {
  const identity = { verifiedServerSide: true, tenantId, subject };
  return {
    now,
    candidate: {
      readyForAtomicCommit: true, grantsCustomerAccess: false,
      code: "verified_candidate_only",
      nextAction: "atomic_unique_event_and_current_state_commit_required",
      tenantId, subject, stripeCustomerId, stripeSubscriptionId,
      eventId, invoiceId, stripePriceId: priceId,
      plan: "starter", cycle: "monthly",
      periodStart: "2026-11-01T00:00:00.000Z",
      periodEnd: "2026-12-01T00:00:00.000Z",
    },
    owner: { ...identity, stripeCustomerId },
    tenant: { ...identity, status: "active", contractAccepted: true,
      ownershipVerified: true, ownerSubject: "admin-owner", activeSeatCount: 1, seatLimit: 2 },
    member: { ...identity, status: "active", approved: true, approvedBy: "admin-owner" },
    seat: { ...identity, status: "active", role: "owner", sessionVersion: 3,
      features: ["medicine-search", "medicine-identity"] },
    billing: { ...identity, status: "pending", version: 1,
      stripeCustomerId, stripeSubscriptionId },
    risk: { ...identity, stripeSubscriptionId, version: 5, refundOutstanding: false,
      disputeOutstanding: false, paymentFailureOutstanding: false },
    contract: { ...identity, accepted: true, version: "contract-001",
      stripeCustomerId, stripeSubscriptionId, stripePriceId: priceId,
      plan: "starter", cycle: "monthly", entitledFeatures: ["medicine-search"] },
    governance: { verifiedServerSide: true, revision: 9, customerLaunchAccepted: true,
      sourceRightsApproved: true, productionApproved: true, approvedBy: "admin-owner" },
    receipt: { verifiedServerSide: true, eventId, eventType: "invoice.paid",
      status: "quarantined_unmapped", livemode: true, synthetic: false, signatureVerified: true },
    release: { verifiedServerSide: true, customerLaunchAccepted: true,
      sourceRightsApproved: true, productionRuntimeAccepted: true,
      tenantIsolationAccepted: true, billingLedgerWriteAndReplayAccepted: true,
      transactionalWriteVerified: true, stripeLiveAccountAccepted: true,
      rollbackAndAuditAccepted: true, productionApprovedFeatures: ["medicine-search"] },
  };
}
function denyWith(key, change, code) {
  const base = scenario();
  const result = prepareIntelligenceBillingAtomicCommit({
    ...base, [key]: { ...base[key], ...change },
  });
  assert.deepEqual(result, { prepared: false, persisted: false,
    grantsCustomerAccess: false, code });
}
test("one verified paid invoice prepares exactly one fenced transaction, never grants access", () => {
  const prepared = prepareIntelligenceBillingAtomicCommit(scenario());
  assert.equal(prepared.prepared, true);
  assert.equal(prepared.persisted, false);
  assert.equal(prepared.grantsCustomerAccess, false);
  assert.equal(prepared.eventId, eventId);
  assert.deepEqual(prepared.tables, [INTELLIGENCE_BILLING_EVENT_TABLE, INTELLIGENCE_BILLING_ACCESS_TABLE]);
  assert.equal(prepared.transaction.TransactItems.length, 8);
  const [tenant, member, seat, governance, risk, receipt, billing, audit] = prepared.transaction.TransactItems;
  assert.deepEqual(tenant.ConditionCheck.Key, { PK: { S: "TENANT#" + tenantId }, SK: { S: "META" } });
  assert.equal(member.ConditionCheck.Key.PK.S, "SUBJECT#" + subject);
  assert.equal(seat.ConditionCheck.Key.SK.S, "SEAT#" + subject);
  assert.match(governance.ConditionCheck.ConditionExpression, /sourceRightsApproved = :yes/u);
  assert.equal(risk.ConditionCheck.Key.SK.S, "RISK#" + stripeSubscriptionId);
  assert.equal(receipt.Update.TableName, INTELLIGENCE_BILLING_EVENT_TABLE);
  assert.match(receipt.Update.ConditionExpression, /attribute_not_exists\(processed_at\)/u);
  assert.match(billing.Update.ConditionExpression, /version = :priorVersion/u);
  assert.equal(billing.Update.ExpressionAttributeValues[":newVersion"].N, "2");
  assert.equal(billing.Update.ExpressionAttributeValues[":quota"].N, "25");
  assert.deepEqual(billing.Update.ExpressionAttributeValues[":features"], { L: [{ S: "medicine-search" }] });
  assert.match(audit.Put.Item.PK.S, /^AUDIT#[0-9a-f-]{36}$/u);
  assert.equal(audit.Put.Item.SK.S, "BILLING_INVOICE_RECONCILED");
  const output = JSON.stringify(prepared);
  assert.doesNotMatch(output, /whsec_|sk_live_|rk_live_|card_number|customer_email/u);
  assert.equal(Object.isFrozen(prepared), true);
});
test("never commit with release, source-rights, pricing or customer gates off", () => {
  for (const flag of [
    "verifiedServerSide", "customerLaunchAccepted", "sourceRightsApproved",
    "productionRuntimeAccepted", "tenantIsolationAccepted",
    "billingLedgerWriteAndReplayAccepted", "transactionalWriteVerified",
    "stripeLiveAccountAccepted", "rollbackAndAuditAccepted",
  ]) denyWith("release", { [flag]: false }, "production_release_not_accepted");
  denyWith("candidate", { readyForAtomicCommit: false }, "paid_invoice_candidate_missing");
  denyWith("candidate", { periodEnd: "2026-11-10T00:00:00.000Z" }, "paid_period_not_current");
  denyWith("candidate", { stripePriceId: "price_unapproved" }, "price_or_plan_unapproved");
  denyWith("candidate", { plan: "__proto__" }, "price_or_plan_unapproved");
  denyWith("candidate", { tenantId: "tenant-attacker" }, "tenant_owner_and_seat_not_approved");
});
test("tenant, member and seat must independently match and remain approved", () => {
  denyWith("owner", { tenantId: "tenant-attacker" }, "tenant_owner_and_seat_not_approved");
  denyWith("tenant", { ownershipVerified: false }, "tenant_owner_and_seat_not_approved");
  denyWith("tenant", { activeSeatCount: 3 }, "tenant_owner_and_seat_not_approved");
  denyWith("member", { approved: false }, "tenant_owner_and_seat_not_approved");
  denyWith("seat", { sessionVersion: 0 }, "tenant_owner_and_seat_not_approved");
  denyWith("seat", { features: [] }, "tenant_owner_and_seat_not_approved");
  denyWith("seat", { role: "public" }, "tenant_owner_and_seat_not_approved");
});
test("replay, stale revision, refunds, disputes, unpaid and forged event are denied", () => {
  denyWith("billing", { version: 0 }, "billing_version_or_period_not_current");
  denyWith("billing", { stripeCustomerId: "cus_otherAccount" }, "billing_version_or_period_not_current");
  denyWith("billing", { status: "revoked" }, "billing_version_or_period_not_current");
  denyWith("billing", { status: "active", periodEnd: "2026-12-01T00:00:00.000Z" }, "billing_version_or_period_not_current");
  denyWith("risk", { refundOutstanding: true }, "billing_risk_not_cleared");
  denyWith("risk", { disputeOutstanding: true }, "billing_risk_not_cleared");
  denyWith("risk", { paymentFailureOutstanding: true }, "billing_risk_not_cleared");
  denyWith("receipt", { synthetic: true }, "signed_quarantined_event_required");
  denyWith("receipt", { signatureVerified: false }, "signed_quarantined_event_required");
  denyWith("receipt", { eventType: "invoice.payment_failed" }, "signed_quarantined_event_required");
  denyWith("receipt", { status: "reconciled_paid_invoice" }, "signed_quarantined_event_required");
  denyWith("governance", { sourceRightsApproved: false }, "source_governance_not_approved");
});
test("contract, approved feature list and enterprise quota cannot be invented", () => {
  denyWith("contract", { accepted: false }, "accepted_contract_required");
  denyWith("contract", { entitledFeatures: ["forecasting"] }, "feature_or_source_not_approved");
  denyWith("contract", { entitledFeatures: ["medicine-search", "medicine-search"] }, "feature_or_source_not_approved");
  denyWith("release", { productionApprovedFeatures: [] }, "feature_or_source_not_approved");
});
test("DynamoDB condition names and value placeholders are used and nonduplicated", () => {
  const { transaction } = prepareIntelligenceBillingAtomicCommit(scenario());
  for (const entry of transaction.TransactItems) {
    const action = entry.Update ?? entry.ConditionCheck ?? entry.Put;
    const exprs = [action.ConditionExpression ?? "", action.UpdateExpression ?? ""].join(" ");
    const keys = Object.keys(action.ExpressionAttributeValues ?? {});
    for (const key of keys) {
      const rx = new RegExp(key.replace(":", ":") + "(?![A-Za-z0-9_])", "u");
      assert.match(exprs, rx, "unused value placeholder " + key);
    }
    for (const token of exprs.match(/:[A-Za-z][A-Za-z0-9_]*/gu) ?? []) {
      assert.equal(keys.includes(token), true, "missing value placeholder " + token);
    }
    for (const token of exprs.match(/#[A-Za-z][A-Za-z0-9_]*/gu) ?? []) {
      assert.equal(Object.hasOwn(action.ExpressionAttributeNames ?? {}, token), true,
        "missing reserved name alias " + token);
    }
  }
});
test("private adapter success records only ledger persistence, not an application session", async () => {
  let calls = 0;
  const value = await commitIntelligenceBillingAtomicLedger({
    ...scenario(),
    transactWrite: async (params) => { calls += 1; assert.equal(params.TransactItems.length, 8); },
  });
  assert.equal(calls, 1);
  assert.deepEqual({ persisted: value.persisted, grantsAccess: value.grantsCustomerAccess, code: value.code },
    { persisted: true, grantsAccess: false,
      code: "billing_reconciled_subject_to_fresh_session_authorisation" });
});
test("missing private adapter and conditional races never claim persisted payment", async () => {
  const missing = await commitIntelligenceBillingAtomicLedger(scenario());
  assert.equal(missing.code, "private_dynamodb_adapter_missing");
  const failed = await commitIntelligenceBillingAtomicLedger({
    ...scenario(), transactWrite: async () => { throw new Error("ConditionalCheckFailed"); },
  });
  assert.deepEqual(failed, { prepared: false, persisted: false,
    grantsCustomerAccess: false, code: "atomic_billing_transaction_not_committed" });
});
