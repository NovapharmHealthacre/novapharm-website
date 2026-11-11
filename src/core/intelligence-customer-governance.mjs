/**
 * NovaPharm Intelligence server-only, fail-closed customer authorisation.
 *
 * This is a pure adapter boundary, NOT an API route, DB connection, login
 * service, Stripe webhook consumer or authorisation to launch customers.
 *
 * Each adapter MUST be implemented by the private runtime using independently
 * authenticated/verified authoritative records. Browser input, Cognito email,
 * Stripe metadata and a cookie alone are never sufficient evidence.
 *
 * commitAuthorisation MUST be a single atomic, revocation-fenced operation that
 * rechecks session/owner/contract/source-rights revisions and writes the
 * redacted audit event and quota reservation with majority durability.
 * An M0 preview or a callback that merely returns success must not be used to
 * assert production acceptance. No fallback or partial grant is permitted.
 */
import { createHash } from "node:crypto";
import { intelligenceCustomerOidc } from "./intelligence-customer-oidc.mjs";
import { decideIntelligenceEntitlement } from "./intelligence-subscription-entitlements.mjs";

const token = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u;
const medicine = /^medicine-[a-f0-9]{32}$/u;
const sourceVersion = /^[A-Za-z0-9][A-Za-z0-9._:/-]{1,127}$/u;
const revision = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u;
const allowedFeatures = new Set([
  "medicine-search", "medicine-identity", "us-fda-labels",
  "observed-market", "geography", "evidence", "reports",
  "watchlists", "nova", "forecasting", "tenders", "biotech", "capital",
]);
const purposeByFeature = Object.freeze({
  "medicine-search": "customer_medicine_search",
  "medicine-identity": "customer_medicine_identity",
  "us-fda-labels": "customer_regulatory_research",
  "observed-market": "customer_market_analysis",
  geography: "customer_geography",
  evidence: "customer_evidence",
  reports: "customer_reports",
  watchlists: "customer_watchlists",
  nova: "customer_ai_inference",
  forecasting: "customer_forecasting",
  tenders: "customer_tenders",
  biotech: "customer_biotech",
  capital: "customer_capital",
});
const requiredAdapters = Object.freeze([
  "loadSession", "loadOwner", "loadSubscription", "loadUsage",
  "loadSourceGrant", "commitAuthorisation",
]);

function deny(code) {
  return Object.freeze({
    contract: "novapharm.intelligence.customer-governance.v1",
    allowed: false, code, effectivePlan: null, remainingSearches: null,
    customerDataReturned: false,
  });
}
function valid(value, regex) {
  return typeof value === "string" && regex.test(value);
}
function utc(raw) {
  if (typeof raw !== "string" ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/u.test(raw)) return null;
  const t = Date.parse(raw);
  return Number.isFinite(t) && new Date(t).toISOString() === raw ? t : null;
}
function fingerprint(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function sourceList(input, tenantId) {
  if (!input || input.verifiedServerSide !== true ||
    input.tenantId !== tenantId ||
    !valid(input.medicineId, medicine) || !Array.isArray(input.sources) ||
    input.sources.length === 0 || input.sources.length > 12) return null;
  const seen = new Set();
  const out = [];
  for (const item of input.sources) {
    if (!item || !valid(item.sourceId, token) ||
      !valid(item.sourceVersion, sourceVersion)) return null;
    const key = JSON.stringify([item.sourceId, item.sourceVersion]);
    if (seen.has(key)) return null;
    seen.add(key);
    out.push(Object.freeze({ sourceId: item.sourceId, sourceVersion: item.sourceVersion }));
  }
  return Object.freeze(out);
}

/**
 * Returns only a redacted permit/deny decision; never customer/medicine rows.
 *
 * This function verifies the *independent* domain invariants in addition to
 * the existing Stripe-backed entitlement policy. It refuses access unless an
 * atomically fenced majority-acknowledged commit confirms all of those
 * invariants still hold at use time. In-memory test adapters cannot substitute
 * for a real MongoDB transaction in live service.
 */
export async function authorizeIntelligenceCustomer({
  identity, sessionId, resource, feature, release,
  now = new Date().toISOString(), adapters,
} = {}) {
  if (identity?.identityVerified !== true ||
    identity.verifiedIssuer !== intelligenceCustomerOidc.issuer ||
    !valid(identity.verifiedCognitoSubject, token) ||
    identity.grantsTenantAccess !== false ||
    !valid(sessionId, token)) return deny("identity_only_or_invalid");
  if (!allowedFeatures.has(feature)) return deny("feature_unrecognised");
  if (utc(now) === null) return deny("invalid_authority_clock");
  if (!adapters || requiredAdapters.some(name => typeof adapters[name] !== "function")) {
    return deny("authoritative_ledger_unavailable");
  }
  if (release?.verifiedServerSide !== true ||
    release?.customerLaunchAccepted !== true ||
    release?.atomicAuthorityCommitApproved !== true ||
    release?.sourceRightsApproved !== true ||
    !Array.isArray(release.productionApprovedFeatures) ||
    !release.productionApprovedFeatures.includes(feature)) {
    return deny("customer_release_not_approved");
  }

  try {
    const subject = identity.verifiedCognitoSubject;
    const session = await adapters.loadSession({ subject, sessionId });
    if (session?.verifiedServerSide !== true ||
      session.subject !== subject || session.sessionId !== sessionId ||
      session.identityProvider !== "cognito-oidc" ||
      session.mfaVerified !== true ||
      session.status !== "active" || session.revokedAt != null ||
      !valid(session.tenantId, token) ||
      !valid(session.revision, revision) ||
      utc(session.expiresAt) === null || utc(session.expiresAt) <= utc(now)) {
      return deny("live_mfa_session_not_verified");
    }

    const owner = await adapters.loadOwner({ tenantId: session.tenantId, subject });
    if (owner?.verifiedServerSide !== true ||
      owner.tenantId !== session.tenantId || owner.subject !== subject ||
      owner.status !== "active" || owner.revokedAt != null ||
      owner.seatAccepted !== true ||
      !valid(owner.revision, revision)) return deny("customer_ownership_unverified");

    const sources = sourceList(resource, session.tenantId);
    if (!sources) return deny("resource_tenant_or_source_invalid");

    const grant = await adapters.loadSubscription({ tenantId: session.tenantId, subject });
    if (!grant || !valid(grant.revision, revision) ||
      grant.tenantId !== session.tenantId || grant.subject !== subject ||
      owner.stripeCustomerId !== grant.stripeCustomerId) {
      return deny("durable_billing_ownership_unverified");
    }
    const usage = await adapters.loadUsage({
      tenantId: session.tenantId, subject, period: now.slice(0, 7),
    });
    const entitlement = decideIntelligenceEntitlement({
      principal: {
        verifiedServerSide: true,
        mfaVerified: session.mfaVerified,
        tenantId: session.tenantId,
        subject,
        identityProvider: "cognito-oidc",
      },
      grant, feature, usage, release, now,
    });
    if (!entitlement.allowed) return deny(entitlement.code);

    const rightsRevisions = [];
    for (const source of sources) {
      const rights = await adapters.loadSourceGrant({
        tenantId: session.tenantId, ...source,
        purpose: purposeByFeature[feature],
      });
      if (rights?.verifiedServerSide !== true ||
        rights.tenantId !== session.tenantId ||
        rights.sourceId !== source.sourceId ||
        rights.sourceVersion !== source.sourceVersion ||
        rights.status !== "active" ||
        rights.revokedAt != null ||
        rights.patientDataAllowed === true ||
        !Array.isArray(rights.allowedPurposes) ||
        !rights.allowedPurposes.includes(purposeByFeature[feature]) ||
        !valid(rights.revision, revision) ||
        utc(rights.validFrom) === null ||
        utc(rights.validFrom) > utc(now) ||
        (rights.validUntil !== null &&
          (utc(rights.validUntil) === null || utc(rights.validUntil) <= utc(now)))) {
        return deny("medicine_source_rights_unverified");
      }
      rightsRevisions.push(Object.freeze({
        sourceId: source.sourceId,
        sourceVersion: source.sourceVersion,
        revision: rights.revision,
      }));
    }

    const scopeDigest = fingerprint({
      tenantId: session.tenantId, medicineId: resource.medicineId,
      sources: rightsRevisions, feature,
    });
    const commit = await adapters.commitAuthorisation({
      tenantId: session.tenantId, subject, sessionId,
      sessionRevision: session.revision,
      ownershipRevision: owner.revision,
      subscriptionRevision: grant.revision,
      sourceRightsRevisions: Object.freeze(rightsRevisions),
      feature, month: now.slice(0, 7),
      expectedUsageCount: usage.searchCount,
      requiresQuotaReservation: feature === "medicine-search",
      scopeDigest, observedAt: now,
      // Implementation MUST use a real serialisable/transactional
      // revocation check, quota reservation, and majority audit before success.
    });
    if (commit?.committed !== true ||
      commit.revocationFenceVerified !== true ||
      commit.majorityAcknowledged !== true ||
      commit.auditRecorded !== true ||
      commit.tenantId !== session.tenantId ||
      commit.subject !== subject ||
      commit.scopeDigest !== scopeDigest ||
      (feature === "medicine-search" && commit.quotaReserved !== true)) {
      return deny("atomic_authorisation_commit_unverified");
    }

    return Object.freeze({
      contract: "novapharm.intelligence.customer-governance.v1",
      allowed: true, code: "authorised",
      effectivePlan: entitlement.effectivePlan,
      remainingSearches: feature === "medicine-search"
        ? entitlement.remainingSearches - 1
        : entitlement.remainingSearches,
      customerDataReturned: false,
      scopeDigest,
      // This permit is narrowly scoped to this checked medicine and sources;
      // a protected API must still enforce it before reading any evidence.
      requiresSameRequestScopedDataAccess: true,
    });
  } catch {
    // Never return private adapter, database or identity error content.
    return deny("authoritative_ledger_unavailable");
  }
}
