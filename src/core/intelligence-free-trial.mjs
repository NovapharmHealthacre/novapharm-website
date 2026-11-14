/**
 * Default-OFF, source-only NovaPharm Intelligence Starter trial.
 * Callers must supply independently verified PRIVATE identity, tenant, terms,
 * history, trial grant, feature release and cumulative usage ledgers.
 * This module never provisions an account, writes a grant or charges money.
 */
export const intelligenceStarterTrialPolicy = Object.freeze({
  version: 1, plan: "starter", durationDays: 30,
  durationMs: 30 * 86400000, totalSearchLimit: 25,
  paymentMethodRequired: false, automaticPaidConversion: false,
  trialFeatures: Object.freeze(["medicine-search", "medicine-identity", "us-fda-labels"]),
});
const deny = code => Object.freeze({allowed:false,code,effectivePlan:null,remainingSearches:null});
const notEligible = code => Object.freeze({eligible:false,code,createsTrial:false,grantsAccess:false});
const trialIdPattern = /^npi_trial_[A-Za-z0-9_-]{8,80}$/u;
function instant(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u.test(s)) return null;
  const n = Date.parse(s);
  if (!Number.isSafeInteger(n)) return null;
  const canonical = s.replace(/(\.\d{1,3})?Z$/u, (_,f) => (f ? f.padEnd(4,"0") : ".000") + "Z");
  return new Date(n).toISOString() === canonical ? n : null;
}
export function assessIntelligenceTrialEnrollment({principal,tenant,history,terms,release}={}) {
  if (release?.verifiedServerSide !== true || release.freeTrialEnrollmentEnabled !== true ||
      release.freeTrialOperationalBudgetApproved !== true || release.freeTrialAbuseControlsAccepted !== true) {
    return notEligible("trial_enrollment_not_released");
  }
  if (principal?.verifiedServerSide !== true || principal.mfaVerified !== true ||
      principal.identityProvider !== "cognito-oidc" || !principal.tenantId || !principal.subject) {
    return notEligible("trial_identity_not_verified");
  }
  if (tenant?.verifiedServerSide !== true || tenant.tenantId !== principal.tenantId ||
      tenant.ownerSubject !== principal.subject || tenant.ownershipVerified !== true ||
      tenant.status !== "active") return notEligible("trial_organisation_not_verified");
  if (history?.verifiedServerSide !== true || history.tenantId !== principal.tenantId ||
      history.everRedeemed !== false || history.atomicUniquenessEnforced !== true) {
    return notEligible("trial_once_per_organisation_not_verified");
  }
  if (terms?.verifiedServerSide !== true || terms.tenantId !== principal.tenantId ||
      terms.subject !== principal.subject || terms.freeTrialTermsAccepted !== true ||
      terms.noAutomaticPaidConversionAcknowledged !== true) return notEligible("trial_terms_not_accepted");
  return Object.freeze({eligible:true,code:"private_atomic_trial_issuance_required",
    createsTrial:false,grantsAccess:false,durationDays:30,totalSearchLimit:25,
    paymentMethodRequired:false,automaticPaidConversion:false});
}
/**
 * Called only for a separately ledger-verified trial grant. In particular,
 * Stripe's trialing subscription state is NOT a trusted free-trial grant.
 */
export function decideIntelligenceFreeTrialEntitlement({principal,grant,feature,usage,release,now=new Date().toISOString()}={}) {
  if (release?.verifiedServerSide !== true || release.freeTrialAccessEnabled !== true ||
      release.freeTrialOperationalBudgetApproved !== true ||
      release.freeTrialAbuseControlsAccepted !== true) return deny("trial_access_not_released");
  if (principal?.verifiedServerSide !== true || principal.mfaVerified !== true ||
      principal.identityProvider !== "cognito-oidc" || !principal.tenantId || !principal.subject) {
    return deny("trial_identity_not_verified");
  }
  if (grant?.verifiedServerSide !== true || grant.source !== "verified-free-trial-ledger" ||
      grant.issuer !== "npi-private-trial-ledger" || grant.status !== "trialing" ||
      grant.plan !== "starter" || grant.policyVersion !== 1 ||
      grant.contractAccepted !== true || grant.oneTrialPerOrganisationVerified !== true ||
      !trialIdPattern.test(String(grant.trialId ?? "")) ||
      grant.tenantId !== principal.tenantId || grant.subject !== principal.subject) {
    return deny("trial_grant_not_verified");
  }
  const t=instant(now), start=instant(grant.trialStart), end=instant(grant.trialEnd);
  if (t===null || start===null || end===null ||
      end-start !== intelligenceStarterTrialPolicy.durationMs ||
      t<start || t>=end) return deny("trial_not_current");
  if (typeof feature !== "string" ||
      !intelligenceStarterTrialPolicy.trialFeatures.includes(feature)) return deny("feature_not_in_trial");
  if (!Array.isArray(grant.entitledFeatures) || !grant.entitledFeatures.includes(feature)) {
    return deny("feature_not_contractually_granted");
  }
  if (!Array.isArray(release.productionApprovedFeatures) ||
      !release.productionApprovedFeatures.includes(feature)) return deny("feature_not_production_approved");
  if (release.sourceRightsApproved !== true) return deny("source_rights_unapproved");
  if (usage?.verifiedServerSide !== true || usage.tenantId !== principal.tenantId ||
      usage.subject !== principal.subject || usage.trialId !== grant.trialId ||
      !Number.isSafeInteger(usage.trialSearchCount) ||
      usage.trialSearchCount < 0) return deny("trial_usage_not_authoritative");
  const remainingSearches = Math.max(0,25-usage.trialSearchCount);
  // A cumulative trial quota, not a calendar-month quota.
  if (feature === "medicine-search" && remainingSearches === 0) return deny("trial_search_limit_reached");
  return Object.freeze({allowed:true,code:"authorised_trial",
    effectivePlan:"starter",remainingSearches,accessKind:"trial"});
}
