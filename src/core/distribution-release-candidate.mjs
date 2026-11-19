/**
 * Distribution eligibility evidence assessment, internal candidate only.
 *
 * This module cannot authorise medicinal sales, dispatch, or charge cards.
 * Receipt objects are inputs to an internal review, not MHRA verification:
 * a separate trusted quality/identity system must authenticate them.
 * Never expose this as a browser-side activation switch.
 */
export const DISTRIBUTION_GATES = Object.freeze([
  "D01_LEGAL_ACTIVITY", "D02_AUTHORITY", "D03_GDP_QMS",
  "D04_WAREHOUSE_SITE", "D05_TEMPERATURE_CONTROL",
  "D06_SUPPLIER_QUALIFICATION", "D07_BUYER_QUALIFICATION",
  "D08_PRODUCT_COUNTRY_RIGHTS", "D09_BATCH_INVENTORY",
  "D10_QUALITY_RELEASE", "D11_ORDER_FINANCE",
  "D12_APPROVED_DISTRIBUTION", "D13_RECALL_EXCEPTIONS",
  "D14_SYSTEM_SECURITY", "D15_END_TO_END_ACCEPTANCE"
]);

const id = /^[A-Za-z0-9][A-Za-z0-9._:/-]{2,127}$/u;
const digest = /^[a-f0-9]{64}$/u;
const timestamp = value => typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(value) &&
  Number.isFinite(Date.parse(value));
const plain = value => value !== null && typeof value === "object" &&
  !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const goodId = value => typeof value === "string" && id.test(value);
const deny = (code, gate = null) => Object.freeze({ code, gate });

function checkedReceipt(receipt, gate, scope, at) {
  if (!plain(receipt) || receipt.gate !== gate || receipt.status !== "approved" ||
      receipt.recordOrigin !== "controlled_quality_system" ||
      receipt.independentlyReviewed !== true ||
      !goodId(receipt.evidenceId) || !goodId(receipt.reviewerId) ||
      !goodId(receipt.reviewerRole) ||
      typeof receipt.evidenceSha256 !== "string" ||
      !digest.test(receipt.evidenceSha256) ||
      !timestamp(receipt.reviewedAt) || !timestamp(receipt.validFrom) ||
      !timestamp(receipt.validUntil)) return false;
  if (Date.parse(receipt.reviewedAt) > at ||
      Date.parse(receipt.validFrom) > at ||
      Date.parse(receipt.validUntil) <= at) return false;
  if (!plain(receipt.scope) ||
      receipt.scope.legalEntity !== scope.legalEntity ||
      receipt.scope.country !== scope.country ||
      receipt.scope.productId !== scope.productId) return false;
  // A generic site approval does not certify a different facility.
  if (receipt.scope.siteId !== scope.siteId) return false;
  return true;
}

/**
 * Evidence completeness review, NOT an authorisation.
 * No result of this function enables a checkout, medicine order, shipment,
 * product listing, licence claim or warehouse temperature certification.
 * The caller must independently authenticate receipts and bind current
 * licences, products, customer, stock and signature in a protected backend.
 */
export function assessDistributionReleaseCandidate(input = {}) {
  const blocks = [];
  const add = (code, gate = null) => blocks.push(deny(code, gate));
  const scope = input?.scope;
  const order = input?.order;
  const now = input?.asOf;
  const at = timestamp(now) ? Date.parse(now) : NaN;
  if (!Number.isFinite(at)) add("SERVER_REVIEW_TIME_MISSING");
  if (!plain(scope) || ![scope?.legalEntity, scope?.productId, scope?.siteId].every(goodId) ||
      scope?.country !== "GB") add("UNVERIFIED_UK_SCOPE");
  if (!plain(order) || order?.productClass !== "regulated_human_medicine" ||
      order?.channel !== "qualified_b2b" ||
      order?.buyerEligible !== true || order?.supplierEligible !== true ||
      order?.productCountryEligible !== true) add("ORDER_OR_COUNTERPARTY_NOT_QUALIFIED");
  if (order?.lotStatus !== "quality_released" ||
      order?.expiryValidated !== true || order?.availableToPromiseValidated !== true)
    add("INVENTORY_NOT_RELEASED");
  if (order?.temperatureDeviationsClosed !== true ||
      order?.laneQualified !== true || order?.recallHold === true)
    add("SHIPMENT_CONTROL_UNVERIFIED");
  const receipts = Array.isArray(input?.receipts) ? input.receipts : [];
  if (!Array.isArray(input?.receipts) || receipts.length !== DISTRIBUTION_GATES.length)
    add("INCOMPLETE_OR_DUPLICATE_RECEIPTS");
  const seen = new Set();
  for (const receipt of receipts) {
    if (plain(receipt) && typeof receipt.gate === "string") {
      if (seen.has(receipt.gate) || !DISTRIBUTION_GATES.includes(receipt.gate))
        add("DUPLICATE_OR_UNRECOGNISED_GATE", receipt.gate);
      seen.add(receipt.gate);
    } else add("MALFORMED_GATE");
  }
  if (plain(scope) && Number.isFinite(at)) {
    for (const gate of DISTRIBUTION_GATES) {
      const match = receipts.find(receipt => plain(receipt) && receipt.gate === gate);
      if (!checkedReceipt(match, gate, scope, at))
        add("GATE_EVIDENCE_NOT_CURRENT_AND_SCOPE_MATCHED", gate);
    }
  }
  const reviewReady = blocks.length === 0;
  return Object.freeze({
    status: reviewReady ? "ready_for_independent_quality_review" : "blocked",
    reviewReady,
    transactionAuthorized: false,
    medicineOrderAccepted: false,
    medicineDispatchAuthorized: false,
    customerFacingReleaseEnabled: false,
    requiresRegulatoryQualityAndOwnerSignoff: true,
    // Evidence receipt fields are untrusted until verified against source.
    requiresServerAuthenticatedReceipts: true,
    failures: Object.freeze(blocks)
  });
}

// Source-backed stage readiness and international network metrics share the
// existing regulated distribution candidate entrypoint. Neither authorises sales.
export {
  DISTRIBUTION_STAGES,
  TERRITORY_RELEASE_CONTROLS,
  reviewGlobalDistributionStages,
  reviewFederatedTerritoryCandidate,
  measureVerifiedDistributionService,
  reviewReplenishmentSuggestion
} from './distribution-network-controls.mjs';
