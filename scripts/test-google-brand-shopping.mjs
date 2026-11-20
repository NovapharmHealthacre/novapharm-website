import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(".");
const read = (path) => readFileSync(join(root, path), "utf8");
const json = (path) => JSON.parse(read(path));
const catalogue = json("assets/data/nutraxin-retail-catalogue.json");
const registered = json("docs/nutraxin-product-register.json").products;
const origin = "https://novapharmhealthcare.com";
const storefrontScript = /<script[^>]*type="module"[^>]*src="\/assets\/js\/nutraxin-retail-store\.js(?:\?[^"]*)?"[^>]*><\/script>/g;
const scripts = (html) => [...html.matchAll(/<script\s+type="application\/ld\+json">([^<]+)<\/script>/g)].map(match => JSON.parse(match[1]));
const ready = (product) => catalogue.delivery_verified === true && catalogue.checkout_enabled === true &&
  catalogue.payment_collection_enabled === true && product.ordering_enabled === true && product.available_to_sell === true;

test("homepage publishes one coherent legal corporate identity and verified public social profile", () => {
  const home = read("index.html");
  const companiesHouse = "https://find-and-update.company-information.service.gov.uk/company/16716501";
  const linkedIn = "https://www.linkedin.com/company/novapharm-healthcare/";
  const orgs = scripts(home).filter(s => (Array.isArray(s["@type"]) ? s["@type"] : [s["@type"]]).includes("Organization"));
  assert.equal(orgs.length, 1);
  const org = orgs[0];
  assert.equal(org["@id"], origin + "/#organization");
  assert.equal(org.legalName, "NOVAPHARM HEALTHCARE LTD");
  assert.equal(org.identifier.value, "16716501");
  assert.deepEqual(org.sameAs, [companiesHouse, linkedIn]);
  const approvedLogoAsset = ["assets", "brand", "novapharm-healthcare-logo.png"].join("/");
  assert.equal(org.logo.url, origin + "/" + approvedLogoAsset);
  assert(existsSync(join(root, approvedLogoAsset)));
  assert(!org.address, "Do not expose a residential registered office address in structured data");
});

test("all 19 consumer product pages have a working storefront module and internally consistent Offers", () => {
  assert.equal(registered.length, 19);
  assert.equal(catalogue.products.length, 19);
  const prices = new Map(catalogue.products.map(p => [p.sku, p]));
  for (const p of registered) {
    const retail = prices.get(p.sku);
    assert(retail, "Retail SKU missing: " + p.sku);
    const html = read("products/nutraxin/" + p.slug + "/index.html");
    assert.equal([...html.matchAll(storefrontScript)].length, 1, "Storefront module not loaded once: " + p.slug);
    const products = scripts(html).filter(s => s["@type"] === "Product");
    assert.equal(products.length, 1, "Product schema missing or duplicated: " + p.slug);
    const structured = products[0];
    assert.equal(structured.sku, p.sku);
    assert.equal(structured.brand.name, "Nutraxin");
    assert.equal(structured.offers?.price, (retail.retail_price_pence / 100).toFixed(2));
    assert.equal(structured.offers?.priceCurrency, "GBP");
    assert.equal(structured.offers?.availability,
      "https://schema.org/" + (ready(retail) ? "InStock" : "OutOfStock"));
    assert.equal(structured.offers?.url, origin + "/products/nutraxin/" + p.slug + "/");
    assert(!(structured.additionalProperty || []).some(v => v.name === "Public status" && /not asserted/i.test(v.value)),
      "Contradictory availability signal: " + p.slug);
    assert(html.includes('data-merchant-sku="' + p.sku + '"'), "Visible retail offer missing: " + p.slug);
  }
});

test("the collection and Bag load retail UI, while the distinct B2B order request does not", () => {
  for (const path of ["products/nutraxin/index.html", "products/nutraxin/bag/index.html"]) {
    assert.equal([...read(path).matchAll(storefrontScript)].length, 1, "Missing retail JS in " + path);
  }
  assert.equal([...read("products/nutraxin/order-request/index.html").matchAll(storefrontScript)].length, 0);
});

test("the 19-row Google Merchant feed stays aligned with the approved consumer catalogue", () => {
  const lines = read("shopping/nutraxin-uk.tsv").trimEnd().split("\n");
  const headers = lines.shift().split("\t");
  const rows = lines.map(line => Object.fromEntries(headers.map((header, i) => [header, line.split("\t")[i]])));
  assert.equal(rows.length, 19);
  const byId = new Map(rows.map(row => [row.id, row]));
  assert.equal(byId.size, 19);
  for (const p of catalogue.products) {
    const row = byId.get(p.sku);
    assert(row, "Merchant feed missing " + p.sku);
    assert.equal(row.price, (p.retail_price_pence / 100).toFixed(2) + " GBP");
    assert.equal(row.availability, ready(p) ? "in_stock" : "out_of_stock");
    assert.equal(row.link, origin + "/products/nutraxin/" + p.slug + "/");
    assert.equal(row["shipping(country:price)"], "GB:" +
      (catalogue.provisional_uk_delivery_charge_pence / 100).toFixed(2) + " GBP");
    assert.equal(row.brand, "Nutraxin");
  }
});
