import assert from "node:assert/strict";
import test from "node:test";
import {
  reconcilePrivateIntelligencePaidInvoice,
} from "../src/core/intelligence-billing-event-worker.mjs";

const eventId = "evt_Synthetic1234";
const invoiceId = "in_Synthetic123";
const subId = "sub_Synthetic123";
const customerId = "cus_Synthetic123";
const tenantId = "tenant-owner";
const subject = "user-owner";
const priceId = "price_1Uati52U9Y3sX5I2RJuYixR9";
const now = "2026-11-11T10:05:00.000Z";
const start = Date.parse("2026-11-01T00:00:00Z") / 1000;
const end = Date.parse("2026-12-01T00:00:00Z") / 1000;

function scenario() {
  const identity = { verifiedServerSide: true, tenantId, subject };
  return {
    receipt: {
      event_id: eventId, event_type: "invoice.paid",
      status: "quarantined_unmapped", synthetic: false,
      source: "signed-stripe-quarantine-table",
    },
    account: { id: "acct_1UZUNv2U9Y3sX5I2" },
    event: {
      id: eventId, type: "invoice.paid", livemode: true, account: null,
      data: { object: { id: invoiceId, object: "invoice" } },
    },
    invoice: {
      id: invoiceId, object: "invoice", livemode: true, customer: customerId,
      subscription: subId, status: "paid", amount_paid: 19900, currency: "gbp",
    },
    subscription: {
      id: subId, object: "subscription", livemode: true,
      customer: customerId, status: "active",
      latest_invoice: invoiceId, cancel_at_period_end: false,
      items: { data: [{
        quantity: 1, price: { id: priceId, currency: "gbp" },
        current_period_start: start, current_period_end: end,
      }] },
    },
    binding: {
      PK: "STRIPE_CUSTOMER#" + customerId, SK: "OWNER",
      status: "approved", tenantId, subject,
      stripeCustomerId: customerId, stripeSubscriptionId: subId,
      plan: "starter", cycle: "monthly",
    },
    ledger: {
      owner: { ...identity, stripeCustomerId: customerId },
      tenant: { ...identity, status: "active", contractAccepted: true,
        ownershipVerified: true, ownerSubject: "admin-owner", activeSeatCount: 1, seatLimit: 2 },
      member: { ...identity, status: "active", approved: true, approvedBy: "admin-owner" },
      seat: { ...identity, status: "active", role: "owner", sessionVersion: 3,
        features: ["medicine-search", "medicine-identity"] },
      billing: { ...identity, status: "pending", version: 1,
        stripeCustomerId: customerId, stripeSubscriptionId: subId },
      contract: { ...identity, accepted: true, version: "contract-001",
        stripeCustomerId: customerId, stripeSubscriptionId: subId,
        stripePriceId: priceId, plan: "starter", cycle: "monthly",
        entitledFeatures: ["medicine-search"] },
      risk: { ...identity, stripeSubscriptionId: subId, version: 5,
        refundOutstanding: false, disputeOutstanding: false,
        paymentFailureOutstanding: false },
      governance: { verifiedServerSide: true, revision: 9, customerLaunchAccepted: true,
        sourceRightsApproved: true, productionApproved: true, approvedBy: "admin-owner" },
      receipt: { verifiedServerSide: true, eventId, eventType: "invoice.paid",
        status: "quarantined_unmapped", livemode: true,
        synthetic: false, signatureVerified: true },
      release: { verifiedServerSide: true, customerLaunchAccepted: true,
        sourceRightsApproved: true, productionRuntimeAccepted: true,
        tenantIsolationAccepted: true, billingLedgerWriteAndReplayAccepted: true,
        transactionalWriteVerified: true, stripeLiveAccountAccepted: true,
        rollbackAndAuditAccepted: true, privateAtomicBillingWorkerAccepted: true,
        productionApprovedFeatures: ["medicine-search"] },
    },
  };
}
function mock(input = scenario(), onWrite = async () => {}) {
  const called = [];
  const access = (name, fn) => async (...args) => {
    called.push(name);
    return fn(...args);
  };
  const adapters = {
    loadSignedQuarantine: access("quarantine", () => input.receipt),
    fetchStripeLiveAccount: access("account", () => input.account),
    fetchStripeLiveEvent: access("event", () => input.event),
    fetchStripeLiveInvoice: access("invoice", () => input.invoice),
    fetchStripeLiveSubscription: access("subscription", () => input.subscription),
    readCustomerOwner: access("owner", () => input.binding),
    readAcceptedCustomerLedger: access("ledger", () => input.ledger),
    transactWrite: access("atomic_write", onWrite),
  };
  return { adapters, called };
}
const deny = (code) => ({ evaluated: false, persisted: false,
  grantsCustomerAccess: false, code });

test("default commit is inert, even if all data appears accepted", async () => {
  const f = mock();
  const result = await reconcilePrivateIntelligencePaidInvoice({
    eventId, mode: "commit", adapters: f.adapters, now,
  });
  assert.deepEqual(result, deny("private_atomic_billing_release_disabled"));
  assert.deepEqual(f.called, []);
});
test("invalid event, mode, adapters, and time reject without I/O", async () => {
  for (const params of [
    { eventId: "../paid", code: "event_id_invalid" },
    { eventId, mode: "delete", code: "worker_mode_invalid" },
    { eventId, adapters: {}, code: "trusted_worker_adapters_missing" },
    { eventId, now: "2026-11-11", code: "clock_invalid" },
  ]) {
    const f = mock();
    const result = await reconcilePrivateIntelligencePaidInvoice({
      eventId, adapters: f.adapters, mode: "inspect", now, ...params,
    });
    assert.equal(result.code, params.code);
    assert.deepEqual(f.called, []);
  }
});
test("signed quarantine + separately re-fetched paid GBP invoice yield inspection only", async () => {
  const f = mock();
  const res = await reconcilePrivateIntelligencePaidInvoice({
    eventId, adapters: f.adapters, mode: "inspect", now,
  });
  assert.deepEqual(res, {
    evaluated: true, persisted: false, grantsCustomerAccess: false,
    code: "verified_paid_invoice_candidate_inspection_only",
  });
  assert.deepEqual(f.called, [
    "quarantine", "account", "event", "invoice", "owner", "subscription", "ledger",
  ]);
});
test("atomic commit requires explicit private switch and independently verified release", async () => {
  const writes = [];
  const f = mock(scenario(), async (txn) => {
    writes.push(txn);
  });
  const res = await reconcilePrivateIntelligencePaidInvoice({
    eventId, adapters: f.adapters, mode: "commit",
    privateAtomicWritesEnabled: true, now,
  });
  assert.equal(res.evaluated, true);
  assert.equal(res.persisted, true);
  assert.equal(res.grantsCustomerAccess, false);
  assert.equal(res.code, "billing_reconciled_subject_to_fresh_session_authorisation");
  assert.equal(writes.length, 1);
  const ops = writes[0].TransactItems;
  assert.equal(ops.length, 8);
  assert.equal(ops[5].Update.TableName,
    "novapharm-intelligence-billing-webhook-events");
  assert.equal(ops[6].Update.TableName,
    "novapharm-intelligence-customer-access");
  assert.match(ops[5].Update.ConditionExpression,
    /attribute_not_exists\(processed_at\)/u);
  assert.match(ops[6].Update.ConditionExpression, /version = :priorVersion/u);
});
test("DynamoDB duplicate invoice replay never reports persisted or grants access", async () => {
  const f = mock(scenario(), async () => { throw Error("conditional rejection"); });
  const res = await reconcilePrivateIntelligencePaidInvoice({
    eventId, adapters: f.adapters, mode: "commit",
    privateAtomicWritesEnabled: true, now,
  });
  assert.deepEqual(res, { evaluated: true, persisted: false,
    grantsCustomerAccess: false, code: "atomic_billing_transaction_not_committed" });
  assert.equal(f.called.filter(x => x === "atomic_write").length, 1);
});
test("invalid quarantine, Stripe account/event/invoice, owner, subscription, and rights reject", async () => {
  const cases = [
    [s => { s.receipt.synthetic = true; }, "signed_quarantine_unverified"],
    [s => { s.receipt.status = "reconciled"; }, "signed_quarantine_unverified"],
    [s => { s.account.id = "acct_other"; }, "live_stripe_account_mismatch"],
    [s => { s.event.livemode = false; }, "live_stripe_event_mismatch"],
    [s => { s.event.data.object.id = "not_invoice"; }, "paid_invoice_reference_unverified"],
    [s => { s.invoice.status = "open"; }, "independently_paid_invoice_required"],
    [s => { s.invoice.currency = "inr"; }, "independently_paid_invoice_required"],
    [s => { s.binding.tenantId = "wrong-tenant"; }, "accepted_ledger_and_quarantine_mismatch"],
    [s => { s.binding.stripeSubscriptionId = "sub_Other12345"; }, "independent_customer_owner_mapping_required"],
    [s => { s.subscription.status = "canceled"; }, "live_subscription_not_current"],
    [s => { s.subscription.items.data[0].price.currency = "inr"; }, "subscription_price_not_approved"],
    [s => { s.ledger.release.sourceRightsApproved = false; }, "production_release_not_approved"],
    [s => { s.ledger.release.customerLaunchAccepted = false; }, "production_release_not_accepted"],
    [s => { s.ledger.risk.refundOutstanding = true; }, "billing_risk_not_cleared"],
    [s => { s.ledger.receipt.signatureVerified = false; }, "accepted_ledger_and_quarantine_mismatch"],
    [s => { s.ledger.release.privateAtomicBillingWorkerAccepted = false; }, "private_atomic_worker_not_accepted"],
  ];
  for (const [edit, expected] of cases) {
    const fixture = scenario();
    edit(fixture);
    const f = mock(fixture);
    const res = await reconcilePrivateIntelligencePaidInvoice({
      eventId, adapters: f.adapters, mode: "commit",
      privateAtomicWritesEnabled: true, now,
    });
    assert.equal(res.code, expected);
    assert.equal(res.persisted, false);
    assert.equal(res.grantsCustomerAccess, false);
    assert.ok(!f.called.includes("atomic_write"), expected);
  }
});
test("adapter failures never retry grants or disclose private Stripe details", async () => {
  const f = mock(scenario());
  f.adapters.fetchStripeLiveInvoice = async () => { throw Error("sk_live_very_private"); };
  const res = await reconcilePrivateIntelligencePaidInvoice({
    eventId, adapters: f.adapters, mode: "commit",
    privateAtomicWritesEnabled: true, now,
  });
  assert.deepEqual(res, deny("private_billing_worker_unavailable"));
  assert.doesNotMatch(JSON.stringify(res), /sk_live_|cus_|tenant-owner/u);
});
