/**
 * NovaPharm Intelligence: server-only, opt-in atomic Stripe billing grant.
 *
 * This is NOT a webhook consumer, a public endpoint, a pricing activation, or
 * a launch approval. All inputs MUST be independently hydrated by a trusted
 * private server from accepted OIDC, Stripe LIVE API, contract, webhook and
 * immutable/revocable DynamoDB ledgers. Never use browser JSON, email or
 * unverified Stripe metadata as authority.
 *
 * Prepared transactions fail closed on current tenant, member, seat, source
 * governance, risk, pending billing and the original signed event quarantine.
 * A successful write is ledger reconciliation, NOT access to medicine data.
 */
import { createHash, randomUUID } from "node:crypto";
import { intelligencePlanDefinitions } from "./intelligence-subscription-entitlements.mjs";
import { intelligenceLiveStripeCatalog } from "./intelligence-live-stripe-catalog.mjs";

export const INTELLIGENCE_BILLING_ACCESS_TABLE = "novapharm-intelligence-customer-access";
export const INTELLIGENCE_BILLING_EVENT_TABLE = "novapharm-intelligence-billing-webhook-events";
const TENANT = /^[a-z0-9][a-z0-9-]{2,63}$/u;
const SUBJECT = /^[A-Za-z0-9-]{8,128}$/u;
const EVENT = /^evt_[A-Za-z0-9]{8,}$/u;
const CUSTOMER = /^cus_[A-Za-z0-9]{6,}$/u;
const SUBSCRIPTION = /^sub_[A-Za-z0-9]{6,}$/u;
const INVOICE = /^in_[A-Za-z0-9]{6,}$/u;
const PRICE = /^price_[A-Za-z0-9]{6,}$/u;

const s = (v) => ({ S: v });
const n = (v) => ({ N: String(v) });
const b = (v) => ({ BOOL: v });
const list = (xs) => ({ L: xs.map(s) });
const key = (pk, sk) => ({ PK: s(pk), SK: s(sk) });
function deny(code) {
  return Object.freeze({ prepared: false, persisted: false, grantsCustomerAccess: false, code });
}
function iso(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value ? Date.parse(value) : null;
}
function integer(v, min = 0) {
  return Number.isSafeInteger(v) && v >= min;
}
function check(pk, sk, expression, values, names = {}) {
  return {
    ConditionCheck: {
      TableName: INTELLIGENCE_BILLING_ACCESS_TABLE,
      Key: key(pk, sk),
      ConditionExpression: expression,
      ExpressionAttributeValues: values,
      ...(Object.keys(names).length ? { ExpressionAttributeNames: names } : {}),
    },
  };
}

/**
 * Prepare one DynamoDB transaction after an independent positive
 * assessIntelligencePaidInvoice() result. No AWS calls or writes occur here.
 *
 * All snapshots are independently fetched from authoritative private stores;
 * every comparison is independently transaction-fenced at commit time.
 */
export function prepareIntelligenceBillingAtomicCommit({
  candidate, owner, tenant, member, seat, billing, risk,
  contract, governance, receipt, release, now = new Date().toISOString(),
} = {}) {
  const at = iso(now);
  if (at === null) return deny("clock_not_verified");
  if (candidate?.readyForAtomicCommit !== true ||
      candidate.grantsCustomerAccess !== false ||
      candidate.code !== "verified_candidate_only" ||
      candidate.nextAction !== "atomic_unique_event_and_current_state_commit_required" ||
      !TENANT.test(String(candidate.tenantId ?? "")) ||
      !SUBJECT.test(String(candidate.subject ?? "")) ||
      !EVENT.test(String(candidate.eventId ?? "")) ||
      !INVOICE.test(String(candidate.invoiceId ?? "")) ||
      !CUSTOMER.test(String(candidate.stripeCustomerId ?? "")) ||
      !SUBSCRIPTION.test(String(candidate.stripeSubscriptionId ?? "")) ||
      !PRICE.test(String(candidate.stripePriceId ?? ""))) return deny("paid_invoice_candidate_missing");

  const { tenantId, subject, stripeCustomerId, stripeSubscriptionId, eventId,
    invoiceId, stripePriceId, plan, cycle, periodStart, periodEnd } = candidate;
  const start = iso(periodStart);
  const end = iso(periodEnd);
  if (start === null || end === null || start >= end || at < start || at >= end) {
    return deny("paid_period_not_current");
  }
  if (!Object.hasOwn(intelligencePlanDefinitions, plan) ||
      !Object.hasOwn(intelligenceLiveStripeCatalog, plan) ||
      !Object.hasOwn(intelligenceLiveStripeCatalog[plan].prices, cycle) ||
      intelligenceLiveStripeCatalog[plan].prices[cycle].id !== stripePriceId) {
    return deny("price_or_plan_unapproved");
  }
  if (release?.verifiedServerSide !== true ||
      release.customerLaunchAccepted !== true ||
      release.sourceRightsApproved !== true ||
      release.productionRuntimeAccepted !== true ||
      release.tenantIsolationAccepted !== true ||
      release.billingLedgerWriteAndReplayAccepted !== true ||
      release.transactionalWriteVerified !== true ||
      release.stripeLiveAccountAccepted !== true ||
      release.rollbackAndAuditAccepted !== true ||
      !Array.isArray(release.productionApprovedFeatures)) return deny("production_release_not_accepted");

  const matching = (v) => v?.verifiedServerSide === true &&
    v.tenantId === tenantId && v.subject === subject;
  if (!matching(owner) || owner.stripeCustomerId !== stripeCustomerId ||
      !matching(tenant) || tenant.status !== "active" ||
      tenant.contractAccepted !== true || tenant.ownershipVerified !== true ||
      !SUBJECT.test(String(tenant.ownerSubject ?? "")) ||
      !integer(tenant.seatLimit, 1) || !integer(tenant.activeSeatCount, 1) ||
      tenant.activeSeatCount > tenant.seatLimit ||
      !matching(member) || member.status !== "active" || member.approved !== true ||
      !SUBJECT.test(String(member.approvedBy ?? "")) ||
      !matching(seat) || seat.status !== "active" ||
      !integer(seat.sessionVersion, 1) || !Array.isArray(seat.features) ||
      !seat.features.includes("medicine-search") ||
      !["owner", "admin", "analyst", "viewer"].includes(seat.role)) {
    return deny("tenant_owner_and_seat_not_approved");
  }
  if (!matching(billing) || !["pending", "active"].includes(billing.status) ||
      !integer(billing.version, 1) ||
      billing.stripeCustomerId !== stripeCustomerId ||
      billing.stripeSubscriptionId !== stripeSubscriptionId ||
      (billing.status === "active" && (
        iso(billing.periodEnd) === null || iso(billing.periodEnd) >= end ||
        billing.lastInvoiceId === invoiceId
      ))) return deny("billing_version_or_period_not_current");

  if (!matching(contract) || contract.accepted !== true ||
      contract.stripeCustomerId !== stripeCustomerId ||
      contract.stripeSubscriptionId !== stripeSubscriptionId ||
      contract.stripePriceId !== stripePriceId ||
      contract.plan !== plan || contract.cycle !== cycle ||
      typeof contract.version !== "string" || !/^[A-Za-z0-9._:-]{3,80}$/u.test(contract.version) ||
      !Array.isArray(contract.entitledFeatures)) return deny("accepted_contract_required");

  const features = [...new Set(contract.entitledFeatures)];
  if (!features.includes("medicine-search") ||
      features.length !== contract.entitledFeatures.length ||
      features.some((f) => typeof f !== "string" ||
        !intelligencePlanDefinitions[plan].features.includes(f) ||
        !release.productionApprovedFeatures.includes(f) || !seat.features.includes(f))) {
    return deny("feature_or_source_not_approved");
  }
  let quota = intelligencePlanDefinitions[plan].monthlySearchLimit;
  if (plan === "enterprise") {
    if (!integer(contract.monthlySearchLimit, 1)) return deny("enterprise_quota_not_accepted");
    quota = contract.monthlySearchLimit;
  }
  if (!integer(quota, 1)) return deny("quota_not_accepted");
  if (!matching(risk) || risk.stripeSubscriptionId !== stripeSubscriptionId ||
      !integer(risk.version, 1) ||
      risk.refundOutstanding !== false || risk.disputeOutstanding !== false ||
      risk.paymentFailureOutstanding !== false) return deny("billing_risk_not_cleared");
  if (governance?.verifiedServerSide !== true ||
      !integer(governance.revision, 1) ||
      governance.customerLaunchAccepted !== true ||
      governance.sourceRightsApproved !== true ||
      governance.productionApproved !== true ||
      !SUBJECT.test(String(governance.approvedBy ?? ""))) {
    return deny("source_governance_not_approved");
  }
  if (receipt?.verifiedServerSide !== true ||
      receipt.eventId !== eventId || receipt.eventType !== "invoice.paid" ||
      receipt.status !== "quarantined_unmapped" ||
      receipt.livemode !== true || receipt.synthetic !== false ||
      receipt.signatureVerified !== true) return deny("signed_quarantined_event_required");

  const tpk = "TENANT#" + tenantId;
  const pairs = {
    ":active": s("active"), ":yes": b(true), ":tenant": s(tenantId),
    ":subject": s(subject), ":customer": s(stripeCustomerId),
    ":sub": s(stripeSubscriptionId),
  };
  const tenantFence = check(tpk, "META",
    "#st = :active AND tenantId = :tenant AND contractAccepted = :yes AND ownershipVerified = :yes AND ownerSubject = :owner AND activeSeatCount = :seats AND seatLimit = :limit",
    { ...pairs, ":owner": s(tenant.ownerSubject), ":seats": n(tenant.activeSeatCount), ":limit": n(tenant.seatLimit) },
    { "#st": "status" });
  const memberFence = check("SUBJECT#" + subject, "TENANT#" + tenantId,
    "#st = :active AND tenantId = :tenant AND subject = :subject AND approved = :yes AND approvedBy = :by",
    { ...pairs, ":by": s(member.approvedBy) }, { "#st": "status" });
  const seatFence = check(tpk, "SEAT#" + subject,
    "#st = :active AND tenantId = :tenant AND subject = :subject AND sessionVersion = :sv AND contains(features, :feature) AND #role = :role",
    { ...pairs, ":sv": n(seat.sessionVersion), ":feature": s("medicine-search"), ":role": s(seat.role) },
    { "#st": "status", "#role": "role" });
  const governanceFence = check("GOVERNANCE#PRODUCTION", "FEATURE#medicine-search",
    "customerLaunchAccepted = :yes AND sourceRightsApproved = :yes AND productionApproved = :yes AND approvedBy = :by AND revision = :rev",
    { ":yes": b(true), ":by": s(governance.approvedBy), ":rev": n(governance.revision) });
  const riskFence = check(tpk, "RISK#" + stripeSubscriptionId,
    "tenantId = :tenant AND subject = :subject AND stripeSubscriptionId = :sub AND refundOutstanding = :no AND disputeOutstanding = :no AND paymentFailureOutstanding = :no AND version = :version",
    { ":tenant": s(tenantId), ":subject": s(subject), ":sub": s(stripeSubscriptionId),
      ":no": b(false), ":version": n(risk.version) });

  const timestamp = now;
  const fingerprint = createHash("sha256").update(tenantId + ":" + subject).digest("hex");
  const eventUpdate = {
    Update: {
      TableName: INTELLIGENCE_BILLING_EVENT_TABLE,
      Key: { event_id: s(eventId) },
      ConditionExpression: "#st = :quarantine AND event_type = :type AND synthetic = :no AND attribute_not_exists(processed_at)",
      UpdateExpression: "SET #st = :complete, processed_at = :now, tenant_fingerprint = :fingerprint",
      ExpressionAttributeNames: { "#st": "status" },
      ExpressionAttributeValues: {
        ":quarantine": s("quarantined_unmapped"), ":type": s("invoice.paid"),
        ":no": b(false), ":complete": s("reconciled_paid_invoice"),
        ":now": s(timestamp), ":fingerprint": s(fingerprint),
      },
    },
  };
  const prior = {
    ":prior": s(billing.status), ":priorVersion": n(billing.version),
    ":tenant": s(tenantId), ":subject": s(subject), ":customer": s(stripeCustomerId),
    ":sub": s(stripeSubscriptionId),
  };
  const previousPeriod = billing.status === "active"
    ? " AND periodEnd = :previousPeriod" : "";
  if (billing.status === "active") prior[":previousPeriod"] = s(billing.periodEnd);
  const billingUpdate = {
    Update: {
      TableName: INTELLIGENCE_BILLING_ACCESS_TABLE,
      Key: key(tpk, "BILLING#" + subject),
      ConditionExpression: "#st = :prior AND version = :priorVersion AND tenantId = :tenant AND subject = :subject AND stripeCustomerId = :customer AND stripeSubscriptionId = :sub" + previousPeriod,
      UpdateExpression: "SET #st = :active, #source = :source, #plan = :plan, #cycle = :cycle, periodStart = :start, periodEnd = :end, stripePriceId = :price, lastInvoiceId = :invoice, lastEventId = :event, contractVersion = :contractVersion, contractAccepted = :yes, webhookSignatureVerified = :yes, entitledFeatures = :features, monthlySearchLimit = :quota, version = :newVersion, reconciledAt = :at",
      ExpressionAttributeNames: { "#st": "status", "#source": "source", "#plan": "plan", "#cycle": "cycle" },
      ExpressionAttributeValues: {
        ...prior, ":active": s("active"), ":source": s("verified-stripe-webhook-ledger"),
        ":plan": s(plan), ":cycle": s(cycle), ":start": s(periodStart),
        ":end": s(periodEnd), ":price": s(stripePriceId), ":invoice": s(invoiceId),
        ":event": s(eventId), ":contractVersion": s(contract.version),
        ":yes": b(true), ":features": list(features), ":quota": n(quota),
        ":newVersion": n(billing.version + 1), ":at": s(timestamp),
      },
    },
  };
  const audit = {
    Put: {
      TableName: INTELLIGENCE_BILLING_ACCESS_TABLE,
      Item: {
        ...key("AUDIT#" + randomUUID(), "BILLING_INVOICE_RECONCILED"),
        tenantId: s(tenantId), subject: s(subject), eventId: s(eventId),
        invoiceId: s(invoiceId), stripeSubscriptionId: s(stripeSubscriptionId),
        eventAt: s(timestamp), actor: s("private-billing-reconciler"),
      },
      ConditionExpression: "attribute_not_exists(PK)",
    },
  };
  return Object.freeze({
    prepared: true, persisted: false, grantsCustomerAccess: false,
    code: "atomic_billing_transaction_prepared",
    eventId, tenantFingerprint: fingerprint,
    tables: Object.freeze([INTELLIGENCE_BILLING_EVENT_TABLE, INTELLIGENCE_BILLING_ACCESS_TABLE]),
    transaction: Object.freeze({
      TransactItems: Object.freeze([
        tenantFence, memberFence, seatFence, governanceFence, riskFence,
        eventUpdate, billingUpdate, audit,
      ]),
    }),
    nextAction: "private_server_must_commit_with_durable_audit_and_recheck",
  });
}

/**
 * Client is a trusted server-injected DynamoDB TransactWriteItems adapter.
 * Never expose this function via an unauthenticated HTTP endpoint.
 * The transaction may fail on replay, revocation, source rights or races.
 */
export async function commitIntelligenceBillingAtomicLedger({
  transactWrite, ...input
} = {}) {
  const prepared = prepareIntelligenceBillingAtomicCommit(input);
  if (!prepared.prepared) return prepared;
  if (typeof transactWrite !== "function") return deny("private_dynamodb_adapter_missing");
  try {
    await transactWrite(prepared.transaction);
    return Object.freeze({
      prepared: true, persisted: true, grantsCustomerAccess: false,
      code: "billing_reconciled_subject_to_fresh_session_authorisation",
      eventId: prepared.eventId,
    });
  } catch {
    return deny("atomic_billing_transaction_not_committed");
  }
}
