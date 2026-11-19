import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  assessExistingServiceChange,
  prohibitedPortalOperationsUntilAccepted,
  validatePortalZeroIncrementalPlan
} from "../src/core/portal-owner-zero-spend.mjs";

const policy = JSON.parse(readFileSync(new URL(
  "../config/portal/owner-zero-incremental-release.json", import.meta.url
), "utf8"));
const clone = () => structuredClone(policy);
const denied = { code: "portal_zero_spend_guard_denied", statusCode: 403 };

test("owner explicitly authorises £0 incremental spend, not free unlimited AWS usage", () => {
  const result = validatePortalZeroIncrementalPlan(clone());
  assert.equal(result.acceptedAdditionalMonthlyCapGbp, 0);
  assert.equal(result.existingServicesOnly, true);
  assert.equal(result.requiresIndependentCostEvidence, true);
  assert.equal(result.publicCutoverAuthorised, false);
  assert.equal(result.newBillingOrPaidServicesAuthorised, false);
  assert.equal(result.businessOrderOrPaymentActivationAuthorised, false);
  assert.equal(result.crossTenantOrRoleElevationAuthorised, false);
  assert.equal(result.currentReleaseStatus, "private_candidate_only");
  assert.ok(Object.isFrozen(result));
});

test("any cost increase, unapproved release or permission relaxation fails closed", () => {
  const edits = [
    obj => { obj.additionalMonthlyCap = 1; },
    obj => { obj.additionalMonthlyCap = 0.01; },
    obj => { obj.additionalMonthlyCap = "0"; },
    obj => { obj.additionalMonthlyCap = null; },
    obj => { obj.currency = "USD"; },
    obj => { obj.costGuarantee = "guaranteed_free"; },
    obj => { obj.infrastructureMode = "create_paid_ecs"; },
    obj => { obj.productionSignoff = "approved"; },
    obj => { obj.acceptance.customerExistingIdentityLink = "verified"; },
    obj => { obj.acceptance.publicIngressWithoutIncrementalCost = "verified"; },
    obj => { obj.permittedEngineering.push("public_domain_cutover"); },
    obj => { obj.permittedEngineering[0] = obj.permittedEngineering[1]; },
    obj => { obj.unapprovedExtraField = true; },
  ];
  for (const edit of edits) {
    const changed = clone();
    edit(changed);
    assert.throws(() => validatePortalZeroIncrementalPlan(changed), denied);
  }
});

test("every provision, privilege, external message and paid action remains prohibited", () => {
  for (const key of prohibitedPortalOperationsUntilAccepted) {
    const changed = clone();
    changed.prohibitedOperations[key] = false;
    assert.throws(() => validatePortalZeroIncrementalPlan(changed), denied, key);
  }
});

test("unverified, fractional, negative or claimed-free spend can never unlock a deployment", () => {
  const complete = {
    existingService: true,
    estimatedAdditionalMonthlyGbp: 0,
    noNewRecurringResources: true,
    freeTierAndQuotaChecked: true,
    costEvidenceReviewed: true
  };
  assert.deepEqual(assessExistingServiceChange(clone()), {
    reviewable: false, executable: false, reason: "independent_cost_proof_missing"
  });
  for (const edit of [
    { existingService: false },
    { estimatedAdditionalMonthlyGbp: 0.01 },
    { estimatedAdditionalMonthlyGbp: -1 },
    { estimatedAdditionalMonthlyGbp: "0" },
    { estimatedAdditionalMonthlyGbp: null },
    { noNewRecurringResources: false },
    { freeTierAndQuotaChecked: false },
    { costEvidenceReviewed: false },
  ]) {
    const result = assessExistingServiceChange(clone(), { ...complete, ...edit });
    assert.equal(result.reviewable, false);
    assert.equal(result.executable, false);
  }
  const reviewed = assessExistingServiceChange(clone(), complete);
  assert.equal(reviewed.reviewable, true);
  assert.equal(reviewed.executable, false);
  assert.equal(reviewed.reason, "production_identity_and_release_gates_pending");
});

test("unknown or incomplete evidence is not an operational authorisation", () => {
  const bad = [
    null, false, {}, [], { existingService: true },
    { existingService: true, estimatedAdditionalMonthlyGbp: 0,
      noNewRecurringResources: true, freeTierAndQuotaChecked: true,
      costEvidenceReviewed: true, liveReleaseApproved: true }
  ];
  for (const evidence of bad) {
    const result = assessExistingServiceChange(clone(), evidence);
    assert.equal(result.reviewable, false);
    assert.equal(result.executable, false);
  }
});
