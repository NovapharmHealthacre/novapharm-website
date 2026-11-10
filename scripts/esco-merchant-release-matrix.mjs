// Private commercial preparation only. Never import this into public checkout.
// Every ESCO catalogue item remains an order-request candidate until a separately
// governed, server-side approval record authorises a precise SKU and price.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { guideFor } from "./esco-merchandising.mjs";
import { internalSkuFromCatalogueId } from "../assets/js/esco-internal-sku.js";

const catalogue = JSON.parse(readFileSync(resolve("assets/data/esco-catalogue.json"), "utf8"));
export function buildMerchantReviewRows(data = catalogue) {
  if (data.entriesTotal !== 373 || data.categories.length !== 12) {
    throw new Error("Unreconciled 2026 ESCO catalogue");
  }
  const ids = new Set();
  const result = data.categories.flatMap(category => category.entries.map(item => {
    if (!/^ESCO-CAT-\d{4}$/.test(item.id) || ids.has(item.id)) {
      throw new Error("Invalid or duplicate ESCO reference");
    }
    ids.add(item.id);
    const guide = guideFor({ ...item, category: category.name });
    if (!Number.isFinite(guide.guidePriceExVatGbp) || guide.guidePriceExVatGbp <= 0) {
      throw new Error("Guide-price estimate missing for " + item.id);
    }
    return {
      catalogue_id: item.id,
      novapharm_internal_order_code: internalSkuFromCatalogueId(item.id),
      internal_code_issuer: "NOVAPHARM_NOT_ESCO_MANUFACTURER",
      category: category.name,
      subcategory: item.subcategory,
      product: item.name,
      supplier_model: item.model ?? "",
      catalogue_source_page: item.sourceIndexPage,
      source_price_basis: guide.sourceType,
      uk_category_guide_ex_vat_gbp: guide.guidePriceExVatGbp.toFixed(2),
      owner_approved_catalogue_unit_price_ex_vat_gbp: guide.guidePriceExVatGbp.toFixed(2),
      owner_price_approval_date: "2026-11-09",
      owner_price_approval_scope: "LISTED_CATALOGUE_REFERENCE_EXCLUDING_DELIVERY_VAT_AND_UNCONFIRMED_VARIANTS",
      illustrative_delivery_budget_gbp: guide.unitEconomics.illustrativeOutboundDeliveryAllocationGbp.toFixed(2),
      illustrative_card_fee_gbp: guide.unitEconomics.illustrativeCardFeeAllocationGbp.toFixed(2),
      illustrative_storage_reserve_gbp: guide.unitEconomics.illustrativeThreeMonthStorageReserveGbp.toFixed(2),
      maximum_supplier_and_inbound_cost_for_modelled_25pct_margin_gbp:
        guide.unitEconomics.maximumSupplierAndInboundCostGbp.toFixed(2),
      owner_declared_planning_units: guide.ownerDeclaredStockUnits,
      fulfilment_state: "OWNER_DECLARED_UNALLOCATED_ORDER_REQUEST",
      delivery_charge_basis: "CALCULATE_FOR_CONFIRMED_UK_ADDRESS",
      tax_engine: "STRIPE_TAX_AFTER_PRODUCT_CLASSIFICATION",
      warehouse_allocatable_units: "",
      resolved_saleable_variant: "",
      manufacturer_supply_rights_confirmed: "",
      uk_product_classification: "",
      uk_product_safety_evidence: "",
      uk_mhra_ukrp_or_conformity_as_applicable: "",
      approved_stripe_tax_code: "",
      actual_supplier_and_inbound_cost_gbp: "",
      approved_delivered_selling_price_ex_vat_gbp: "",
      merchant_release_approval: "",
      checkout_status: "AWAITING_INDIVIDUAL_APPROVAL",
      customer_order_request_available: "YES",
      current_live_checkout_status: "VERIFY_AGAINST_PROTECTED_SSM_POLICY",
      additional_live_card_checkout_approved_by_this_matrix: "NO"
    };
  }));
  if (result.length !== 373 || ids.size !== 373) throw new Error("ESCO review matrix incomplete");
  return result;
}
function safeCsvCell(value) {
  let s = String(value ?? "");
  // Spreadsheet programs should never interpret supplier text as formulas.
  if (/^[\s]*[=+@]/.test(s) || /^[\s]*-(?!\d)/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export function merchantRowsToCsv(rows) {
  const columns = Object.keys(rows[0] ?? {});
  return [columns.map(safeCsvCell).join(","), ...rows.map(row =>
    columns.map(column => safeCsvCell(row[column])).join(","))].join("\n") + "\n";
}
const script = process.argv[1] ? resolve(process.argv[1]) : "";
if (script === fileURLToPath(import.meta.url)) {
  const path = resolve("docs/commerce/esco-2026-merchant-release-matrix.csv");
  mkdirSync(dirname(path), { recursive:true });
  const rows = buildMerchantReviewRows();
  writeFileSync(path, merchantRowsToCsv(rows), "utf8");
  console.log("Prepared " + rows.length +
    " ESCO order-request records for private commercial authorisation. 0 additional SKUs released for card charging.");
}
