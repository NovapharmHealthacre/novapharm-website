/**
 * NovaPharm Intelligence: fail-closed, read-only paid invoice reconciliation.
 *
 * This is a PURE assessment, not a consumer webhook or a production grant.
 * Caller must obtain the event from verifyIntelligenceBillingEvent, the Stripe
 * objects from authenticated LIVE Stripe API reads, and all customer ownership,
 * contract, risk and release data from distinct audited server-owned ledgers.
 * Do not accept these arguments from browser JSON, Stripe metadata, or email.
 *
 * The result is only a candidate for a future atomic, idempotent, durable
 * compare-and-set transaction. No entitlement is ever issued here.
 */
import { intelligenceLiveStripeCatalog } from "./intelligence-live-stripe-catalog.mjs";

const CUSTOMER = /^cus_[A-Za-z0-9]{6,}$/u;
const SUBSCRIPTION = /^sub_[A-Za-z0-9]{6,}$/u;
const INVOICE = /^in_[A-Za-z0-9]{6,}$/u;
function deny(code) {
  return Object.freeze({ readyForAtomicCommit: false, grantsCustomerAccess: false, code });
}
function sameOwner(owner, mapping, event) {
  return owner?.verifiedServerSide === true &&
    mapping?.verifiedServerSide === true &&
    owner.tenantId === mapping.tenantId &&
    owner.subject === mapping.subject &&
    owner.stripeCustomerId === mapping.stripeCustomerId &&
    mapping.tenantId === event.tenantId &&
    mapping.subject === event.subject &&
    mapping.stripeCustomerId === event.stripeCustomerId &&
    mapping.stripeSubscriptionId === event.stripeSubscriptionId &&
    CUSTOMER.test(String(mapping.stripeCustomerId ?? "")) &&
    SUBSCRIPTION.test(String(mapping.stripeSubscriptionId ?? ""));
}
function stripeObjectId(value) {
  return typeof value === "string" ? value : value?.id;
}
function periodSeconds(value) {
  return Number.isSafeInteger(value) && value > 0 && value < 253402300800 ? value : null;
}

/**
 * Assesses exactly one paid invoice event for independently verified current
 * Stripe state. Old invoices, failed payments, refunded/disputed charges,
 * cancellations and other-tenant records cannot become grant candidates.
 *
 * A caller MUST separately enforce unique event IDs, transaction ordering,
 * payment/contract reconciliation, and transactional write of the grant.
 */
export function assessIntelligencePaidInvoice({
  signedEvent, trustedOwner, trustedMapping, stripeSubscription, paidInvoice,
  acceptedContract, riskLedger, release, nowEpochSeconds = Math.floor(Date.now() / 1000),
} = {}) {
  if (signedEvent?.eventType !== "invoice.paid" ||
      signedEvent.receivedInLiveMode !== true ||
      signedEvent.grantsCustomerAccess !== false ||
      signedEvent.requiresAtomicEventDeduplication !== true ||
      signedEvent.requiresVerifiedInvoiceAndContract !== true ||
      !INVOICE.test(String(signedEvent.invoiceId ?? ""))) return deny("signed_paid_invoice_required");

  if (!sameOwner(trustedOwner, trustedMapping, signedEvent)) return deny("billing_ownership_unverified");

  if (stripeSubscription?.verifiedServerSide !== true ||
      stripeSubscription.providerSource !== "stripe-live-api" ||
      stripeSubscription.livemode !== true ||
      stripeSubscription.object !== "subscription" ||
      stripeSubscription.id !== trustedMapping.stripeSubscriptionId ||
      stripeSubscription.customer !== trustedMapping.stripeCustomerId ||
      stripeSubscription.status !== "active") return deny("subscription_not_currently_paid");

  const item = stripeSubscription.items?.data;
  if (!Array.isArray(item) || item.length !== 1 || item[0]?.quantity !== 1 ||
      typeof item[0]?.price?.id !== "string" ||
      item[0]?.price?.currency !== "inr") return deny("subscription_price_not_approved");

  const plan = trustedMapping.plan;
  const cycle = trustedMapping.cycle;
  if (typeof plan !== "string" || !Object.hasOwn(intelligenceLiveStripeCatalog, plan) ||
      typeof cycle !== "string" || !Object.hasOwn(intelligenceLiveStripeCatalog[plan].prices, cycle) ||
      item[0].price.id !== intelligenceLiveStripeCatalog[plan].prices[cycle].id) {
    return deny("subscription_price_not_approved");
  }

  if (paidInvoice?.verifiedServerSide !== true ||
      paidInvoice.providerSource !== "stripe-live-api" ||
      paidInvoice.livemode !== true || paidInvoice.object !== "invoice" ||
      paidInvoice.id !== signedEvent.invoiceId ||
      paidInvoice.customer !== trustedMapping.stripeCustomerId ||
      stripeObjectId(paidInvoice.subscription ?? paidInvoice.parent?.subscription_details?.subscription) !== trustedMapping.stripeSubscriptionId ||
      stripeObjectId(stripeSubscription.latest_invoice) !== paidInvoice.id ||
      paidInvoice.status !== "paid" || !Number.isSafeInteger(paidInvoice.amount_paid) ||
      paidInvoice.amount_paid <= 0 || paidInvoice.currency !== "inr") {
    return deny("verified_current_paid_invoice_required");
  }

  if (acceptedContract?.verifiedServerSide !== true ||
      acceptedContract.accepted !== true ||
      acceptedContract.tenantId !== trustedMapping.tenantId ||
      acceptedContract.subject !== trustedMapping.subject ||
      acceptedContract.stripePriceId !== item[0].price.id ||
      acceptedContract.plan !== plan || acceptedContract.cycle !== cycle ||
      (plan === "enterprise" &&
       (!acceptedContract.signedEnterpriseContract ||
        !Number.isSafeInteger(acceptedContract.monthlySearchLimit) ||
        acceptedContract.monthlySearchLimit <= 0))) return deny("contract_not_verified");

  if (riskLedger?.verifiedServerSide !== true ||
      riskLedger.tenantId !== trustedMapping.tenantId ||
      riskLedger.stripeSubscriptionId !== trustedMapping.stripeSubscriptionId ||
      riskLedger.refundOutstanding !== false ||
      riskLedger.disputeOutstanding !== false ||
      riskLedger.paymentFailureOutstanding !== false) return deny("billing_risk_not_cleared");

  const start = periodSeconds(item[0].current_period_start);
  const end = periodSeconds(item[0].current_period_end);
  if (start === null || end === null || start >= end ||
      !Number.isSafeInteger(nowEpochSeconds) || nowEpochSeconds < start ||
      nowEpochSeconds >= end) return deny("billing_period_not_current");

  if (release?.verifiedServerSide !== true ||
      release.sourceRightsApproved !== true ||
      release.productionRuntimeAccepted !== true ||
      release.tenantIsolationAccepted !== true ||
      release.billingLedgerWriteAndReplayAccepted !== true) return deny("production_release_not_approved");

  return Object.freeze({
    readyForAtomicCommit: true,
    grantsCustomerAccess: false,
    code: "verified_candidate_only",
    eventId: signedEvent.eventId,
    invoiceId: paidInvoice.id,
    tenantId: trustedMapping.tenantId,
    subject: trustedMapping.subject,
    stripeCustomerId: trustedMapping.stripeCustomerId,
    stripeSubscriptionId: trustedMapping.stripeSubscriptionId,
    stripePriceId: item[0].price.id,
    plan,
    cycle,
    periodStart: new Date(start * 1000).toISOString(),
    periodEnd: new Date(end * 1000).toISOString(),
    nextAction: "atomic_unique_event_and_current_state_commit_required",
  });
}
