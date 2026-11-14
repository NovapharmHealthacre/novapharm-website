import assert from "node:assert/strict";
import test from "node:test";
import { assessPrivateEpdAugust2026FullRowQa } from "../src/core/intelligence-epd-private-full-row-qa-proof.mjs";

const archiveS3Version = "a0SydhvR0d3vfShP3CTdmXjAQwGLysG9";
const qualityS3Version = "HWfJazjlpOkx80lxqqe_nPSavfzQvHzo";
const zipHash = "6b0b99e22968ac2f7eb730511fd3c3b9d59a1e47acd814053c573a8976ca5551";
const csvHash = "1a3ee72477c8e999cabd3284544bf370f78eb3045529191c0062bf74c9a1017b";
const flags = Object.freeze({
  accepted_observations: 0,
  customer_publish_approved: false,
  ai_processing_approved: false,
  commercial_redistribution_approved: false,
  production_promoted: false,
});
function fixture() {
  return {
    archiveS3Version, qualityS3Version,
    archive: {
      source_id: "nhsbsa_english_prescribing",
      resource: "EPD_SNOMED_202608",
      reporting_period: "2026-08",
      schema_version: "npi-private-source-s3-verified-v1",
      source_sha256: zipHash,
      decompressed_csv_sha256: csvHash,
      source_bytes: 644232845,
      decompressed_csv_bytes: 7432815985,
      s3_integrity_readback: "full_bytes_sha256_pass",
      rights_grants_created: 0,
      independent_terminology_rights_approved: false,
      production_release_status: "BLOCKED_PENDING_RIGHTS_RECONCILIATION_AND_INDEPENDENT_ACCEPTANCE",
      ...flags,
    },
    qualityReceipt: {
      source_id: "nhsbsa_english_prescribing",
      resource: "EPD_SNOMED_202608",
      period: "2026-08",
      schema_version: "npi-private-nhsbsa-epd-full-row-quality-v1",
      zip_sha256: zipHash,
      csv_sha256: csvHash,
      zip_bytes: 644232845,
      csv_bytes: 7432815985,
      matches_independent_private_drive_audit: true,
      independently_publisher_certified_totals: false,
      third_party_terminology_rights_approved: false,
      source_rights_approved: false,
      release_state: "BLOCKED_PENDING_RIGHTS_AND_INDEPENDENT_RELEASE",
      quality: {
        records: 17754211, columns: 27,
        missing_snomed_codes: 10972,
        apixaban_rows: 50593,
        apixaban_missing_snomed: 0,
        // Synthetic fixture code strings only, not actual BNF mappings.
        apixaban_presentations: {
          AAAAAAAAAAAAAAA: 25298,
          BBBBBBBBBBBBBBB: 24175,
          CCCCCCCCCCCCCCC: 71,
          DDDDDDDDDDDDDDD: 394,
          EEEEEEEEEEEEEEE: 655,
        },
        items_total: 102050994,
        nic_total: "943194933.77",
        actual_cost_total: "904525399.92187",
        missing_bnf_presentation_codes: 0,
        missing_practice_codes: 0,
        row_length_mismatches: 0,
        unexpected_reporting_periods: 0,
        invalid_items: 0,
        invalid_quantity: 0,
        invalid_nic: 0,
        invalid_actual_cost: 0,
      },
      ...flags,
    },
  };
}
const rejected = code => error => error?.code === code && error?.statusCode === 409;
test("two pinned private receipts produce a data-quality result, never a rights grant or production metric", () => {
  const result = assessPrivateEpdAugust2026FullRowQa(fixture());
  assert.equal(result.state, "quarantine_quality_consistent_pending_independent_release");
  assert.equal(result.scan.records, 17754211);
  assert.equal(result.scan.apixabanRowsPrivateUnapproved, 50593);
  assert.equal(result.scan.apixabanPresentationGroups, 5);
  assert.equal(result.scan.missingSnomedCodes, 10972);
  assert.equal(result.sourceFile.csvSha256, csvHash);
  for (const k of [
    "independentS3ReadbackAttestedByThisFunction",
    "publisherControlTotalsIndependentlyCertified",
    "exactMedicineIdentityAccepted", "approvedSourceRights",
    "thirdPartyTerminologyRightsApproved", "customerPublishApproved",
    "modelEgressApproved", "productionAccepted",
  ]) assert.equal(result[k], false, k);
  assert.equal(result.admittedMedicineObservations, 0);
  assert.doesNotMatch(JSON.stringify(result), /AAAAAAAAAAAAAAA|BNF_PRESENTATION_NAME|practice_code/iu);
});

test("a substituted S3 version or mismatched pinned source digest is denied", () => {
  for (const patch of [
    { archiveS3Version: "wrong-version" },
    { qualityS3Version: "wrong-version" },
    { archive: { source_sha256: "0".repeat(64) } },
    { archive: { decompressed_csv_sha256: "0".repeat(64) } },
    { qualityReceipt: { csv_sha256: "0".repeat(64) } },
    { qualityReceipt: { zip_bytes: 644232846 } },
  ]) {
    const value = fixture();
    for (const [field, change] of Object.entries(patch)) {
      if (typeof change === "object") Object.assign(value[field], change);
      else value[field] = change;
    }
    assert.throws(() => assessPrivateEpdAugust2026FullRowQa(value), e => e.statusCode === 409);
  }
});

test("acceptance or source-rights values changed to true must never pass as the pinned quarantine receipt", () => {
  const deniedChanges = [
    ["archive", "accepted_observations", 1],
    ["archive", "rights_grants_created", 1],
    ["archive", "customer_publish_approved", true],
    ["archive", "ai_processing_approved", true],
    ["qualityReceipt", "source_rights_approved", true],
    ["qualityReceipt", "third_party_terminology_rights_approved", true],
    ["qualityReceipt", "independently_publisher_certified_totals", true],
    ["qualityReceipt", "production_promoted", true],
    ["qualityReceipt", "matches_independent_private_drive_audit", false],
  ];
  for (const [target, key, value] of deniedChanges) {
    const input = fixture();
    input[target][key] = value;
    assert.throws(() => assessPrivateEpdAugust2026FullRowQa(input),
      e => e.statusCode === 409, target + "." + key);
  }
});

test("period mismatch, impossible source counts and altered full-row totals fail closed", () => {
  for (const [field, value] of [
    ["records", 17754210], ["columns", 26], ["missing_snomed_codes", -1],
    ["apixaban_rows", 50592], ["items_total", 102050993],
    ["nic_total", "943194933.76"], ["actual_cost_total", "904525399.92186"],
  ]) {
    const input = fixture();
    input.qualityReceipt.quality[field] = value;
    assert.throws(() => assessPrivateEpdAugust2026FullRowQa(input),
      rejected("private_quality_reconciliation_mismatch"), field);
  }
  const input = fixture();
  input.archive.reporting_period = "2026-07";
  assert.throws(() => assessPrivateEpdAugust2026FullRowQa(input),
    rejected("archive_integrity_or_release_gate_mismatch"));
});

test("presentation reconciliation refuses duplicates, invalid codes, unbalanced rows and bad zero controls", () => {
  const changes = [
    input => { input.qualityReceipt.quality.apixaban_presentations.AAAAAAAAAAAAAAA -= 1; },
    input => { input.qualityReceipt.quality.apixaban_presentations.BAD = 0; },
    input => { input.qualityReceipt.quality.apixaban_missing_snomed = 60000; },
    input => { input.qualityReceipt.quality.missing_practice_codes = 1; },
    input => { input.qualityReceipt.quality.invalid_items = 1; },
  ];
  for (const edit of changes) {
    const input = fixture();
    edit(input);
    assert.throws(() => assessPrivateEpdAugust2026FullRowQa(input),
      rejected("source_schema_or_presentation_reconciliation_mismatch"));
  }
});
