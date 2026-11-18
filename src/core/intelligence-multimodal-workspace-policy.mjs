/**
 * Cross-workspace NovaPharm multimodal research boundary.
 *
 * Canonical Intelligence workspaces stay in apps/portal/data/intelligence-workspaces.ts.
 * These 22 descriptions are future research purposes, not live features.
 * The explicit map prevents a new UI route from silently inheriting AI access.
 */
export const multimodalWorkspacePolicy = Object.freeze({
  "medicine-search": "research_only_visual_text_retrieval",
  "medicine-overview": "research_only_cross_modal_evidence_summary",
  "identity": "research_only_candidate_identity_comparison",
  "evidence": "research_only_document_image_provenance",
  "observed-market": "research_only_source_document_crosscheck",
  "geography": "research_only_territory_document_crosscheck",
  "market-structure": "research_only_segment_document_crosscheck",
  "forecasts": "not_permitted_from_image_similarity",
  "signals": "research_only_unverified_signal_review",
  "medicine-tape": "research_only_event_document_crosscheck",
  "supply-intelligence": "research_only_packaging_candidate_review",
  "regulatory-intelligence": "research_only_regulatory_document_crosscheck",
  "pricing-reimbursement": "research_only_price_document_crosscheck",
  "tender-intelligence": "research_only_tender_document_crosscheck",
  "portfolio": "research_only_catalogue_image_crosscheck",
  "biotech-intelligence": "research_only_research_figure_crosscheck",
  "capital-intelligence": "research_only_financial_document_crosscheck",
  "decision-workspace": "not_permitted_for_automated_decisions",
  "watchlists": "research_only_source_review_candidate",
  "alerts": "not_permitted_for_automated_alerting",
  "reports": "research_only_cited_figure_review",
  "private-commercial": "not_permitted_for_unlicensed_or_private_data"
});

export const multimodalProhibitedDecisions = Object.freeze([
  "medicine_identity_verification",
  "prescribing_or_dispensing",
  "patient_treatment",
  "quality_release",
  "regulatory_submission_or_approval",
  "supplier_qualification",
  "procurement_or_payment",
  "price_or_stock_confirmation",
  "autonomous_operational_action"
]);

/**
 * A non-executable planning contract: never use a browser or mobile value
 * as evidence of source/tenant/model rights, regardless of the requested slug.
 */
export function assessMultimodalWorkspacePolicy(workspaceSlug) {
  const valid = typeof workspaceSlug === "string" &&
    Object.hasOwn(multimodalWorkspacePolicy, workspaceSlug);
  return Object.freeze({
    contract: "novapharm.intelligence.multimodal-workspace-policy.v1",
    workspaceSlug: valid ? workspaceSlug : null,
    plannedResearchPurpose: valid ? multimodalWorkspacePolicy[workspaceSlug] : "unknown_workspace_denied",
    state: valid ? "research_plan_only" : "blocked_unknown_workspace",
    requiresExplicitNonSensitiveMaterial: true,
    requiresIndependentSourceRights: true,
    requiresAuthenticatedTenantAuthority: true,
    requiresOriginalEvidenceReview: true,
    requiresHumanReleaseApproval: true,
    modelInferenceEnabled: false,
    productionAccepted: false,
    customerAccessible: false,
    canPublish: false,
    decisionReady: false
  });
}
