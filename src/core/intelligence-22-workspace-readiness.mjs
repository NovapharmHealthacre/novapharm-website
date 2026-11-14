/**
 * Private implementation-readiness map for the 22 Intelligence workspaces.
 *
 * This is NOT a release authority, a source-rights grant, an authentication
 * service or an activation switch. Candidate receipts and catalogue entries
 * never grant data, tenant access, billing, medicines use or customer release.
 *
 * Workspaces share the six capability gates defined by issue #517; the
 * registry of 22 routes remains authoritative in the Portal. A real accepted
 * medicine is the cross-workspace integration prerequisite in issue #497.
 */
import { capabilityRequirements } from "./intelligence-unified-capability-evidence.mjs";

export const workspaceCapabilityDependencies = Object.freeze({
  "medicine-search": Object.freeze(["medicine_knowledge_graph", "data_operations_governance", "enterprise_operations"]),
  "medicine-overview": Object.freeze(["medicine_knowledge_graph", "data_operations_governance"]),
  "identity": Object.freeze(["medicine_knowledge_graph", "data_operations_governance"]),
  "evidence": Object.freeze(["data_operations_governance", "research_evaluation"]),
  "observed-market": Object.freeze(["medicine_knowledge_graph", "data_operations_governance"]),
  "geography": Object.freeze(["medicine_knowledge_graph", "data_operations_governance"]),
  "market-structure": Object.freeze(["medicine_knowledge_graph", "data_operations_governance", "research_evaluation"]),
  "forecasts": Object.freeze(["data_operations_governance", "research_evaluation"]),
  "signals": Object.freeze(["data_operations_governance", "supply_tender_intelligence", "research_evaluation"]),
  "medicine-tape": Object.freeze(["data_operations_governance", "supply_tender_intelligence"]),
  "supply-intelligence": Object.freeze(["data_operations_governance", "supply_tender_intelligence"]),
  "regulatory-intelligence": Object.freeze(["medicine_knowledge_graph", "data_operations_governance"]),
  "pricing-reimbursement": Object.freeze(["data_operations_governance", "supply_tender_intelligence"]),
  "tender-intelligence": Object.freeze(["data_operations_governance", "supply_tender_intelligence"]),
  "portfolio": Object.freeze(["medicine_knowledge_graph", "supply_tender_intelligence", "enterprise_operations"]),
  "biotech-intelligence": Object.freeze(["data_operations_governance", "biotech_capital_intelligence"]),
  "capital-intelligence": Object.freeze(["data_operations_governance", "biotech_capital_intelligence"]),
  "decision-workspace": Object.freeze(["research_evaluation", "enterprise_operations"]),
  "watchlists": Object.freeze(["data_operations_governance", "enterprise_operations"]),
  "alerts": Object.freeze(["supply_tender_intelligence", "enterprise_operations"]),
  "reports": Object.freeze(["data_operations_governance", "research_evaluation", "enterprise_operations"]),
  "private-commercial": Object.freeze(["supply_tender_intelligence", "enterprise_operations"]),
});

export const firstMedicinePilotWorkspaces = Object.freeze([
  "medicine-search", "medicine-overview", "identity", "evidence",
  "observed-market", "geography",
]);

// These are real accepted records, not metadata inventory, tests or raw files.
export const intelligenceSourceEvidenceKeys = Object.freeze([
  "sourceRights", "medicineIdentity", "medicineEvidence",
  "ingestionRuns", "evidenceManifests", "auditEvents",
]);

const capabilityNames = new Set(Object.keys(capabilityRequirements));
const pilotSet = new Set(firstMedicinePilotWorkspaces);
const dependencies = Object.entries(workspaceCapabilityDependencies);
if (dependencies.length !== 22 || pilotSet.size !== 6) {
  throw new Error("22-workspace dependency and six-pilot contracts are inconsistent.");
}
for (const [slug, gates] of dependencies) {
  if (!slug || gates.length === 0 || new Set(gates).size !== gates.length ||
      gates.some(gate => !capabilityNames.has(gate))) {
    throw new Error("Invalid 22-workspace capability dependency map.");
  }
}

/**
 * Builds a read-only evidence report from a trusted caller's source counts and
 * the separate six-capability *candidate* report.
 *
 * The output never declares production readiness or changes access controls.
 * The source counts are caller assertions, NOT a proof-store attestation;
 * live activation still requires separate verification by authoritative stores,
 * two-tenant proof, medical/source-rights approval and owner acceptance.
 */
export function assessIntelligence22Workspaces({
  catalogue, capabilityReport, sourceCounts, sourceSnapshotAt,
} = {}) {
  if (!Array.isArray(catalogue) || catalogue.length !== 22 ||
      !capabilityReport || capabilityReport.contract !== "novapharm.intelligence.unified-capability-evidence.v1" ||
      !Array.isArray(capabilityReport.capabilities) || capabilityReport.capabilities.length !== 6 ||
      capabilityReport.productionLive !== false ||
      capabilityReport.customerReleaseApproved !== false ||
      typeof sourceSnapshotAt !== "string" ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/u.test(sourceSnapshotAt) ||
      !Number.isFinite(Date.parse(sourceSnapshotAt)) ||
      !sourceCounts || typeof sourceCounts !== "object" || Array.isArray(sourceCounts)) {
    throw new Error("Invalid private Intelligence workspace implementation assessment.");
  }
  for (const key of intelligenceSourceEvidenceKeys) {
    if (!Number.isSafeInteger(sourceCounts[key]) || sourceCounts[key] < 0) {
      throw new Error("Source evidence counts must be non-negative integers.");
    }
  }
  // The source registry is discovery metadata, not one of the six admission
  // prerequisites and must not satisfy missing rights or accepted evidence.
  if (sourceCounts.sourceRegistry !== undefined &&
      (!Number.isSafeInteger(sourceCounts.sourceRegistry) || sourceCounts.sourceRegistry < 0)) {
    throw new Error("Invalid source registry count.");
  }

  const expectedSlugs = Object.keys(workspaceCapabilityDependencies);
  const actualSlugs = catalogue.map(x => x?.slug);
  if (new Set(actualSlugs).size !== 22 ||
      actualSlugs.some(s => !expectedSlugs.includes(s)) ||
      expectedSlugs.some(s => !actualSlugs.includes(s))) {
    throw new Error("The 22 canonical workspaces and capability dependencies drifted.");
  }
  const capabilityMap = new Map(capabilityReport.capabilities.map(x => [x.id, x]));
  if (capabilityMap.size !== 6 ||
      [...capabilityNames].some(name => !capabilityMap.has(name)) ||
      capabilityReport.capabilities.some(x =>
        !["evidence_incomplete", "candidate_requires_independent_runtime_acceptance"].includes(x.status) ||
        !Array.isArray(x.missingChecks) || !Number.isSafeInteger(x.coveredCandidateChecks))) {
    throw new Error("Invalid six-capability candidate assessment.");
  }

  const missingSourceRecords = intelligenceSourceEvidenceKeys.filter(key => sourceCounts[key] === 0);
  const workspaces = catalogue.map(workspace => {
    if (!["existing-read-only", "gated"].includes(workspace.state) ||
        typeof workspace.title !== "string" || !workspace.title.trim()) {
      throw new Error("Invalid canonical workspace evidence state.");
    }
    const gates = workspaceCapabilityDependencies[workspace.slug];
    const missingCapabilityChecks = [...new Set(gates.flatMap(id =>
      capabilityMap.get(id).missingChecks.map(check => id + ":" + check)))];
    const blockers = [
      ...missingSourceRecords.map(key => "accepted_source:" + key),
      ...missingCapabilityChecks,
    ];
    return Object.freeze({
      slug: workspace.slug,
      title: workspace.title,
      group: workspace.group,
      catalogueState: workspace.state,
      priority: pilotSet.has(workspace.slug) ? "P0_first_accepted_medicine" : "P1_after_shared_pilot",
      capabilityDependencies: Object.freeze([...gates]),
      missingChecks: Object.freeze(blockers),
      // These are IMPLEMENTATION states, not claims of released function.
      implementationState: blockers.length
        ? (workspace.state === "existing-read-only" ? "repository_read_only_foundation" : "dependency_gated")
        : "candidate_requires_independent_runtime_acceptance",
      independentRuntimeAcceptanceVerified: false,
      productionAccepted: false,
      customerAccessible: false,
    });
  });
  return Object.freeze({
    contract: "novapharm.intelligence.22-workspace-implementation-evidence.v1",
    sourceSnapshotAt,
    sourceSnapshot: Object.freeze(Object.fromEntries(
      [...intelligenceSourceEvidenceKeys, "sourceRegistry"].filter(k => sourceCounts[k] !== undefined)
        .map(k => [k, sourceCounts[k]]))),
    sourceCountsIndependentlyAttested: false,
    sixCapabilityEvidenceReport: capabilityReport.contract,
    summary: Object.freeze({
      defined: 22,
      repositoryReadOnlyFoundations: workspaces.filter(w => w.catalogueState === "existing-read-only").length,
      catalogueDependencyGated: workspaces.filter(w => w.catalogueState === "gated").length,
      pilotPriority: workspaces.filter(w => w.priority === "P0_first_accepted_medicine").length,
      independentProductionAccepted: 0,
    }),
    independentProductionAcceptanceVerified: false,
    customerReleaseApproved: false,
    productionLive: false,
    workspaces: Object.freeze(workspaces),
  });
}
