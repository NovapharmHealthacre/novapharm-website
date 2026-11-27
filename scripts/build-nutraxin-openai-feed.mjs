import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

// Export-only adapter for OpenAI's stable *flat* product-feed format.
// This file never makes network requests, publishes an offer, or authorizes Ads or checkout.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://novapharmhealthcare.com";
export const SEARCH_REVIEW_HOLD = Object.freeze(["NUT-UK-MGCX-T60", "NUT-UK-MGDL-T60"]);
export const COLUMNS = Object.freeze([
  "item_id", "title", "description", "url", "brand", "image_url",
  "price", "availability", "seller_name", "seller_url", "gtin",
  "product_category", "shipping", "target_countries", "store_country",
  "is_eligible_search", "is_eligible_checkout", "is_ads_eligible"
]);

export function parseMerchantTsv(source) {
  const [heading, ...rows] = source.trimEnd().split(/\r?\n/);
  const keys = heading.split("\t");
  assert.equal(new Set(keys).size, keys.length, "Duplicate merchant headers");
  for (const key of [
    "id", "title", "description", "link", "image_link", "availability",
    "price", "brand", "gtin", "product_type", "shipping(country:price)"
  ]) assert(keys.includes(key), "Merchant feed header missing " + key);
  return rows.filter(Boolean).map(line => {
    const values = line.split("\t");
    assert.equal(values.length, keys.length, "Malformed merchant feed row");
    return Object.fromEntries(keys.map((key, i) => [key, values[i]]));
  });
}

export function exportCandidate(tsv, retail) {
  const entries = parseMerchantTsv(tsv);
  assert.equal(entries.length, 19, "Expected exactly nineteen approved Nutraxin variants");
  assert.equal(retail.retail_price_revision, "nutraxin-retail-2026-11-27");
  assert.equal(retail.currency, "GBP");
  assert.equal(retail.provisional_uk_delivery_charge_pence, 449);
  assert.equal(retail.provisional_uk_delivery_cost_seller_funded, false);
  const bySku = new Map(retail.products.map(p => [p.sku, p]));
  assert.equal(bySku.size, 19);
  const unique = new Set();
  const variants = entries.map(source => {
    const sku = source.id;
    assert(!unique.has(sku), "Duplicate SKU: " + sku);
    unique.add(sku);
    const product = bySku.get(sku);
    assert(product, "Unexpected unapproved SKU: " + sku);
    assert(product.available_to_sell === true && product.ordering_enabled === true,
      "Variant is not seller-approved for public purchase: " + sku);
    assert(source.link === BASE + "/products/nutraxin/" + product.slug + "/");
    assert(source.image_link.startsWith(BASE + "/assets/media/products/nutraxin/"));
    assert(/^\d{13}$/.test(source.gtin), "Invalid GTIN syntax: " + sku);
    assert(source.brand === "Nutraxin");
    assert(source.availability === "in_stock");
    assert(source.price === (product.retail_price_pence / 100).toFixed(2) + " GBP",
      "Feed differs from approved retail price: " + sku);
    assert(source["shipping(country:price)"] === "GB:4.49 GBP",
      "Shipping must agree with live checkout: " + sku);
    assert(source.title.length > 5 && source.title.length <= 150);
    assert(source.description.length > 10 && source.description.length <= 5000);
    const held = SEARCH_REVIEW_HOLD.includes(sku);
    return {
      item_id: sku,
      title: source.title,
      description: source.description,
      url: source.link,
      brand: "Nutraxin",
      image_url: source.image_link,
      price: source.price,
      availability: source.availability,
      seller_name: "NovaPharm Healthcare Ltd",
      seller_url: BASE + "/",
      gtin: source.gtin,
      product_category: source.product_type,
      shipping: "GB::Standard:4.49 GBP",
      target_countries: "GB",
      store_country: "GB",
      is_eligible_search: held ? "false" : "true",
      is_eligible_checkout: "false",
      is_ads_eligible: "false"
    };
  });
  assert.equal(variants.filter(v => v.is_eligible_search === "true").length, 17);
  return variants;
}

export function serializeTsv(records) {
  assert.equal(records.length, 19);
  const header = COLUMNS.join("\t");
  const rows = records.map(record => COLUMNS.map(k => {
    const v = record[k];
    assert(typeof v === "string" && !/[\t\r\n]/.test(v), "Invalid TSV field " + k);
    return v;
  }).join("\t"));
  return header + "\n" + rows.join("\n") + "\n";
}

export function assertUkUploadEnabled(settings) {
  assert(settings.businessVerified === "yes",
    "ChatGPT Business Hub business identity verification is not confirmed");
  assert(settings.ukMarketSupported === "yes",
    "OpenAI has not confirmed UK/GBP processing for this registered merchant feed");
  assert(settings.uploadApproved === "yes",
    "The merchant has not approved the exact UK upload channel and product scope");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rows = exportCandidate(
    readFileSync(resolve(ROOT, "shopping/nutraxin-uk.tsv"), "utf8"),
    JSON.parse(readFileSync(resolve(ROOT, "assets/data/nutraxin-retail-catalogue.json"), "utf8"))
  );
  const file = serializeTsv(rows);
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--check") {
    console.log("ChatGPT candidate source validated: 19 rows, GBP, £4.49 UK delivery, 17 search-ready, 2 review holds; Ads and in-ChatGPT checkout disabled. NO UPLOAD.");
  } else if (args.length === 1 && args[0].startsWith("--export=")) {
    assertUkUploadEnabled({
      businessVerified: process.env.OPENAI_BUSINESS_VERIFIED,
      ukMarketSupported: process.env.OPENAI_GB_FEED_SUPPORTED,
      uploadApproved: process.env.OPENAI_NUTRAXIN_UPLOAD_APPROVED
    });
    const output = resolve(args[0].slice("--export=".length));
    assert(output.endsWith(".tsv.gz"), "Use .tsv.gz output");
    assert(!output.startsWith(ROOT + "/shopping/") && !output.startsWith(ROOT + "/products/"),
      "Do not accidentally publish a candidate feed without merchant review");
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, gzipSync(file));
    console.log("Wrote reviewed candidate for manual Business Hub upload: " + output);
  } else {
    throw new Error("Usage: --check OR --export=/private/location/nutraxin-uk.tsv.gz (requires verified UK merchant account)");
  }
}
