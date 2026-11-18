import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import {
  createHsaBulkCandidateEvaluator, parseHsaCsvBytes
} from "../src/core/intelligence-singapore-hsa-bulk-candidate.mjs";

const COLUMNS = [
  "LicenceNo", "Productname", "Licenseholder", "Approvaldate",
  "Forensicclassification", "ATCCode", "Dosageform", "RouteofAdministration",
  "Manufacturer", "Countryofmanufacturer", "Activeingredients", "Strength"
];
const csv = (...rows) => new TextEncoder().encode(
  [COLUMNS.join(","), ...rows].join("\r\n") + "\r\n"
);
const row = (id = "SIN00001P", name = '"Medicine, five mg"') =>
  [id, name, "HSA Licenseholder", "2025-01-20", "Prescription Only",
    "B01AF02", "Tablet", "Oral", "Manufacturing Ltd", "Singapore", "Apixaban", "5 mg"].join(",");
const NOW = Date.parse("2026-11-18T07:05:00.000Z");
const grant = (ctx, overrides = {}) => ({
  decision: "approved", rightsStatus: "approved", ...ctx,
  allowedUses: ["internal-evaluation"],
  receiptId: "synthetic-licence-review-only",
  licenseId: "synthetic-licence-test",
  rightsVersion: "v1", revokedAt: null,
  issuedAt: "2026-11-18T06:05:00.000Z",
  validUntil: "2026-11-18T08:05:00.000Z",
  ...overrides
});

test("exact 12-column Singapore HSA CSV contract preserves zeroes, comma and quotes", () => {
  const bytes = csv(
    row("SIN00001P", '"Medicine, five mg"'),
    row("SIN00002P", '"Tablet ""extended"" release"')
  );
  const result = parseHsaCsvBytes(bytes);
  assert.equal(result.totalDataRows, 2);
  assert.equal(result.validIdentityRows, 2);
  assert.equal(result.invalidSourceRows, 0);
  assert.equal(result.records[0].localId, "SIN00001P");
  assert.equal(result.records[0].label, "Medicine, five mg");
  assert.equal(result.records[1].label, 'Tablet "extended" release');
  assert.equal(result.completeNationalCoverageDemonstrated, false);
});

test("full candidate holds integrity hash, exact rights receipt, and no publication", async () => {
  const bytes = csv(row("SIN00001P", "Example"));
  const evaluator = createHsaBulkCandidateEvaluator({
    authorize: async (ctx) => grant(ctx), now: () => NOW
  });
  const report = await evaluator.evaluate({ tenantId: "tenantA", bytes });
  assert.equal(report.fileSha256, createHash("sha256").update(bytes).digest("hex"));
  assert.equal(report.sourceId, "sg-hsa-products");
  assert.equal(report.country, "SG");
  assert.equal(report.rightsReceiptId, "synthetic-licence-review-only");
  assert.equal(report.dataState, "quarantined_csv_snapshot_candidate");
  for (const key of [
    "canPublish", "productionAccepted", "sourceRightsIndependentlyVerified",
    "clinicalDecisionReady", "commercialDecisionReady", "upstreamFileAuthenticated",
    "datasetVersionVerified", "snapshotSourceDateVerified", "publicCustomerEndpointConnected"
  ]) assert.equal(report[key], false, key);
});

test("source quality retains row count but never declares dataset complete", () => {
  const bytes = csv(
    row("SIN00001P", "Valid"),
    row("SIN00001P", "Repeated licence"),
    row('"bad\ninvisible"', "Malformed"),
    row("SIN00004P", '"Medicine, 10 mg"')
  );
  const result = parseHsaCsvBytes(bytes);
  assert.equal(result.totalDataRows, 4);
  assert.equal(result.invalidSourceRows, 1);
  assert.equal(result.duplicateSourceIds, 1);
  assert.equal(result.completeNationalCoverageDemonstrated, false);
  assert.equal(result.records.length, 3);
});

test("malformed bytes, row widths, quote sequences, missing columns and oversize fail", () => {
  const invalid = [
    new Uint8Array(),
    new Uint8Array([0xff, 0xfe, 0xfd]),
    new Uint8Array(16 * 1024 * 1024 + 1),
    new TextEncoder().encode("Other,Column\n1,2\n"),
    csv('"unterminated'),
    csv(row("SIN00001P", "Invalid") + ",extra"),
    csv('SIN00001P,"Broken"suffix,Licenceholder,2025-01-20,Prescription Only,B01AF02,Tablet,Oral,Manufacturer,Singapore,Apixaban,5 mg'),
    new TextEncoder().encode(COLUMNS.join(",") + "\r\n")
  ];
  for (const bytes of invalid) {
    assert.throws(() => parseHsaCsvBytes(bytes), /HSA bulk candidate rejected/);
  }
});

test("an HSA file cannot skip independent rights approval or tenant binding", async () => {
  const bytes = csv(row());
  for (const authorize of [
    async () => ({ decision: "approved" }),
    async (ctx) => grant(ctx, { country: "GB" }),
    async (ctx) => grant(ctx, { tenantId: "tenantB" }),
    async (ctx) => grant(ctx, { purpose: "commercial-redistribution" }),
    async (ctx) => grant(ctx, { revokedAt: "2026-11-18T07:00:00Z" }),
    async (ctx) => grant(ctx, { validUntil: "2026-11-18T07:00:00Z" })
  ]) {
    const evaluator = createHsaBulkCandidateEvaluator({ authorize, now: () => NOW });
    await assert.rejects(evaluator.evaluate({ tenantId: "tenantA", bytes }), /not approved/);
  }
});

test("expiry during validation blocks even a valid file and receipt", async () => {
  let times = [NOW, Date.parse("2026-11-18T08:05:00Z")];
  const evaluator = createHsaBulkCandidateEvaluator({
    authorize: async (ctx) => grant(ctx), now: () => times.shift()
  });
  await assert.rejects(evaluator.evaluate({
    tenantId: "tenantA", bytes: csv(row())
  }), /rights expired/);
});

test("untrusted clocks, improper tenants and missing authorizer fail closed", async () => {
  assert.throws(() => createHsaBulkCandidateEvaluator(), /trusted authorizer/);
  const evaluator = createHsaBulkCandidateEvaluator({
    authorize: async (ctx) => grant(ctx), now: () => NaN
  });
  await assert.rejects(evaluator.evaluate({ tenantId: "tenantA", bytes: csv(row()) }), /invalid trusted/);
  await assert.rejects(evaluator.evaluate({ tenantId: "x", bytes: csv(row()) }), /tenant context/);
});

test("parsed records are bounded to five previews, all rows counted", () => {
  const bytes = csv(...Array.from({ length: 22 }, (_, i) =>
    row("SIN" + String(i).padStart(5, "0") + "P", "Name-" + i)
  ));
  const result = parseHsaCsvBytes(bytes);
  assert.equal(result.records.length, 5);
  assert.equal(result.totalDataRows, 22);
  assert.equal(result.validIdentityRows, 22);
});


test("HSA bulk rechecks revocation and licence version after parsing, never returning rows", async () => {
  const bytes = csv(row());
  for (const update of [
    (ctx) => grant(ctx, { revokedAt: "2026-11-18T07:00:00Z" }),
    (ctx) => grant(ctx, { receiptId: "new-receipt" }),
    (ctx) => grant(ctx, { rightsVersion: "new-version" }),
    (ctx) => grant(ctx, { licenseId: "new-licence" }),
    (ctx) => grant(ctx, { tenantId: "another-tenant" }),
    () => { throw new Error("authorizer disconnected"); }
  ]) {
    let calls = 0;
    const evaluator = createHsaBulkCandidateEvaluator({
      authorize: async (ctx) => (++calls === 1 ? grant(ctx) : update(ctx)),
      now: () => NOW
    });
    await assert.rejects(evaluator.evaluate({ tenantId: "tenantA", bytes }),
      /HSA bulk candidate rejected: source rights (revoked|rotated|unavailable) after validation/);
    assert.equal(calls, 2);
  }
});
