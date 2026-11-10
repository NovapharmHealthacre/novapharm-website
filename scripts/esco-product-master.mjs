// Reproducible ESCO commercial product master. Never a Stripe charge authority.
// The merchant has approved the website's existing GBP base prices. UK VAT,
// delivery, exact variants and checkout release remain separately controlled.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { guideFor } from "./esco-merchandising.mjs";

const source = resolve("assets/data/esco-catalogue.json");
export function buildEscoProductMaster(data = JSON.parse(readFileSync(source, "utf8"))) {
  if (data.entriesTotal !== 373 || data.categories?.length !== 12 ||
      data.checkoutEnabled !== false || data.requestQuoteOnly !== true) {
    throw new Error("ESCO catalogue release boundary or count changed");
  }
  const seenIds = new Set();
  const seenSkus = new Set();
  const records = data.categories.flatMap(category => category.entries.map(item => {
    const id = item.id;
    if (!/^ESCO-CAT-\d{4}$/.test(id) || seenIds.has(id)) {
      throw new Error("Invalid or duplicated ESCO catalogue reference");
    }
    seenIds.add(id);
    const sku = "NP-ESCO-" + id.slice(-4);
    if (seenSkus.has(sku)) throw new Error("Duplicate internal NovaPharm SKU");
    seenSkus.add(sku);
    const base = guideFor({ ...item, category: category.name }).guidePriceExVatGbp;
    const pricePence = Math.round(base * 100);
    if (!Number.isSafeInteger(pricePence) || pricePence < 1) {
      throw new Error("Approved GBP base price missing for " + id);
    }
    return {
      catalogue_id: id,
      internal_novapharm_sku: sku,
      manufacturer: "Eastern Surgical Company (ESCO)",
      manufacturer_model: item.model || null,
      name: item.name,
      category: category.name,
      subcategory: item.subcategory,
      source_catalogue: "ESCO 2026 product catalogue",
      source_index_page: item.sourceIndexPage,
      currency: "GBP",
      owner_approved_base_price_ex_vat_pence: pricePence,
      owner_declared_stock_units: 10000,
      stock_basis: "OWNER_DECLARED_NOT_ALLOCATED",
      saleable_variant_basis: item.model
        ? "MODEL_CODE_PRESENT_SPECIFICATION_REVIEW_REQUIRED"
        : "MODEL_CODE_NOT_RECORDED",
      tax_and_delivery_not_included: true,
      checkout_authority: "PROTECTED_SSM_ONLY",
      payment_approved_in_this_record: false
    };
  }));
  if (records.length !== 373 || seenIds.size !== 373 || seenSkus.size !== 373 ||
      records.filter(r => r.manufacturer_model === null).length !== 300) {
    throw new Error("373-product ESCO reconciliation failure");
  }
  return {
    schema: "novapharm-esco-product-master-v1",
    record_count: 373,
    merchant_price_approval: "2026-11-10",
    pricing_scope: "APPROVED_WEBSITE_EX_VAT_EX_DELIVERY",
    records
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = resolve(process.env.ESCO_PRODUCT_MASTER_OUTPUT ||
    "docs/commerce/esco-2026-product-master-staging.json");
  const master = buildEscoProductMaster();
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(master, null, 2) + "\n", "utf8");
  console.log("Prepared " + master.records.length +
    " manufacturer-identified ESCO product master records. Payment release remains controlled by the production SSM policy.");
}
