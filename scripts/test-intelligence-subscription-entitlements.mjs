import assert from "node:assert/strict";
import test from "node:test";
import { decideIntelligenceEntitlement, intelligencePlanDefinitions } from "../src/core/intelligence-subscription-entitlements.mjs";

const now = "2026-11-09T12:00:00.000Z";
const principal = Object.freeze({
  verifiedServerSide: true,
  mfaVerified: true,
  identityProvider: "cognito-oidc",
  tenantId: "tenant-owner-1",
  subject: "user-verified-1",
});
const grant = Object.freeze({
  source: "verified-stripe-webhook-ledger",
  webhookSignatureVerified: true,
  contractAccepted: true,
  tenantId: principal.tenantId,
  subject: principal.subject,
  stripeCustomerId: "cus_Synthetic123",
  stripeSubscriptionId: "sub_Synthetic123",
  status: "active",
  plan: "starter",
  periodStart: "2026-11-01T00:00:00.000Z",
  periodEnd: "2026-12-01T00:00:00.000Z",
  entitledFeatures: ["medicine-search", "medicine-identity"],
});
const release = Object.freeze({
  verifiedServerSide: true,
  sourceRightsApproved: true,
  productionApprovedFeatures: ["medicine-search", "medicine-identity"],
});
const usage = Object.freeze({ verifiedServerSide: true, tenantId: principal.tenantId, subject: principal.subject, period: "2026-11", searchCount: 24 });

function request(overrides = {}) {
  return { principal, grant, feature: "medicine-search", release, usage, now, ...overrides };
}
function denied(overrides, code) {
  const result = decideIntelligenceEntitlement(request(overrides));
  assert.equal(result.allowed, false, code);
  assert.equal(result.code, code);
  assert.equal(result.effectivePlan, null);
  assert.equal(result.remainingSearches, null);
}
test("plan catalogue has explicit finite Starter and Professional search ceilings", () => {
  assert.equal(intelligencePlanDefinitions.starter.monthlySearchLimit, 25);
  assert.equal(intelligencePlanDefinitions.professional.monthlySearchLimit, 250);
  assert.equal(intelligencePlanDefinitions.enterprise.monthlySearchLimit, null);
  assert.ok(!intelligencePlanDefinitions.starter.features.includes("nova"));
  assert.ok(!intelligencePlanDefinitions.professional.features.includes("forecasting"));
});

test("grant verifies an exact identity/tenant and a currently paid source-rights-approved feature", () => {
  assert.deepEqual(decideIntelligenceEntitlement(request()), {
    allowed: true, code: "authorised", effectivePlan: "starter", remainingSearches: 1,
  });
});
test("identity must be server-authenticated, from an approved OIDC provider and MFA checked", () => {
  denied({ principal: { ...principal, mfaVerified: false } }, "identity_not_verified");
  denied({ principal: { ...principal, verifiedServerSide: false } }, "identity_not_verified");
  denied({ principal: { ...principal, identityProvider: "untrusted", mfaVerified: true } }, "identity_provider_not_approved");
});
test("cross-tenant or different-subject access remains denied even with a valid paid grant", () => {
  denied({ principal: { ...principal, tenantId: "tenant-attacker-2" } }, "tenant_or_subject_mismatch");
  denied({ principal: { ...principal, subject: "user-attacker-2" } }, "tenant_or_subject_mismatch");
});
test("usage ledger must be independently verified and tenant- and subject-bound", () => {
  denied({ usage: { ...usage, verifiedServerSide: false } }, "usage_not_authoritative");
  denied({ usage: { ...usage, tenantId: "different-tenant" } }, "usage_not_authoritative");
  denied({ usage: { ...usage, subject: "different-user" } }, "usage_not_authoritative");
});

test("untrusted client pricing, unsigned ledger and unaccepted terms cannot confer permissions", () => {
  denied({ grant: { ...grant, webhookSignatureVerified: false } }, "subscription_not_verified");
  denied({ grant: { ...grant, source: "browser-pricing-card" } }, "subscription_not_verified");
  denied({ grant: { ...grant, contractAccepted: false } }, "subscription_not_verified");
  denied({ grant: { ...grant, stripeSubscriptionId: "not-a-subscription" } }, "subscription_not_verified");
});
test("suspended, incomplete, unpaid or expired subscriptions never activate service", () => {
  for (const status of ["past_due", "unpaid", "canceled", "incomplete", "paused", "trialing"]) {
    denied({ grant: { ...grant, status } }, "subscription_not_active");
  }
  denied({ now: "2026-12-01T00:00:00.000Z", usage: { ...usage, period: "2026-12", searchCount: 0 } }, "billing_period_not_current");
  denied({ now: "2026-10-31T23:59:59.000Z" }, "billing_period_not_current");
});
test("production feature status, source rights and contractual grants all separately gate access", () => {
  denied({ grant: { ...grant, entitledFeatures: [] } }, "feature_not_contractually_granted");
  denied({ release: { ...release, verifiedServerSide: false } }, "feature_not_production_approved");
  denied({ release: { ...release, productionApprovedFeatures: [] } }, "feature_not_production_approved");
  denied({ release: { ...release, sourceRightsApproved: false } }, "source_rights_unapproved");
  denied({ feature: "nova" }, "feature_not_in_plan");
});
test("monthly quota is fail-closed, and non-search features still show remaining usage", () => {
  denied({ usage: { ...usage, period: "2026-11", searchCount: 25 } }, "monthly_search_limit_reached");
  denied({ usage: { ...usage, period: "2026-10", searchCount: 0 } }, "usage_period_not_current");
  denied({ usage: { ...usage, period: "2026-11", searchCount: -1 } }, "usage_not_authoritative");
  const allowed = decideIntelligenceEntitlement(request({
    feature: "medicine-identity", usage: { ...usage, period: "2026-11", searchCount: 25 },
  }));
  assert.equal(allowed.allowed, true);
  assert.equal(allowed.remainingSearches, 0);
});
test("Professional has own bounded entitlement; Enterprise requires explicit signed quota", () => {
  const pro = decideIntelligenceEntitlement(request({
    grant: { ...grant, plan: "professional" },
    usage: { ...usage, period: "2026-11", searchCount: 249 },
  }));
  assert.equal(pro.allowed, true);
  assert.equal(pro.remainingSearches, 1);
  const enterprise = { ...grant, plan: "enterprise", monthlySearchLimit: 123 };
  const enterpriseAllowed = decideIntelligenceEntitlement(request({
    grant: enterprise, usage: { ...usage, period: "2026-11", searchCount: 122 },
  }));
  assert.equal(enterpriseAllowed.allowed, true);
  assert.equal(enterpriseAllowed.remainingSearches, 1);
  denied({ grant: { ...enterprise, monthlySearchLimit: null } }, "enterprise_quota_not_contracted");
  denied({ grant: { ...enterprise, monthlySearchLimit: Number.MAX_SAFE_INTEGER + 1 } }, "enterprise_quota_not_contracted");
});
test("all incomplete inputs deny access without exposing billing or identity values", () => {
  const result = decideIntelligenceEntitlement({});
  assert.equal(result.allowed, false);
  assert.equal(JSON.stringify(result).includes("stripe"), false);
  assert.equal(JSON.stringify(result).includes("tenant-owner-1"), false);
});
