import assert from "node:assert/strict";
import test from "node:test";
import { reconcilePrivateEpdQuarantineReceipt as reconcile } from "../src/core/intelligence-epd-private-qa-reconciliation.mjs";

const RESOURCE = "00000000-0000-4000-8000-000000000000";
const SHA = "a".repeat(64);
const pending = "third_party_terminology_and_commercial_reuse_pending";
const unverified = "exact_code_observed_but_canonical_medicine_identity_unverified";
function synthetic() {
  // Entirely fictional codes and amounts, not copies of protected publisher data.
  const basis = {
    source_id: "nhsbsa_english_prescribing", official_resource_id: RESOURCE,
    csv_sha256: SHA, reporting_period: "2026-08",
    source_chemical_substance: "Apixaban",
    source_aggregate_grain: "month_presentation_all_practices_internal_quality_only",
    rights_status: pending, source_identity_status: unverified,
    accepted_observations: 0, customer_publish_approved: false,
  };
  const rows = [
    { ...basis, bnf_presentation_code_private_unapproved: "000000000000001",
      source_rows: 2, observed_items_private_unapproved: 3,
      observed_nic_gbp_decimal_string_private_unapproved: "0.1",
      observed_actual_cost_gbp_decimal_string_private_unapproved: "2.00001" },
    { ...basis, bnf_presentation_code_private_unapproved: "000000000000002",
      source_rows: 4, observed_items_private_unapproved: 5,
      observed_nic_gbp_decimal_string_private_unapproved: "0.2",
      observed_actual_cost_gbp_decimal_string_private_unapproved: "0.30002" },
  ];
  const receipt = {
    kind: "private_source_quality_receipt",
    source_id: basis.source_id, source_chemical_substance: basis.source_chemical_substance,
    official_resource_id: RESOURCE, csv_sha256: SHA, reporting_period: "2026-08",
    presentation_count: 2, matched_source_rows: 6,
    observed_items_private_unapproved: 8,
    observed_nic_gbp_decimal_string_private_unapproved: "0.3",
    observed_actual_cost_gbp_decimal_string_private_unapproved: "2.30003",
    rights_status: pending, customer_publish_approved: false, accepted_observations: 0,
  };
  return { receipt, rows };
}
function fails(input, code) {
  assert.throws(() => reconcile(input), error => error.code === code);
}
test("private decimal arithmetic reconciles exact amounts without floating-point error or release", () => {
  const result = reconcile(synthetic());
  assert.deepEqual(result, {
    status: "quarantine_receipt_consistency_only", presentationCount: 2,
    sourceIdentity: "unverified", independentlyPublisherCertified: false,
    sourceRightsApproved: false, commercialReuseApproved: false, aiUseApproved: false,
    admittedObservations: 0, customerPublishApproved: false,
    requiresIndependentPublisherTotals: true, requiresRightsAndIdentityReview: true,
  });
  assert.equal(Object.isFrozen(result), true);
});
test("even a one-hundred-thousandth GBP discrepancy is rejected", () => {
  const input = synthetic();
  input.rows[0].observed_actual_cost_gbp_decimal_string_private_unapproved = "2.00002";
  fails(input, "private_qa_totals_mismatch");
});
test("no numeric, scientific, negative or overprecision money in QA receipt", () => {
  for (const amount of [0.3, -1, "-0.1", "1e3", "0.000001", "01.20", "1.", "", null]) {
    const input = synthetic();
    input.receipt.observed_nic_gbp_decimal_string_private_unapproved = amount;
    fails(input, "currency_decimal_invalid");
  }
});
test("duplicate codes cannot inflate quality totals", () => {
  const input = synthetic();
  input.rows[1].bnf_presentation_code_private_unapproved = input.rows[0].bnf_presentation_code_private_unapproved;
  fails(input, "duplicate_presentation_code");
});
test("mixed resource hashes, reporting periods and source grains are refused", () => {
  for (const change of [
    { csv_sha256: "b".repeat(64) },
    { reporting_period: "2026-07" },
    { official_resource_id: "11111111-1111-4111-8111-111111111111" },
    { source_aggregate_grain: "sales_volume" },
    { source_chemical_substance: "Another molecule" },
  ]) {
    const input = synthetic();
    Object.assign(input.rows[0], change);
    fails(input, "quarantine_source_or_release_mismatch");
  }
});
test("unverified third-party rights, medicine identity and quarantine cannot become approved", () => {
  for (const change of [
    { rights_status: "commercial_approved" },
    { source_identity_status: "exact_approved" },
    { customer_publish_approved: true },
    { accepted_observations: 1 },
  ]) {
    const input = synthetic();
    Object.assign(input.rows[0], change);
    fails(input, "quarantine_source_or_release_mismatch");
  }
});
test("receipt cannot assert published or accepted observations", () => {
  for (const change of [
    { kind: "approved_source_receipt" },
    { rights_status: "active" },
    { customer_publish_approved: true },
    { accepted_observations: 1 },
    { matched_source_rows: 0 },
  ]) {
    const input = synthetic();
    Object.assign(input.receipt, change);
    fails(input, "private_receipt_unacceptable");
  }
});
test("patient fields and unknown keys cannot pass staging-only projection", () => {
  const input = synthetic();
  input.rows[0].patient_id = "do-not-persist";
  fails(input, "unapproved_projection_fields");
});
test("source row counts, items, or exact monetary totals must match separate QA receipt", () => {
  for (const change of [
    { source_rows: 3 },
    { observed_items_private_unapproved: 6 },
    { observed_nic_gbp_decimal_string_private_unapproved: "0.10001" },
  ]) {
    const input = synthetic();
    Object.assign(input.rows[0], change);
    fails(input, "private_qa_totals_mismatch");
  }
});
test("wrong presentation count and unsafe integer are always denied", () => {
  const fewer = synthetic(); fewer.receipt.presentation_count = 3;
  fails(fewer, "presentation_count_mismatch");
  const unsafe = synthetic(); unsafe.rows[0].source_rows = Number.MAX_SAFE_INTEGER + 1;
  fails(unsafe, "quarantine_source_or_release_mismatch");
});
