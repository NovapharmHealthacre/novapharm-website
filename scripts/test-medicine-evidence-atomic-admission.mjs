import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { admitPrivateOfficialMedicineEvidence } from "../src/core/medicine-evidence-atomic-admission.mjs";

const sha = value => createHash("sha256").update(value).digest("hex");
const h = char => char.repeat(64);
const when = "2026-11-12T12:00:00Z";
const sample = () => {
  const row = {
    source_id: "nhsbsa_english_prescribing",
    source_version: "epd-snomed-2026-08",
    resource_id: "epd-202608-partition-01",
    resource_sha256: h("a"),
    row_id: "publisher-row-1",
    row_sha256: h("b"),
    period: "2026-08",
    jurisdiction: "England",
    geography_id: "NHS-AREA-1",
    metric: "items", unit: "items", value: 4,
    code_system: "BNF_PRESENTATION_CODE",
    source_code: "0302000N0BBAYBA",
    medicine_identity: "medicine:approved:1",
    identity_proof: {
      matchType: "verified_exact", verifiedByAuthority: true,
      sourceCode: "0302000N0BBAYBA", codeSystem: "BNF_PRESENTATION_CODE",
      medicineIdentity: "medicine:approved:1",
      sourceVersion: "epd-snomed-2026-08",
      mappingRevision: "mapping-reviewed-v1", referenceSha256: h("c")
    }
  };
  return {
    // Deliberately fake official-like values: fixtures never grant source rights.
    rows: [row],
    snapshot: {
      sourceId: row.source_id, sourceVersion: row.source_version,
      resourceId: row.resource_id, resourceSha256: row.resource_sha256,
      period: row.period, jurisdiction: "England",
      sourceHashIndependentlyVerified: true, fullPartitionVerified: true,
      expectedRows: 1, expectedTotal: 4, metric: "items", unit: "items",
      expectedRowsDigest: sha(row.row_id + ":" + row.row_sha256),
      containsPatientData: false
    },
    grant: {
      status: "active", verifiedByRightsAuthority: true,
      sourceId: row.source_id, sourceVersion: row.source_version,
      resourceId: row.resource_id,
      allowedPurposes: ["private_observed_prescribing_ingestion"],
      commercialAnalysisApproved: true, datasetReuseApproved: true,
      termsSha256: h("d"),
      termsUrl: "https://opendata.nhsbsa.net/pages/terms-and-conditions",
      rightsRevision: "rights-reviewed-v1", reviewerId: "test-compliance-reviewer",
      reviewedAt: "2026-11-11T00:00:00Z",
      validFrom: "2026-11-11T00:00:00Z",
      thirdPartyTerminologyReuseApproved: true,
      terminologyRightsRevision: "test-terminology-revision"
    },
    release: {
      environment: "private_staging", verifiedServerSide: true,
      customerPublishingEnabled: false, allowPatientData: false,
      checkedAt: when
    },
    authority: {
      verifiedBySessionService: true, workspaceId: "novapharm-internal-staging",
      principalId: "test_board_one", authorityRevision: "board-revision-v1",
      scopes: ["board"], customerAccess: false
    },
    now: new Date(when)
  };
};
function adapters(input = sample()) {
  const rights = () => ({
    verifiedByRightsAuthority: true, status: "active", revoked: false,
    workspaceId: "novapharm-internal-staging",
    sourceId: input.snapshot.sourceId,
    sourceVersion: input.snapshot.sourceVersion,
    resourceId: input.snapshot.resourceId,
    resourceSha256: input.snapshot.resourceSha256,
    rightsRevision: input.grant.rightsRevision,
    termsSha256: input.grant.termsSha256,
    terminologyRightsRevision: input.grant.terminologyRightsRevision,
    allowedPurposes: ["private_observed_prescribing_ingestion"],
    datasetReuseApproved: true, commercialAnalysisApproved: true,
    thirdPartyTerminologyReuseApproved: true,
    checkedAt: when, validFrom: "2026-11-11T00:00:00Z"
  });
  const read = p => ({
    durable: true, workspaceId: p.workspaceId, transactionId: p.transactionId,
    eventId: p.eventId, manifestSha256: p.manifestSha256,
    acceptedRows: p.expectedRows, auditCommitted: true,
    customerPublishApproved: false
  });
  return {
    verifyCurrentAuthority: async () => true,
    verifyCurrentRights: async () => rights(),
    commitAtomic: async p => ({
      committed: true, transactionId: "staging-test-transaction-01",
      eventId: p.eventId, manifestSha256: p.manifestSha256,
      workspaceId: p.workspaceId, rowCount: p.rowCount,
      customerPublishApproved: false
    }),
    readBackCommit: async p => read(p),
    rights, read
  };
}
async function denied(input, code) {
  await assert.rejects(admitPrivateOfficialMedicineEvidence(input),
    err => err.code === code);
}

test("authoritative server fixtures can exercise the private atomic admission contract, not certify production", async () => {
  const input = sample();
  let verified = 0, writes = 0, reads = 0;
  const mock = adapters(input);
  const result = await admitPrivateOfficialMedicineEvidence({
    ...input, ...mock,
    verifyCurrentAuthority: async () => { verified += 1; return true; },
    commitAtomic: async p => {
      writes += 1;
      assert.equal(p.workspaceId, "novapharm-internal-staging");
      assert.equal(p.records[0].status, "candidate_not_accepted");
      assert.equal(p.records[0].medicine_identity, "medicine:approved:1");
      assert.equal(p.customerPublishApproved, false);
      assert.equal(p.rowCount, 1);
      assert.equal(typeof p.manifestSha256, "string");
      return mock.commitAtomic(p);
    },
    readBackCommit: async p => { reads += 1; return mock.readBackCommit(p); }
  });
  assert.equal(result.status, "privately_admitted_requires_independent_release");
  assert.equal(result.acceptedPrivateRows, 1);
  assert.equal(result.customerPublishApproved, false);
  assert.equal(result.customerAccessEnabled, false);
  assert.equal(result.aiExecutionApproved, false);
  assert.equal(result.productionCertified, false);
  assert.equal(result.requiresIndependentSourceAndScientificAcceptance, true);
  assert.deepEqual([verified, writes, reads], [2, 1, 1]);
});

test("missing, wrong-tenant, customer or untrusted session never reaches source rights or writes", async () => {
  for (const bad of [
    null, { ...sample().authority, workspaceId: "another-tenant" },
    { ...sample().authority, customerAccess: true },
    { ...sample().authority, verifiedBySessionService: false },
    { ...sample().authority, scopes: ["founder-shell-read-only"] },
  ]) {
    let touched = 0;
    const input = sample();
    await denied({
      ...input, authority: bad,
      verifyCurrentRights: async () => { touched += 1; return null; },
      commitAtomic: async () => { touched += 1; }
    }, "trusted_private_authority_required");
    assert.equal(touched, 0);
  }
});

test("rights missing, revoked, stale and terminology conflict block atomic write", async () => {
  for (const defect of [
    null,
    { revoked: true },
    { status: "revoked" },
    { checkedAt: "2026-11-12T11:58:00Z" },
    { sourceVersion: "unmatched-revision" },
    { thirdPartyTerminologyReuseApproved: false },
    { workspaceId: "other-tenant" },
    { validUntil: "2026-11-12T11:59:00Z" }
  ]) {
    const input = sample();
    const mock = adapters(input);
    let written = 0;
    await denied({
      ...input, ...mock,
      verifyCurrentRights: async () => defect === null ? null : { ...mock.rights(), ...defect },
      commitAtomic: async () => { written++; }
    }, "rights_revoked_before_commit");
    assert.equal(written, 0);
  }
});

test("fuzzy match, patient field, wrong source and unbalanced totals fail before any commit", async () => {
  const changes = [
    x => { x.rows[0].identity_proof.matchType = "fuzzy"; },
    x => { x.rows[0].patient_name = "Not allowed"; },
    x => { x.snapshot.sourceId = "openfda_drug"; },
    x => { x.snapshot.expectedTotal = 6; },
  ];
  for (const change of changes) {
    const input = sample();
    change(input);
    const mock = adapters(input);
    let written = false;
    await assert.rejects(admitPrivateOfficialMedicineEvidence({
      ...input, ...mock, commitAtomic: async () => { written = true; }
    }), /Medicine evidence admission denied/u);
    assert.equal(written, false);
  }
});

test("false atomic receipt and missing independent audit readback prevent admitted status", async () => {
  const input = sample(); const mock = adapters(input);
  await denied({ ...input, ...mock,
    commitAtomic: async p => ({ ...await mock.commitAtomic(p), manifestSha256: h("f") })
  }, "atomic_commit_not_attested");
  await denied({ ...input, ...mock,
    readBackCommit: async p => ({ ...mock.read(p), auditCommitted: false })
  }, "durable_audit_or_manifest_missing");
  await denied({ ...input, ...mock,
    readBackCommit: async p => ({ ...mock.read(p), acceptedRows: 0 })
  }, "durable_audit_or_manifest_missing");
});

test("rights revoked after a durable transaction refuse release and require quarantine", async () => {
  const input = sample(); const mock = adapters(input);
  let checks = 0;
  await denied({ ...input, ...mock,
    verifyCurrentRights: async () => (++checks === 1 ? mock.rights() : { ...mock.rights(), revoked: true })
  }, "rights_revoked_after_commit");
  assert.equal(checks, 2);
});

test("authority revocation after commit prevents authorised result", async () => {
  const input = sample(); const mock = adapters(input);
  let checks = 0;
  await denied({ ...input, ...mock,
    verifyCurrentAuthority: async () => ++checks === 1
  }, "authority_revoked_after_commit");
});

test("release timestamp and absent transactional adapters fail closed", async () => {
  const input = sample(); const mock = adapters(input);
  await denied({ ...input, ...mock, now: new Date("2026-11-12T12:03:00Z") },
    "release_freshness_invalid");
  await denied({ ...input, ...mock, commitAtomic: undefined },
    "trusted_storage_adapters_required");
});
