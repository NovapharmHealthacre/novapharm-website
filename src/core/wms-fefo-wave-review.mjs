import { reviewQualified3plSnapshot } from "./wms-control-tower.mjs";
import { review3plInventoryReconciliation } from "./wms-network-reconciliation.mjs";

/**
 * A deterministic FEFO and wave *review* engine for the NovaPharm Distribution
 * control plane. It does not release waves or create warehouse tasks.
 *
 * External provider authenticity, accepted product/customer rights, shelf-life
 * agreements, unit-of-measure master and 3PL execution remain separate gates.
 * Valid input is still only an independently reviewable recommendation.
 */
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,99}$/u;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u;
const UOMS = new Set(["EA", "BOX", "PALLET"]);
const validId = (x) => typeof x === "string" && ID.test(x);
const isObject = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const validDateTime = (x) => typeof x === "string" && ISO.test(x) &&
  Number.isFinite(Date.parse(x)) && new Date(Date.parse(x)).toISOString().slice(0, 19) === x.slice(0, 19);
const quantity = (x) => Number.isSafeInteger(x) && x > 0 && x <= 1000000;
const freezeRows = (rows) => Object.freeze(rows.map((r) => Object.freeze(r)));
const releaseBoundary = Object.freeze({
  providerAuthenticated: false,
  independentlyReconciled: false,
  customerTradeAuthorised: false,
  qualityReleased: false,
  availableToPromise: null,
  stockReserved: false,
  waveReleased: false,
  warehouseTasksCreated: false,
  pickConfirmed: false,
  dispatchAuthorised: false,
  customerOrderReleased: false,
});
const base = (status, reasons, extras = {}) => Object.freeze({
  status,
  reasons: Object.freeze([...new Set(reasons)]),
  proposedPicks: Object.freeze([]),
  proposedWaves: Object.freeze([]),
  shortfalls: Object.freeze([]),
  ordersReviewed: null,
  candidateUnits: null,
  ...extras,
  ...releaseBoundary,
});

function dateOnlyEpoch(date) {
  const epoch = Date.parse(date + "T00:00:00Z");
  return Number.isFinite(epoch) && new Date(epoch).toISOString().slice(0, 10) === date
    ? epoch : NaN;
}

/**
 * All quantities are in an explicitly matching base unit. No UOM conversion
 * is performed (and BOX vs EA must never be treated as interchangeable).
 *
 * Review-only order demand is processed in deterministic priority/due order
 * and capacities are consumed once per owner/bin/lot across all order lines.
 */
export function reviewFefoWaveCandidates({
  providerPacket,
  ledgerSnapshot,
  orderLines,
  tenantId,
  siteId,
  ownerId,
  asOf = new Date().toISOString(),
  maxTasksPerWave = 20,
} = {}) {
  if (![tenantId, siteId, ownerId].every(validId) ||
      !validDateTime(asOf) || !Number.isSafeInteger(maxTasksPerWave) ||
      maxTasksPerWave < 1 || maxTasksPerWave > 100 ||
      !Array.isArray(orderLines) || orderLines.length < 1 || orderLines.length > 1000) {
    return base("blocked", ["invalid_scope_clock_order_lines_or_wave_limit"]);
  }

  const reconciliation = review3plInventoryReconciliation({
    providerPacket, ledgerSnapshot, tenantId, siteId, asOf,
  });
  if (reconciliation.status !== "candidate_for_independent_reconciliation" ||
      reconciliation.varianceRows.length !== 0) {
    return base("blocked", ["warehouse_and_ledger_reconciliation_candidate_missing",
      ...reconciliation.reasons]);
  }
  const screening = reviewQualified3plSnapshot(providerPacket, { tenantId, siteId, asOf });
  if (screening.state !== "candidate_for_independent_review")
    return base("blocked", ["qualified_provider_lot_candidates_missing", ...screening.reasons]);

  // An independently verified UOM master is not available here; require the
  // provider and ledger to agree exactly, with no implicit pack conversion.
  const ledgerIndex = new Map(ledgerSnapshot.lines.map((l) =>
    [[l.ownerId, l.locationId, l.sku, l.batchNumber].join("|"), l]));
  const allLots = providerPacket.lots.filter((l) => l.ownerId === ownerId);
  for (const lot of allLots) {
    const key = [lot.ownerId, lot.locationId, lot.sku, lot.batchNumber].join("|");
    if (!UOMS.has(lot.baseUom) || ledgerIndex.get(key)?.baseUom !== lot.baseUom) {
      return base("blocked", ["base_unit_master_and_ledger_agreement_required"]);
    }
  }

  const seen = new Set();
  for (const line of orderLines) {
    const key = [line?.orderId, line?.lineId].join("|");
    if (!isObject(line) || ![line.tenantId, line.siteId, line.ownerId,
        line.orderId, line.lineId, line.sku].every(validId) ||
        line.tenantId !== tenantId || line.siteId !== siteId || line.ownerId !== ownerId ||
        !UOMS.has(line.baseUom) || !quantity(line.requestedUnits) ||
        !["urgent", "standard"].includes(line.priority) ||
        !validDateTime(line.dueAt) ||
        !Number.isSafeInteger(line.minRemainingShelfLifeDays) ||
        line.minRemainingShelfLifeDays < 0 || line.minRemainingShelfLifeDays > 3650 ||
        seen.has(key)) {
      return base("blocked", ["invalid_duplicate_or_cross_scope_order_line"]);
    }
    seen.add(key);
  }

  // Matching SKU with a different base unit is a hard review failure, not
  // an apparent inventory shortfall or implicit BOX-to-EA conversion.
  if (orderLines.some((line) => allLots.some((lot) =>
    lot.sku === line.sku && lot.baseUom !== line.baseUom))) {
    return base("blocked", ["order_unit_and_warehouse_base_unit_mismatch"]);
  }

  const candidates = screening.fefoReviewCandidates.filter((lot) => lot.ownerId === ownerId)
    .map((lot) => ({
      ...lot,
      baseUom: ledgerIndex.get([lot.ownerId,lot.locationId,lot.sku,lot.batchNumber].join("|")).baseUom,
      remaining: lot.quantityForQualityReview,
    }));
  candidates.sort((a,b) => a.expiryDate.localeCompare(b.expiryDate) ||
    a.locationId.localeCompare(b.locationId) || a.batchNumber.localeCompare(b.batchNumber) ||
    a.sku.localeCompare(b.sku));

  const queue = [...orderLines].sort((a,b) =>
    (a.priority === "urgent" ? 0 : 1) - (b.priority === "urgent" ? 0 : 1) ||
    a.dueAt.localeCompare(b.dueAt) || a.orderId.localeCompare(b.orderId) ||
    a.lineId.localeCompare(b.lineId));
  const picks = [], shortfalls = [];
  const today = dateOnlyEpoch(asOf.slice(0,10));
  for (const line of queue) {
    const shelfLimit = today + line.minRemainingShelfLifeDays * 86400000;
    let remaining = line.requestedUnits;
    for (const lot of candidates) {
      if (remaining === 0) break;
      if (lot.sku !== line.sku || lot.baseUom !== line.baseUom || lot.remaining < 1 ||
          !(dateOnlyEpoch(lot.expiryDate) > shelfLimit)) continue;
      const allocated = Math.min(remaining, lot.remaining);
      lot.remaining -= allocated;
      remaining -= allocated;
      picks.push(Object.freeze({
        orderId: line.orderId, lineId: line.lineId, priority: line.priority,
        dueAt: line.dueAt, ownerId, siteId,
        locationId: lot.locationId, sku: line.sku,
        batchNumber: lot.batchNumber, expiryDate: lot.expiryDate,
        baseUom: line.baseUom, proposedUnits: allocated,
        reviewState: "not_authorised_for_execution",
      }));
    }
    if (remaining > 0) shortfalls.push(Object.freeze({
      orderId:line.orderId, lineId:line.lineId, sku:line.sku,
      baseUom:line.baseUom, requiredUnits:line.requestedUnits, unfilledUnits:remaining,
      reason:"qualified_review_candidates_insufficient_or_shelf_life_restricted",
    }));
  }

  // Bounded review-wave grouping; these are NOT worker tasks or 3PL wave IDs.
  const waves = [];
  for (let i = 0; i < picks.length; i += maxTasksPerWave) {
    const group = picks.slice(i, i + maxTasksPerWave);
    const units = group.reduce((sum, row) => sum + row.proposedUnits, 0);
    if (!Number.isSafeInteger(units))
      return base("blocked", ["candidate_wave_quantity_overflow"]);
    waves.push(Object.freeze({
      reviewWave: "WAVE-REVIEW-" + String(waves.length+1).padStart(3,"0"),
      taskCandidates: group.length, proposedUnits: units,
      orderCount: new Set(group.map((x) => x.orderId)).size,
      reviewState: "not_authorised_for_execution",
    }));
  }
  const units = picks.reduce((sum,row) => sum + row.proposedUnits,0);
  if (!Number.isSafeInteger(units)) return base("blocked", ["candidate_quantity_overflow"]);
  return base(shortfalls.length ? "partial_fefo_review_with_shortfalls" : "fefo_wave_candidates_for_independent_review",
    ["external_authenticity_trade_rights_quality_uom_master_and_3pl_acceptance_required"],{
      proposedPicks:freezeRows(picks),
      proposedWaves:freezeRows(waves),
      shortfalls:freezeRows(shortfalls),
      ordersReviewed:orderLines.length,
      candidateUnits:units,
      warehouseEvidenceId:reconciliation.warehouseEvidenceId,
      ledgerEvidenceId:reconciliation.ledgerEvidenceId,
      reviewOnly:true,
    });
}
