/**
 * NovaPharm Science: deterministic cross-platform research design contract.
 * No OpenAI or third-party API calls, secrets, patient data or auto-publishing.
 * A research hypothesis is not clinical or regulatory evidence.
 */
import { workspaceCapabilityDependencies } from "./intelligence-22-workspace-readiness.mjs";

/**
 * Applies to every canonical Intelligence workspace, even where a particular
 * Science workflow is only a future design. No UI route can be used as proof of
 * permission to invoke a restricted research model or to publish findings.
 */
export { SCIENCE_COMMON_GUARDRAILS } from "./intelligence-science-research-principles.mjs";
import { SCIENCE_COMMON_GUARDRAILS } from "./intelligence-science-research-principles.mjs";

export function scienceGovernanceForWorkspace(slug) {
  if (typeof slug !== "string" || !Object.hasOwn(workspaceCapabilityDependencies, slug)) {
    throw Object.assign(new Error("Unknown canonical Intelligence research workspace."), {
      code: "science_workspace_unknown", statusCode: 400
    });
  }
  return Object.freeze({
    contract: "novapharm.intelligence.science-workspace-governance.v1",
    workspaceSlug: slug,
    capabilityDependencies: workspaceCapabilityDependencies[slug],
    requiredGuardrails: SCIENCE_COMMON_GUARDRAILS,
    scientificAiProductionCertified: false,
    customerModelAccessApproved: false,
    internalResearchModelAccessApproved: false,
    evidenceRightsVerified: false,
    experimentExecutionAuthorised: false,
    humanScientificReviewRequired: true
  });
}

/**
 * Rosalind API is currently scoped to separately approved INTERNAL research.
 * A caller-provided approval flag can never turn this planning inventory into
 * a runtime model entitlement. This is deliberately NOT an auth service.
 */
const RESTRICTED_RESEARCH_AUDIENCES = Object.freeze([
  "unspecified", "internal_research", "customer", "external_commercial"
]);

export function assessRosalindResearchBoundary({ audience = "unspecified" } = {}) {
  // Never echo unbounded caller content (including possible patient data)
  // through a research or model-access status report.
  if (typeof audience !== "string" || !RESTRICTED_RESEARCH_AUDIENCES.includes(audience)) {
    throw Object.assign(new Error("Restricted research audience must be an approved non-sensitive category."), {
      code: "science_research_audience_invalid", statusCode: 400
    });
  }
  const internalAudienceCandidate = audience === "internal_research";
  return Object.freeze({
    contract: "novapharm.intelligence.restricted-research-model-boundary.v1",
    audience,
    internalAudienceCandidate,
    customerFacingUsePermitted: false,
    externalCommercialUsePermitted: false,
    modelCallAuthorised: false,
    approvedApiOrganisationVerified: false,
    approvedResearchTierVerified: false,
    modelAccessScope: "approved_internal_research_only",
    requiredBeforeInvocation: Object.freeze([
      "verified_trusted_access_research_tier",
      "separately_approved_api_organisation_and_model",
      "trusted_backend_role_and_tenant_check",
      "licensed_evidence_and_security_review",
      "independent_authorised_research_workflow"
    ])
  });
}

export const SCIENCE_WORKFLOW_IDS = Object.freeze([
  "literature-evidence", "data-code", "scientific-modelling",
  "research-connectors", "hypotheses-experiments", "research-operations"
]);

const REQUIREMENTS = Object.freeze({
  "literature-evidence": Object.freeze(["source-rights", "identifiers", "citation-review", "human-review"]),
  "data-code": Object.freeze(["immutable-dataset", "reproducibility", "statistical-review", "human-review"]),
  "scientific-modelling": Object.freeze(["validated-domain", "model-provenance", "independent-replication", "human-review"]),
  "research-connectors": Object.freeze(["official-api", "tenant-and-source-rights", "provenance", "human-review"]),
  "hypotheses-experiments": Object.freeze(["conflicting-hypotheses", "safety-review", "qualified-investigator", "replication"]),
  "research-operations": Object.freeze(["copyright-and-reuse", "citation-review", "document-control", "human-review"])
});

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const JURISDICTION = /^[A-Z]{2}$/u;
const deny = (code = "science_review_invalid") => Object.assign(
  new Error("Research review requires a valid workflow and bounded non-sensitive reference identifiers."),
  { code, statusCode: 400 }
);

/**
 * Science is a supplementary lens on the canonical 22 Intelligence workspaces,
 * never a new evidence source or a grant of model, commercial or clinical rights.
 * Only opaque IDs are accepted; no prompts, scientific data or PHI enter here.
 */
export function planScienceResearchReview({ workflowId, subjectRef, jurisdiction, sourceRefs = [] } = {}) {
  if (!SCIENCE_WORKFLOW_IDS.includes(workflowId)) throw deny("science_workflow_unknown");
  if (typeof subjectRef !== "string" || !IDENTIFIER.test(subjectRef)) throw deny("science_subject_invalid");
  if (typeof jurisdiction !== "string" || !JURISDICTION.test(jurisdiction)) throw deny("science_jurisdiction_invalid");
  if (!Array.isArray(sourceRefs) || sourceRefs.length > 16 ||
    sourceRefs.some((value) => typeof value !== "string" || !IDENTIFIER.test(value)) ||
    new Set(sourceRefs).size !== sourceRefs.length) throw deny("science_sources_invalid");
  return Object.freeze({
    contract: "novapharm.intelligence.science-review-plan.v1",
    workflowId, subjectRef, jurisdiction,
    referencedSourceIds: Object.freeze([...sourceRefs]),
    requiredProof: REQUIREMENTS[workflowId],
    status: "planning_only",
    externalScienceSiteIsNotAnApi: true,
    inputEvidenceVerified: false,
    scientificResultGenerated: false,
    modelInvocationAuthorised: false,
    proposedExperimentExecutionAuthorised: false,
    clinicalDecisionReady: false,
    regulatoryDecisionReady: false,
    customerPublishable: false,
    humanScientificReviewRequired: true
  });
}

/** Never promote a plan merely because a caller submits an approval flag. */
export function assertScienceProductionReady() {
  throw Object.assign(new Error("Scientific AI production requires independent backend identity, rights, safety, audit and evaluation acceptance."), {
    code: "science_production_release_denied", statusCode: 403
  });
}
