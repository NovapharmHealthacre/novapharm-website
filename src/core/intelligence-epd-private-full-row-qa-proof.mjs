/**
 * August 2026 NHSBSA EPD — cross-check two private source-quarantine
 * receipts. This is a pure data-integrity/quality consistency assessment,
 * NOT source-rights approval, licensed medicine identity, customer data,
 * admission transaction or independently authenticated S3 readback.
 *
 * Input receipts must be loaded by a trusted private S3 reader. Caller-
 * supplied JSON alone cannot establish source authenticity or legal rights.
 */
const expected = Object.freeze({
  period: "2026-08",
  resource: "EPD_SNOMED_202608",
  sourceId: "nhsbsa_english_prescribing",
  archiveVersion: "a0SydhvR0d3vfShP3CTdmXjAQwGLysG9",
  qualityVersion: "HWfJazjlpOkx80lxqqe_nPSavfzQvHzo",
  zipSha256: "6b0b99e22968ac2f7eb730511fd3c3b9d59a1e47acd814053c573a8976ca5551",
  csvSha256: "1a3ee72477c8e999cabd3284544bf370f78eb3045529191c0062bf74c9a1017b",
  zipBytes: 644232845,
  csvBytes: 7432815985,
  sourceRows: 17754211,
  sourceColumns: 27,
  missingSnomedCodes: 10972,
  apixabanRows: 50593,
  apixabanPresentationGroups: 5,
  reportedItems: 102050994,
  nicGbp: "943194933.77",
  actualCostGbp: "904525399.92187",
});
const fail = code => Object.assign(new Error("Private EPD source QA proof unavailable."), {
  code, statusCode: 409,
});
const plain = x => x != null && typeof x === "object" && !Array.isArray(x) &&
  Object.getPrototypeOf(x) === Object.prototype;
const integer = x => Number.isSafeInteger(x) && x >= 0;
const exact = (a, b) => a === b;
const sourcePin = (doc, periodKey = "period") =>
  doc.source_id === expected.sourceId &&
  doc.resource === expected.resource &&
  doc[periodKey] === expected.period;
const blocked = doc => doc.accepted_observations === 0 &&
  doc.customer_publish_approved === false &&
  doc.ai_processing_approved === false &&
  doc.commercial_redistribution_approved === false &&
  doc.production_promoted === false;
/**
 * @param {object} input Trusted server supplies immutable S3 JSON receipts and
 * exact S3 version IDs read separately. Neither JSON nor these inputs are a
 * cryptographic signature; verify IAM, versions, size and SHA outside this
 * pure function. No third-party BNF/SNOMED terms leave the returned result.
 */
export function assessPrivateEpdAugust2026FullRowQa({
  archive, qualityReceipt, archiveS3Version, qualityS3Version,
} = {}) {
  if (!plain(archive) || !plain(qualityReceipt) ||
      archiveS3Version !== expected.archiveVersion ||
      qualityS3Version !== expected.qualityVersion) {
    throw fail("missing_or_changed_immutable_source_receipt");
  }
  if (!sourcePin(archive, "reporting_period") ||
      archive.schema_version !== "npi-private-source-s3-verified-v1" ||
      archive.source_sha256 !== expected.zipSha256 ||
      archive.decompressed_csv_sha256 !== expected.csvSha256 ||
      archive.source_bytes !== expected.zipBytes ||
      archive.decompressed_csv_bytes !== expected.csvBytes ||
      archive.s3_integrity_readback !== "full_bytes_sha256_pass" ||
      archive.rights_grants_created !== 0 ||
      archive.independent_terminology_rights_approved !== false ||
      archive.production_release_status !==
        "BLOCKED_PENDING_RIGHTS_RECONCILIATION_AND_INDEPENDENT_ACCEPTANCE" ||
      !blocked(archive)) {
    throw fail("archive_integrity_or_release_gate_mismatch");
  }
  if (!sourcePin(qualityReceipt) ||
      qualityReceipt.schema_version !== "npi-private-nhsbsa-epd-full-row-quality-v1" ||
      qualityReceipt.zip_sha256 !== expected.zipSha256 ||
      qualityReceipt.csv_sha256 !== expected.csvSha256 ||
      qualityReceipt.zip_bytes !== expected.zipBytes ||
      qualityReceipt.csv_bytes !== expected.csvBytes ||
      qualityReceipt.matches_independent_private_drive_audit !== true ||
      qualityReceipt.independently_publisher_certified_totals !== false ||
      qualityReceipt.third_party_terminology_rights_approved !== false ||
      qualityReceipt.source_rights_approved !== false ||
      qualityReceipt.release_state !== "BLOCKED_PENDING_RIGHTS_AND_INDEPENDENT_RELEASE" ||
      !blocked(qualityReceipt)) {
    throw fail("quality_source_integrity_or_release_gate_mismatch");
  }
  const quality = qualityReceipt.quality;
  if (!plain(quality) || !integer(quality.records) ||
      quality.records !== expected.sourceRows ||
      quality.columns !== expected.sourceColumns ||
      quality.missing_snomed_codes !== expected.missingSnomedCodes ||
      quality.apixaban_rows !== expected.apixabanRows ||
      quality.items_total !== expected.reportedItems ||
      quality.nic_total !== expected.nicGbp ||
      quality.actual_cost_total !== expected.actualCostGbp ||
      !plain(quality.apixaban_presentations)) {
    throw fail("private_quality_reconciliation_mismatch");
  }
  const presentations = Object.entries(quality.apixaban_presentations);
  if (presentations.length !== expected.apixabanPresentationGroups ||
      presentations.some(([code, rows]) => !/^[A-Z0-9]{15}$/u.test(code) ||
        !integer(rows) || rows === 0) ||
      presentations.reduce((sum, [, rows]) => sum + rows, 0) !== expected.apixabanRows ||
      !integer(quality.apixaban_missing_snomed) ||
      quality.apixaban_missing_snomed > expected.apixabanRows ||
      !["missing_bnf_presentation_codes", "missing_practice_codes",
        "row_length_mismatches", "unexpected_reporting_periods",
        "invalid_items", "invalid_quantity", "invalid_nic",
        "invalid_actual_cost"].every(k => quality[k] === 0)) {
    throw fail("source_schema_or_presentation_reconciliation_mismatch");
  }
  return Object.freeze({
    contract: "novapharm.intelligence.private-epd-aug2026-source-qa.v1",
    state: "quarantine_quality_consistent_pending_independent_release",
    sourceId: expected.sourceId,
    period: expected.period,
    sourceFile: Object.freeze({
      archiveSha256: expected.zipSha256,
      csvSha256: expected.csvSha256,
      archiveBytes: expected.zipBytes,
      csvBytes: expected.csvBytes,
    }),
    scan: Object.freeze({
      records: expected.sourceRows,
      columns: expected.sourceColumns,
      missingSnomedCodes: expected.missingSnomedCodes,
      apixabanRowsPrivateUnapproved: expected.apixabanRows,
      apixabanPresentationGroups: expected.apixabanPresentationGroups,
    }),
    // Two injected JSON receipts cannot independently authenticate their
    // own S3 versions, issuer or external publisher's population controls.
    independentS3ReadbackAttestedByThisFunction: false,
    publisherControlTotalsIndependentlyCertified: false,
    exactMedicineIdentityAccepted: false,
    approvedSourceRights: false,
    thirdPartyTerminologyRightsApproved: false,
    admittedMedicineObservations: 0,
    customerPublishApproved: false,
    modelEgressApproved: false,
    productionAccepted: false,
  });
}
