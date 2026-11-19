/**
 * Private NovaPharm Intelligence paid-invoice orchestration.
 *
 * This is not a webhook endpoint or a live deployment. A server-owned worker
 * MUST supply separately authenticated Stripe LIVE reads and consistent,
 * authorised DynamoDB snapshots. Neither the client, Stripe event metadata,
 * nor a Checkout success redirect may supply tenant/contract/release facts.
 *
 * Mode "inspect" only analyses an event, never writes. Mode "commit" is
 * independently gated by the PRIVATE worker's off-by-default release flag and
 * the existing source/contract/tenant and atomic DynamoDB condition fences.
 * Even a persisted paid invoice does not issue a customer session.
 */
import { assessIntelligencePaidInvoice } from "./intelligence-billing-reconciliation.mjs";
import {
  prepareIntelligenceBillingAtomicCommit,
  commitIntelligenceBillingAtomicLedger,
} from "./intelligence-billing-atomic-ledger.mjs";

const EVENT_ID = /^evt_[A-Za-z0-9]{8,}$/u;
const INVOICE_ID = /^in_[A-Za-z0-9]{6,}$/u;
const SUBSCRIPTION_ID = /^sub_[A-Za-z0-9]{6,}$/u;
const CUSTOMER_ID = /^cus_[A-Za-z0-9]{6,}$/u;
const TENANT = /^[a-z0-9][a-z0-9-]{2,63}$/u;
const SUBJECT = /^[A-Za-z0-9-]{8,128}$/u;
const ACCOUNT_ID = "acct_1UZUNv2U9Y3sX5I2";
const REQUIRED = Object.freeze([
  "loadSignedQuarantine", "fetchStripeLiveAccount", "fetchStripeLiveEvent",
  "fetchStripeLiveInvoice", "fetchStripeLiveSubscription", "readCustomerOwner",
  "readAcceptedCustomerLedger",
]);
const refuse = (code) => Object.freeze({
  evaluated: false, persisted: false, grantsCustomerAccess: false, code,
});
const id = (value) => typeof value === "string" ? value : value?.id;

/**
 * Requires a dedicated, IAM-restricted private worker. "VerifiedServerSide"
 * flags are stamped only on independently loaded records, never on browser
 * body / Stripe event metadata.
 */
export async function reconcilePrivateIntelligencePaidInvoice({
  eventId, adapters, mode = "inspect", privateAtomicWritesEnabled = false,
  now = new Date().toISOString(),
} = {}) {
  if (!EVENT_ID.test(String(eventId ?? ""))) return refuse("event_id_invalid");
  if (mode !== "inspect" && mode !== "commit") return refuse("worker_mode_invalid");
  if (mode === "commit" && privateAtomicWritesEnabled !== true) {
    // The default is NO CHARGE GRANTS and NO reads or writes.
    return refuse("private_atomic_billing_release_disabled");
  }
  if (adapters === null || typeof adapters !== "object" ||
      REQUIRED.some((name) => typeof adapters[name] !== "function") ||
      (mode === "commit" && typeof adapters.transactWrite !== "function")) {
    return refuse("trusted_worker_adapters_missing");
  }
  const timestamp = Date.parse(now);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== now ||
      timestamp % 1000 !== 0) return refuse("clock_invalid");
  try {
    // The quarantine table is exclusively written AFTER live Stripe signature
    // verification. A matching real event is then re-fetched independently.
    const receipt = await adapters.loadSignedQuarantine(eventId);
    if (receipt?.event_id !== eventId ||
        receipt.event_type !== "invoice.paid" ||
        receipt.status !== "quarantined_unmapped" ||
        receipt.synthetic !== false ||
        receipt.source !== "signed-stripe-quarantine-table" ||
        receipt.processed_at !== undefined) return refuse("signed_quarantine_unverified");

    const account = await adapters.fetchStripeLiveAccount();
    if (account?.id !== ACCOUNT_ID || account.livemode === false) {
      return refuse("live_stripe_account_mismatch");
    }
    const event = await adapters.fetchStripeLiveEvent(eventId);
    if (event?.id !== eventId || event.type !== "invoice.paid" ||
        event.livemode !== true ||
        (event.account !== null && event.account !== undefined &&
         event.account !== ACCOUNT_ID)) return refuse("live_stripe_event_mismatch");
    const referencedInvoice = event.data?.object;
    const invoiceId = referencedInvoice?.id;
    if (referencedInvoice?.object !== "invoice" ||
        !INVOICE_ID.test(String(invoiceId ?? ""))) {
      return refuse("paid_invoice_reference_unverified");
    }

    const invoice = await adapters.fetchStripeLiveInvoice(invoiceId);
    const customerId = id(invoice?.customer);
    const subscriptionId = id(invoice?.subscription ??
      invoice?.parent?.subscription_details?.subscription);
    if (invoice?.id !== invoiceId || invoice.object !== "invoice" ||
        invoice.livemode !== true || invoice.status !== "paid" ||
        invoice.currency !== "gbp" ||
        !Number.isSafeInteger(invoice.amount_paid) || invoice.amount_paid <= 0 ||
        !CUSTOMER_ID.test(String(customerId ?? "")) ||
        !SUBSCRIPTION_ID.test(String(subscriptionId ?? ""))) {
      return refuse("independently_paid_invoice_required");
    }
    // A customerId in Stripe is never a tenant identity. Require the
    // independently approved one-to-one mapping in DynamoDB.
    const binding = await adapters.readCustomerOwner(customerId);
    const tenantId = binding?.tenantId;
    const subject = binding?.subject;
    if (binding?.PK !== "STRIPE_CUSTOMER#" + customerId ||
        binding.SK !== "OWNER" || binding.status !== "approved" ||
        binding.stripeCustomerId !== customerId ||
        binding.stripeSubscriptionId !== subscriptionId ||
        !TENANT.test(String(tenantId ?? "")) ||
        !SUBJECT.test(String(subject ?? "")) ||
        !["starter", "professional"].includes(binding.plan) ||
        !["monthly", "annual"].includes(binding.cycle)) {
      return refuse("independent_customer_owner_mapping_required");
    }

    const subscription = await adapters.fetchStripeLiveSubscription(subscriptionId);
    if (subscription?.id !== subscriptionId ||
        subscription.object !== "subscription" || subscription.livemode !== true ||
        id(subscription.customer) !== customerId ||
        id(subscription.latest_invoice) !== invoiceId ||
        subscription.status !== "active") {
      return refuse("live_subscription_not_current");
    }
    const ledger = await adapters.readAcceptedCustomerLedger({
      tenantId, subject, stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId, eventId,
    });
    if (!ledger || typeof ledger !== "object") return refuse("customer_ledger_missing");
    const trusted = (value) => value && typeof value === "object" &&
      value.tenantId === tenantId && value.subject === subject &&
      value.verifiedServerSide === true;
    if (!trusted(ledger.owner) ||
        !trusted(ledger.tenant) || !trusted(ledger.member) ||
        !trusted(ledger.seat) || !trusted(ledger.billing) ||
        !trusted(ledger.contract) || !trusted(ledger.risk) ||
        ledger.owner.stripeCustomerId !== customerId ||
        ledger.contract.stripeCustomerId !== customerId ||
        ledger.contract.stripeSubscriptionId !== subscriptionId ||
        ledger.contract.plan !== binding.plan ||
        ledger.contract.cycle !== binding.cycle ||
        ledger.receipt?.eventId !== eventId ||
        ledger.receipt?.eventType !== "invoice.paid" ||
        ledger.receipt?.status !== "quarantined_unmapped" ||
        ledger.receipt?.synthetic !== false ||
        ledger.receipt?.signatureVerified !== true ||
        ledger.governance?.verifiedServerSide !== true ||
        ledger.release?.verifiedServerSide !== true) {
      return refuse("accepted_ledger_and_quarantine_mismatch");
    }
    // The only trusted event tenant comes from the independent owner row.
    const mapping = Object.freeze({
      verifiedServerSide: true, tenantId, subject,
      stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId,
      stripeLiveMode: true, plan: binding.plan, cycle: binding.cycle,
    });
    const owner = ledger.owner;
    const signedEvent = Object.freeze({
      eventId, eventType: "invoice.paid", invoiceId,
      tenantId, subject, stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      receivedInLiveMode: true,
      grantsCustomerAccess: false,
      requiresAtomicEventDeduplication: true,
      requiresVerifiedInvoiceAndContract: true,
    });
    const candidate = assessIntelligencePaidInvoice({
      signedEvent,
      trustedOwner: owner,
      trustedMapping: mapping,
      stripeSubscription: {
        ...subscription, verifiedServerSide: true,
        providerSource: "stripe-live-api",
      },
      paidInvoice: {
        ...invoice, verifiedServerSide: true,
        providerSource: "stripe-live-api",
      },
      acceptedContract: ledger.contract,
      riskLedger: ledger.risk,
      release: ledger.release,
      nowEpochSeconds: timestamp / 1000,
    });
    if (candidate.readyForAtomicCommit !== true) {
      return refuse(candidate.code || "paid_invoice_not_accepted");
    }
    const input = {
      candidate, owner, tenant: ledger.tenant, member: ledger.member,
      seat: ledger.seat, billing: ledger.billing, risk: ledger.risk,
      contract: ledger.contract, governance: ledger.governance,
      receipt: ledger.receipt, release: ledger.release, now,
    };
    const prepared = prepareIntelligenceBillingAtomicCommit(input);
    if (!prepared.prepared) return refuse(prepared.code || "atomic_ledger_not_accepted");

    if (mode === "inspect") {
      return Object.freeze({
        evaluated: true, persisted: false, grantsCustomerAccess: false,
        code: "verified_paid_invoice_candidate_inspection_only",
      });
    }
    if (ledger.release.privateAtomicBillingWorkerAccepted !== true ||
        ledger.release.customerLaunchAccepted !== true ||
        ledger.release.rollbackAndAuditAccepted !== true) {
      return refuse("private_atomic_worker_not_accepted");
    }
    const outcome = await commitIntelligenceBillingAtomicLedger({
      ...input,
      transactWrite: adapters.transactWrite,
    });
    return Object.freeze({
      evaluated: true, persisted: outcome.persisted === true,
      grantsCustomerAccess: false, code: outcome.code,
    });
  } catch {
    // No customer identities, Stripe errors, API keys or record details in
    // external/error responses. No retries that could create duplicate grants.
    return refuse("private_billing_worker_unavailable");
  }
}
