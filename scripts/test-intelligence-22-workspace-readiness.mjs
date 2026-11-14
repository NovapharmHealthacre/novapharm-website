import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assessUnifiedIntelligenceCapabilityEvidence, capabilityRequirements,
  sharedCapabilityRequirements } from "../src/core/intelligence-unified-capability-evidence.mjs";
import { assessIntelligence22Workspaces, firstMedicinePilotWorkspaces,
  intelligenceSourceEvidenceKeys, workspaceCapabilityDependencies } from "../src/core/intelligence-22-workspace-readiness.mjs";

// The TypeScript navigation registry remains authoritative. Parse its fixed
// typed literal format instead of maintaining a second canonical slug list.
const source = readFileSync(new URL("../apps/portal/data/intelligence-workspaces.ts", import.meta.url), "utf8");
const catalogue = [...source.matchAll(/\{ slug: "([^"]+)", title: "([^"]+)", group: "([^"]+)", state: "([^"]+)", summary: "([^"]+)", requirements: \[([^\]]*)\] \}/gu)]
  .map(([, slug, title, group, state]) => ({ slug, title, group, state }));
const asOf = "2026-11-14T17:00:00Z";
const counts = Object.fromEntries(intelligenceSourceEvidenceKeys.map(key => [key, 0]));
counts.sourceRegistry = 4;
const capabilityReport = assessUnifiedIntelligenceCapabilityEvidence({
  workspaceId: "npi_internal_evidence",
  asOf,
});

function assess(sourceCounts = counts, report = capabilityReport, entries = catalogue) {
  return assessIntelligence22Workspaces({
    catalogue: entries, capabilityReport: report, sourceCounts, sourceSnapshotAt: asOf,
  });
}

test("exactly 22 canonical routes, five repository foundations and 17 dependency-gated workspaces", () => {
  assert.equal(catalogue.length, 22);
  assert.equal(Object.keys(workspaceCapabilityDependencies).length, 22);
  const output = assess();
  assert.equal(output.contract, "novapharm.intelligence.22-workspace-implementation-evidence.v1");
  assert.deepEqual(output.summary, {
    defined: 22,
    repositoryReadOnlyFoundations: 5,
    catalogueDependencyGated: 17,
    pilotPriority: 6,
    independentProductionAccepted: 0,
  });
  assert.deepEqual(new Set(output.workspaces.map(x => x.slug)), new Set(catalogue.map(x => x.slug)));
  assert.ok(output.workspaces.every(x => x.productionAccepted === false && x.customerAccessible === false));
  assert.equal(output.productionLive, false);
  assert.equal(output.customerReleaseApproved, false);
  assert.equal(output.sourceCountsIndependentlyAttested, false);
});

test("Apixaban six-workspace pilot is P0, other sixteen build on shared evidence", () => {
  assert.equal(new Set(firstMedicinePilotWorkspaces).size, 6);
  const output = assess();
  const p0 = output.workspaces.filter(x => x.priority === "P0_first_accepted_medicine");
  assert.deepEqual(new Set(p0.map(x => x.slug)), new Set(firstMedicinePilotWorkspaces));
  for (const item of output.workspaces) {
    assert.ok(item.capabilityDependencies.length > 0);
    assert.ok(item.capabilityDependencies.every(id => Object.hasOwn(capabilityRequirements, id)));
  }
});

test("four metadata registry entries cannot unlock any of 22 workspaces", () => {
  const output = assess();
  assert.equal(output.sourceSnapshot.sourceRegistry, 4);
  assert.ok(intelligenceSourceEvidenceKeys.every(key => output.sourceSnapshot[key] === 0));
  assert.ok(output.workspaces.every(x => x.missingChecks.includes("accepted_source:sourceRights")));
  assert.ok(output.workspaces.every(x => x.missingChecks.includes("accepted_source:medicineIdentity")));
  assert.ok(output.workspaces.every(x => x.missingChecks.includes("accepted_source:medicineEvidence")));
  assert.ok(output.workspaces.every(x =>
    x.implementationState === "repository_read_only_foundation" || x.implementationState === "dependency_gated"));
});

test("a full set of synthetic candidate receipts cannot certify production or customer access", () => {
  const checks = [...new Set([...sharedCapabilityRequirements, ...Object.values(capabilityRequirements).flat()])];
  const receipts = checks.map((check, i) => ({
    check,
    workspaceId: "npi_internal_evidence",
    receiptId: `receiptx:${String(i + 1).padStart(3, "0")}`,
    independentVerifierId: "reviewer-001",
    approverId: "approver-002",
    evidenceSha256: "a".repeat(64),
    verdict: "verified",
    testFixture: false,
    revoked: false,
    verifiedAt: "2026-11-14T15:00:00Z",
    expiresAt: "2026-12-14T15:00:00Z",
  }));
  const report = assessUnifiedIntelligenceCapabilityEvidence({
    workspaceId: "npi_internal_evidence", asOf, receipts,
  });
  assert.ok(report.capabilities.every(x => x.missingChecks.length === 0));
  const fullCounts = Object.fromEntries(intelligenceSourceEvidenceKeys.map(k => [k, 1]));
  const output = assess(fullCounts, report);
  assert.ok(output.workspaces.every(x => x.missingChecks.length === 0));
  assert.ok(output.workspaces.every(x => x.implementationState === "candidate_requires_independent_runtime_acceptance"));
  assert.ok(output.workspaces.every(x => !x.productionAccepted && !x.customerAccessible));
  assert.equal(output.summary.independentProductionAccepted, 0);
  assert.equal(output.productionLive, false);
});

test("missing or untrusted evidence, drift and forged release statuses fail closed", () => {
  assert.throws(() => assess({ ...counts, sourceRights: -1 }), /counts/);
  assert.throws(() => assess({ ...counts, medicineIdentity: "5" }), /counts/);
  assert.throws(() => assess({ ...counts, sourceRights: undefined }), /counts/);
  assert.throws(() => assess(counts, capabilityReport, [...catalogue.slice(1), catalogue[1]]), /drifted/);
  assert.throws(() => assess(counts, { ...capabilityReport, productionLive: true }), /Invalid/);
  assert.throws(() => assess(counts, { ...capabilityReport,
    capabilities: capabilityReport.capabilities.map((x, i) =>
      i ? x : { ...x, status: "production_accepted" }),
  }), /Invalid/);
  assert.throws(() => assess(counts, capabilityReport, catalogue.slice(0, 21)), /Invalid/);
});
