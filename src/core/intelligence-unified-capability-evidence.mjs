/**
 * Private executive evidence-acceptance inventory for NovaPharm Intelligence.
 *
 * NOT an authorization service, not a licensing authority, and never a customer
 * launch switch. Evidence receipts must be supplied by a trusted server after
 * independent verification against authoritative stores. Untrusted callers can
 * at most produce a candidate assessment; this API never approves a release.
 */
const common = Object.freeze([
  "canonical_identity", "source_rights", "tenant_authorization",
  "provenance_lineage", "revocation", "durable_audit"
]);

export const capabilityRequirements = Object.freeze({
  medicine_knowledge_graph: Object.freeze([
    "temporal_identity_resolution", "pack_product_relationships",
    "verified_suppliers", "jurisdiction_authorisations", "unresolved_matches"
  ]),
  data_operations_governance: Object.freeze([
    "source_contracts", "orchestrated_ingestion", "freshness_monitoring",
    "partition_reconciliation", "dataset_revocation"
  ]),
  supply_tender_intelligence: Object.freeze([
    "verified_supply_status", "shortage_sources", "official_tender_awards",
    "pack_eligibility", "price_provenance", "reviewed_opportunity_score"
  ]),
  biotech_capital_intelligence: Object.freeze([
    "versioned_trials", "asset_company_resolution", "partnership_events",
    "investment_event_sources", "as_of_commercial_evaluation"
  ]),
  research_evaluation: Object.freeze([
    "expert_gold_standard", "citation_accuracy", "contradiction_uncertainty",
    "agent_safety", "controlled_scientific_studies"
  ]),
  enterprise_operations: Object.freeze([
    "real_two_tenant_mfa_pilot", "customer_administration", "alerts_monitoring",
    "reproducible_reports", "governed_api_access", "disaster_recovery_restore",
    "support_operations"
  ])
});
export const sharedCapabilityRequirements = common;

const scopePattern = /^[a-z0-9][a-z0-9_-]{2,63}$/u;
const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{2,127}$/u;
const digestPattern = /^[0-9a-f]{64}$/u;
const allChecks = new Set([
  ...common, ...Object.values(capabilityRequirements).flat()
]);

function validId(value) {
  return typeof value === "string" && idPattern.test(value);
}
function validDate(value) {
  return typeof value === "string" &&
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/u.test(value) &&
    Number.isFinite(Date.parse(value));
}
function verifiedCandidate(receipt, workspaceId, now) {
  return receipt && typeof receipt === "object" && !Array.isArray(receipt) &&
    allChecks.has(receipt.check) && receipt.workspaceId === workspaceId &&
    receipt.verdict === "verified" && receipt.testFixture === false &&
    receipt.revoked !== true && validId(receipt.receiptId) &&
    validId(receipt.independentVerifierId) &&
    validId(receipt.approverId) &&
    receipt.independentVerifierId !== receipt.approverId &&
    digestPattern.test(receipt.evidenceSha256) &&
    validDate(receipt.verifiedAt) && validDate(receipt.expiresAt) &&
    Date.parse(receipt.verifiedAt) <= now && Date.parse(receipt.expiresAt) > now;
}

/**
 * A fail-closed inventory of evidence receipts for six shared capabilities.
 * No result from this reporting function may be used to enable customer access.
 * Missing, conflicting, expired, wrong-tenant or test-fixture receipts do not count.
 */
export function assessUnifiedIntelligenceCapabilityEvidence({
  workspaceId, asOf, receipts = []
} = {}) {
  if (typeof workspaceId !== "string" || !scopePattern.test(workspaceId) ||
      !validDate(asOf) || !Array.isArray(receipts) || receipts.length > 1000) {
    throw new Error("Invalid private capability evidence assessment.");
  }
  const now = Date.parse(asOf);
  const accepted = new Set();
  const duplicates = new Set();
  const receiptCheck = new Map();
  for (const receipt of receipts) {
    if (!verifiedCandidate(receipt, workspaceId, now)) continue;
    // Conflicting receipts for the same check never establish release evidence.
    if (receiptCheck.has(receipt.receiptId)) {
      duplicates.add(receipt.check);
      duplicates.add(receiptCheck.get(receipt.receiptId));
    }
    if (accepted.has(receipt.check)) duplicates.add(receipt.check);
    receiptCheck.set(receipt.receiptId, receipt.check);
    accepted.add(receipt.check);
  }
  const commonMissing = common.filter(check => !accepted.has(check) || duplicates.has(check));
  const capabilities = Object.entries(capabilityRequirements).map(([id, required]) => {
    const missing = [...commonMissing, ...required.filter(check =>
      !accepted.has(check) || duplicates.has(check))];
    return {
      id, requirementCount: common.length + required.length,
      coveredCandidateChecks: common.length + required.length - missing.length,
      missingChecks: missing,
      status: missing.length ? "evidence_incomplete" : "candidate_requires_independent_runtime_acceptance"
    };
  });
  return {
    contract: "novapharm.intelligence.unified-capability-evidence.v1",
    asOf, workspaceId,
    access: "private_executive_reporting_only",
    proofStoreAuthorityVerified: false,
    independentProductionAcceptanceVerified: false,
    customerReleaseApproved: false,
    productionLive: false,
    capabilities
  };
}
