/**
 * NovaPharm Distribution: observational cross-domain warehouse worklist.
 *
 * This is NOT a QMS case register, warehouse event ledger, stock order,
 * availability promise, regulatory decision or task-assignment service.
 * It only helps an employee review bounded records already visible under
 * employee.warehouse RBAC. Absence of recorded signals is NOT clearance.
 */
const SOURCES = Object.freeze([
  "Warehouse exception review",
  "Receiving and purchasing evidence",
  "Quality and recall observations",
  "Return isolation review",
  "Shipment and carrier observations",
  "Integration delivery exceptions",
  "Commercial fulfilment queue",
]);
const isObject = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const identifier = (value) =>
  typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:/ -]{0,99}$/u.test(value)
    ? value : "Not recorded";
const nonnegative = (x) => typeof x === "number" && Number.isSafeInteger(x) && x >= 0;
const lower = (x) => typeof x === "string" ? x.trim().toLowerCase() : "";
const flag = (domain, signal, priority, reference, owner, source, index) => Object.freeze({
  priority, domain, reference: identifier(reference), signal,
  reviewOwner: owner, observedFrom: source,
  // An observed application record is NOT an authenticated provider incident.
  evidenceState: "application_record_not_3pl_reconciled",
  observationKey: `${source}:${index}`,
});
const priorities = Object.freeze({ high: 0, standard: 1 });

export function reviewWmsOperationalExceptionWorklist(snapshot) {
  const blocked = (reason) => Object.freeze({
    status: "blocked", reasons: Object.freeze([reason]),
    rows: Object.freeze([]), missingSources: Object.freeze([...SOURCES]),
    observedSignals: null, sampleLimited: true,
    networkCoverageVerified: false, warehouseCommandIssued: false,
    qualityDispositionIssued: false, shipmentAuthorised: false,
    saleAuthorised: false, externalIncidentCreated: false,
  });
  if (!isObject(snapshot) || snapshot.module?.code !== "employee.warehouse" ||
      snapshot.readOnly !== true || !Array.isArray(snapshot.sections) ||
      snapshot.actions?.length) {
    return blocked("read_only_authorised_employee_warehouse_view_required");
  }
  const byTitle = new Map(snapshot.sections.filter(isObject).map((s) => [s.title, s]));
  const rows = [];
  const missing = [];
  function collect(name, review) {
    const src = byTitle.get(name);
    if (!src || !Array.isArray(src.rows)) { missing.push(name); return; }
    // Never allow an unexpectedly unbounded external record feed into this view.
    for (const [index, item] of src.rows.slice(0, 120).entries()) {
      if (isObject(item)) review(item, index);
    }
  }
  const add = (...args) => rows.push(flag(...args));

  collect("Warehouse exception review", (row, i) => {
    const signal = lower(row.reason);
    if (!signal) return;
    add("Inventory/lot", "Warehouse ledger: " + identifier(row.reason),
      ["expired_batch", "quantity_reconciliation_required", "quality_hold_or_unverified"].includes(signal)
        ? "high" : "standard",
      row.batchNumber || row.sku, "Warehouse & quality review",
      "Warehouse exception review", i);
  });

  collect("Receiving and purchasing evidence", (row, i) => {
    if (nonnegative(row.rejected_quantity) && row.rejected_quantity > 0) {
      add("Inbound", "Recorded rejected receipt quantity",
        "high", row.receipt_number || row.po_number, "Warehouse receiving / quality",
        "Receiving and purchasing evidence", i);
    } else if (row.rejected_quantity == null || row.received_quantity == null) {
      add("Inbound", "Missing recorded receipt quantities",
        "standard", row.receipt_number || row.po_number, "Warehouse receiving",
        "Receiving and purchasing evidence", i);
    }
  });

  collect("Quality and recall observations", (row, i) => {
    if (lower(row.status) === "closed") return;
    const urgent = ["critical", "high", "severe"].includes(lower(row.severity)) ||
      ["required", "escalated", "open"].includes(lower(row.pv_escalation_status));
    add("Quality", "Recorded open quality/safety case",
      urgent ? "high" : "standard", row.complaint_number,
      "Quality / Responsible Person", "Quality and recall observations", i);
  });

  collect("Return isolation review", (row, i) => {
    if (![true, 1, "1"].includes(row.quality_hold)) return;
    add("Returns", "Recorded return on quality hold",
      "high", row.return_number, "Returns / Quality",
      "Return isolation review", i);
  });

  collect("Shipment and carrier observations", (row, i) => {
    const state = lower(row.shipment_status);
    if (["dispatched", "in_transit", "delivered"].includes(state) &&
        identifier(row.tracking_reference) === "Not recorded") {
      add("Outbound", "Recorded outbound shipment lacks tracking reference",
        "high", row.shipment_number || row.order_number,
        "3PL / Carrier reconciliation", "Shipment and carrier observations", i);
    }
    if (state === "delivered" && !row.delivered_at) {
      add("Outbound", "Recorded delivery lacks delivery timestamp",
        "high", row.shipment_number || row.order_number,
        "Carrier / Proof-of-delivery review", "Shipment and carrier observations", i);
    }
  });

  collect("Integration delivery exceptions", (row, i) => {
    const state = lower(row.status);
    if (!["blocked", "pending", "retrying"].includes(state)) return;
    add("Systems", "Recorded integration event: " + state,
      state === "blocked" ? "high" : "standard",
      row.destination_system || row.event_type, "Integration operations",
      "Integration delivery exceptions", i);
  });

  collect("Commercial fulfilment queue", (row, i) => {
    if (!["blocked", "on_hold", "held"].includes(lower(row.status))) return;
    add("Commercial", "Recorded order is held or blocked",
      "high", row.order_number, "Commercial operations",
      "Commercial fulfilment queue", i);
  });

  rows.sort((a, b) => priorities[a.priority] - priorities[b.priority] ||
    a.domain.localeCompare(b.domain) || a.observationKey.localeCompare(b.observationKey));
  const limited = rows.length > 120 || [...byTitle.values()].some((s) => isObject(s) && Array.isArray(s.rows) && s.rows.length > 120);
  return Object.freeze({
    status: "bounded_application_observations",
    reasons: Object.freeze([
      "all_signals_require_independent_source_and_operational_validation",
      "zero_recorded_signals_does_not_prove_network_healthy",
    ]),
    rows: Object.freeze(rows.slice(0, 120)),
    missingSources: Object.freeze(missing),
    observedSignals: rows.length,
    sampleLimited: true,
    worklistTruncated: limited,
    networkCoverageVerified: false,
    warehouseCommandIssued: false, qualityDispositionIssued: false,
    shipmentAuthorised: false, saleAuthorised: false, externalIncidentCreated: false,
  });
}
