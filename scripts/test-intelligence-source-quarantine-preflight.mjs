import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { inspectQuarantinedSourceSnapshot } from "../src/data/intelligence-source-quarantine-preflight.mjs";

const origins = Object.freeze({
  FDA_NDC: "https://api.fda.gov/drug/ndc.json?search=generic_name%3Aapixaban&limit=100",
  EMA_SHORTAGES: "https://www.ema.europa.eu/en/documents/report/shortages-output-json-report_en.json",
});

function fixture(dataset, items, modifications = {}) {
  const payload = dataset === "FDA_NDC"
    ? {meta: {results: {total: items.length}}, results: items}
    : {meta: {total_records: items.length}, data: items};
  const rawBytes = Buffer.from(JSON.stringify(payload), "utf8");
  return {
    dataset, rawBytes,
    provenance: {
      dataset,
      status: "DOWNLOADED",
      rights_status: "REVIEW_BEFORE_COMMERCIAL_REPUBLISHING",
      acceptance: "RAW_UNVALIDATED",
      source_url: origins[dataset],
      bytes: rawBytes.length,
      sha256: createHash("sha256").update(rawBytes).digest("hex"),
      ...modifications
    }
  };
}
const fdaProduct = {product_ndc: "12345-6789", product_id: "prod-001",
  generic_name: "Apixaban", packaging: [{package_ndc: "12345-6789-01"}]};
const emaEvent = {shortage_url: "https://www.ema.europa.eu/en/shortages/example",
  medicine_affected: "Example medicine", supply_shortage_status: "ongoing",
  last_updated_date: "", start_of_shortage_date: ""};

test("complete FDA sample envelope remains a quarantined local copy, never an accepted medicine", () => {
  const result = inspectQuarantinedSourceSnapshot(fixture("FDA_NDC", [fdaProduct]));
  assert.equal(result.status, "quarantined_not_accepted");
  assert.equal(result.copiedByteIntegrity, "matches_accompanying_untrusted_manifest");
  assert.equal(result.inspectedRecords, 1);
  assert.equal(result.distinctIdentifiers, 1);
  assert.equal(result.publisherAuthenticityVerified, false);
  assert.equal(result.licenseApproved, false);
  assert.equal(result.modelProcessingApproved, false);
  assert.equal(result.recordsAdmitted, 0);
  assert.equal(result.customerPublishApproved, false);
  assert.equal(result.requiredFieldsPass, true);
});

test("EMA shortage events never imply inventory, procurement eligibility or launch", () => {
  const result = inspectQuarantinedSourceSnapshot(fixture("EMA_SHORTAGES", [emaEvent]));
  assert.equal(result.coverage, "dated_ema_events_not_inventory");
  assert.equal(result.qualityExceptions.last_updated_date_missing, 1);
  assert.equal(result.qualityExceptions.start_of_shortage_date_missing, 1);
  assert.equal(result.recordsAdmitted, 0);
  assert.equal(result.customerPublishApproved, false);
});

test("stale or mismatched provenance, invented rights and unexpected origin fail closed", () => {
  const f = fixture("FDA_NDC", [fdaProduct]);
  for (const overrides of [
    {sha256: "0".repeat(64)},
    {bytes: f.rawBytes.length + 1},
    {acceptance: "ACCEPTED"},
    {rights_status: "APPROVED"},
    {source_url: "https://example.com/ndc.json"},
    {source_url: "http://api.fda.gov/drug/ndc.json?search=generic_name%3Aapixaban&limit=100"},
  ]) {
    assert.throws(() => inspectQuarantinedSourceSnapshot({
      ...f, provenance: {...f.provenance, ...overrides}
    }), /Quarantine preflight rejected/);
  }
});

test("incorrect source totals, unknown dataset and malformed JSON cannot enter quarantine report", () => {
  const f = fixture("EMA_SHORTAGES", [emaEvent]);
  assert.throws(() => inspectQuarantinedSourceSnapshot({...f, dataset: "OTHER"}), /rejected/);
  const mismatched = Buffer.from(JSON.stringify({meta: {total_records: 2}, data: [emaEvent]}));
  const m = fixture("EMA_SHORTAGES", [emaEvent], {
    bytes: mismatched.length, sha256: createHash("sha256").update(mismatched).digest("hex")
  });
  assert.throws(() => inspectQuarantinedSourceSnapshot({...m, rawBytes: mismatched}), /rejected/);
  const bad = Buffer.from("{broken");
  const b = fixture("EMA_SHORTAGES", [emaEvent], {
    bytes: bad.length, sha256: createHash("sha256").update(bad).digest("hex")
  });
  assert.throws(() => inspectQuarantinedSourceSnapshot({...b, rawBytes: bad}), /rejected/);
});

test("duplicate identifiers or missing required fields are surfaced, never silently admitted", () => {
  const duplicate = inspectQuarantinedSourceSnapshot(fixture("FDA_NDC", [fdaProduct, fdaProduct]));
  assert.equal(duplicate.requiredFieldsPass, false);
  assert.equal(duplicate.requiredFieldExceptions, 1);
  assert.equal(duplicate.recordsAdmitted, 0);
  const incomplete = inspectQuarantinedSourceSnapshot(fixture("FDA_NDC", [
    {...fdaProduct, packaging: []}
  ]));
  assert.equal(incomplete.qualityExceptions.packaging_missing, 1);
  assert.equal(incomplete.recordsAdmitted, 0);
});
