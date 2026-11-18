import assert from "node:assert/strict";
import { test } from "node:test";
import { assessIntelligenceEnterpriseReadiness as assess } from "../src/core/intelligence-enterprise-readiness.mjs";

const candidate = (country = "India", key = "in-india-test") => ({
  candidateKey: key, country, rightsStatus: "not-reviewed", integrationStatus: "candidate-only",
  authorityVerification: "pending", termsReview: "pending", verifiedOn: null,
  licenceEvidenceId: null, allowedUses: [], dataAdmission: "not-admitted", activeAdapterId: null
});
const payload = (sources = [candidate()]) => ({
  registry: { schema: "novapharm.intelligence.global-source-candidates.v2", sources },
  constraints: { productionSignoff: "not_granted", initialInfrastructureBudget: {monthlyCapGbp: 0},
    productionPermissions: { activatePublicCustomerAccess: false, provisionNewPaidInfrastructure: false } },
  modelRegistry: { models: [{ id: "research-only" }] }
});

test("source counts are not inferred as 101 covered countries", () => {
  const report = assess(payload([candidate("India"), candidate("India", "in-india-alt"), candidate("Global", "global-trials")]));
  assert.equal(report.metrics.sourceCandidateCount, 3);
  assert.equal(report.metrics.distinctCountryLabelsIncludingGlobal, 2);
  assert.equal(report.metrics.distinctNamedCountries, 1);
  assert.equal(report.countryRows.find(x => x.country === "Global").type, "cross-border-source-label");
  assert.equal(report.countryRows.find(x => x.country === "India").candidates, 2);
  assert.equal(report.completionPercent, null);
  assert.equal(report.enterpriseReady, false);
});

test("source metadata alone can never certify live rights or customer readiness", () => {
  const p = payload();
  Object.assign(p.registry.sources[0], { rightsStatus: "approved", authorityVerification: "verified",
    termsReview: "approved", verifiedOn: "2026-11-18", licenceEvidenceId: "rights-internal-candidate",
    allowedUses: ["commercial-internal"], integrationStatus: "production", dataAdmission: "admitted", activeAdapterId: "test-adapter" });
  p.constraints.productionSignoff = "granted";
  p.constraints.productionPermissions.activatePublicCustomerAccess = true;
  const report = assess(p);
  assert.equal(report.metrics.sourcesRightsDeclaredReviewed, 1);
  assert.equal(report.metrics.sourceProductionIntegrationsDeclared, 1);
  assert.equal(report.metrics.contradictoryClaims, 0);
  assert.equal(report.countryRows[0].enterpriseCoverageVerified, false);
  assert.equal(report.enterpriseReady, false);
  assert.ok(report.blockers.includes("INDEPENDENT_DATA_RIGHTS_AND_OPERATIONAL_EVIDENCE_NOT_VERIFIED"));
});

test("inconsistent production claims trigger explicit contradiction", () => {
  const p = payload();
  Object.assign(p.registry.sources[0], { integrationStatus: "production", dataAdmission: "admitted", activeAdapterId: "test" });
  const report = assess(p);
  assert.equal(report.metrics.contradictoryClaims, 1);
  assert.ok(report.blockers.includes("INCONSISTENT_SOURCE_PRODUCTION_CLAIMS"));
  assert.equal(report.metrics.sourceProductionIntegrationsDeclared, 1);
  assert.equal(report.metrics.sourcesRightsDeclaredReviewed, 0);
});

test("malformed source keys, duplicate identities and absent owner policy fail closed", () => {
  assert.throws(() => assess(payload([candidate(), candidate()])), /duplicate/);
  assert.throws(() => assess(payload([candidate("India", "unsafe/key")])), /Malformed/);
  const p = payload(); delete p.constraints.productionPermissions;
  assert.throws(() => assess(p), /constraints/);
  assert.throws(() => assess({ ...payload(), modelRegistry: {} }), /model/);
});

test("zero budget with permitted paid provisioning is a policy conflict", () => {
  const p = payload(); p.constraints.productionPermissions.provisionNewPaidInfrastructure = true;
  assert.ok(assess(p).blockers.includes("INFRASTRUCTURE_SPEND_POLICY_CONFLICT"));
});
