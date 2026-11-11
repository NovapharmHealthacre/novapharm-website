/**
 * NovaPharm Intelligence: private subscription suspension and revocation.
 *
 * No public endpoint or AWS/Stripe mutations are activated by this module.
 * A signed webhook event alone is NEVER enough: live Stripe and independently
 * authoritative tenant, billing, owner and risk records must agree.
 * Revocation must work even when a medicine source licence is suspended.
 */
import { createHash, randomUUID } from "node:crypto";
import {
  INTELLIGENCE_BILLING_ACCESS_TABLE,
  INTELLIGENCE_BILLING_EVENT_TABLE,
} from "./intelligence-billing-atomic-ledger.mjs";

const TENANT = /^[a-z0-9][a-z0-9-]{2,63}$/u;
const SUBJECT = /^[A-Za-z0-9-]{8,128}$/u;
const CUSTOMER = /^cus_[A-Za-z0-9]{6,}$/u;
const SUB = /^sub_[A-Za-z0-9]{6,}$/u;
const EVENT = /^evt_[A-Za-z0-9]{8,}$/u;
const STATUS = new Set(["past_due", "unpaid", "canceled", "incomplete_expired"]);
const TYPES = new Set([
  "invoice.payment_failed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "charge.refunded",
  "charge.dispute.created",
  "radar.early_fraud_warning.created",
]);
const s = (v) => ({ S: v });
const n = (v) => ({ N: String(v) });
const b = (v) => ({ BOOL: v });
const key = (pk, sk) => ({ PK: s(pk), SK: s(sk) });
function deny(code) {
  return Object.freeze({ prepared: false, persisted: false, grantsCustomerAccess: false, code });
}
function validTime(value) {
  return typeof value === "string" &&
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/u.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
function trusted(record, tenantId, subject) {
  return record?.verifiedServerSide === true &&
    record.tenantId === tenantId && record.subject === subject;
}

/**
 * Builds an all-or-nothing suspension transaction. The input `reason` is
 * derived by a private worker from signed event receipt AND current live Stripe
 * state; it must never be accepted from a client request or Stripe metadata.
 */
export function prepareIntelligenceBillingSuspension({
  receipt, owner, mapping, billing, risk, liveStripe, release,
  now = new Date().toISOString(),
} = {}) {
  if (!validTime(now)) return deny("clock_invalid");
  if (receipt?.verifiedServerSide !== true ||
      !EVENT.test(String(receipt.eventId ?? "")) ||
      !TYPES.has(receipt.eventType) ||
      receipt.status !== "quarantined_unmapped" ||
      receipt.livemode !== true || receipt.synthetic !== false ||
      receipt.signatureVerified !== true) return deny("signed_event_not_accepted");
  const { eventId, eventType } = receipt;
  const tenantId = mapping?.tenantId, subject = mapping?.subject;
  const customer = mapping?.stripeCustomerId;
  const subscription = mapping?.stripeSubscriptionId;
  if (!TENANT.test(String(tenantId ?? "")) ||
      !SUBJECT.test(String(subject ?? "")) ||
      !CUSTOMER.test(String(customer ?? "")) ||
      !SUB.test(String(subscription ?? "")) ||
      !trusted(mapping, tenantId, subject) ||
      !trusted(owner, tenantId, subject) ||
      owner.stripeCustomerId !== customer ||
      !trusted(billing, tenantId, subject) ||
      billing.status !== "active" ||
      billing.stripeCustomerId !== customer ||
      billing.stripeSubscriptionId !== subscription ||
      !Number.isSafeInteger(billing.version) || billing.version <= 0 ||
      !validTime(billing.periodEnd)) return deny("billing_ownership_or_revision_invalid");

  if (!trusted(risk, tenantId, subject) ||
      risk.stripeSubscriptionId !== subscription ||
      !Number.isSafeInteger(risk.version) || risk.version <= 0 ||
      ![risk.refundOutstanding, risk.disputeOutstanding, risk.paymentFailureOutstanding]
        .every((v) => typeof v === "boolean")) return deny("risk_not_verified");

  if (liveStripe?.verifiedServerSide !== true ||
      liveStripe.providerSource !== "stripe-live-api" ||
      liveStripe.livemode !== true ||
      liveStripe.stripeCustomerId !== customer ||
      liveStripe.stripeSubscriptionId !== subscription ||
      typeof liveStripe.subscriptionStatus !== "string") return deny("live_stripe_state_missing");

  let reason;
  if (eventType === "charge.refunded" && risk.refundOutstanding === true) reason = "refund";
  else if (eventType === "charge.dispute.created" && risk.disputeOutstanding === true) reason = "dispute";
  else if (eventType === "radar.early_fraud_warning.created" &&
    risk.disputeOutstanding === true) reason = "fraud_risk";
  else if (eventType === "invoice.payment_failed" &&
    risk.paymentFailureOutstanding === true &&
    liveStripe.latestInvoicePaid === false) reason = "payment_failed";
  else if (eventType === "customer.subscription.deleted" &&
    liveStripe.subscriptionStatus === "canceled") reason = "subscription_deleted";
  else if (eventType === "customer.subscription.updated" &&
    STATUS.has(liveStripe.subscriptionStatus) &&
    (liveStripe.subscriptionStatus !== "canceled" ||
      liveStripe.cancelAtPeriodEnd !== true)) reason = "subscription_inactive";
  if (!reason) return deny("no_verified_revocation_trigger");

  // Access suspension is a safety action. It is permitted during a disabled
  // customer launch or expired medicine licence. Never re-grant here.
  if (release?.verifiedServerSide !== true ||
      release.privateWorkerAccepted !== true ||
      release.replayAndRevocationTested !== true ||
      release.transactionalWriteVerified !== true ||
      release.auditAndRestoreAccepted !== true) return deny("private_revocation_runtime_not_approved");

  const tpk = "TENANT#" + tenantId;
  const riskCheck = {
    ConditionCheck: {
      TableName: INTELLIGENCE_BILLING_ACCESS_TABLE,
      Key: key(tpk, "RISK#" + subscription),
      ConditionExpression: "tenantId = :tenant AND subject = :subject AND stripeSubscriptionId = :sub AND version = :v AND refundOutstanding = :refunded AND disputeOutstanding = :disputed AND paymentFailureOutstanding = :failed",
      ExpressionAttributeValues: {
        ":tenant": s(tenantId), ":subject": s(subject),
        ":sub": s(subscription), ":v": n(risk.version),
        ":refunded": b(risk.refundOutstanding), ":disputed": b(risk.disputeOutstanding),
        ":failed": b(risk.paymentFailureOutstanding),
      },
    },
  };
  const eventUpdate = {
    Update: {
      TableName: INTELLIGENCE_BILLING_EVENT_TABLE,
      Key: { event_id: s(eventId) },
      ConditionExpression: "#st = :quarantine AND event_type = :type AND synthetic = :no AND attribute_not_exists(processed_at)",
      UpdateExpression: "SET #st = :processed, processed_at = :now, tenant_fingerprint = :fingerprint",
      ExpressionAttributeNames: { "#st": "status" },
      ExpressionAttributeValues: {
        ":quarantine": s("quarantined_unmapped"), ":type": s(eventType),
        ":no": b(false), ":processed": s("reconciled_access_suspended"),
        ":now": s(now),
        ":fingerprint": s(createHash("sha256").update(tenantId + ":" + subject).digest("hex")),
      },
    },
  };
  const billingUpdate = {
    Update: {
      TableName: INTELLIGENCE_BILLING_ACCESS_TABLE,
      Key: key(tpk, "BILLING#" + subject),
      ConditionExpression: "#st = :active AND version = :priorVersion AND tenantId = :tenant AND subject = :subject AND stripeCustomerId = :customer AND stripeSubscriptionId = :sub AND periodEnd = :end",
      UpdateExpression: "SET #st = :suspended, revocationReason = :reason, revokedAt = :now, lastEventId = :event, entitledFeatures = :none, version = :nextVersion",
      ExpressionAttributeNames: { "#st": "status" },
      ExpressionAttributeValues: {
        ":active": s("active"), ":priorVersion": n(billing.version),
        ":tenant": s(tenantId), ":subject": s(subject),
        ":customer": s(customer), ":sub": s(subscription), ":end": s(billing.periodEnd),
        ":suspended": s("suspended"), ":reason": s(reason),
        ":now": s(now), ":event": s(eventId), ":none": { L: [] },
        ":nextVersion": n(billing.version + 1),
      },
    },
  };
  const audit = {
    Put: {
      TableName: INTELLIGENCE_BILLING_ACCESS_TABLE,
      Item: {
        ...key("AUDIT#" + randomUUID(), "BILLING_ACCESS_SUSPENDED"),
        tenantId: s(tenantId), subject: s(subject),
        stripeSubscriptionId: s(subscription),
        eventId: s(eventId), reason: s(reason), eventAt: s(now),
      },
      ConditionExpression: "attribute_not_exists(PK)",
    },
  };
  return Object.freeze({
    prepared: true, persisted: false, grantsCustomerAccess: false,
    code: "billing_suspension_prepared",
    eventId, reason,
    transaction: Object.freeze({
      TransactItems: Object.freeze([riskCheck, eventUpdate, billingUpdate, audit]),
    }),
    nextAction: "private_worker_must_execute_atomic_revocation",
  });
}

export async function commitIntelligenceBillingSuspension({ transactWrite, ...input } = {}) {
  const prepared = prepareIntelligenceBillingSuspension(input);
  if (!prepared.prepared) return prepared;
  if (typeof transactWrite !== "function") return deny("private_dynamodb_adapter_missing");
  try {
    await transactWrite(prepared.transaction);
    return Object.freeze({
      prepared: true, persisted: true, grantsCustomerAccess: false,
      code: "subscription_access_suspended",
      eventId: prepared.eventId, reason: prepared.reason,
    });
  } catch {
    return deny("suspension_transaction_not_committed");
  }
}
