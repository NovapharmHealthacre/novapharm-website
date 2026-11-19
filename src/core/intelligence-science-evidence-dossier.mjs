/**
 * NovaPharm research integrity: bounded *candidate dossier* for published
 * scientific methods, never acceptance of an external scientific claim.
 *
 * The original paper, its licence, source corrections and independent reviews
 * must be verified by an actual trusted system. This is neither a source rights
 * oracle nor a model, laboratory or medical-decision API.
 */
import researchSources from "../../docs/intelligence/openai-science-methods-20261118.json" with { type: "json" };
import { workspaceCapabilityDependencies } from "./intelligence-22-workspace-readiness.mjs";
import { SCIENCE_COMMON_GUARDRAILS } from "./intelligence-science-research-principles.mjs";

export const SCIENCE_EVIDENCE_STAGE_IDS = Object.freeze([
  "source_identity",
  "legal_rights",
  "source_corrections",
  "provenance",
  "independent_method_validation",
  "conflicts_and_uncertainty",
  "qualified_review",
  "release_review"
]);

export const SCIENCE_VALIDATION_TRACKS = Object.freeze([
  "discovery", "formal", "experimental", "clinical_research", "computational"
]);

const cases = new Map(researchSources.methods.map((x) => [x.id, x]));
const SHA_REF = /^research:[a-f0-9]{64}$/u;
const SHA_ARTIFACT = /^evidence:[a-f0-9]{64}$/u;

if (cases.size !== researchSources.methods.length ||
    JSON.stringify(researchSources.claimIntegrityPolicy.requiredStages) !== JSON.stringify(SCIENCE_EVIDENCE_STAGE_IDS) ||
    JSON.stringify(researchSources.claimIntegrityPolicy.validationTracks) !== JSON.stringify(SCIENCE_VALIDATION_TRACKS) ||
    researchSources.methods.some((entry) =>
      !SCIENCE_VALIDATION_TRACKS.includes(entry.validationTrack) ||
      entry.publisherClaimVerification !== "not_independently_assessed" ||
      entry.retractionCorrectionStatus !== "not_checked" ||
      entry.primaryStudyEvidenceInspected !== false ||
      entry.approvedResearchDatasetAvailable !== false)) {
  throw new Error("Scientific source candidate registry drifted from research integrity requirements.");
}

function reject(code) {
  return Object.assign(new Error("Invalid research integrity dossier input. Only canonical case, workspace and opaque research fingerprints are accepted."), {
    statusCode: 400, code
  });
}

/**
 * No source content, living-person reference, API key or client-provided
 * approval is accepted. Fingerprints refer only to *candidate* metadata.
 * Neither a correctly shaped hash nor a completed checklist certifies truth.
 */
export function buildScienceEvidenceDossier({
  caseId, workspaceSlug, researchRef, artifactRefs = []
} = {}) {
  const item = typeof caseId === "string" ? cases.get(caseId) : undefined;
  if (!item) throw reject("science_source_unknown");
  if (typeof workspaceSlug !== "string" ||
      !Object.hasOwn(workspaceCapabilityDependencies, workspaceSlug) ||
      !item.linkedWorkspaces.includes(workspaceSlug)) {
    throw reject("science_workspace_not_in_source_scope");
  }
  if (typeof researchRef !== "string" || !SHA_REF.test(researchRef)) {
    throw reject("science_research_fingerprint_invalid");
  }
  if (!Array.isArray(artifactRefs) || artifactRefs.length > 12 ||
      artifactRefs.some((ref) => typeof ref !== "string" || !SHA_ARTIFACT.test(ref)) ||
      new Set(artifactRefs).size !== artifactRefs.length) {
    throw reject("science_evidence_references_invalid");
  }

  const sourceIsDiscoveryIndex = item.validationTrack === "discovery";
  return Object.freeze({
    contract: "novapharm.intelligence.science-evidence-dossier.v1",
    caseId,
    workspaceSlug,
    researchRef,
    artifactRefs: Object.freeze([...artifactRefs]),
    sourceUrl: item.sourceUrl,
    sourceReportedFindingIsNotValidatedFact: true,
    validationTrack: item.validationTrack,
    sourceIsDiscoveryIndex,
    evidenceReviewStatus: "not_independently_verified",
    sourceRightsStatus: "not_verified",
    retractionOrCorrectionStatus: "not_checked",
    scientificReplicationStatus: "not_verified",
    referencedArtifactAuthenticityVerified: false,
    evidenceStages: Object.freeze(SCIENCE_EVIDENCE_STAGE_IDS.map((id) =>
      Object.freeze({ id, status: "not_independently_verified" }))),
    requiredControls: SCIENCE_COMMON_GUARDRAILS,
    reviewerIdentityIndependentlyValidated: false,
    experimentalExecutionAuthorized: false,
    anyClinicalUseAuthorized: false,
    anyRegulatoryUseAuthorized: false,
    customerPublicationAuthorized: false,
    restrictedModelInvocationAuthorized: false,
    automatedReleaseAuthorized: false,
    independentlyVerifiedScientificClaim: false,
    qualifiedScientistReviewRequired: true,
    independentSourceAndRightsChecksRequired: true,
    publicationOrClinicalClaimsMustAbstain: true,
    limitations: item.limitations
  });
}

/** Caller-supplied approvals and completed checklist labels are never runtime evidence. */
export function assertScienceClaimReleaseAuthorized() {
  throw Object.assign(new Error("Science claims require independent source rights, authentic evidence, qualified review and separate release authority."), {
    code: "science_claim_release_denied", statusCode: 403
  });
}
