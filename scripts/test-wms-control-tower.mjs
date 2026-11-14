import test from "node:test";
import assert from "node:assert/strict";
import {
  reviewRecordedWarehouseLedger,
  reviewQualified3plSnapshot,
} from "../src/core/wms-control-tower.mjs";

const asOf = "2026-11-14T12:00:00Z";
const tenantId = "NOVAPHARM-UK";
const siteId = "UK-POLAR-SPEED-001";
const ledgerLot = {
  location_code: "RACK-001", sku: "NUTRAXIN-001", batch_number: "BATCH-001",
  expiry_date: "2027-05-01", release_status: "released",
  on_hand_quantity: 100, reserved_quantity: 10,
  available_quantity: 85, quarantine_quantity: 5,
};
const lot = (overrides = {}) => ({
  tenantId, siteId, sku: "NUTRAXIN-001", batchNumber: "BATCH-001",
  expiryDate: "2027-05-01", qualityStatus: "released",
  temperatureStatus: "verified_in_range", recallStatus: "clear",
  onHand: 100, reserved: 10, quarantined: 5, damaged: 0, ...overrides,
});
const manifest = {
  tenantId, siteId, sourceSystem: "polar_speed", feedId: "FEED-001",
  evidenceId: "EVIDENCE-001", sha256: "a".repeat(64),
  reviewState: "evidence_submitted_for_independent_reconciliation",
  synthetic: false, capturedAt: "2026-11-14T11:30:00Z",
};
const feed = (lots = [lot()], manifestChanges = {}) => ({
  manifest: { ...manifest, ...manifestChanges }, lots,
});
const options = { tenantId, siteId, asOf };

test("legacy warehouse ledger is always unverified even with apparently clean rows", () => {
  const clean = { ...ledgerLot, quarantine_quantity: 0, available_quantity: 90 };
  const result = reviewRecordedWarehouseLedger([clean], { asOf });
  assert.equal(result.state, "unverified");
  assert.equal(result.observedLots, 1);
  assert.equal(result.findings.length, 0);
  assert.equal(result.sourceReconciled, false);
  assert.equal(result.saleAuthorised, false);
  assert.equal(result.promiseAuthorised, false);
  assert.equal(result.stockReserved, false);
  assert.equal(result.dispatchAuthorised, false);
});

test("legacy exceptions flag quarantine, expired, near-expiry, quality and quantity mismatches", () => {
  const rows = [
    { ...ledgerLot, expiry_date: "2026-11-13", batch_number: "BATCH-EXP" },
    { ...ledgerLot, expiry_date: "2026-12-01", batch_number: "BATCH-NEAR",
      release_status: "quarantined", available_quantity: 100 },
    { ...ledgerLot, expiry_date: "2027-06-01", batch_number: "BATCH-LATER" },
  ];
  const r = reviewRecordedWarehouseLedger(rows, { asOf });
  const kinds = new Set(r.findings.map((f) => f.reason));
  for (const k of ["EXPIRED_BATCH", "EXPIRY_WITHIN_90_DAYS",
    "QUALITY_HOLD_OR_UNVERIFIED", "QUARANTINED_STOCK_PRESENT",
    "QUANTITY_RECONCILIATION_REQUIRED"]) assert.ok(kinds.has(k), k);
  assert.equal(r.state, "unverified");
  assert.equal(r.warehouseCommandIssued, false);
});

test("duplicated batches, invalid clock and malformed ledger never create authority", () => {
  assert.ok(reviewRecordedWarehouseLedger([ledgerLot, ledgerLot], { asOf })
    .findings.some((f) => f.reason === "DUPLICATE_LOCATION_BATCH"));
  for (const bad of [{ asOf: "not-a-time" }, { asOf, expiryDays: 500 }]) {
    const r = reviewRecordedWarehouseLedger([ledgerLot], bad);
    assert.equal(r.observedLots, null);
    assert.equal(r.promiseAuthorised, false);
  }
});

test("3PL envelope yields only independent-review FEFO candidates, not real ATP", () => {
  const later = lot({ batchNumber: "BATCH-LATER", expiryDate: "2027-08-01" });
  const earlier = lot({ batchNumber: "BATCH-EARLIER", expiryDate: "2027-03-01" });
  const r = reviewQualified3plSnapshot(feed([later, earlier]), options);
  assert.equal(r.state, "candidate_for_independent_review");
  assert.equal(r.lotsReviewed, 2);
  assert.equal(r.reportedOnHand, 200);
  assert.equal(r.reportedReleased, 170);
  assert.deepEqual(r.fefoReviewCandidates.map((f) => f.batchNumber),
    ["BATCH-EARLIER", "BATCH-LATER"]);
  assert.equal(r.sourceReconciled, false);
  for (const action of ["saleAuthorised", "promiseAuthorised", "stockReserved",
    "dispatchAuthorised", "purchaseOrderPlaced", "warehouseCommandIssued"])
    assert.equal(r[action], false, action);
});

test("stale feed, future feed, wrong site or tenant, synthetic and fake digest block", () => {
  const invalid = [
    feed([lot()], { tenantId: "OTHER-TENANT" }),
    feed([lot()], { siteId: "OTHER-WAREHOUSE" }),
    feed([lot()], { capturedAt: "2026-11-12T11:00:00Z" }),
    feed([lot()], { capturedAt: "2026-11-15T11:00:00Z" }),
    feed([lot()], { synthetic: true }),
    feed([lot()], { sha256: "not-a-digest" }),
    feed([lot()], { reviewState: "approved_for_sale" }),
    feed([{ ...lot(), tenantId: "OTHER-TENANT" }]),
    feed([{ ...lot(), siteId: "OTHER-SITE" }]),
  ];
  for (const packet of invalid) {
    const r = reviewQualified3plSnapshot(packet, options);
    assert.equal(r.state, "blocked");
    assert.deepEqual(r.fefoReviewCandidates, []);
    assert.equal(r.promiseAuthorised, false);
  }
});

test("duplicates and impossible quantities reject the full feed", () => {
  for (const lots of [
    [lot(), lot()],
    [lot({ reserved: 101 })],
    [lot({ quarantined: -1 })],
    [lot({ expiryDate: "2027-02-30" })],
  ]) {
    const r = reviewQualified3plSnapshot(feed(lots), options);
    assert.equal(r.state, "blocked");
    assert.deepEqual(r.fefoReviewCandidates, []);
  }
});

test("recalls, temperature excursions, QA holds and expired lots cannot enter FEFO", () => {
  const lots = [
    lot({ batchNumber: "BATCH-RECALL", recallStatus: "active" }),
    lot({ batchNumber: "BATCH-TEMP", temperatureStatus: "excursion" }),
    lot({ batchNumber: "BATCH-QUALITY", qualityStatus: "quarantined" }),
    lot({ batchNumber: "BATCH-EXPIRED", expiryDate: "2026-11-01" }),
    lot({ batchNumber: "BATCH-OK" }),
  ];
  const r = reviewQualified3plSnapshot(feed(lots), options);
  assert.equal(r.state, "candidate_for_independent_review");
  assert.deepEqual(r.fefoReviewCandidates.map((f) => f.batchNumber), ["BATCH-OK"]);
  assert.equal(r.reportedReleased, 85);
  assert.equal(r.stockReserved, false);
});

test("empty or absent 3PL source is never interpreted as operational integration", () => {
  const empty = reviewQualified3plSnapshot(feed([]), options);
  assert.equal(empty.state, "candidate_for_independent_review");
  assert.equal(empty.lotsReviewed, 0);
  assert.equal(empty.promiseAuthorised, false);
  const missing = reviewQualified3plSnapshot({}, options);
  assert.equal(missing.state, "blocked");
  assert.equal(missing.reportedOnHand, null);
});
