/**
 * Zero-incremental-spend guard for the owner-approved NovaPharm portal plan.
 * This is source/CI release policy, not AWS IAM, an invoice calculation,
 * or a token granting production deployment authority.
 */
const ACCEPTED_WORK = Object.freeze([
  "read_only_cloud_inventory",
  "repository_work_and_ci",
  "isolated_security_testing",
  "reuse_existing_free_tier_without_upgrade",
  "nonproduction_no_ingress_design"
]);

const FORBIDDEN_CHANGES = Object.freeze([
  "createNewRecurringPaidResources",
  "increaseReservedCompute",
  "createPaidLoadBalancersOrNat",
  "upgradeAtlasFromFree",
  "addPaidMonitoringOrBackups",
  "activatePublicDomainCutover",
  "activateOrdersOrPayments",
  "grantUnverifiedTenantOrRoleAccess",
  "sendExternalMessages"
]);

const RELEASE_PROOFS = Object.freeze([
  "persistentTenantSessionBackend",
  "customerExistingIdentityLink",
  "employeeBoardMfaAndRbac",
  "customer18ModuleDataAuthority",
  "stockRightsTaxAndOrderAcceptance",
  "publicIngressWithoutIncrementalCost",
  "exactShaProductionSecurityAndRollback"
]);

function exact(value, keys) {
  return value !== null && typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    Object.keys(value).every(key => keys.includes(key)) &&
    keys.every(key => Object.hasOwn(value, key));
}

function deny() {
  return Object.assign(new Error("NovaPharm £0 additional-spend and production release restrictions are in force."), {
    code: "portal_zero_spend_guard_denied",
    statusCode: 403
  });
}

export function validatePortalZeroIncrementalPlan(policy) {
  if (!exact(policy, [
    "contract", "decisionDate", "currency", "additionalMonthlyCap",
    "infrastructureMode", "costGuarantee", "permittedEngineering",
    "prohibitedOperations", "acceptance", "productionSignoff"
  ])) throw deny();

  if (policy.contract !== "novapharm.portal.zero-incremental.v1" ||
      policy.decisionDate !== "2026-11-14" ||
      policy.currency !== "GBP" ||
      policy.additionalMonthlyCap !== 0 ||
      policy.infrastructureMode !== "existing_active_services_only" ||
      policy.costGuarantee !== "not_proven" ||
      policy.productionSignoff !== "not_granted") throw deny();

  if (!Array.isArray(policy.permittedEngineering) ||
      policy.permittedEngineering.length !== ACCEPTED_WORK.length ||
      new Set(policy.permittedEngineering).size !== ACCEPTED_WORK.length ||
      !policy.permittedEngineering.every(work => ACCEPTED_WORK.includes(work))) throw deny();

  if (!exact(policy.prohibitedOperations, FORBIDDEN_CHANGES) ||
      FORBIDDEN_CHANGES.some(k => policy.prohibitedOperations[k] !== true)) throw deny();

  if (!exact(policy.acceptance, RELEASE_PROOFS) ||
      RELEASE_PROOFS.some(k => policy.acceptance[k] !== "not_verified")) throw deny();

  return Object.freeze({
    acceptedAdditionalMonthlyCapGbp: 0,
    existingServicesOnly: true,
    permittedEngineering: Object.freeze([...ACCEPTED_WORK]),
    requiresIndependentCostEvidence: true,
    publicCutoverAuthorised: false,
    newBillingOrPaidServicesAuthorised: false,
    businessOrderOrPaymentActivationAuthorised: false,
    crossTenantOrRoleElevationAuthorised: false,
    releaseProofsRequired: Object.freeze([...RELEASE_PROOFS]),
    currentReleaseStatus: "private_candidate_only"
  });
}

/**
 * A change request is NOT proof of a £0 cost. A valid quote and observed
 * service-use attribution can only advance a change to human review.
 * This helper never executes AWS operations or authorises a live cutover.
 */
export function assessExistingServiceChange(policy, proof) {
  const contract = validatePortalZeroIncrementalPlan(policy);
  if (!exact(proof, [
    "existingService", "estimatedAdditionalMonthlyGbp",
    "noNewRecurringResources", "freeTierAndQuotaChecked",
    "costEvidenceReviewed"
  ])) return Object.freeze({ reviewable: false, executable: false, reason: "independent_cost_proof_missing" });

  if (proof.existingService !== true ||
      proof.estimatedAdditionalMonthlyGbp !== 0 ||
      proof.noNewRecurringResources !== true ||
      proof.freeTierAndQuotaChecked !== true ||
      proof.costEvidenceReviewed !== true) {
    return Object.freeze({ reviewable: false, executable: false, reason: "zero_incremental_cost_unproven" });
  }

  if (!contract.publicCutoverAuthorised) {
    return Object.freeze({ reviewable: true, executable: false, reason: "production_identity_and_release_gates_pending" });
  }
  return Object.freeze({ reviewable: false, executable: false, reason: "unreachable_without_independent_release_authority" });
}

export const prohibitedPortalOperationsUntilAccepted = FORBIDDEN_CHANGES;
