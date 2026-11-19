/**
 * Explicitly NOT a payment gateway or a production entitlement store.
 *
 * Server-only decision boundary for a future Stripe-Billing-backed Intelligence
 * customer session. Every provided principal, billing grant, source permission,
 * and release switch MUST be loaded from independently verified server state.
 * Never populate these objects from request JSON, pricing DOM or query strings.
 */
import { decideIntelligenceFreeTrialEntitlement } from "./intelligence-free-trial.mjs";

const PLAN_DEFINITIONS = Object.freeze({
  starter: Object.freeze({
    monthlySearchLimit: 25,
    features: Object.freeze(["medicine-search", "medicine-identity", "us-fda-labels"]),
  }),
  professional: Object.freeze({
    monthlySearchLimit: 250,
    features: Object.freeze(["medicine-search", "medicine-identity", "us-fda-labels", "observed-market", "geography"]),
  }),
  enterprise: Object.freeze({
    monthlySearchLimit: null, // Explicit signed-contract quota required, never unlimited by default.
    features: Object.freeze(["medicine-search", "medicine-identity", "us-fda-labels", "observed-market", "geography", "evidence", "reports", "watchlists", "nova", "forecasting", "tenders", "biotech", "capital"]),
  }),
});

export const intelligencePlanDefinitions = PLAN_DEFINITIONS;

function deny(code) {
  return Object.freeze({ allowed: false, code, effectivePlan: null, remainingSearches: null });
}

function monthKey(value) {
  if (typeof value !== "string" || !/^\d{4}-(?:0[1-9]|1[0-2])$/u.test(value)) return null;
  return value;
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u.test(value)) return null;
  const n = Date.parse(value);
  if (!Number.isFinite(n)) return null;
  // Date.parse can normalise impossible UTC dates (e.g. November 31) into
  // the following month. Billing grants must match the claimed instant exactly.
  const canonical = value.replace(/(\.\d{1,3})?Z$/u, (_, fraction) =>
    `${fraction ? fraction.padEnd(4, "0") : ".000"}Z`);
  return new Date(n).toISOString() === canonical ? n : null;
}

/**
 * Return a pure, redacted access decision. This function neither verifies
 * Stripe signatures nor trusts client-provided billing status: callers MUST
 * hydrate the signed-webhook-backed ledger and authoritative OIDC session.
 */
export function decideIntelligenceEntitlement({ principal, grant, feature, usage, release, now = new Date().toISOString() } = {}) {
  if (!principal?.verifiedServerSide || principal.mfaVerified !== true || !principal.tenantId || !principal.subject) return deny("identity_not_verified");
  if (!["cognito-oidc", "entra-oidc"].includes(principal.identityProvider)) return deny("identity_provider_not_approved");
  if (typeof principal.tenantId !== "string" || typeof principal.subject !== "string") return deny("invalid_identity");
  // A no-card offer is a separately verified, never-auto-billed grant.
  // Missing release flags fail closed; paid Stripe subscriptions retain the original path.
  if (grant?.source === "verified-free-trial-ledger") {
    return decideIntelligenceFreeTrialEntitlement({ principal, grant, feature, usage, release, now });
  }
  if (!grant || grant.source !== "verified-stripe-webhook-ledger" || grant.webhookSignatureVerified !== true || grant.contractAccepted !== true) return deny("subscription_not_verified");
  if (grant.tenantId !== principal.tenantId || grant.subject !== principal.subject) return deny("tenant_or_subject_mismatch");
  if (typeof grant.stripeCustomerId !== "string" || !/^cus_[a-zA-Z0-9]{6,}$/u.test(grant.stripeCustomerId)) return deny("billing_account_not_verified");
  if (typeof grant.stripeSubscriptionId !== "string" || !/^sub_[a-zA-Z0-9]{6,}$/u.test(grant.stripeSubscriptionId)) return deny("subscription_not_verified");
  if (grant.status !== "active") return deny("subscription_not_active");

  const referenceTime = validDate(now);
  const from = validDate(grant.periodStart);
  const to = validDate(grant.periodEnd);
  if (referenceTime === null || from === null || to === null || from >= to || referenceTime < from || referenceTime >= to) return deny("billing_period_not_current");

  const plan = Object.hasOwn(PLAN_DEFINITIONS, grant.plan) ? grant.plan : null;
  if (!plan) return deny("plan_not_recognised");
  const definition = PLAN_DEFINITIONS[plan];
  if (typeof feature !== "string" || !definition.features.includes(feature)) return deny("feature_not_in_plan");
  if (!Array.isArray(grant.entitledFeatures) || !grant.entitledFeatures.includes(feature)) return deny("feature_not_contractually_granted");
  if (!release || release.verifiedServerSide !== true || !Array.isArray(release.productionApprovedFeatures) || !release.productionApprovedFeatures.includes(feature)) return deny("feature_not_production_approved");

  if (typeof release.sourceRightsApproved !== "boolean" || release.sourceRightsApproved !== true) return deny("source_rights_unapproved");
  if (usage?.verifiedServerSide !== true || usage.tenantId !== principal.tenantId || usage.subject !== principal.subject) return deny("usage_not_authoritative");
  if (typeof usage?.period !== "string" || !monthKey(usage.period) || usage.period !== now.slice(0, 7)) return deny("usage_period_not_current");
  if (!Number.isSafeInteger(usage.searchCount) || usage.searchCount < 0) return deny("usage_not_authoritative");

  let limit = definition.monthlySearchLimit;
  if (plan === "enterprise") {
    if (!Number.isSafeInteger(grant.monthlySearchLimit) || grant.monthlySearchLimit <= 0) return deny("enterprise_quota_not_contracted");
    limit = grant.monthlySearchLimit;
  }
  if (!Number.isSafeInteger(limit) || limit <= 0) return deny("plan_quota_unavailable");
  const remainingSearches = Math.max(0, limit - usage.searchCount);
  if (feature === "medicine-search" && remainingSearches === 0) return deny("monthly_search_limit_reached");

  return Object.freeze({
    allowed: true,
    code: "authorised",
    effectivePlan: plan,
    remainingSearches,
  });
}
