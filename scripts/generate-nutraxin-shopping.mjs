import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Same approved retail source drives prices, merchant availability and landing-page Offer markup.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const site = "https://novapharmhealthcare.com";
const check = process.argv.includes("--check");
const retail = JSON.parse(readFileSync(join(root, "assets/data/nutraxin-retail-catalogue.json"), "utf8"));
const registered = JSON.parse(readFileSync(join(root, "docs/nutraxin-product-register.json"), "utf8"));
assert.equal(retail.currency, "GBP");
assert.equal(retail.price_authority, "approved_consumer_retail");
assert.equal(registered.products.length, 19);
assert.equal(retail.products.length, 19);
assert.equal(typeof retail.delivery_verified, "boolean");
const indexed = new Map(retail.products.map(p => [p.sku, p]));
assert.equal(indexed.size, 19);
const money = n => {
  assert(Number.isSafeInteger(n) && n > 0, "Invalid approved retail price");
  return (n / 100).toFixed(2);
};
const ready = p => retail.delivery_verified === true &&
  retail.checkout_enabled === true && retail.payment_collection_enabled === true &&
  p.ordering_enabled === true && p.available_to_sell === true;
const clean = s => String(s).replace(/[\t\r\n]+/g, " ").trim();
const header = ["id","title","description","link","image_link","availability","price","condition","brand","product_type","shipping(country:price)"];
const lines = [header.join("\t")];
let saleReady = 0;

for (const product of registered.products) {
  const p = indexed.get(product.sku);
  assert(p && p.slug === product.slug && p.name === product.name && p.pack === product.packSize,
    "Identity mismatch: " + product.sku);
  const url = site + "/products/nutraxin/" + product.slug + "/";
  const image = site + "/assets/media/products/nutraxin/" + product.imageBase + ".png";
  assert(existsSync(join(root, "assets/media/products/nutraxin", product.imageBase + ".png")));
  const inStock = ready(p);
  if (inStock) saleReady++;
  const availability = inStock ? "in_stock" : "out_of_stock";
  const ship = retail.delivery_verified === true
    ? "GB:" + (retail.provisional_uk_delivery_charge_pence / 100).toFixed(2) + " GBP" : "";
  lines.push([
    p.sku, p.name + " - " + p.pack,
    p.name + ", " + p.pack + ". Nutraxin food supplement in the " + product.range + " range.",
    url, image, availability, money(p.retail_price_pence) + " GBP",
    "new", "Nutraxin", "Food Supplements > " + product.range, ship
  ].map(clean).join("\t"));

  const path = join(root, "products/nutraxin", p.slug, "index.html");
  const original = readFileSync(path, "utf8");
  let schemaCount = 0;
  let html = original.replace(/<script type="application\/ld\+json">([^<]+)<\/script>/g, (tag, content) => {
    const json = JSON.parse(content);
    if (json["@type"] !== "Product") return tag;
    assert.equal(json.sku, p.sku);
    schemaCount++;
    json.offers = {
      "@type": "Offer", url, priceCurrency: "GBP",
      price: money(p.retail_price_pence),
      availability: "https://schema.org/" + (inStock ? "InStock" : "OutOfStock"),
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "NovaPharm Healthcare Ltd" }
    };
    return '<script type="application/ld+json">' + JSON.stringify(json) + "</script>";
  });
  assert.equal(schemaCount, 1, "Missing Product schema " + p.slug);
  const offer = '<div class="nx-merchant-offer" data-merchant-sku="' + p.sku + '">' +
    '<p class="nx-merchant-price">£' + money(p.retail_price_pence) +
    ' <small>including UK VAT</small></p><p class="nx-merchant-availability">' +
    (inStock ? "Available to order online in the UK." :
      "Currently unavailable to order online. Contact us for availability.") + '</p></div>';
  if (html.includes('class="nx-merchant-offer"')) {
    html = html.replace(/<div class="nx-merchant-offer"[^>]*>[\s\S]*?<\/p><\/div>/, offer);
  } else {
    assert(html.includes('class="npd-product-pack"'));
    html = html.replace(/(<p class="npd-product-pack">[^<]+<\/p>)/, "$1" + offer);
  }
  if (!html.includes('/assets/css/nutraxin-merchant.css')) {
    html = html.replace("</head>", '<link rel="stylesheet" href="/assets/css/nutraxin-merchant.css">\n</head>');
  }
  html = html.replaceAll(
    "This page does not assert current UK availability, price, stock, a permitted health claim, regulatory acceptance or medicinal status.",
    "The price shown is the approved UK consumer price. Online ordering availability follows the retailer sale-readiness controls; product claims and regulatory status require separate verification."
  );
  html = html.replaceAll(
    "availability and regulatory status are not asserted.",
    "the UK consumer price and ordering status are displayed; regulatory approval is not implied."
  );
  if (check) assert.equal(original, html, "Regenerate " + p.slug);
  else writeFileSync(path, html, "utf8");
}
const output = lines.join("\n") + "\n";
const feed = join(root, "shopping/nutraxin-uk.tsv");
if (check) assert.equal(readFileSync(feed, "utf8"), output, "Feed is stale");
else {
  mkdirSync(dirname(feed), { recursive: true });
  writeFileSync(feed, output, "utf8");
}
console.log("Nutraxin Google Merchant feed: 19 products, " + saleReady + " eligible as in-stock; " + (check ? "verified" : "generated") + ".");
