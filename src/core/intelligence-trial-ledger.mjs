/**
 * NovaPharm Intelligence: PRIVATE trial ledger transaction preparations.
 *
 * This module is SOURCE-ONLY. No public route, AWS execution, account grant,
 * email, payment, or production flag is created here. The private caller must
 * independently validate its principal, tenant, current rights/release,
 * immutable trial ID, one-per-organisation history and approved legal terms.
 *
 * All returned DynamoDB transaction items are intended for a trusted backend;
 * never pass these from a browser or use the return shape as an access token.
 */
import {
  assessIntelligenceTrialEnrollment,
  decideIntelligenceFreeTrialEntitlement,
  intelligenceStarterTrialPolicy,
} from "./intelligence-free-trial.mjs";

const TABLE = "novapharm-intelligence-customer-access";
const TENANT = /^[a-z0-9][a-z0-9-]{2,63}$/u;
const SUBJECT = /^[A-Za-z0-9-]{8,128}$/u;
const TRIAL = /^npi_trial_[A-Za-z0-9_-]{8,80}$/u;
const REQUEST = /^npi_req_[A-Za-z0-9_-]{8,80}$/u;

const refuse = (code) => Object.freeze({
  prepared: false, code, transactItems: Object.freeze([]),
  grantsAccess: false, chargesMoney: false,
});

function canonicalUtc(value) {
  if (typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) return null;
  const epoch = Date.parse(value);
  if (!Number.isSafeInteger(epoch) || new Date(epoch).toISOString() !== value) return null;
  return epoch;
}
function key(pk, sk) {
  return { PK: { S: pk }, SK: { S: sk } };
}
/**
 * Prepare exactly one canonical, never-deleted organisation sentinel and one
 * cumulative usage record in a single conditional TransactWriteItems request.
 * The **private** adapter must verify the real organisation owner and the
 * full legal/privacy, feature and source-rights approval before calling.
 */
export function prepareIntelligenceStarterTrialIssuance({
  principal, tenant, history, terms, release, trialId, now,
} = {}) {
  const candidate = assessIntelligenceTrialEnrollment({
    principal, tenant, history, terms, release,
  });
  if (!candidate.eligible) return refuse(candidate.code);
  if (!TENANT.test(String(principal.tenantId)) ||
      !SUBJECT.test(String(principal.subject)) ||
      !TRIAL.test(String(trialId))) return refuse("trial_issuance_identity_or_id_invalid");
  const startEpoch = canonicalUtc(now);
  if (startEpoch === null) return refuse("trial_issuance_clock_invalid");
  if (release.sourceRightsApproved !== true ||
      !Array.isArray(release.productionApprovedFeatures) ||
      !release.productionApprovedFeatures.includes("medicine-search")) {
    return refuse("trial_source_or_feature_not_approved");
  }
  const trialStart = new Date(startEpoch).toISOString();
  const trialEnd = new Date(startEpoch + intelligenceStarterTrialPolicy.durationMs).toISOString();
  if (canonicalUtc(trialEnd) === null) return refuse("trial_issuance_expiry_invalid");
  const pk = "TENANT#" + principal.tenantId;
  const sentinel = Object.freeze({
    Put: {
      TableName: TABLE,
      Item: {
        ...key(pk,"TRIAL#STARTER"),
        tenantId: { S: principal.tenantId },
        subject: { S: principal.subject },
        trialId: { S: trialId },
        trialStart: { S: trialStart },
        trialEnd: { S: trialEnd },
        source: { S: "verified-free-trial-ledger" },
        issuer: { S: "npi-private-trial-ledger" },
        status: { S: "trialing" },
        plan: { S: "starter" },
        policyVersion: { N: "1" },
        redeemedEver: { BOOL: true },
        contractAccepted: { BOOL: true },
      },
      ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
    },
  });
  const usage = Object.freeze({
    Put: {
      TableName: TABLE,
      Item: {
        ...key(pk,"TRIAL_USAGE#" + trialId),
        tenantId: { S: principal.tenantId },
        subject: { S: principal.subject },
        trialId: { S: trialId },
        trialSearchCount: { N: "0" },
        updatedAt: { S: trialStart },
      },
      ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
    },
  });
  return Object.freeze({
    prepared: true, code: "private_trial_issuance_transaction_prepared",
    grantsAccess: false, chargesMoney: false, trialStart, trialEnd,
    transactItems: Object.freeze([sentinel, usage]),
  });
}

/**
 * Atomically reserve one of 25 lifetime searches against an existing trial.
 * The first ConditionCheck binds status and expiry; Update prevents concurrent
 * quota overspend; the Put prevents replay of a stable backend request ID.
 *
 * Results must be checked only AFTER private TransactWriteItems succeeds.
 * Upstream read authorization still needs the customer session, seat, and
 * accepted medicine observation/source permissions.
 */
export function prepareIntelligenceTrialSearchReservation({
  principal, grant, usage, release, now, requestId,
} = {}) {
  const decision = decideIntelligenceFreeTrialEntitlement({
    principal, grant, usage, release, now, feature: "medicine-search",
  });
  if (!decision.allowed) return refuse(decision.code);
  if (!TENANT.test(String(principal.tenantId)) ||
      !SUBJECT.test(String(principal.subject)) ||
      !TRIAL.test(String(grant.trialId)) ||
      !REQUEST.test(String(requestId))) return refuse("trial_reservation_identity_or_request_invalid");
  if (canonicalUtc(now) === null) return refuse("trial_reservation_clock_invalid");
  const pk = "TENANT#" + principal.tenantId;
  const items = [
    {
      ConditionCheck: {
        TableName: TABLE,
        Key: key(pk, "TRIAL#STARTER"),
        ConditionExpression: "#status = :status AND trialId = :trialId AND trialEnd > :now AND subject = :subject",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":status": { S: "trialing" },
          ":trialId": { S: grant.trialId },
          ":subject": { S: principal.subject },
          ":now": { S: now },
        },
      },
    },
    {
      Update: {
        TableName: TABLE,
        Key: key(pk, "TRIAL_USAGE#" + grant.trialId),
        ConditionExpression: "attribute_exists(PK) AND #count < :limit AND subject = :subject",
        UpdateExpression: "SET #count = #count + :one, updatedAt = :now",
        ExpressionAttributeNames: { "#count": "trialSearchCount" },
        ExpressionAttributeValues: {
          ":limit": { N: String(intelligenceStarterTrialPolicy.totalSearchLimit) },
          ":one": { N: "1" },
          ":subject": { S: principal.subject },
          ":now": { S: now },
        },
      },
    },
    {
      Put: {
        TableName: TABLE,
        Item: {
          ...key(pk, "TRIAL_REQUEST#" + requestId),
          trialId: { S: grant.trialId },
          subject: { S: principal.subject },
          reservedAt: { S: now },
        },
        ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
      },
    },
  ];
  return Object.freeze({
    prepared: true, code: "private_atomic_search_reservation_prepared",
    grantsAccess: false, chargesMoney: false,
    transactItems: Object.freeze(items),
  });
}
