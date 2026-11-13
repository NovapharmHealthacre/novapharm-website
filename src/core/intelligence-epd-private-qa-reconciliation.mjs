/**
 * Private, read-only EPD source-quality receipt consistency check.
 *
 * This compares independent *inputs* supplied by a private staging worker;
 * it cannot authenticate a publisher, attest to a licence, create medicine
 * identities, ingest data, authorise model use or publish observations.
 * Never import this module into public routes or client bundles.
 */
const SOURCE = "nhsbsa_english_prescribing";
const QA_GRAIN = "month_presentation_all_practices_internal_quality_only";
const PENDING_RIGHTS = "third_party_terminology_and_commercial_reuse_pending";
const PENDING_IDENTITY = "exact_code_observed_but_canonical_medicine_identity_unverified";
const sha = /^[a-f0-9]{64}$/u;
const resourceId = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu;
const period = /^20\d{2}-(0[1-9]|1[0-2])$/u;
const presentationCode = /^[A-Z0-9]{15}$/u;
const decimal = /^(0|[1-9]\d{0,14})(?:\.(\d{1,5}))?$/u;
const ROW_FIELDS = new Set([
  "source_id", "official_resource_id", "csv_sha256", "reporting_period",
  "source_chemical_substance", "bnf_presentation_code_private_unapproved",
  "source_aggregate_grain", "source_rows", "observed_items_private_unapproved",
  "observed_nic_gbp_decimal_string_private_unapproved",
  "observed_actual_cost_gbp_decimal_string_private_unapproved",
  "rights_status", "source_identity_status", "accepted_observations",
  "customer_publish_approved",
]);

function refuse(code) {
  throw Object.assign(new Error("Private EPD quarantine receipt consistency check refused"), { code });
}
function isPlain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}
function scaledPounds(value) {
  const match = typeof value === "string" ? decimal.exec(value) : null;
  if (!match) refuse("currency_decimal_invalid");
  return BigInt(match[1]) * 100_000n + BigInt((match[2] ?? "").padEnd(5, "0"));
}
function validNonnegativeInt(n) {
  return Number.isSafeInteger(n) && n >= 0;
}

/**
 * Receipt is an untrusted QA assertion, not a publisher control total.
 * Rows must be an explicit allowlisted projection from private staging.
 * Success does not contain source medicine facts or GBP values.
 */
export function reconcilePrivateEpdQuarantineReceipt({ receipt, rows } = {}) {
  if (!isPlain(receipt) || receipt.kind !== "private_source_quality_receipt" ||
      receipt.source_id !== SOURCE || receipt.source_chemical_substance !== "Apixaban" ||
      typeof receipt.official_resource_id !== "string" || !resourceId.test(receipt.official_resource_id) ||
      typeof receipt.csv_sha256 !== "string" || !sha.test(receipt.csv_sha256) ||
      typeof receipt.reporting_period !== "string" || !period.test(receipt.reporting_period) ||
      !validNonnegativeInt(receipt.presentation_count) || receipt.presentation_count < 1 ||
      receipt.presentation_count > 100 ||
      !validNonnegativeInt(receipt.matched_source_rows) || receipt.matched_source_rows < 1 ||
      !validNonnegativeInt(receipt.observed_items_private_unapproved) ||
      receipt.customer_publish_approved !== false || receipt.accepted_observations !== 0 ||
      receipt.rights_status !== PENDING_RIGHTS) {
    refuse("private_receipt_unacceptable");
  }
  const expectedNIC = scaledPounds(receipt.observed_nic_gbp_decimal_string_private_unapproved);
  const expectedCost = scaledPounds(receipt.observed_actual_cost_gbp_decimal_string_private_unapproved);
  if (!Array.isArray(rows) || rows.length !== receipt.presentation_count || rows.length > 100) {
    refuse("presentation_count_mismatch");
  }
  let rowsTotal = 0;
  let itemsTotal = 0;
  let nicTotal = 0n;
  let costTotal = 0n;
  const codes = new Set();
  for (const row of rows) {
    if (!isPlain(row) || Object.keys(row).some(key => !ROW_FIELDS.has(key))) {
      refuse("unapproved_projection_fields");
    }
    if (row.source_id !== SOURCE || row.official_resource_id !== receipt.official_resource_id ||
        row.csv_sha256 !== receipt.csv_sha256 ||
        row.reporting_period !== receipt.reporting_period ||
        row.source_chemical_substance !== "Apixaban" ||
        row.source_aggregate_grain !== QA_GRAIN ||
        row.rights_status !== PENDING_RIGHTS || row.source_identity_status !== PENDING_IDENTITY ||
        row.customer_publish_approved !== false || row.accepted_observations !== 0 ||
        typeof row.bnf_presentation_code_private_unapproved !== "string" ||
        !presentationCode.test(row.bnf_presentation_code_private_unapproved) ||
        !validNonnegativeInt(row.source_rows) || row.source_rows < 1 ||
        !validNonnegativeInt(row.observed_items_private_unapproved)) {
      refuse("quarantine_source_or_release_mismatch");
    }
    if (codes.has(row.bnf_presentation_code_private_unapproved)) {
      refuse("duplicate_presentation_code");
    }
    codes.add(row.bnf_presentation_code_private_unapproved);
    rowsTotal += row.source_rows;
    itemsTotal += row.observed_items_private_unapproved;
    if (!Number.isSafeInteger(rowsTotal) || !Number.isSafeInteger(itemsTotal)) {
      refuse("integer_overflow");
    }
    nicTotal += scaledPounds(row.observed_nic_gbp_decimal_string_private_unapproved);
    costTotal += scaledPounds(row.observed_actual_cost_gbp_decimal_string_private_unapproved);
  }
  if (rowsTotal !== receipt.matched_source_rows ||
      itemsTotal !== receipt.observed_items_private_unapproved ||
      nicTotal !== expectedNIC || costTotal !== expectedCost) {
    refuse("private_qa_totals_mismatch");
  }
  return Object.freeze({
    status: "quarantine_receipt_consistency_only",
    presentationCount: rows.length,
    sourceIdentity: "unverified",
    independentlyPublisherCertified: false,
    sourceRightsApproved: false,
    commercialReuseApproved: false,
    aiUseApproved: false,
    admittedObservations: 0,
    customerPublishApproved: false,
    requiresIndependentPublisherTotals: true,
    requiresRightsAndIdentityReview: true,
  });
}
