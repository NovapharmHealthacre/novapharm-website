/**
 * Server-side commercial quote calculator for a future NovaPharm checkout.
 *
 * The price of a product is NOT an authorisation to sell it. Persisted
 * price/cost sources, product eligibility, tax registrations, secure customer
 * identity and fulfilment must be verified separately before creating payment.
 *
 * Internal cost values must never be returned by public API endpoints.
 */
export const TARGET_GROSS_MARGIN_BPS = 2500;
const MAX_LINES = 50;
const MAX_MINOR = 99_999_999;
const SKU = /^[A-Z0-9][A-Z0-9-]{4,58}$/u;
const COUNTRY = /^[A-Z]{2}$/u;

function stop(message) {
  throw Object.assign(new Error(message), { code: "commercial_quote_unavailable" });
}
function money(n, description, { allowZero = false } = {}) {
  if (!Number.isSafeInteger(n) || n < 0 || n > MAX_MINOR || (!allowZero && n === 0)) {
    stop(description + " must be an approved integer GBP-pence amount.");
  }
  return n;
}
function marginSaleNet(costMinor) {
  money(costMinor, "Landed cost");
  // A 25% gross profit margin means the net sales price must be >= cost/.75.
  // Round up to prevent under-shooting 25% due to rounding.
  return Math.ceil((costMinor * 10_000) / (10_000 - TARGET_GROSS_MARGIN_BPS));
}

/** Makes a quote candidate; it does not reserve stock or enable payment. */
export function calculateMarginQuote({
  destinationCountry,
  approvedCostLines,
  deliveryQuote,
  taxAssessment,
  nowMs = Date.now()
} = {}) {
  if (!COUNTRY.test(destinationCountry ?? "")) stop("A validated destination country is required.");
  if (!Array.isArray(approvedCostLines) || approvedCostLines.length < 1 || approvedCostLines.length > MAX_LINES) {
    stop("At least one approved cost line is required.");
  }
  if (!deliveryQuote || deliveryQuote.destinationCountry !== destinationCountry ||
      deliveryQuote.currency !== "GBP" || deliveryQuote.providerApproval !== true ||
      !Number.isFinite(deliveryQuote.expiresAtMs) || deliveryQuote.expiresAtMs <= nowMs ||
      typeof deliveryQuote.reference !== "string" || deliveryQuote.reference.length < 6 ||
      deliveryQuote.reference.length > 120) {
    stop("An unexpired destination-specific logistics quotation is required.");
  }
  const seen = new Set();
  const quotedLines = approvedCostLines.map(row => {
    if (typeof row?.sku !== "string" || !SKU.test(row.sku) || seen.has(row.sku)) stop("Invalid or repeated SKU.");
    seen.add(row.sku);
    if (typeof row.name !== "string" || row.name.trim().length < 2 || row.name.length > 120) stop("Approved product name is required.");
    if (!Number.isSafeInteger(row.quantity) || row.quantity < 1 || row.quantity > 10000) stop("Order quantity is invalid.");
    if (row.sourceApproved !== true || row.commerciallyEligible !== true ||
        typeof row.costVersion !== "string" || row.costVersion.length < 4) {
      stop("Price and product eligibility must be confirmed from private authoritative sources.");
    }
    if (row.fulfilmentMode === "ready_stock") {
      if (!Number.isSafeInteger(row.availableToPromise) || row.availableToPromise < row.quantity) {
        stop("Sellable warehouse stock is not confirmed.");
      }
    } else if (row.fulfilmentMode === "manufacture_to_order") {
      // Manufacturing capability is not instantly dispatchable stock.
      if (row.customerAcceptedLeadTime !== true ||
          !Number.isSafeInteger(row.confirmedProductionDays) ||
          row.confirmedProductionDays < 1 || row.confirmedProductionDays > 365 ||
          row.productionCapacityApproved !== true) {
        stop("Made-to-order items require confirmed capacity and customer-accepted lead time.");
      }
    } else stop("Fulfilment status is unverified.");
    const landedUnitCostMinor = money(row.landedUnitCostMinor, "Private landed unit cost");
    const netCostMinor = landedUnitCostMinor * row.quantity;
    if (!Number.isSafeInteger(netCostMinor) || netCostMinor > MAX_MINOR) stop("Cost exceeds checkout limit.");
    return {
      sku: row.sku, name: row.name, quantity: row.quantity,
      netSaleMinor: marginSaleNet(netCostMinor)
    };
  });
  const deliveryCostMinor = money(deliveryQuote.costMinor, "Destination shipping cost", { allowZero: true });
  const packingCostMinor = money(deliveryQuote.packingMinor, "Picking and packing cost", { allowZero: true });
  const logisticsCostMinor = deliveryCostMinor + packingCostMinor;
  if (!Number.isSafeInteger(logisticsCostMinor) || logisticsCostMinor > MAX_MINOR) stop("Logistics exceeds checkout limit.");
  const logisticsSaleMinor = logisticsCostMinor ? marginSaleNet(logisticsCostMinor) : 0;
  const netMinor = quotedLines.reduce((n, line) => n + line.netSaleMinor, logisticsSaleMinor);
  if (!Number.isSafeInteger(netMinor) || netMinor > MAX_MINOR) stop("Net total exceeds checkout limit.");

  // Tax decisions must be calculated from this *exact* net base by an
  // approved jurisdiction-aware backend, not guessed from a country code.
  if (!taxAssessment || taxAssessment.confirmed !== true ||
      taxAssessment.destinationCountry !== destinationCountry ||
      taxAssessment.currency !== "GBP" || taxAssessment.netMinor !== netMinor ||
      !Number.isFinite(taxAssessment.expiresAtMs) || taxAssessment.expiresAtMs <= nowMs ||
      typeof taxAssessment.reference !== "string" || taxAssessment.reference.length < 6 ||
      typeof taxAssessment.jurisdictionBasis !== "string" || taxAssessment.jurisdictionBasis.length < 6 ||
      !Array.isArray(taxAssessment.lineTaxMinor) || taxAssessment.lineTaxMinor.length !== quotedLines.length + (logisticsSaleMinor ? 1 : 0)) {
    stop("A current destination-specific tax decision for this exact quote is required.");
  }
  const approvedTax = taxAssessment.lineTaxMinor.reduce((sum, amount) => sum + money(amount, "Approved tax line", {allowZero:true}), 0);
  if (!Number.isSafeInteger(approvedTax) || approvedTax > MAX_MINOR ||
      approvedTax !== taxAssessment.totalTaxMinor) stop("Approved tax amounts do not reconcile.");

  const lines = quotedLines.map((line, index) => Object.freeze({
    name: line.name,
    sku: line.sku,
    quantity: line.quantity,
    grossMinor: line.netSaleMinor + taxAssessment.lineTaxMinor[index]
  }));
  if (logisticsSaleMinor) {
    lines.push(Object.freeze({
      name: "Approved delivery and handling", sku: "DELIVERY-APPROVED",
      quantity: 1, grossMinor: logisticsSaleMinor + taxAssessment.lineTaxMinor.at(-1)
    }));
  }
  const grossMinor = netMinor + approvedTax;
  if (!Number.isSafeInteger(grossMinor) || grossMinor < 30 || grossMinor > MAX_MINOR ||
      lines.reduce((n, x) => n + x.grossMinor, 0) !== grossMinor) {
    stop("Final quote total does not reconcile.");
  }
  return Object.freeze({
    currency: "GBP", destinationCountry,
    lines: Object.freeze(lines),
    netMinor, taxMinor: approvedTax, grossMinor,
    pricingPolicy: "25-percent-gross-margin-on-verified-landed-cost",
    deliveryQuoteReference: deliveryQuote.reference,
    taxAssessmentReference: taxAssessment.reference,
    status: "quote_candidate_not_payment_authorisation"
  });
}
