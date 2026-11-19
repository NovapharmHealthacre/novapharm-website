import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { verifyIntelligenceBillingEvent } from "../src/core/intelligence-billing-events.mjs";
import { assessIntelligencePaidInvoice } from "../src/core/intelligence-billing-reconciliation.mjs";

const nowMs = Date.parse("2026-11-11T06:30:00.000Z");
const nowEpochSeconds = nowMs / 1000;
const start = Date.parse("2026-11-01T00:00:00Z") / 1000;
const end = Date.parse("2026-12-01T00:00:00Z") / 1000;
const secret = "whsec_offline_synthetic_reconciliation_only";
const customer = "cus_Synthetic123", sub = "sub_Synthetic123", invoice = "in_Synthetic123";
const price = "price_1Uati52U9Y3sX5I2RJuYixR9";
const mapping = { verifiedServerSide: true, tenantId: "tenant-owner", subject: "user-owner",
  stripeCustomerId: customer, stripeSubscriptionId: sub, stripeLiveMode: true,
  plan: "starter", cycle: "monthly" };
const owner = { verifiedServerSide: true, tenantId: mapping.tenantId,
  subject: mapping.subject, stripeCustomerId: customer };

function verifiedEvent(type = "invoice.paid", id = invoice) {
  const invoiceType = type.startsWith("invoice.");
  const payload = { id: "evt_Synthetic1234", livemode: true, type,
    data: { object: invoiceType
      ? { object: "invoice", id, customer, subscription: sub }
      : { object: "subscription", id: sub, customer, status: "active" } } };
  const rawBody = JSON.stringify(payload);
  const timestamp = Math.floor(nowMs / 1000);
  const signature = createHmac("sha256", secret).update(timestamp + "." + rawBody).digest("hex");
  return verifyIntelligenceBillingEvent({ rawBody, signatureHeader: "t=" + timestamp + ",v1=" + signature,
    webhookSecret: secret, expectedLiveMode: true, trustedMapping: mapping,
    trustedOwner: owner, nowMs });
}
const stripeSubscription = { verifiedServerSide: true, providerSource: "stripe-live-api",
  livemode: true, object: "subscription", id: sub, customer, status: "active",
  latest_invoice: invoice, cancel_at_period_end: false,
  items: { data: [{ quantity: 1, price: { id: price, currency: "gbp" },
    current_period_start: start, current_period_end: end }] } };
const paidInvoice = { verifiedServerSide: true, providerSource: "stripe-live-api",
  livemode: true, object: "invoice", id: invoice, customer, subscription: sub,
  status: "paid", amount_paid: 19900, currency: "gbp" };
const contract = { verifiedServerSide: true, accepted: true, tenantId: mapping.tenantId,
  subject: mapping.subject, plan: "starter", cycle: "monthly", stripePriceId: price };
const riskLedger = { verifiedServerSide: true, tenantId: mapping.tenantId,
  stripeSubscriptionId: sub, refundOutstanding: false, disputeOutstanding: false,
  paymentFailureOutstanding: false };
const release = { verifiedServerSide: true, sourceRightsApproved: true,
  productionRuntimeAccepted: true, tenantIsolationAccepted: true,
  billingLedgerWriteAndReplayAccepted: true };
const sample = () => ({ signedEvent: verifiedEvent(), trustedOwner: owner, trustedMapping: mapping,
  stripeSubscription, paidInvoice, acceptedContract: contract, riskLedger, release, nowEpochSeconds });
function denied(overrides, code) {
  assert.deepEqual(assessIntelligencePaidInvoice({ ...sample(), ...overrides }),
    { readyForAtomicCommit: false, grantsCustomerAccess: false, code });
}
test("owner-approved GBP invoices qualify for review but old INR or forged price IDs never qualify", () => {
  const verified = assessIntelligencePaidInvoice(sample());
  assert.equal(verified.readyForAtomicCommit, true);
  assert.equal(verified.grantsCustomerAccess, false);
  denied({ paidInvoice: { ...paidInvoice, currency: "inr" } },
    "verified_current_paid_invoice_required");
  denied({ stripeSubscription: { ...stripeSubscription, items: { data: [{
    ...stripeSubscription.items.data[0],
    price: { ...stripeSubscription.items.data[0].price, currency: "inr" },
  }] } } }, "subscription_price_not_approved");
  denied({ stripeSubscription: { ...stripeSubscription, items: { data: [{
    ...stripeSubscription.items.data[0],
    price: { id: "price_1Ua7M92U9Y3sX5I2tVhCoFaq", currency: "gbp" },
  }] } } }, "subscription_price_not_approved");
  denied({ paidInvoice: { ...paidInvoice, currency: "usd" } },
    "verified_current_paid_invoice_required");
  denied({ stripeSubscription: { ...stripeSubscription, items: { data: [{
    ...stripeSubscription.items.data[0],
    price: { ...stripeSubscription.items.data[0].price, currency: "eur" },
  }] } } }, "subscription_price_not_approved");
});

test("paid invoice may be assessed only for a future atomic commit, never immediate access", () => {
  const value = assessIntelligencePaidInvoice(sample());
  assert.equal(value.readyForAtomicCommit, true);
  assert.equal(value.grantsCustomerAccess, false);
  assert.equal(value.invoiceId, invoice);
  assert.equal(value.tenantId, mapping.tenantId);
  assert.equal(value.stripePriceId, price);
  assert.equal(value.periodStart, "2026-11-01T00:00:00.000Z");
  assert.equal(value.periodEnd, "2026-12-01T00:00:00.000Z");
  assert.equal(value.nextAction, "atomic_unique_event_and_current_state_commit_required");
  assert.equal(Object.isFrozen(value), true);
  assert.doesNotMatch(JSON.stringify(value), /whsec_|sk_live_|rk_live_/u);
});
test("invoice identity is signed and strictly matched; failures cannot trigger positive reconciliation", () => {
  denied({ signedEvent: verifiedEvent("invoice.payment_failed") }, "signed_paid_invoice_required");
  denied({ signedEvent: verifiedEvent("customer.subscription.updated") }, "signed_paid_invoice_required");
  denied({ signedEvent: { ...verifiedEvent(), invoiceId: "in_otherInvoice1" } }, "verified_current_paid_invoice_required");
  denied({ signedEvent: { ...verifiedEvent(), receivedInLiveMode: false } }, "signed_paid_invoice_required");
  assert.throws(() => verifiedEvent("invoice.paid", "not_an_invoice"),
    e => e.code === "billing_object_identity_invalid");
});
test("tenant mapping and Stripe objects must be independently authoritative", () => {
  denied({ trustedOwner: { ...owner, tenantId: "tenant-attacker" } }, "billing_ownership_unverified");
  denied({ trustedMapping: { ...mapping, verifiedServerSide: false } }, "billing_ownership_unverified");
  denied({ stripeSubscription: { ...stripeSubscription, livemode: false } }, "subscription_not_currently_paid");
  denied({ stripeSubscription: { ...stripeSubscription, status: "past_due" } }, "subscription_not_currently_paid");
  denied({ stripeSubscription: { ...stripeSubscription, status: "canceled" } }, "subscription_not_currently_paid");
  denied({ stripeSubscription: { ...stripeSubscription, providerSource: "untrusted-browser" } }, "subscription_not_currently_paid");
  denied({ trustedMapping: { ...mapping, plan: "__proto__" } }, "subscription_price_not_approved");
  denied({ stripeSubscription: { ...stripeSubscription, items: { data: [
    ...stripeSubscription.items.data, ...stripeSubscription.items.data ] } } }, "subscription_price_not_approved");
});
test("only the latest paid positive-value verified invoice can qualify", () => {
  denied({ paidInvoice: { ...paidInvoice, amount_paid: 0 } }, "verified_current_paid_invoice_required");
  denied({ paidInvoice: { ...paidInvoice, status: "open" } }, "verified_current_paid_invoice_required");
  denied({ paidInvoice: { ...paidInvoice, customer: "cus_otherValue1" } }, "verified_current_paid_invoice_required");
  denied({ paidInvoice: { ...paidInvoice, subscription: "sub_otherValue1" } }, "verified_current_paid_invoice_required");
  denied({ stripeSubscription: { ...stripeSubscription, latest_invoice: "in_newInvoice12" } }, "verified_current_paid_invoice_required");
  assert.equal(assessIntelligencePaidInvoice({ ...sample(), paidInvoice: {
    ...paidInvoice, subscription: null, parent: { subscription_details: { subscription: sub } },
  } }).readyForAtomicCommit, true);
});
test("refund, dispute and unpaid risk are always fail-closed", () => {
  for (const key of ["refundOutstanding", "disputeOutstanding", "paymentFailureOutstanding"])
    denied({ riskLedger: { ...riskLedger, [key]: true } }, "billing_risk_not_cleared");
  denied({ riskLedger: { ...riskLedger, verifiedServerSide: false } }, "billing_risk_not_cleared");
});
test("current contract, period, source rights, isolation and ledger write approval required", () => {
  denied({ nowEpochSeconds: end }, "billing_period_not_current");
  denied({ nowEpochSeconds: start - 1 }, "billing_period_not_current");
  denied({ acceptedContract: { ...contract, accepted: false } }, "contract_not_verified");
  denied({ release: { ...release, sourceRightsApproved: false } }, "production_release_not_approved");
  denied({ release: { ...release, billingLedgerWriteAndReplayAccepted: false } }, "production_release_not_approved");
  assert.equal(assessIntelligencePaidInvoice({ ...sample(), stripeSubscription: {
    ...stripeSubscription, cancel_at_period_end: true } }).readyForAtomicCommit, true);
  const enterprisePrice = "price_1UatiL2U9Y3sX5I2gktsrNl5";
  const enterprise = { ...sample(), trustedMapping: { ...mapping, plan: "enterprise" },
    stripeSubscription: { ...stripeSubscription, items: { data: [{
      ...stripeSubscription.items.data[0], price: { id: enterprisePrice, currency: "gbp" } }] } },
    acceptedContract: { ...contract, plan: "enterprise", stripePriceId: enterprisePrice } };
  assert.equal(assessIntelligencePaidInvoice(enterprise).code, "contract_not_verified");
  enterprise.acceptedContract = { ...enterprise.acceptedContract,
    signedEnterpriseContract: true, monthlySearchLimit: 500 };
  assert.equal(assessIntelligencePaidInvoice(enterprise).code, "verified_candidate_only");
});
