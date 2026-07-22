const registry = Object.freeze({
  "claims-consistency-review": Object.freeze({
    id: "claims-consistency-review",
    name: "Claims consistency review",
    maturity: "bounded-prototype",
    allowedScopes: Object.freeze(["employee", "admin"]),
    sourceTypes: Object.freeze(["approved_public_copy", "approved_evidence", "catalogue_metadata", "image_provenance"]),
    humanReviewRequired: true,
    productionWriteAllowed: false,
    prohibitedDecision: "Publication or regulatory approval"
  }),
  "supplier-document-gap-analysis": Object.freeze({
    id: "supplier-document-gap-analysis",
    name: "Supplier-document gap analysis",
    maturity: "bounded-prototype",
    allowedScopes: Object.freeze(["employee", "admin"]),
    sourceTypes: Object.freeze(["supplier_document_metadata", "qualification_requirement"]),
    humanReviewRequired: true,
    productionWriteAllowed: false,
    prohibitedDecision: "Supplier approval or rejection"
  }),
  "controlled-document-comparison": Object.freeze({
    id: "controlled-document-comparison",
    name: "Controlled document comparison",
    maturity: "bounded-prototype",
    allowedScopes: Object.freeze(["employee", "board", "admin"]),
    sourceTypes: Object.freeze(["controlled_document_version"]),
    humanReviewRequired: true,
    productionWriteAllowed: false,
    prohibitedDecision: "Document approval or change control"
  }),
  "support-enquiry-classification": Object.freeze({
    id: "support-enquiry-classification",
    name: "Support and enquiry classification",
    maturity: "bounded-prototype",
    allowedScopes: Object.freeze(["employee", "admin"]),
    sourceTypes: Object.freeze(["authorised_enquiry"]),
    humanReviewRequired: true,
    productionWriteAllowed: false,
    prohibitedDecision: "Safety assessment or automatic case closure"
  }),
  "executive-evidence-brief": Object.freeze({
    id: "executive-evidence-brief",
    name: "Executive evidence brief",
    maturity: "bounded-prototype",
    allowedScopes: Object.freeze(["board", "admin"]),
    sourceTypes: Object.freeze(["approved_canonical_record", "approved_board_record"]),
    humanReviewRequired: true,
    productionWriteAllowed: false,
    prohibitedDecision: "Board decision or investment recommendation"
  }),
  "content-insights-outline": Object.freeze({
    id: "content-insights-outline",
    name: "Content and Insights outline",
    maturity: "bounded-prototype",
    allowedScopes: Object.freeze(["employee", "admin"]),
    sourceTypes: Object.freeze(["approved_public_source", "approved_primary_source"]),
    humanReviewRequired: true,
    productionWriteAllowed: false,
    prohibitedDecision: "Automatic publication"
  })
});

export function listInternalAiUseCases() {
  return Object.values(registry).map((entry) => ({ ...entry }));
}

export function internalAiUseCase(id) {
  return registry[String(id || "").trim()] || null;
}

export function scopePermitsUseCase(scopes = [], useCase) {
  const granted = new Set(scopes.map((scope) => String(scope).toLowerCase()));
  return Boolean(useCase && (granted.has("admin") || useCase.allowedScopes.some((scope) => granted.has(scope))));
}
