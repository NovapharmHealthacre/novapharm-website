/**
 * Shared OpenAI Science methods library: versioned educational references.
 * Every source is a third-party report, not NovaPharm replicated evidence.
 *
 * This module does not connect OpenAI, approve external data use, perform
 * chemical/biological experimentation or make clinical/regulatory decisions.
 */
import scienceSources from "../../docs/intelligence/openai-science-methods-20261118.json" with { type: "json" };
import { workspaceCapabilityDependencies } from "./intelligence-22-workspace-readiness.mjs";
import { SCIENCE_COMMON_GUARDRAILS } from "./intelligence-science-research-principles.mjs";

const CASES = new Map(scienceSources.methods.map((entry) => [entry.id, entry]));
const opaque = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const denied = (code) => Object.assign(new Error("Science methods review requires a canonical workspace and bounded source identity."), {
  code, statusCode: 400
});

export function listScienceMethodologyReferences() {
  return Object.freeze(scienceSources.methods.map((entry) => Object.freeze({
    id: entry.id,
    methodologyId: entry.methodologyId,
    sourceType: entry.sourceType,
    sourceUrl: entry.sourceUrl,
    linkedWorkspaces: Object.freeze([...entry.linkedWorkspaces]),
    sourceReviewIsNotScientificReplication: true,
    productionCertified: false
  })));
}

export function scienceMethodsForWorkspace(slug) {
  if (typeof slug !== "string" || !Object.hasOwn(workspaceCapabilityDependencies, slug)) {
    throw denied("science_workspace_unknown");
  }
  return Object.freeze({
    workspaceSlug: slug,
    referenceCaseIds: Object.freeze(scienceSources.methods.filter((entry) =>
      entry.linkedWorkspaces.includes(slug)).map((entry) => entry.id)),
    requiredGuardrails: SCIENCE_COMMON_GUARDRAILS,
    scientificResearchEvidenceAccepted: false,
    productionCertified: false,
    customerPublicationApproved: false
  });
}

/**
 * Creates a deterministic *plan*, never a scientific claim. Source URLs
 * are not fetched and the method cannot accept patient data or lab commands.
 * Any caller-supplied "approved" flag is ignored; permissions must be checked
 * separately by a trusted server against actual rights and scientific evidence.
 */
export function planScienceMethodologyReview({ caseId, workspaceSlug, subjectRef } = {}) {
  if (typeof caseId !== "string" || !CASES.has(caseId)) throw denied("science_case_unknown");
  if (typeof workspaceSlug !== "string" || !Object.hasOwn(workspaceCapabilityDependencies, workspaceSlug)) {
    throw denied("science_workspace_unknown");
  }
  if (typeof subjectRef !== "string" || !opaque.test(subjectRef)) throw denied("science_subject_invalid");
  const entry = CASES.get(caseId);
  if (!entry.linkedWorkspaces.includes(workspaceSlug)) throw denied("science_case_scope_invalid");
  return Object.freeze({
    contract: "novapharm.intelligence.science-method-review.v1",
    status: "review_planning_only",
    caseId, workspaceSlug, subjectRef, methodologyId: entry.methodologyId,
    sourceReferenceUrl: entry.sourceUrl,
    primaryPublisherEvidenceVerified: false,
    scientificClaimsIndependentlyReplicated: false,
    researchModelInvocationAuthorized: false,
    clinicalUseApproved: false,
    regulatoryUseApproved: false,
    labExecutionAuthorized: false,
    customerPublicationApproved: false,
    sourceAiIngestionRightsApproved: false,
    qualifiedReviewerRequired: true,
    requiredProof: Object.freeze([...entry.validationRequirements, ...SCIENCE_COMMON_GUARDRAILS])
  });
}
