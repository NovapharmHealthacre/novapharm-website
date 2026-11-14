/**
 * G1 private admission candidate for real NHSBSA EPD prescribing evidence.
 * Never fetches, grants rights, writes, publishes, or marks rows as accepted.
 * ONS population, openFDA labels, and trial records need different adapters.
 */
import { createHash } from "node:crypto";

const sourceId = "nhsbsa_english_prescribing";
const purpose = "private_observed_prescribing_ingestion";
const sha256 = /^[a-f0-9]{64}$/u;
const month = /^\d{4}-(0[1-9]|1[0-2])$/u;
const reference = /^[A-Za-z0-9][A-Za-z0-9._:/-]{1,127}$/u;
const metrics = Object.freeze({ items: "items", quantity: "units", nic: "GBP", actual_cost: "GBP" });
const rowKeys = new Set([
  "source_id", "source_version", "resource_id", "resource_sha256",
  "row_id", "row_sha256", "period", "jurisdiction", "geography_id",
  "metric", "unit", "value", "code_system", "source_code",
  "medicine_identity", "identity_proof",
]);

function deny(code) {
  const e = new Error("Medicine evidence admission denied: " + code);
  e.code = code;
  throw e;
}
function simple(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}
function matches(value, pattern) {
  return typeof value === "string" && pattern.test(value);
}
function timestamp(value) {
  return typeof value === "string" &&
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/u.test(value) &&
    Number.isFinite(Date.parse(value));
}
const digest = value => createHash("sha256").update(value, "utf8").digest("hex");

/**
 * release/grant/snapshot MUST come from independently verified private server
 * authorities, not browser, customer, LLM or raw upstream row declarations.
 * The result remains unaccepted until separately committed with an audit and
 * current rights re-check. This pure function never exposes customer data.
 */
export function prepareOfficialMedicineEvidenceCandidate({ snapshot, rows, grant, release } = {}) {
  if (!simple(release) || release.environment !== "private_staging" ||
    release.verifiedServerSide !== true || release.customerPublishingEnabled !== false ||
    release.allowPatientData !== false || !timestamp(release.checkedAt)) deny("release_not_private");

  if (!simple(snapshot) || snapshot.sourceId !== sourceId ||
    !matches(snapshot.sourceVersion, reference) ||
    !matches(snapshot.resourceId, reference) ||
    !matches(snapshot.resourceSha256, sha256) ||
    !matches(snapshot.period, month) || snapshot.jurisdiction !== "England" ||
    snapshot.sourceHashIndependentlyVerified !== true ||
    snapshot.fullPartitionVerified !== true ||
    !Number.isSafeInteger(snapshot.expectedRows) || snapshot.expectedRows < 1 ||
    snapshot.expectedRows > 5000 ||
    !Number.isFinite(snapshot.expectedTotal) || snapshot.expectedTotal < 0 ||
    !matches(snapshot.expectedRowsDigest, sha256) ||
    !Object.hasOwn(metrics, snapshot.metric) || snapshot.unit !== metrics[snapshot.metric] ||
    snapshot.containsPatientData !== false) deny("unverified_source_snapshot");

  if (!simple(grant) || grant.status !== "active" || grant.verifiedByRightsAuthority !== true ||
    grant.sourceId !== sourceId || grant.sourceVersion !== snapshot.sourceVersion ||
    grant.resourceId !== snapshot.resourceId ||
    !Array.isArray(grant.allowedPurposes) || !grant.allowedPurposes.includes(purpose) ||
    grant.commercialAnalysisApproved !== true || grant.datasetReuseApproved !== true ||
    !matches(grant.termsSha256, sha256) ||
    typeof grant.termsUrl !== "string" ||
    !grant.termsUrl.startsWith("https://opendata.nhsbsa.net/") ||
    !matches(grant.rightsRevision, reference) ||
    !matches(grant.reviewerId, reference) ||
    !timestamp(grant.reviewedAt) || !timestamp(grant.validFrom) ||
    (grant.validUntil != null && !timestamp(grant.validUntil))) deny("source_rights_not_accepted");

  const at = Date.parse(release.checkedAt);
  if (Date.parse(grant.reviewedAt) > at || Date.parse(grant.validFrom) > at ||
    (grant.validUntil != null && Date.parse(grant.validUntil) <= at)) {
    deny("source_rights_expired_or_future");
  }
  if (!Array.isArray(rows) || rows.length !== snapshot.expectedRows || rows.length > 5000) {
    deny("partition_count_not_reconciled");
  }

  const seen = new Set();
  const records = [];
  let total = 0;
  for (const row of rows) {
    if (!simple(row) || Object.keys(row).some(key => !rowKeys.has(key) ||
      key.startsWith("$") || key.includes("."))) deny("unapproved_row_schema");
    if (row.source_id !== sourceId || row.source_version !== snapshot.sourceVersion ||
      row.resource_id !== snapshot.resourceId ||
      row.resource_sha256 !== snapshot.resourceSha256 ||
      row.period !== snapshot.period || row.jurisdiction !== "England" ||
      !matches(row.row_id, reference) || !matches(row.row_sha256, sha256) ||
      !matches(row.geography_id, reference) ||
      row.metric !== snapshot.metric || row.unit !== snapshot.unit ||
      typeof row.value !== "number" || !Number.isFinite(row.value) || row.value < 0 ||
      !matches(row.source_code, reference) || !matches(row.medicine_identity, reference) ||
      !["BNF_PRESENTATION_CODE", "SNOMED_CODE"].includes(row.code_system)) {
      deny("source_row_invalid");
    }
    // EPD OGL alone does not establish commercial BNF or SNOMED CT reuse.
    if (grant.thirdPartyTerminologyReuseApproved !== true ||
      !matches(grant.terminologyRightsRevision, reference)) {
      deny("terminology_rights_unverified");
    }
    const proof = row.identity_proof;
    if (!simple(proof) || proof.matchType !== "verified_exact" ||
      proof.verifiedByAuthority !== true || proof.sourceCode !== row.source_code ||
      proof.codeSystem !== row.code_system ||
      proof.medicineIdentity !== row.medicine_identity ||
      proof.sourceVersion !== snapshot.sourceVersion ||
      !matches(proof.mappingRevision, reference) ||
      !matches(proof.referenceSha256, sha256)) deny("medicine_identity_unresolved");

    if (seen.has(row.row_id) || seen.has("hash:" + row.row_sha256)) {
      deny("duplicate_source_row");
    }
    seen.add(row.row_id);
    seen.add("hash:" + row.row_sha256);
    total += row.value;
    records.push(Object.freeze({
      workspace_id: "novapharm-internal-staging",
      medicine_identity: row.medicine_identity,
      // Preserve exact code-system and publisher identifier for independent
      // G2 temporal mapping verification. Never infer from a display name.
      code_system: row.code_system,
      source_code: row.source_code,
      source_id: row.source_id,
      source_version: row.source_version,
      resource_id: row.resource_id,
      resource_sha256: row.resource_sha256,
      row_id: row.row_id,
      provenance_sha256: row.row_sha256,
      period: row.period,
      jurisdiction: row.jurisdiction,
      geography_id: row.geography_id,
      metric: row.metric,
      unit: row.unit,
      value: row.value,
      evidence_type: "observed_fact",
      identity_revision: proof.mappingRevision,
      rights_revision: grant.rightsRevision,
      status: "candidate_not_accepted",
    }));
  }
  // expectedTotal must originate from independent publisher/resource evidence.
  if (Math.abs(total - snapshot.expectedTotal) > 1e-6) {
    deny("partition_total_not_reconciled");
  }
  const rowsDigest = digest(rows.map(row => row.row_id + ":" + row.row_sha256).join("\n"));
  if (rowsDigest !== snapshot.expectedRowsDigest) deny("partition_digest_mismatch");
  return Object.freeze({
    status: "candidate_validated_not_accepted",
    customerPublishApproved: false,
    acceptedObservations: 0,
    sourceId, sourceVersion: snapshot.sourceVersion,
    resourceId: snapshot.resourceId, resourceSha256: snapshot.resourceSha256,
    period: snapshot.period, rowCount: records.length,
    rowsDigest, reconciliationTotal: total,
    rightsRevision: grant.rightsRevision,
    requiresIndependentAtomicCommit: true,
    requiresCurrentRightsRecheck: true,
    requiresAuditReceipt: true,
    records: Object.freeze(records),
  });
}
