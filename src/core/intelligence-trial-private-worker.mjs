/**
 * Private NovaPharm Intelligence trial transaction worker (SOURCE ONLY).
 *
 * This is not a network endpoint or a deployed AWS Lambda. Callers MUST
 * provide real, independently validated DynamoDB strongly consistent loaders,
 * Cognito MFA identity and tenant ownership from a privileged server.
 * No caller/browser-provided release flags, tenant IDs, emails, or rights grants.
 * No live functionality is enabled by adding this file.
 */
import { randomBytes } from "node:crypto";
import {
  prepareIntelligenceStarterTrialIssuance,
  prepareIntelligenceTrialSearchReservation,
} from "./intelligence-trial-ledger.mjs";

const deny = (code) => Object.freeze({
  committed: false, code, grantsCustomerAccess: false, chargesMoney: false,
});
const REQUIRED_ISSUANCE = Object.freeze([
  "readPrincipal", "readTenant", "readTrialHistory", "readAcceptedTerms",
  "readRelease", "transactWriteItems", "readTrial", "readUsage",
]);
const REQUIRED_RESERVATION = Object.freeze([
  "readPrincipal", "readTrial", "readUsage", "readRelease",
  "transactWriteItems", "readUsage",
]);
const pattern = /^npi_trial_[A-Za-z0-9_-]{8,80}$/u;
const requestPattern = /^npi_req_[A-Za-z0-9_-]{8,80}$/u;
const utc = value => {
  if (typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) return false;
  const epoch = Date.parse(value);
  return Number.isSafeInteger(epoch) && new Date(epoch).toISOString() === value;
};

function ready(adapters, required, privateTransactionEnabled) {
  return privateTransactionEnabled === true &&
    adapters && required.every(name => typeof adapters[name] === "function");
}
function makeTrialId() {
  return "npi_trial_" + randomBytes(24).toString("base64url");
}

/**
 * Eligibility is read from independent private stores. DynamoDB conditional
 * transaction rechecks uniqueness atomically; post-read validates durability.
 * This method NEVER issues a session or directly grants a medicine permission.
 */
export async function issueIntelligenceStarterTrialPrivate({
  adapters, privateTransactionEnabled = false, now = new Date().toISOString(),
} = {}) {
  if (!ready(adapters, REQUIRED_ISSUANCE, privateTransactionEnabled)) return deny("private_trial_issuer_disabled");
  if (!utc(now)) return deny("private_trial_clock_invalid");
  try {
    const principal = await adapters.readPrincipal();
    if (principal?.verifiedServerSide !== true || principal.mfaVerified !== true ||
        !principal.subject || !principal.tenantId) return deny("verified_principal_required");

    const [tenant, history, terms, release] = await Promise.all([
      adapters.readTenant(principal.tenantId),
      adapters.readTrialHistory(principal.tenantId),
      adapters.readAcceptedTerms(principal.tenantId, principal.subject),
      adapters.readRelease(),
    ]);
    if (release?.privateTrialTransactionEnabled !== true ||
        release?.customerLaunchAccepted !== true ||
        release?.sourceRightsApproved !== true) {
      return deny("private_trial_release_unaccepted");
    }
    const prepared = prepareIntelligenceStarterTrialIssuance({
      principal, tenant, history, terms, release, trialId: makeTrialId(), now,
    });
    if (!prepared.prepared) return deny(prepared.code);
    const item = prepared.transactItems[0]?.Put?.Item;
    const trialId = item?.trialId?.S;
    if (!pattern.test(String(trialId || ""))) return deny("private_trial_id_invalid");

    const commit = await adapters.transactWriteItems(prepared.transactItems);
    if (commit?.committed !== true || commit?.verifiedDurable !== true) return deny("trial_durable_transaction_unverified");

    const [persisted, persistedUsage] = await Promise.all([
      adapters.readTrial(principal.tenantId, trialId),
      adapters.readUsage(principal.tenantId, trialId),
    ]);
    if (persisted?.verifiedServerSide !== true ||
        persisted?.consistentRead !== true ||
        persisted?.tenantId !== principal.tenantId ||
        persisted?.subject !== principal.subject ||
        persisted?.trialId !== trialId ||
        persisted?.trialStart !== prepared.trialStart ||
        persisted?.trialEnd !== prepared.trialEnd ||
        persisted?.status !== "trialing" ||
        persistedUsage?.verifiedServerSide !== true ||
        persistedUsage?.consistentRead !== true ||
        persistedUsage?.tenantId !== principal.tenantId ||
        persistedUsage?.subject !== principal.subject ||
        persistedUsage?.trialId !== trialId ||
        persistedUsage?.trialSearchCount !== 0) {
      return deny("trial_post_commit_verification_missing");
    }

    return Object.freeze({
      committed: true, code: "trial_durably_issued_private",
      grantsCustomerAccess: false, chargesMoney: false,
      trialId, trialStart: prepared.trialStart, trialEnd: prepared.trialEnd,
      requiresApprovedSeatAndCustomerSession: true,
    });
  } catch {
    return deny("trial_private_issuance_unavailable");
  }
}

/**
 * Reserve ONE trial search through the bounded conditional write transaction.
 * This reservation alone never returns medicine data or authorizes a protected
 * API read; source rights, route/seat/session and request-scoped data checks
 * still need independent enforcement.
 */
export async function reserveIntelligenceTrialSearchPrivate({
  adapters, privateTransactionEnabled = false,
  requestId, now = new Date().toISOString(),
} = {}) {
  if (!ready(adapters, REQUIRED_RESERVATION, privateTransactionEnabled)) return deny("private_trial_reservation_disabled");
  if (!requestPattern.test(String(requestId ?? "")) || !utc(now)) return deny("trial_request_or_clock_invalid");
  try {
    const principal = await adapters.readPrincipal();
    if (principal?.verifiedServerSide !== true || principal.mfaVerified !== true ||
        !principal.subject || !principal.tenantId) return deny("verified_principal_required");
    const [grant, release] = await Promise.all([
      adapters.readTrial(principal.tenantId), adapters.readRelease(),
    ]);
    if (release?.privateTrialTransactionEnabled !== true ||
        release?.customerLaunchAccepted !== true ||
        release?.sourceRightsApproved !== true) return deny("private_trial_release_unaccepted");
    const usage = await adapters.readUsage(principal.tenantId, grant?.trialId);
    const prepared = prepareIntelligenceTrialSearchReservation({
      principal, grant, usage, release, now, requestId,
    });
    if (!prepared.prepared) return deny(prepared.code);
    const committed = await adapters.transactWriteItems(prepared.transactItems);
    if (committed?.committed !== true || committed?.verifiedDurable !== true) {
      return deny("trial_search_atomic_commit_not_verified");
    }
    const after = await adapters.readUsage(principal.tenantId, grant.trialId);
    if (after?.verifiedServerSide !== true || after?.consistentRead !== true ||
        after?.tenantId !== principal.tenantId ||
        after?.subject !== principal.subject ||
        after?.trialId !== grant.trialId ||
        !Number.isSafeInteger(after.trialSearchCount) ||
        after.trialSearchCount < usage.trialSearchCount + 1 ||
        after.trialSearchCount > 25) return deny("trial_search_post_commit_verification_missing");
    return Object.freeze({
      committed: true, code: "trial_search_reservation_committed",
      grantsCustomerAccess: false, chargesMoney: false,
      remainingSearches: 25 - after.trialSearchCount,
      requiresSameRequestScopedSourceAuthorisation: true,
    });
  } catch {
    return deny("trial_search_private_reservation_unavailable");
  }
}
