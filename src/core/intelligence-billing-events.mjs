import { verifyStripeWebhook } from "./payments/stripe-checkout.mjs";

const CUSTOMER_ID = /^cus_[a-zA-Z0-9]{6,}$/u;
const SUBSCRIPTION_ID = /^sub_[a-zA-Z0-9]{6,}$/u;
const EVENT_TYPES = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);

function reject(code) {
  return Object.assign(new Error("Intelligence Billing event rejected."), { code });
}

function validInternalIdentity(value) {
  return typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{2,127}$/u.test(value);
}

/**
 * A signed webhook is not an entitlement grant. A caller must obtain mapping
 * from an independently authenticated durable billing ledger, not from the
 * payload's metadata, email, public pricing card or customer-submitted JSON.
 * Also compare that subscription mapping against the independently verified
 * customer-ownership ledger. A signed Stripe event cannot identify a tenant.
 *
 * Returns a redacted, immutable event for a future atomic idempotent queue.
 * No live endpoint, payment creation, ledger write, access grant or customer
 * account mutation occurs in this module.
 */
export function verifyIntelligenceBillingEvent({
  rawBody, signatureHeader, webhookSecret, expectedLiveMode, trustedMapping, trustedOwner, nowMs = Date.now(),
} = {}) {
  if (typeof expectedLiveMode !== "boolean") throw reject("billing_mode_not_approved");
  const event = verifyStripeWebhook({ rawBody, signatureHeader, webhookSecret, nowMs });

  if (event.livemode !== expectedLiveMode || typeof event.account === "string") {
    throw reject("billing_account_mode_mismatch");
  }
  if (!EVENT_TYPES.has(event.type)) throw reject("billing_event_type_unapproved");
  const object = event.data?.object;
  if (!object || typeof object !== "object" || Array.isArray(object)) throw reject("billing_object_invalid");

  const subscriptionEvent = event.type.startsWith("customer.subscription.");
  const stripeCustomerId = object.customer;
  const stripeSubscriptionId = subscriptionEvent
    ? object.id
    : object.subscription ?? object.parent?.subscription_details?.subscription;
  if (!CUSTOMER_ID.test(String(stripeCustomerId ?? "")) ||
      !SUBSCRIPTION_ID.test(String(stripeSubscriptionId ?? "")) ||
      (subscriptionEvent && object.object !== "subscription") ||
      (!subscriptionEvent && object.object !== "invoice")) {
    throw reject("billing_object_identity_invalid");
  }

  if (trustedMapping?.verifiedServerSide !== true ||
      trustedMapping.stripeLiveMode !== expectedLiveMode ||
      !validInternalIdentity(trustedMapping.tenantId) ||
      !validInternalIdentity(trustedMapping.subject) ||
      trustedMapping.stripeCustomerId !== stripeCustomerId ||
      trustedMapping.stripeSubscriptionId !== stripeSubscriptionId ||
      trustedOwner?.verifiedServerSide !== true ||
      !validInternalIdentity(trustedOwner.tenantId) ||
      !validInternalIdentity(trustedOwner.subject) ||
      trustedOwner.tenantId !== trustedMapping.tenantId ||
      trustedOwner.subject !== trustedMapping.subject ||
      trustedOwner.stripeCustomerId !== stripeCustomerId) {
    throw reject("billing_tenant_mapping_unverified");
  }

  const status = subscriptionEvent && typeof object.status === "string"
    ? object.status.slice(0, 36) : null;

  return Object.freeze({
    eventId: event.id,
    eventType: event.type,
    tenantId: trustedMapping.tenantId,
    subject: trustedMapping.subject,
    stripeCustomerId,
    stripeSubscriptionId,
    observedStripeSubscriptionStatus: status,
    receivedInLiveMode: expectedLiveMode,
    requiresAtomicEventDeduplication: true,
    requiresVerifiedInvoiceAndContract: true,
    grantsCustomerAccess: false,
    nextAction: "persist_in_authoritative_ledger_then_reconcile",
  });
}
