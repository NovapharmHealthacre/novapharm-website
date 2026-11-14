/**
 * Static engineering safety contract for the owner's 14 November 2026 decision.
 *
 * This is a CI / planning validation only. It is NOT an AWS IAM policy, a
 * credentialed release authorizer, a licence, an entitlement, a cost-control
 * service, a deployment permission, or a source-rights approval. Production
 * changes require separately verified signed change and finance approvals.
 */
const EXPECTED_FLAGS = Object.freeze([
  "provisionNewPaidInfrastructure",
  "purchaseVendorLicenses",
  "activateNativePalantir",
  "activateNativePrisma",
  "activateNativeBloomberg",
  "admitUnapprovedMedicineData",
  "enableCustomerSubscriptions",
  "enableCustomerBilling",
  "sendExternalEmail",
  "activatePublicCustomerAccess",
  "cutOverPortalDnsOrApiMapping"
]);

const ENGINEERING_SCOPE = Object.freeze([
  "repository_changes",
  "code_review_and_ci",
  "unit_and_isolated_security_tests",
  "read_only_inventory_and_verification",
  "source_rights_and_security_documentation",
  "reversible_nonproduction_design"
]);

function fail() {
  return Object.assign(
    new Error("NovaPharm production constraints require independent approval."),
    { code: "intelligence_owner_constraints_denied", statusCode: 403 }
  );
}

function exactly(object, fields) {
  return object !== null && typeof object === "object" &&
    !Array.isArray(object) &&
    Object.keys(object).length === fields.length &&
    Object.keys(object).every(key => fields.includes(key)) &&
    fields.every(key => Object.hasOwn(object, key));
}

export function validateOwnerProductionConstraints(policy) {
  if (!exactly(policy, [
    "contract", "decisionDate", "vendorStrategy",
    "enterpriseVendorAccounts", "initialInfrastructureBudget",
    "engineeringTarget", "productionPermissions",
    "acceptedEngineeringScope", "productionSignoff"
  ])) throw fail();

  if (
    policy.contract !== "novapharm.intelligence.owner-constraints.v1" ||
    policy.decisionDate !== "2026-11-14" ||
    policy.vendorStrategy !== "vendor_neutral_only" ||
    policy.enterpriseVendorAccounts !== "none" ||
    policy.engineeringTarget !== "private_read_only_pilot" ||
    policy.productionSignoff !== "not_granted"
  ) throw fail();

  // The owner permits existing subscriptions only, capped at GBP 0
  // additional monthly spend. This authorises no new metered usage or
  // public production activation and is not an AWS cost guarantee.
  if (!exactly(policy.initialInfrastructureBudget, [
    "status", "monthlyCapGbp", "existingSubscriptionsOnly",
    "newChargeableResourceProvisioning"
  ]) ||
    policy.initialInfrastructureBudget.status !== "zero_additional_spend_only" ||
    policy.initialInfrastructureBudget.monthlyCapGbp !== 0 ||
    policy.initialInfrastructureBudget.existingSubscriptionsOnly !== true ||
    policy.initialInfrastructureBudget.newChargeableResourceProvisioning !== false
  ) throw fail();

  if (!exactly(policy.productionPermissions, EXPECTED_FLAGS) ||
    EXPECTED_FLAGS.some(key => policy.productionPermissions[key] !== false)
  ) throw fail();

  const scope = policy.acceptedEngineeringScope;
  if (!Array.isArray(scope) || scope.length !== ENGINEERING_SCOPE.length ||
    new Set(scope).size !== ENGINEERING_SCOPE.length ||
    !scope.every(item => ENGINEERING_SCOPE.includes(item))
  ) throw fail();

  return Object.freeze({
    contract: "novapharm.intelligence.owner-release-assessment.v1",
    decisionDate: policy.decisionDate,
    vendorMode: "vendor_neutral_only",
    nextMilestone: "private_read_only_pilot",
    engineeringMayContinueWithinListedScope: true,
    budgetApproved: false,
    additionalMonthlyCapGbp: 0,
    existingSubscriptionsOnly: true,
    independentlyProvenZeroIncrementalCostRequired: true,
    nativeVendorConnectionApproved: false,
    licensedDataAdmissionApproved: false,
    productionDeploymentApproved: false,
    publicCustomerReleaseApproved: false,
    procurementApproved: false,
    requiresIndependentFinancialLegalSecurityAndReleaseProof: true,
    blockedOperations: Object.freeze([...EXPECTED_FLAGS])
  });
}

export const prohibitedOperationsUntilApproved = EXPECTED_FLAGS;
