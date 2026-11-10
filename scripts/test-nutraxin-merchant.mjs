import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const catalogue = JSON.parse(read("assets/data/nutraxin-retail-catalogue.json"));
const registered = JSON.parse(read("docs/nutraxin-product-register.json"));
const lines = read("shopping/nutraxin-uk.tsv").replace(/\n$/, "").split("\n");
const heads = lines[0].split("\t");
const parsed = lines.slice(1).map(line => Object.fromEntries(line.split("\t").map((value, i) => [heads[i], value])));
test("19 product URLs, approved prices and availability match Merchant feed and Product offers", () => {
  assert.equal(parsed.length, 19);
  assert.equal(new Set(parsed.map(x => x.id)).size, 19);
  const bySku = new Map(catalogue.products.map(p => [p.sku, p]));
  const refs = new Map(registered.products.map(p => [p.sku, p]));
  for (const item of parsed) {
    const product = bySku.get(item.id), ref = refs.get(item.id);
    assert(product && ref);
    const price = (product.retail_price_pence / 100).toFixed(2);
    const url = "https://novapharmhealthcare.com/products/nutraxin/" + product.slug + "/";
    const ready = catalogue.delivery_verified === true && catalogue.checkout_enabled === true &&
      catalogue.payment_collection_enabled === true &&
      product.ordering_enabled === true && product.available_to_sell === true;
    assert.equal(item.price, price + " GBP");
    assert.equal(item.link, url);
    assert.equal(item.image_link, "https://novapharmhealthcare.com/assets/media/products/nutraxin/" + ref.imageBase + ".png");
    assert.equal(item.availability, ready ? "in_stock" : "out_of_stock");
    assert.equal(item.brand, "Nutraxin");
    assert.equal(item["shipping(country:price)"], catalogue.delivery_verified ?
      "GB:" + (catalogue.provisional_uk_delivery_charge_pence / 100).toFixed(2) + " GBP" : "");
    const html = read("products/nutraxin/" + product.slug + "/index.html");
    const nodes = [...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)].map(m => JSON.parse(m[1]));
    const schema = nodes.find(node => node["@type"] === "Product");
    assert(schema && schema.offers);
    assert.equal(schema.offers.price, price);
    assert.equal(schema.offers.priceCurrency, "GBP");
    assert.equal(schema.offers.availability, "https://schema.org/" + (ready ? "InStock" : "OutOfStock"));
    assert(html.includes('data-merchant-sku="' + product.sku + '"'));
    assert(html.includes("£" + price));
  }
});
test("Do not represent unavailable-to-sell products as stocked", () => {
  for (const item of parsed) {
    const product = catalogue.products.find(p => p.sku === item.id);
    if (!product.available_to_sell || !catalogue.delivery_verified) assert.equal(item.availability, "out_of_stock");
  }
});
