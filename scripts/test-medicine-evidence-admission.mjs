import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { prepareOfficialMedicineEvidenceCandidate } from "../src/core/medicine-evidence-admission.mjs";

const digest = input => createHash("sha256").update(input).digest("hex");
const h = digit => digit.repeat(64);
const make = () => {
  const sourceVersion = "epd-snomed-2026-08";
  const resourceId = "epd-202608-partition-01";
  const resourceSha256 = h("b");
  const rows = [{
    source_id: "nhsbsa_english_prescribing",
    source_version: sourceVersion, resource_id: resourceId,
    resource_sha256: resourceSha256,
    row_id: "publisher-record-1", row_sha256: h("a"),
    period: "2026-08", jurisdiction: "England", geography_id: "QWO",
    metric: "items", unit: "items", value: 4,
    code_system: "BNF_PRESENTATION_CODE", source_code: "0302000N0BBAYBA",
    medicine_identity: "medicine:approved:1",
    identity_proof: {
      matchType: "verified_exact", verifiedByAuthority: true,
      sourceCode: "0302000N0BBAYBA", codeSystem: "BNF_PRESENTATION_CODE",
      medicineIdentity: "medicine:approved:1", sourceVersion,
      mappingRevision: "source-code-map-v1", referenceSha256: h("c"),
    },
  }];
  return {
    snapshot: {
      sourceId: "nhsbsa_english_prescribing", sourceVersion, resourceId,
      resourceSha256, period: "2026-08", jurisdiction: "England",
      sourceHashIndependentlyVerified: true, fullPartitionVerified: true,
      expectedRows: 1, expectedTotal: 4, metric: "items", unit: "items",
      expectedRowsDigest: digest(rows.map(r => r.row_id + ":" + r.row_sha256).join("\n")),
      containsPatientData: false,
    },
    rows,
    grant: {
      status: "active", verifiedByRightsAuthority: true,
      sourceId: "nhsbsa_english_prescribing", sourceVersion, resourceId,
      allowedPurposes: ["private_observed_prescribing_ingestion"],
      commercialAnalysisApproved: true, datasetReuseApproved: true,
      termsSha256: h("d"),
      termsUrl: "https://opendata.nhsbsa.net/pages/terms-and-conditions",
      rightsRevision: "licensed-reviewed-v1", reviewerId: "compliance-reviewer-1",
      reviewedAt: "2026-11-10T06:00:00Z",
      validFrom: "2026-11-10T06:00:00Z",
      thirdPartyTerminologyReuseApproved: true,
      terminologyRightsRevision: "bnf-rights-v1",
    },
    release: {
      environment: "private_staging", verifiedServerSide: true,
      customerPublishingEnabled: false, allowPatientData: false,
      checkedAt: "2026-11-11T06:00:00Z",
    },
  };
};
function refused(x, code) {
  assert.throws(() => prepareOfficialMedicineEvidenceCandidate(x), err => err.code === code);
}
test("synthetic fixture is a private candidate, NEVER an accepted observation", () => {
  const result = prepareOfficialMedicineEvidenceCandidate(make());
  assert.equal(result.rowCount, 1);
  assert.equal(result.acceptedObservations, 0);
  assert.equal(result.customerPublishApproved, false);
  assert.equal(result.records[0].status, "candidate_not_accepted");
  assert.equal(result.records[0].code_system, "BNF_PRESENTATION_CODE");
  assert.equal(result.records[0].source_code, "0302000N0BBAYBA");
  assert.equal(typeof result.records[0].source_code, "string");
  assert.equal(result.requiresCurrentRightsRecheck, true);
  assert.equal(result.requiresIndependentAtomicCommit, true);
  assert.equal(result.requiresAuditReceipt, true);
});
test("missing, revoked, expired, wrong-version and untrusted grants fail closed", () => {
  let x = make(); refused({ ...x, grant: null }, "source_rights_not_accepted");
  x = make(); x.grant.status = "revoked"; refused(x, "source_rights_not_accepted");
  x = make(); x.grant.verifiedByRightsAuthority = false;
  refused(x, "source_rights_not_accepted");
  x = make(); x.grant.sourceVersion = "other"; refused(x, "source_rights_not_accepted");
  x = make(); x.grant.validUntil = "2026-11-10T07:00:00Z";
  refused(x, "source_rights_expired_or_future");
});
test("no unlicensed BNF/SNOMED reuse or inferred medicine equivalence", () => {
  let x = make(); x.grant.thirdPartyTerminologyReuseApproved = false;
  refused(x, "terminology_rights_unverified");
  x = make(); x.rows[0].identity_proof.matchType = "fuzzy";
  refused(x, "medicine_identity_unresolved");
  x = make(); x.rows[0].identity_proof.medicineIdentity = "different";
  refused(x, "medicine_identity_unresolved");
  x = make(); x.rows[0].identity_proof.verifiedByAuthority = false;
  refused(x, "medicine_identity_unresolved");
});
test("verified publisher partition counts, totals, hashes and units are mandatory", () => {
  let x = make(); x.snapshot.fullPartitionVerified = false;
  refused(x, "unverified_source_snapshot");
  x = make(); x.snapshot.expectedRows = 2;
  refused(x, "partition_count_not_reconciled");
  x = make(); x.snapshot.expectedTotal = 9;
  refused(x, "partition_total_not_reconciled");
  x = make(); x.snapshot.expectedRowsDigest = h("a");
  refused(x, "partition_digest_mismatch");
  x = make(); x.rows[0].resource_sha256 = h("c");
  refused(x, "source_row_invalid");
  x = make(); x.rows[0].unit = "GBP";
  refused(x, "source_row_invalid");
});
test("patient fields, unrecognised measures, cross-country rows and invalid values fail closed", () => {
  let x = make(); x.snapshot.containsPatientData = true;
  refused(x, "unverified_source_snapshot");
  x = make(); x.rows[0].patient_name = "example";
  refused(x, "unapproved_row_schema");
  x = make(); x.rows[0].metric = "sales";
  refused(x, "source_row_invalid");
  x = make(); x.rows[0].jurisdiction = "United States";
  refused(x, "source_row_invalid");
  x = make(); x.rows[0].value = Number.NaN;
  refused(x, "source_row_invalid");
});
test("duplicate official row IDs and hashes cannot inflate counts", () => {
  const x = make();
  x.rows.push({ ...x.rows[0] });
  x.snapshot.expectedRows = 2;
  x.snapshot.expectedTotal = 8;
  x.snapshot.expectedRowsDigest = digest(x.rows.map(r =>
    r.row_id + ":" + r.row_sha256).join("\n"));
  refused(x, "duplicate_source_row");
});
test("customer publish, other sources, fabricated licence terms and client-origin releases fail", () => {
  let x = make(); x.release.customerPublishingEnabled = true;
  refused(x, "release_not_private");
  x = make(); x.snapshot.sourceId = "openfda_drug";
  refused(x, "unverified_source_snapshot");
  x = make(); x.grant.termsUrl = "https://example.com/terms";
  refused(x, "source_rights_not_accepted");
  x = make(); x.release.verifiedServerSide = false;
  refused(x, "release_not_private");
});

test("G1 preserves the exact source code needed for G2, never a name-based guess", () => {
  const input = make();
  input.rows[0].source_code = "001234567890";
  input.rows[0].identity_proof.sourceCode = "001234567890";
  const result = prepareOfficialMedicineEvidenceCandidate(input);
  assert.equal(result.records[0].source_code, "001234567890");
  assert.equal(result.records[0].code_system, "BNF_PRESENTATION_CODE");
  assert.equal(result.records[0].source_code.startsWith("00"), true);
  const other = make();
  other.rows[0].code_system = "SNOMED_CODE";
  other.rows[0].identity_proof.codeSystem = "SNOMED_CODE";
  const candidate = prepareOfficialMedicineEvidenceCandidate(other);
  assert.equal(candidate.records[0].code_system, "SNOMED_CODE");
  assert.equal(candidate.records[0].source_code, "0302000N0BBAYBA");
});
