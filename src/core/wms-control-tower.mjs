/**
 * NovaPharm WMS control tower, a pure read-only 3PL orchestration contract.
 *
 * This module deliberately never accepts browser authority, writes stock,
 * reserves inventory, dispatches, or represents a catalogue as available stock.
 * A valid packet is still only a candidate for an independently approved
 * operational reconciliation. Warehouse truth must originate at the 3PL.
 */
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,99}$/u;
const SHA256 = /^[a-f0-9]{64}$/iu;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u;
const goodId = (value) => typeof value === "string" && ID.test(value);
const quantity = (value) => Number.isSafeInteger(value) && value >= 0;
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function utcInstant(value) {
  return typeof value === "string" && ISO.test(value) && Number.isFinite(Date.parse(value))
    ? Date.parse(value) : NaN;
}

function utcDay(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return NaN;
  const time = Date.parse(value + "T00:00:00Z");
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : NaN;
}

const readonlyResult = (value) => Object.freeze({
  ...value,
  saleAuthorised: false,
  promiseAuthorised: false,
  stockReserved: false,
  dispatchAuthorised: false,
  purchaseOrderPlaced: false,
  // A pure validation result must never be mistaken for execution authority.
  warehouseCommandIssued: false,
});

/**
 * Legacy enterprise inventory ledger is unverified presentation data. It can
 * surface *observed exceptions*, but cannot prove warehouse stock or ATP.
 * Evidence remains explicitly incomplete even when no exceptions are found.
 */
export function reviewRecordedWarehouseLedger(rows = [], { asOf = new Date().toISOString(), expiryDays = 90 } = {}) {
  const at = utcInstant(asOf);
  if (!Array.isArray(rows) || !Number.isFinite(at) || !Number.isSafeInteger(expiryDays) ||
      expiryDays < 1 || expiryDays > 365) {
    return readonlyResult({
      state: "unverified", observedLots: null, expiryDays: 90,
      findings: Object.freeze([]), reasons: Object.freeze(["invalid_ledger_or_clock"]),
      sourceReconciled: false,
    });
  }
  const start = Date.parse(new Date(at).toISOString().slice(0, 10) + "T00:00:00Z");
  const horizon = start + expiryDays * 86400000;
  const findings = [];
  const observed = new Set();
  for (const row of rows) {
    const r = object(row) ? row : {};
    const key = [r.location_code, r.sku, r.batch_number].join("|");
    const problems = [];
    if (!goodId(r.sku) || !goodId(r.batch_number) || !goodId(r.location_code) ||
        !Number.isFinite(utcDay(r.expiry_date))) problems.push("INCOMPLETE_BATCH_IDENTITY");
    if (observed.has(key)) problems.push("DUPLICATE_LOCATION_BATCH");
    observed.add(key);
    if (!["released", "released_for_sale"].includes(r.release_status)) problems.push("QUALITY_HOLD_OR_UNVERIFIED");
    const q = ["on_hand_quantity", "reserved_quantity", "available_quantity", "quarantine_quantity"];
    if (!q.every((field) => quantity(r[field])) ||
        (q.every((field) => quantity(r[field])) &&
        r.reserved_quantity + r.available_quantity + r.quarantine_quantity > r.on_hand_quantity))
      problems.push("QUANTITY_RECONCILIATION_REQUIRED");
    if (quantity(r.quarantine_quantity) && r.quarantine_quantity > 0) problems.push("QUARANTINED_STOCK_PRESENT");
    const expiry = utcDay(r.expiry_date);
    if (Number.isFinite(expiry)) {
      if (expiry < start) problems.push("EXPIRED_BATCH");
      else if (expiry <= horizon) problems.push("EXPIRY_WITHIN_90_DAYS");
    }
    for (const reason of problems) findings.push(Object.freeze({
      reason, sku: goodId(r.sku) ? r.sku : null,
      batchNumber: goodId(r.batch_number) ? r.batch_number : null,
      locationCode: goodId(r.location_code) ? r.location_code : null,
      expiryDate: Number.isFinite(expiry) ? r.expiry_date : null,
      // Observed exception; NOT a verified warehouse event.
      evidenceState: "legacy_ledger_not_3pl_reconciled",
    }));
  }
  return readonlyResult({
    state: "unverified",
    observedLots: rows.length,
    expiryDays,
    findings: Object.freeze(findings),
    reasons: Object.freeze(["warehouse_source_reconciliation_not_proven"]),
    sourceReconciled: false,
  });
}

/**
 * Validates a 3PL feed envelope supplied by a trusted server adapter.
 * No signature checking, warehouse connectivity or independent review occurs
 * here. Valid metadata yields only 'candidate_for_independent_review'.
 * The authoritative reconciliation must be a separate, auditable process.
 */
export function reviewQualified3plSnapshot(packet = {}, {
  tenantId, siteId, asOf = new Date().toISOString(),
} = {}) {
  const blocked = (reasons) => readonlyResult({
    state: "blocked", reasons: Object.freeze([...new Set(reasons)]),
    lotsReviewed: null, reportedOnHand: null, reportedReleased: null,
    fefoReviewCandidates: Object.freeze([]), sourceReconciled: false,
  });
  const m = packet?.manifest;
  const at = utcInstant(asOf);
  const reasons = [];
  if (!goodId(tenantId) || !goodId(siteId) || !Number.isFinite(at))
    reasons.push("trusted_tenant_site_or_review_clock_missing");
  if (!object(m) || !goodId(m.feedId) || !goodId(m.evidenceId) ||
      !SHA256.test(m.sha256 || "") ||
      !["polar_speed", "ups_marken", "qualified_3pl"].includes(m.sourceSystem) ||
      m.reviewState !== "evidence_submitted_for_independent_reconciliation" ||
      m.synthetic !== false)
    reasons.push("source_evidence_incomplete");
  if (!object(m) || m.tenantId !== tenantId || m.siteId !== siteId)
    reasons.push("tenant_or_site_mismatch");
  const captured = utcInstant(m?.capturedAt);
  if (!Number.isFinite(captured) || !Number.isFinite(at) || captured > at ||
      at - captured > 24 * 60 * 60 * 1000)
    reasons.push("source_stale_or_future_dated");
  if (!Array.isArray(packet?.lots) || packet.lots.length > 20000)
    reasons.push("invalid_or_unbounded_lot_feed");
  if (reasons.length) return blocked(reasons);

  const seen = new Set();
  const eligible = [];
  let onHand = 0;
  let released = 0;
  for (const lot of packet.lots) {
    if (!object(lot) || lot.tenantId !== tenantId || lot.siteId !== siteId ||
        !goodId(lot.sku) || !goodId(lot.batchNumber) ||
        !goodId(lot.ownerId) || !goodId(lot.locationId) ||
        !Number.isFinite(utcDay(lot.expiryDate))) {
      reasons.push("invalid_or_cross_tenant_lot");
      break;
    }
    const key = lot.ownerId + "|" + lot.locationId + "|" + lot.sku + "|" + lot.batchNumber;
    if (seen.has(key)) { reasons.push("duplicate_lot"); break; }
    seen.add(key);
    const fields = ["onHand", "reserved", "quarantined", "damaged"];
    if (!fields.every((field) => quantity(lot[field])) ||
        lot.reserved + lot.quarantined + lot.damaged > lot.onHand) {
      reasons.push("invalid_lot_quantities");
      break;
    }
    onHand += lot.onHand;
    if (!Number.isSafeInteger(onHand)) { reasons.push("stock_quantity_overflow"); break; }
    const releasable = lot.onHand - lot.reserved - lot.quarantined - lot.damaged;
    const safeToReview = lot.qualityStatus === "released" &&
      lot.temperatureStatus === "verified_in_range" &&
      lot.recallStatus === "clear" &&
      utcDay(lot.expiryDate) > at;
    if (safeToReview) {
      released += releasable;
      if (!Number.isSafeInteger(released)) { reasons.push("stock_quantity_overflow"); break; }
      if (releasable > 0) eligible.push(Object.freeze({
        sku: lot.sku, batchNumber: lot.batchNumber,
        siteId, ownerId: lot.ownerId, locationId: lot.locationId,
        expiryDate: lot.expiryDate,
        // Suggested FEFO sequence only; cannot reserve, ship or promise stock.
        quantityForQualityReview: releasable,
      }));
    }
  }
  if (reasons.length) return blocked(reasons);
  eligible.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate) ||
    a.sku.localeCompare(b.sku) || a.batchNumber.localeCompare(b.batchNumber));
  return readonlyResult({
    state: "candidate_for_independent_review",
    reasons: Object.freeze(["requires_3pl_reconciliation_quality_and_release_signoff"]),
    lotsReviewed: packet.lots.length,
    reportedOnHand: onHand,
    reportedReleased: released,
    fefoReviewCandidates: Object.freeze(eligible),
    sourceReconciled: false,
    feedId: m.feedId,
    evidenceId: m.evidenceId,
  });
}
