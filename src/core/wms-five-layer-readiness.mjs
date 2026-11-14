/**
 * NovaPharm employee WMS control plane.
 *
 * The five sources are intentionally NOT treated as one authoritative system:
 * commerce order, internal ledger, QMS, logistics event and analytics evidence
 * retain their separate owners. This is a read-only, role-gated decision view.
 * Do not derive available-to-promise, dispatch approval, OTIF or margin here.
 */
export const WMS_CONTROL_LAYERS = Object.freeze([
  Object.freeze({
    code: "commercial",
    label: "Commercial",
    evidence: "Accepted customer account, price, credit and legal supply permissions",
    destination: "employee.orders",
  }),
  Object.freeze({
    code: "inventory",
    label: "Inventory visibility",
    evidence: "Independently matched physical stock by 3PL, owner, site, bin and lot",
    destination: "employee.warehouse",
  }),
  Object.freeze({
    code: "quality",
    label: "Quality",
    evidence: "Qualified batch status, quarantine, returns, temperature and recall approvals",
    destination: "employee.quality",
  }),
  Object.freeze({
    code: "orchestration",
    label: "Order orchestration",
    evidence: "Authorised order, accepted 3PL execution events and carrier proof",
    destination: "employee.orders",
  }),
  Object.freeze({
    code: "intelligence",
    label: "Distribution intelligence",
    evidence: "Reconciled order, warehouse, carrier and finance period with measured denominators",
    destination: "employee.dashboard",
  }),
]);

const DATASET_CODES = Object.freeze({
  commercial: "Commercial fulfilment queue",
  inventory: "Inventory ledger",
  quality: "Quality and recall observations",
  orchestration: "Shipment and carrier observations",
  intelligence: "Integration delivery exceptions",
});
const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);

/**
 * A zero-length sample is UNKNOWN; it cannot certify zero actual exceptions,
 * missing stock, absence of recalls, an empty warehouse, or operational KPIs.
 */
export function reviewWmsFiveLayerObservations(snapshot) {
  if (!isObject(snapshot) || snapshot.module?.code !== "employee.warehouse" ||
      !Array.isArray(snapshot.sections) || !Array.isArray(snapshot.notices)) {
    return Object.freeze({
      status: "blocked",
      rows: Object.freeze([]),
      reasons: Object.freeze(["authorised_employee_warehouse_snapshot_required"]),
      releaseAuthorised: false,
      inventoryAvailableToPromise: null,
      otifPercent: null,
      perfectOrderPercent: null,
      grossContributionMinor: null,
    });
  }
  const rows = WMS_CONTROL_LAYERS.map((layer) => {
    const source = snapshot.sections.find((entry) => entry?.title === DATASET_CODES[layer.code]);
    const sampleSize = source && Array.isArray(source.rows) ? source.rows.length : null;
    const origin = snapshot.dataState === "synthetic"
      ? "synthetic_local_validation"
      : "enterprise_application_ledger_not_independently_reconciled";
    return Object.freeze({
      layer: layer.label,
      observedSampleRows: sampleSize,
      dataOrigin: origin,
      reconciliation: "not_independently_proven",
      decision: "review_only",
      requiredEvidence: layer.evidence,
      destination: layer.destination,
    });
  });
  return Object.freeze({
    status: "observation_only",
    rows: Object.freeze(rows),
    reasons: Object.freeze([
      "no_accepted_physical_3pl_feed_or_independent_quality_reconciliation",
      "portal_records_do_not_prove_end_to_end_operational_service",
    ]),
    releaseAuthorised: false,
    inventoryAvailableToPromise: null,
    otifPercent: null,
    perfectOrderPercent: null,
    grossContributionMinor: null,
    paymentAuthorised: false,
    shipmentAuthorised: false,
    recallClosureAuthorised: false,
  });
}
