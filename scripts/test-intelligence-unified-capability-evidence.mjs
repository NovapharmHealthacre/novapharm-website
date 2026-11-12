import assert from "node:assert/strict";
import test from "node:test";
import {
  assessUnifiedIntelligenceCapabilityEvidence, capabilityRequirements,
  sharedCapabilityRequirements
} from "../src/core/intelligence-unified-capability-evidence.mjs";

const workspaceId = "novapharm_internal_alpha";
const asOf = "2026-11-12T09:00:00Z";
const checks = [...new Set([...sharedCapabilityRequirements, ...Object.values(capabilityRequirements).flat()])];

function receipt(check, index, overrides = {}) {
  return {
    check, workspaceId, receiptId: "r-" + String(index).padStart(4, "0"),
    independentVerifierId: "reviewer_001",
    approverId: "approver_001",
    evidenceSha256: "a".repeat(64),
    verdict: "verified",
    testFixture: false,
    revoked: false,
    verifiedAt: "2026-11-12T08:00:00Z",
    expiresAt: "2026-12-12T08:00:00Z",
    ...overrides
  };
}

test("six capabilities default to not live, with shared authorization and provenance requirements", () => {
  const report = assessUnifiedIntelligenceCapabilityEvidence({ workspaceId, asOf });
  assert.equal(report.capabilities.length, 6);
  assert.equal(report.customerReleaseApproved, false);
  assert.equal(report.productionLive, false);
  assert.equal(report.proofStoreAuthorityVerified, false);
  assert.ok(report.capabilities.every(c => c.status === "evidence_incomplete"));
  assert.ok(report.capabilities.every(c => c.missingChecks.includes("source_rights")));
  assert.ok(report.capabilities.every(c => c.missingChecks.includes("tenant_authorization")));
});

test("synthetic, expired, revoked, wrong-tenant or self-approved claims never satisfy checks", () => {
  const invalid = [
    receipt("source_rights", 1, { testFixture: true }),
    receipt("tenant_authorization", 2, { expiresAt: "2026-11-01T00:00:00Z" }),
    receipt("provenance_lineage", 3, { revoked: true }),
    receipt("durable_audit", 4, { workspaceId: "novapharm_internal_beta" }),
    receipt("canonical_identity", 5, { approverId: "reviewer_001" })
  ];
  const report = assessUnifiedIntelligenceCapabilityEvidence({ workspaceId, asOf, receipts: invalid });
  assert.ok(report.capabilities.every(c => c.coveredCandidateChecks === 0));
});

test("candidate evidence cannot be promoted to live, even when all checks are represented", () => {
  const receipts = checks.map((check, index) => receipt(check, index + 1));
  const report = assessUnifiedIntelligenceCapabilityEvidence({ workspaceId, asOf, receipts });
  assert.ok(report.capabilities.every(c => c.missingChecks.length === 0));
  assert.ok(report.capabilities.every(c => c.status === "candidate_requires_independent_runtime_acceptance"));
  assert.equal(report.customerReleaseApproved, false);
  assert.equal(report.productionLive, false);
});

test("duplicate/conflicting check receipts block the affected capability", () => {
  const receipts = checks.map((check, index) => receipt(check, index + 1));
  receipts.push(receipt("source_rights", checks.length + 1));
  const report = assessUnifiedIntelligenceCapabilityEvidence({ workspaceId, asOf, receipts });
  assert.ok(report.capabilities.every(c => c.missingChecks.includes("source_rights")));
});

test("invalid input fails closed", () => {
  assert.throws(() => assessUnifiedIntelligenceCapabilityEvidence({workspaceId:"../../unsafe",asOf}), /Invalid/);
  assert.throws(() => assessUnifiedIntelligenceCapabilityEvidence({workspaceId,asOf:"tomorrow"}), /Invalid/);
  assert.throws(() => assessUnifiedIntelligenceCapabilityEvidence({workspaceId,asOf,receipts:{}}), /Invalid/);
});
