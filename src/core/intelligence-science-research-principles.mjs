/**
 * Cross-cutting Science research evidence principles for all 22 canonical
 * NovaPharm Intelligence workspaces. Metadata only, not runtime authority.
 * Keep vendor-specific licence/model eligibility outside user-controlled code.
 */
export const SCIENCE_COMMON_GUARDRAILS = Object.freeze([
  "independent_tenant_and_role_authorisation",
  "source_specific_scientific_and_ai_use_rights",
  "immutable_provenance_and_retraction_review",
  "reproducibility_and_falsifiable_counterevidence",
  "qualified_human_scientific_review",
  "no_customer_facing_restricted_model_access",
  "no_clinical_or_regulatory_auto_decision"
]);

export const SCIENCE_READINESS_BOUNDARY = Object.freeze({
  contract: "novapharm.intelligence.science-readiness-boundary.v1",
  requiredGuardrails: SCIENCE_COMMON_GUARDRAILS,
  evidenceRightsVerified: false,
  researchModelApproved: false,
  scientificAiProductionCertified: false,
  customerRestrictedModelAccessApproved: false,
  researchOutputReleaseApproved: false,
  clinicalDecisionReady: false,
  regulatoryDecisionReady: false,
  humanScientificReviewRequired: true
});
