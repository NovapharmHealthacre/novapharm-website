import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  buildDriveQuarantineManifest, buildEpdResourceLocator
} from "../src/data/intelligence-drive-source-handoff.mjs";

const ids = {
  originalFileId: "1yk7aYxh1iPhtI3vurpEKp7yg1yH93YPi",
  quarantineFileId: "1x9D8xjjJeIasV7IaRMzeC9tIMkkXDiw6",
  snapshotDate: "2026-10-09",
  reviewedOn: "2026-11-12",
};
const urls = {
  FDA_NDC: "https://api.fda.gov/drug/ndc.json?search=generic_name%3Aapixaban&limit=100",
  EMA_SHORTAGES: "https://www.ema.europa.eu/en/documents/report/shortages-output-json-report_en.json",
};
function example(dataset) {
  const payload = dataset === "FDA_NDC"
    ? { meta: { results: { total: 1 } }, results: [{
      product_ndc: "12345-6789", product_id: "ndc-test",
      generic_name: "Apixaban", packaging: [{ package_ndc: "12345-6789-01" }]
    }] }
    : { meta: { total_records: 1 }, data: [{
      shortage_url: "https://www.ema.europa.eu/en/example",
      medicine_affected: "Example", supply_shortage_status: "ongoing",
      start_of_shortage_date: "", last_updated_date: ""
    }] };
  const rawBytes = Buffer.from(JSON.stringify(payload), "utf8");
  return {
    dataset, rawBytes,
    provenance: {
      dataset, status: "DOWNLOADED", acceptance: "RAW_UNVALIDATED",
      rights_status: "REVIEW_BEFORE_COMMERCIAL_REPUBLISHING",
      source_url: urls[dataset], bytes: rawBytes.byteLength,
      sha256: createHash("sha256").update(rawBytes).digest("hex"),
    },
  };
}
test("FDA copied bytes yield a source-labelled private manifest, never admitted medicine data", () => {
  const input = { ...example("FDA_NDC"), ...ids };
  const result = buildDriveQuarantineManifest(input);
  assert.equal(result.source_id, "us.fda.openfda.ndc");
  assert.ok(result._id.startsWith("drive-fda-ndc-apx-20261009-"));
  assert.equal(result.record_count, 1);
  assert.equal(result.unique_key_count, 1);
  assert.equal(result.sha256, input.provenance.sha256);
  assert.equal(result.customer_publish_approved, false);
  assert.equal(result.ai_processing_approved, false);
  assert.equal(result.commercial_redistribution_approved, false);
  assert.equal(result.accepted_observations, 0);
  assert.equal(result.production_promoted, false);
  assert.equal(result.publisher_authenticity_verified, false);
  assert.equal(result.source_rights_grant_id, null);
  assert.equal(JSON.stringify(result).includes("ndc-test"), false);
});
test("EMA source is distinct, missing dates are recorded and no supply claim follows", () => {
  const result = buildDriveQuarantineManifest({
    ...example("EMA_SHORTAGES"), ...ids,
  });
  assert.equal(result.source_id, "eu.ema.shortages");
  assert.equal(result.record_count, 1);
  assert.equal(result.quality_exceptions.start_of_shortage_date_missing, 1);
  assert.equal(result.customer_publish_approved, false);
  assert.equal(result.status, "quarantined_not_accepted");
});
test("tampering, invalid identifiers, rights overrides and mismatched source fail closed", () => {
  const base = { ...example("FDA_NDC"), ...ids };
  for (const changes of [
    { originalFileId: "x" }, { quarantineFileId: ids.originalFileId },
    { snapshotDate: "2026-02-30" }, { reviewedOn: "2025-01-01" },
    { dataset: "BAD" },
    { provenance: { ...base.provenance, sha256: "0".repeat(64) } },
    { provenance: { ...base.provenance, rights_status: "APPROVED" } },
    { rawBytes: Buffer.from("{}") },
  ]) {
    assert.throws(() => buildDriveQuarantineManifest({ ...base, ...changes }), /rejected/);
  }
});
test("EPD 2026-08 locator is metadata only; requires actual downloaded and verified bytes", () => {
  const input = {
    resourceId: "30b74257-9912-4b54-8990-8eec2a4b7f14",
    period: "2026-08", resourceName: "EPD_SNOMED_202608",
    reviewedOn: "2026-11-12",
  };
  const result = buildEpdResourceLocator(input);
  assert.equal(result.source_id, "nhsbsa_english_prescribing");
  assert.equal(result.download_bytes_verified, false);
  assert.equal(result.checksum_verified, false);
  assert.equal(result.accepted_observations, 0);
  assert.equal(result.customer_publish_approved, false);
  for (const changes of [
    { resourceId: "not-a-uuid" }, { period: "2026-13" },
    { resourceName: "EPD_SNOMED_202607" }, { reviewedOn: "2026-02-30" }
  ]) {
    assert.throws(() => buildEpdResourceLocator({ ...input, ...changes }), /rejected/);
  }
});
