/**
 * Validate 19 published Nutraxin GBP offers and the exact Google Shopping TSV.
 * Live validation is NOT Google Merchant Center approval.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const origin = "https://novapharmhealthcare.com";
const expectedFeed = readFileSync(join(root, "shopping/nutraxin-uk.tsv"), "utf8");
const catalogue = JSON.parse(readFileSync(join(root, "assets/data/nutraxin-retail-catalogue.json"), "utf8"));
const header = expectedFeed.split("\n")[0].split("\t");
const expectedHeader = ["id", "title", "description", "link", "image_link",
  "availability", "price", "condition", "brand", "product_type", "shipping(country:price)"];
assert.deepEqual(header, expectedHeader);
const rows = expectedFeed.replace(/\n$/, "").split("\n").slice(1).map((line) => {
  const cells = line.split("\t");
  assert.equal(cells.length, header.length, "Every row needs all attributes");
  return Object.fromEntries(header.map((field, index) => [field, cells[index]]));
});
assert.equal(rows.length, 19);
assert.equal(new Set(rows.map((row) => row.id)).size, 19);
assert.equal(catalogue.products.length, 19);
const retail = new Map(catalogue.products.map((item) => [item.sku, item]));
assert.equal(retail.size, 19);
for (const row of rows) {
  const p = retail.get(row.id);
  assert(p, "Unknown SKU: " + row.id);
  const ready = catalogue.delivery_verified === true &&
    catalogue.checkout_enabled === true && catalogue.payment_collection_enabled === true &&
    p.ordering_enabled === true && p.available_to_sell === true;
  assert.equal(row.link, origin + "/products/nutraxin/" + p.slug + "/");
  assert.equal(row.price, (p.retail_price_pence / 100).toFixed(2) + " GBP");
  assert.equal(row.availability, ready ? "in_stock" : "out_of_stock");
  assert.equal(row["shipping(country:price)"], "GB:" +
    (catalogue.provisional_uk_delivery_charge_pence / 100).toFixed(2) + " GBP");
}

if (process.argv.includes("--local")) {
  console.log("Local Merchant vetting passed: 19 unique SKUs with matching prices and availability.");
} else {
  const suffix = process.env.GITHUB_SHA || "manual";
  async function get(path) {
    const url = new URL(path, origin);
    url.searchParams.set("_release", suffix);
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "Cache-Control": "no-cache, no-store", "Pragma": "no-cache" },
      signal: AbortSignal.timeout(15000)
    });
    assert.equal(response.status, 200, path + " returned HTTP " + response.status);
    const body = await response.text();
    assert(body.length > 10, path + " is empty");
    return body;
  }
  async function verifyEventually(label, verify, attempts = 12) {
    let failure;
    for (let n = 1; n <= attempts; n++) {
      try { return await verify(); }
      catch (err) { failure = err; if (n < attempts) await delay(5000); }
    }
    throw new Error(label + " not publicly verified: " + failure?.message);
  }

  await verifyEventually("Google Merchant TSV", async () => {
    const body = await get("/shopping/nutraxin-uk.tsv");
    assert(!/^\s*<!doctype html/i.test(body), "Google was served HTML instead of TSV");
    assert.equal(body, expectedFeed, "Live TSV differs from committed source");
  });

  await verifyEventually("Sale availability frontend", async () => {
    const js = await get("/assets/js/nutraxin-retail-store.js");
    assert(js.includes("merchantSaleReady"), "Stock gates absent from live JS");
    assert(js.includes("bag.every((line) => merchantSaleReady"), "Checkout gate absent");
  });

  async function checkOffer(row) {
    const p = retail.get(row.id);
    await verifyEventually(row.id, async () => {
      const html = await get("/products/nutraxin/" + p.slug + "/");
      const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
      const candidates = scripts.map((m) => JSON.parse(m[1]));
      const offer = candidates.find((item) => item["@type"] === "Product" && item.sku === p.sku)?.offers;
      assert(offer, p.sku + ": Product Offer missing");
      assert.equal(offer.price, (p.retail_price_pence / 100).toFixed(2));
      assert.equal(offer.priceCurrency, "GBP");
      assert.equal(offer.url, row.link);
      assert.equal(offer.availability, "https://schema.org/" +
        (row.availability === "in_stock" ? "InStock" : "OutOfStock"));
      assert(html.includes('data-merchant-sku="' + p.sku + '"'), p.sku + ": SKU missing");
      assert(html.includes("£" + offer.price), p.sku + ": visible GBP price missing");
    }, 6);
  }
  for (let i = 0; i < rows.length; i += 4) {
    await Promise.all(rows.slice(i, i + 4).map(checkOffer));
  }
  await verifyEventually("AWS-backed Contact release retained", async () => {
    const contact = await get("/contact/");
    assert(contact.includes("data-live-b2b-enquiry-form"));
    assert(contact.includes("https://h4dc1e4u57.execute-api.eu-north-1.amazonaws.com"));
  });
  console.log("LIVE MERCHANT VETTING PASS: 19 offers, GBP, exact TSV, stock guards and AWS contact preserved.");
  console.log("This does not represent Google Merchant Center account approval.");
}
