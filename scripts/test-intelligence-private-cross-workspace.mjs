import assert from "node:assert/strict";
import test from "node:test";
import { composePrivateMedicineCrossWorkspace } from "../src/core/intelligence-private-cross-workspace.mjs";

const tenantId = "npi-pilot-alpha";
const medicineId = "medicine-" + "a".repeat(32);
const asOf = "2026-11-12T10:00:00.000Z";
const authority = Object.freeze({
  verifiedServerSide: true, mfaVerified: true, sessionActive: true,
  tenantId, subjectId: "synthetic-subject-alpha", authorityRevision: "synthetic-authority-01",
  accessScopes: ["board"]
});
const release = Object.freeze({
  verifiedServerSide: true, environment: "private_staging", privateResearchApproved: true,
  customerAccessEnabled: false, customerPublishingEnabled: false, outboundActionsEnabled: false
});
const source = Object.freeze({
  sourceId: "fixture_official_source", sourceVersion: "fixture-2026-11", rightsRevision: "fixture-rights-01",
  sourceSha256: "a".repeat(64), status: "accepted", rightsStatus: "active",
  allowedPurposes: ["internal_cross_workspace_research"], thirdPartyRightsReviewed: true,
  verifiedServerSide: true, nonSampleAccepted: true, validFrom: "2026-01-01T00:00:00.000Z",
  validUntil: null, revokedAt: null
});
const types = [
  "identity_code", "pack_relationship", "source_ingestion", "partition_reconciliation",
  "shortage_notice", "tender_notice", "trial_registration", "capital_event",
  "scientific_evaluation", "tenant_isolation_test", "restore_drill"
];
function evidence(kind, i, overrides = {}) {
  return {
    evidenceId: "synthetic-evidence-" + i, publisherRecordId: "synthetic-public-record-" + i,
    tenantId, medicineId, sourceId: source.sourceId, sourceVersion: source.sourceVersion,
    rightsRevision: source.rightsRevision, sourceSha256: source.sourceSha256,
    provenanceSha256: "b".repeat(64), kind,
    observedAt: "2026-11-01T00:00:00.000Z", recordedAt: "2026-11-02T00:00:00.000Z",
    validFrom: "2026-11-01T00:00:00.000Z", validUntil: null,
    matchStatus: "authoritative_exact", evidenceType: ["scientific_evaluation", "tenant_isolation_test", "audit_integrity_test", "restore_drill", "partition_reconciliation", "source_revocation_test"].includes(kind) ? "derived_metric" : "observed_fact",
    verifiedServerSide: true, acceptedFromNonSampleData: true, ...overrides
  };
}
function harness(overrides = {}) {
  const actions = { verifies: 0, audits: 0 };
  const args = {
    authority, release, medicineId, asOf, sources: [source], evidence: types.map((kind, index) => evidence(kind, index)),
    async verifyCurrentAuthority(input) {
      actions.verifies++;
      assert.equal(input.tenantId, tenantId);
      assert.equal(input.medicineId, medicineId);
      assert.equal(input.rightsVector.length, 1);
      return true;
    },
    async recordAudit(input) { actions.audits++; return { eventId: input.eventId, committed: true, majorityAcknowledged: true }; },
    ...overrides
  };
  return { args, actions };
}

test("all six workstreams share an as-of medicine identity, source and private audit fence", async () => {
  const { args, actions } = harness();
  const output = await composePrivateMedicineCrossWorkspace(args);
  assert.equal(output.workstreams.length, 6);
  assert.equal(output.workstreams.reduce((n, x) => n + x.acceptedLinkedCandidateCount, 0), types.length);
  assert.ok(output.workstreams.every(x => x.status === "candidate_requires_independent_runtime_acceptance"));
  assert.equal(output.workstreams.find(x => x.id === "supply_tender_intelligence").acceptedLinkedCandidateCount, 2);
  assert.equal(output.workstreams.find(x => x.id === "biotech_capital_intelligence").acceptedLinkedCandidateCount, 2);
  assert.equal(output.customerLive, false);
  assert.equal(output.customerReleaseApproved, false);
  assert.equal(output.independentlyAccepted, false);
  assert.equal(output.sourceRightsProductionCertified, false);
  assert.deepEqual(actions, { verifies: 1, audits: 1 });
  assert.doesNotMatch(JSON.stringify(output), /patient|private clinical text|commercial forecast/iu);
});

test("an empty rights-approved source set returns six honest empty views and audits", async () => {
  const { args } = harness({ sources: [], evidence: [] });
  const result = await composePrivateMedicineCrossWorkspace({
    ...args,
    verifyCurrentAuthority: async input => input.rightsVector.length === 0,
  });
  assert.equal(result.workstreams.length, 6);
  assert.ok(result.workstreams.every(x => x.acceptedLinkedCandidateCount === 0));
});

test("unresolved medicine references are excluded from linked facts", async () => {
  const { args } = harness({ evidence: [evidence("tender_notice", 1, { matchStatus: "unresolved" })] });
  const result = await composePrivateMedicineCrossWorkspace(args);
  const tenders = result.workstreams.find(x => x.id === "supply_tender_intelligence");
  assert.equal(tenders.acceptedLinkedCandidateCount, 0);
  assert.equal(tenders.unresolvedMatchCount, 1);
  assert.deepEqual(tenders.evidenceRefs, []);
});

test("missing verified session, MFA or disabled launch boundary denies before database calls", async () => {
  for (const delta of [
    { authority: { ...authority, mfaVerified: false } },
    { authority: { ...authority, accessScopes: ["customer"] } },
    { authority: { ...authority, sessionActive: false } },
    { release: { ...release, customerAccessEnabled: true } },
    { release: { ...release, outboundActionsEnabled: true } },
    { release: { ...release, environment: "production" } }
  ]) {
    const h = harness(delta);
    await assert.rejects(() => composePrivateMedicineCrossWorkspace(h.args), x => x.statusCode === 403);
    assert.deepEqual(h.actions, { verifies: 0, audits: 0 });
  }
});

test("cross-tenant, wrong-medicine, mismatched source and duplicated evidence deny", async () => {
  for (const changed of [
    [evidence("tender_notice", 1, { tenantId: "npi-pilot-beta" })],
    [evidence("trial_registration", 1, { medicineId: "medicine-" + "f".repeat(32) })],
    [evidence("identity_code", 1, { sourceVersion: "unknown-version" })],
    [evidence("identity_code", 1), evidence("tender_notice", 1)],
    [evidence("scientific_evaluation", 1, { evidenceType: "observed_fact" })],
    [evidence("tender_notice", 1, { suspiciousText: "private text" })],
    [evidence("tender_notice", 1, { acceptedFromNonSampleData: false })]
  ]) {
    const h = harness({ evidence: changed });
    await assert.rejects(() => composePrivateMedicineCrossWorkspace(h.args), x => x.statusCode === 403);
    assert.deepEqual(h.actions, { verifies: 0, audits: 0 });
  }
});

test("stale, revoked, unverified and duplicate source-rights contracts never read", async () => {
  for (const sources of [
    [{ ...source, status: "quarantined" }],
    [{ ...source, rightsStatus: "revoked" }],
    [{ ...source, revokedAt: asOf }],
    [{ ...source, thirdPartyRightsReviewed: false }],
    [{ ...source, validUntil: "2026-11-01T00:00:00.000Z" }],
    [{ ...source, validFrom: "2026-11-20T00:00:00.000Z" }],
    [{ ...source, allowedPurposes: ["metadata_discovery_only"] }],
    [source, source],
  ]) {
    const h = harness({ sources });
    await assert.rejects(() => composePrivateMedicineCrossWorkspace(h.args), x => x.statusCode === 403);
    assert.deepEqual(h.actions, { verifies: 0, audits: 0 });
  }
});

test("future and expired evidence cannot leak into historical as-of views", async () => {
  for (const changed of [
    { observedAt: "2026-11-20T00:00:00.000Z" },
    { recordedAt: "2026-11-20T00:00:00.000Z" },
    { validFrom: "2026-11-20T00:00:00.000Z" },
    { validUntil: "2026-11-10T00:00:00.000Z" },
    { observedAt: "2026-02-30T00:00:00.000Z" },
  ]) {
    const h = harness({ evidence: [evidence("tender_notice", 1, changed)] });
    await assert.rejects(() => composePrivateMedicineCrossWorkspace(h.args), x => x.statusCode === 403);
  }
});

test("late rights revision changes, authority failure or missing majority audit deny output", async () => {
  for (const delta of [
    { verifyCurrentAuthority: async () => false },
    { verifyCurrentAuthority: async () => { throw new Error("backend confidential details"); } },
    { recordAudit: async input => ({ eventId: input.eventId, committed: true, majorityAcknowledged: false }) },
    { recordAudit: async () => { throw new Error("database confidential details"); } },
  ]) {
    const h = harness(delta);
    await assert.rejects(() => composePrivateMedicineCrossWorkspace(h.args), x => [403,503].includes(x.statusCode) && !/confidential/.test(x.message));
  }
});
