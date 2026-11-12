/**
 * Offline, server-only bridge from owner-controlled Google Drive quarantine to
 * MongoDB Atlas staging MANIFESTS. No raw records, patient data, secrets, links
 * to customer routes, rights grants, or live ingestion are written here.
 */
import { inspectQuarantinedSourceSnapshot } from "./intelligence-source-quarantine-preflight.mjs";

const driveId = /^[A-Za-z0-9_-]{20,128}$/u;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const datasets = Object.freeze({
  FDA_NDC: Object.freeze({ id: "us.fda.openfda.ndc", key: "fda-ndc-apx" }),
  EMA_SHORTAGES: Object.freeze({ id: "eu.ema.shortages", key: "ema-shortages" }),
});

function fail(reason) {
  const error = new Error("Drive staging handoff rejected: " + reason);
  error.code = "DRIVE_STAGING_HANDOFF_REJECTED";
  throw error;
}

function isoDate(value) {
  return typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/u.test(value) &&
    Number.isFinite(Date.parse(value + "T00:00:00Z")) &&
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;
}
function base(reviewedOn) {
  return {
    workspace_id: "novapharm-internal-staging",
    environment: "staging",
    customer_publish_approved: false,
    ai_processing_approved: false,
    commercial_redistribution_approved: false,
    source_rights_grant_id: null,
    medicine_identity_accepted: false,
    accepted_observations: 0,
    production_promoted: false,
    reviewed_on: reviewedOn,
  };
}

/**
 * Must be invoked on verified private bytes, NOT on caller-supplied counts or
 * an LLM prediction. Hash comparison is only against the supplied sidecar,
 * which may be untrusted; this operation never proves upstream authenticity.
 */
export function buildDriveQuarantineManifest({
  dataset, rawBytes, provenance, originalFileId, quarantineFileId,
  snapshotDate, reviewedOn,
} = {}) {
  if (!Object.hasOwn(datasets, dataset) || !driveId.test(originalFileId ?? "") ||
      !driveId.test(quarantineFileId ?? "") || originalFileId === quarantineFileId ||
      !isoDate(snapshotDate) || !isoDate(reviewedOn) || reviewedOn < snapshotDate) {
    fail("unrecognized source, Drive identifiers or dates");
  }
  const preflight = inspectQuarantinedSourceSnapshot({ dataset, rawBytes, provenance });
  if (preflight.status !== "quarantined_not_accepted" ||
      preflight.recordsAdmitted !== 0 || preflight.customerPublishApproved !== false) {
    fail("source preflight did not remain quarantined");
  }
  const spec = datasets[dataset];
  return Object.freeze({
    ...base(reviewedOn),
    _id: "drive-" + spec.key + "-" + snapshotDate.replaceAll("-", "") +
      "-" + preflight.contentSha256.slice(0, 16),
    source_id: spec.id,
    kind: "quarantined_source_copy",
    snapshot_date: snapshotDate,
    origin_file_id: originalFileId,
    quarantine_file_id: quarantineFileId,
    sha256: preflight.contentSha256,
    byte_size: rawBytes.byteLength,
    record_count: preflight.inspectedRecords,
    record_grain: preflight.coverage,
    unique_key: preflight.identifier,
    unique_key_count: preflight.distinctIdentifiers,
    status: "quarantined_not_accepted",
    quality_exceptions: Object.freeze({ ...preflight.qualityExceptions }),
    required_field_exceptions: preflight.requiredFieldExceptions,
    copied_byte_integrity: preflight.copiedByteIntegrity,
    publisher_authenticity_verified: false,
    publisher_url: provenance.source_url,
    rights_status: "source_and_field_review_required",
  });
}

/**
 * Records the exact NHSBSA EPD publisher resource discovered in the official
 * source registry. Discovery is NOT download verification or dataset admission.
 */
export function buildEpdResourceLocator({ resourceId, period, resourceName, reviewedOn } = {}) {
  if (!uuid.test(resourceId ?? "") || !/^\d{4}-(0[1-9]|1[0-2])$/u.test(period ?? "") ||
      !isoDate(reviewedOn) || resourceName !== "EPD_SNOMED_" + period.replace("-", "")) {
    fail("unverified EPD resource identifier or period");
  }
  return Object.freeze({
    ...base(reviewedOn),
    _id: "nhsbsa-epd-snomed-" + period.replace("-", "") + "-official-resource-locator",
    source_id: "nhsbsa_english_prescribing",
    kind: "official_resource_locator",
    reporting_period: period,
    resource_id: resourceId,
    resource_title: resourceName,
    dataset_url: "https://opendata.nhsbsa.net/dataset/english-prescribing-dataset-epd-with-snomed-code",
    discovery_url: "https://opendata.nhsbsa.net/api/3/action/package_show?id=english-prescribing-dataset-epd-with-snomed-code",
    status: "resource_identified_download_not_verified",
    source_file_id: null,
    download_bytes_verified: false,
    checksum_verified: false,
    source_schema_probe_only: true,
    source_license: "OGL-UK-3.0 dataset-level metadata",
    third_party_terminology_status: "pending_independent_review",
    rights_status: "dataset_specific_review_required",
  });
}


/**
 * Bounded minimal-field source-row projection for Atlas PRIVATE quarantine.
 * Never copies arbitrary raw properties, asserts rights or admits observations.
 * Caller must use staging credentials and limited-size write batches.
 */
export function buildQuarantinedReviewProjection(input = {}) {
  const manifest = buildDriveQuarantineManifest(input);
  if (manifest.required_field_exceptions !== 0) fail("required source keys unresolved");
  const data = JSON.parse(Buffer.from(input.rawBytes).toString("utf8"));
  const records = input.dataset === "FDA_NDC" ? data.results : data.data;
  if (!Array.isArray(records) || records.length !== manifest.record_count) {
    fail("source count changed between inspections");
  }
  const clean = (v, max = 150) => typeof v === "string" && v.trim()
    ? v.trim().slice(0, max) : null;
  const seen = new Set();
  const rows = records.map((r, index) => {
    const fda = input.dataset === "FDA_NDC";
    const key = fda ? r.product_ndc : r.shortage_url;
    if (typeof key !== "string" || !key || seen.has(key)) fail("invalid row key");
    seen.add(key);
    const shared = {
      workspace_id: "novapharm-internal-staging",
      source_dataset: fda ? "FDA" : "EMA",
      source_copy_sha256: manifest.sha256,
      quarantine_drive_file_id: manifest.quarantine_file_id,
      original_index: index,
      record_key: key,
      quarantine_status: "RAW_UNVALIDATED",
      customer_publish_approved: false,
      accepted_observations: 0,
      source_rights_status: "REVIEW_REQUIRED",
    };
    if (fda) {
      if (!/\bapixaban\b/iu.test(r.generic_name ?? "") || !clean(r.product_id)) {
        fail("unverified FDA record");
      }
      return Object.freeze({
        ...shared, _id: "drive-raw-fda-20261009-" + key,
        product_ndc: key, generic_name: clean(r.generic_name),
        product_id: clean(r.product_id), dosage_form: clean(r.dosage_form),
        route: Array.isArray(r.route) ? r.route.filter(v => typeof v === "string")
          .slice(0, 4).map(v => v.slice(0, 80)) : [],
      });
    }
    let url;
    try { url = new URL(key); } catch { fail("invalid EMA link"); }
    if (url.protocol !== "https:" || url.hostname !== "www.ema.europa.eu" ||
        url.username || url.password || url.hash || !clean(r.medicine_affected) ||
        !clean(r.supply_shortage_status)) fail("invalid EMA record");
    return Object.freeze({
      ...shared, _id: "drive-raw-ema-20261009-" + String(index + 1).padStart(3, "0"),
      shortage_url: key, medicine_affected: clean(r.medicine_affected),
      shortage_status: clean(r.supply_shortage_status),
      start_of_shortage_date: clean(r.start_of_shortage_date),
      last_updated_date: clean(r.last_updated_date),
    });
  });
  return Object.freeze({
    manifestId: manifest._id, rowCount: rows.length,
    status: "quarantine_projection_only", acceptedObservations: 0,
    customerPublishApproved: false, rows: Object.freeze(rows),
  });
}
