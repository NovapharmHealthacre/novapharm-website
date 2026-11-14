import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  validateOwnerProductionConstraints,
  prohibitedOperationsUntilApproved
} from "../src/core/intelligence-owner-production-constraints.mjs";

const policy = JSON.parse(readFileSync(
  new URL("../config/intelligence/owner-production-constraints.json", import.meta.url), "utf8"
));
const denial = { code: "intelligence_owner_constraints_denied", statusCode: 403 };
const copy = () => structuredClone(policy);

test("owner's exact vendor-neutral, zero incremental spend decision is preserved", () => {
  const decision = validateOwnerProductionConstraints(copy());
  assert.equal(decision.vendorMode, "vendor_neutral_only");
  assert.equal(decision.engineeringMayContinueWithinListedScope, true);
  assert.equal(decision.nextMilestone, "private_read_only_pilot");
  assert.equal(decision.additionalMonthlyCapGbp, 0);
  assert.equal(decision.existingSubscriptionsOnly, true);
  assert.equal(decision.independentlyProvenZeroIncrementalCostRequired, true);
  for (const key of [
    "budgetApproved", "nativeVendorConnectionApproved",
    "licensedDataAdmissionApproved", "productionDeploymentApproved",
    "publicCustomerReleaseApproved", "procurementApproved"
  ]) assert.equal(decision[key], false, key);
  assert.equal(decision.requiresIndependentFinancialLegalSecurityAndReleaseProof, true);
  assert.deepEqual(decision.blockedOperations, prohibitedOperationsUntilApproved);
  assert.ok(Object.isFrozen(decision));
});

test("no unapproved operational permission may be enabled by changing config", () => {
  for (const key of prohibitedOperationsUntilApproved) {
    const candidate = copy();
    candidate.productionPermissions[key] = true;
    assert.throws(() => validateOwnerProductionConstraints(candidate), denial, key);
  }
});

test("no imaginary budget cap, vendor account, signoff or release status is accepted", () => {
  const mutations = [
    p => { p.initialInfrastructureBudget.monthlyCapGbp = 0.01; },
    p => { p.initialInfrastructureBudget.monthlyCapGbp = null; },
    p => { p.initialInfrastructureBudget.status = "approved"; },
    p => { p.initialInfrastructureBudget.existingSubscriptionsOnly = false; },
    p => { p.initialInfrastructureBudget.newChargeableResourceProvisioning = true; },
    p => { p.vendorStrategy = "native_vendor"; },
    p => { p.enterpriseVendorAccounts = "configured"; },
    p => { p.productionSignoff = "approved"; },
    p => { p.engineeringTarget = "public_customer_release"; },
    p => { p.decisionDate = "not-a-date"; }
  ];
  for (const mutate of mutations) {
    const candidate = copy();
    mutate(candidate);
    assert.throws(() => validateOwnerProductionConstraints(candidate), denial);
  }
});

test("extra fields, missing flags, broad engineering scopes and malformed inputs deny", () => {
  const cases = [
    null, undefined, [], false, { ...copy(), budgetApproved: true }
  ];
  const missing = copy();
  delete missing.productionPermissions.activateNativeBloomberg;
  cases.push(missing);
  const newFlag = copy();
  newFlag.productionPermissions.allowUnsafeDeployment = true;
  cases.push(newFlag);
  const broad = copy();
  broad.acceptedEngineeringScope.push("public_customer_deployment");
  cases.push(broad);
  const duplicate = copy();
  duplicate.acceptedEngineeringScope[0] = duplicate.acceptedEngineeringScope[1];
  cases.push(duplicate);
  for (const candidate of cases) {
    assert.throws(() => validateOwnerProductionConstraints(candidate), denial);
  }
});

test("AWS dedicated production ingress remains default-off in source control", () => {
  const cf = JSON.parse(readFileSync(
    new URL("../infra/aws/intelligence-dedicated-ingress-candidate.json", import.meta.url), "utf8"
  ));
  assert.equal(cf.Parameters.ActivationApproval.Default, "BLOCKED");
  assert.equal(cf.Parameters.PrivateEgressAcceptance.Default, "BLOCKED");
  assert.ok(cf.Conditions.ActivateAfterApproval);
});

test("safety policy cannot be misrepresented as production deployment authorization", () => {
  const decision = validateOwnerProductionConstraints(copy());
  assert.equal(decision.productionDeploymentApproved, false);
  assert.equal(decision.publicCustomerReleaseApproved, false);
  assert.equal(decision.licensedDataAdmissionApproved, false);
  assert.equal(decision.procurementApproved, false);
});
