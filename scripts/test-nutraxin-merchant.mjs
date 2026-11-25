import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { merchantSaleReady } from "../assets/js/nutraxin-retail-store.js";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const catalogue = JSON.parse(read("assets/data/nutraxin-retail-catalogue.json"));
const registered = JSON.parse(read("docs/nutraxin-product-register.json"));
const ukGtins = JSON.parse(read("assets/data/nutraxin-gtin-uk.json"));
const validEan13 = value => {
  if (!/^\d{13}$/.test(value)) return false;
  const digits = Array.from(value, Number);
  const weighted = digits.slice(0, 12).reduce((sum, digit, index) =>
    sum + digit * (index % 2 ? 3 : 1), 0);
  return (10 - weighted % 10) % 10 === digits[12];
};
const gtinBySku = new Map(ukGtins.products.map(row => [row.sku, row]));
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
    assert.equal(item.google_product_category, "525", "Google Vitamins & Supplements taxonomy");
    const gtinRow = gtinBySku.get(item.id);
    assert(gtinRow, "Unmapped UK GTIN: " + item.id);
    assert.equal(gtinRow.slug, product.slug, "GTIN slug mismatch");
    assert.equal(gtinRow.pack, product.pack, "GTIN must match exact UK sellable pack");
    assert.equal(item.gtin, gtinRow.gtin13, "Merchant GTIN mismatch");
    assert(validEan13(item.gtin), "Invalid EAN-13 in Merchant feed");
    assert(item.title.startsWith("Nutraxin "));
    assert(item.title.length <= 70, "Feed title exceeds editorial target");
    assert(!/\b(sachets|effervescent|chewable)\b.*\b\1\b/i.test(item.title),
      "Feed title repeats a product form");
    assert(item.description.includes(ref.formulation[0].name), "Catalogue ingredient missing from feed");
    assert(item.description.includes("See the product label"), "No unsupported health claims");
    assert.equal(item["shipping(country:price)"],
      "GB:" + (catalogue.provisional_uk_delivery_charge_pence / 100).toFixed(2) + " GBP");
    const html = read("products/nutraxin/" + product.slug + "/index.html");
    const nodes = [...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)].map(m => JSON.parse(m[1]));
    const schema = nodes.find(node => node["@type"] === "Product");
    assert(schema && schema.offers);
    assert.equal(schema.gtin13, item.gtin, "Product JSON-LD GTIN must equal feed");
    assert.equal(schema.category, "Vitamins & Supplements");
    assert(!(schema.additionalProperty || []).some(v => v.name === "Public status"),
      "The Product Offer must not contradict an old unavailability note");
    assert.equal(schema.description, item.description, "Feed/Product structured description drift");
    assert.equal(schema.image, item.image_link, "Feed image must equal Product JSON-LD image");
    const pageImagePath = new URL(item.image_link).pathname;
    assert(html.includes('src="' + pageImagePath + '"'),
      "Feed image must also appear as a real fallback <img> on the landing page");
    assert.equal(schema.offers.seller.logo,
      "https://novapharmhealthcare.com/assets/brand/novapharm-healthcare-logo.png");
    const meta = html.match(/<meta name="description" content="([^"]+)">/);
    assert(meta && meta[1].length <= 160, "Product search snippet must be concise");
    assert(!meta[1].includes("qualified B2B review"), "Retail snippet must not be B2B-only");
    const page = nodes.find(node => node["@type"] === "WebPage");
    assert(page && page.dateModified === "2026-11-20");
    const searchTitle = html.match(/<title>([^<]+)<\/title>/)?.[1];
    assert(searchTitle && searchTitle.length <= 60, "Review overlong product title " + product.sku);
    assert(searchTitle.startsWith("Nutraxin ") && searchTitle.endsWith(" | NovaPharm"));
    assert(!searchTitle.includes("| Nutraxin |"), "Do not duplicate the supplier brand");
    assert.equal(page.name, searchTitle, "WebPage schema title drift");
    assert.equal(html.match(/<meta property="og:title" content="([^"]+)"/)?.[1], searchTitle);
    assert.equal(html.match(/<meta name="twitter:title" content="([^"]+)"/)?.[1], searchTitle);
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

test("Consumer Add to Bag, Buy now and checkout honor exactly the published Merchant stock gate", () => {
  const item = catalogue.products[0];
  assert.equal(merchantSaleReady(item, catalogue), true);
  assert.equal(merchantSaleReady({ ...item, available_to_sell: false }, catalogue), false);
  assert.equal(merchantSaleReady(item, { ...catalogue, delivery_verified: false }), false);
  assert.equal(merchantSaleReady({ ...item, ordering_enabled: false }, catalogue), false);
  assert.equal(merchantSaleReady(item, { ...catalogue, payment_collection_enabled: false }), false);
  const runtime = read("assets/js/nutraxin-retail-store.js");
  assert.match(runtime, /add\.disabled = !merchantSaleReady\(p, data\)/);
  assert.match(runtime, /buy\.disabled = !merchantSaleReady\(p, data\)/);
  assert.match(runtime, /bag\.every\(\(line\) => merchantSaleReady/);
});

test("19-stock declaration has owner traceability and in-stock Merchant parity", () => {
  assert.equal(catalogue.delivery_verified, true);
  assert.equal(catalogue.inventory_attestation?.independently_audited, false);
  assert.equal(catalogue.delivery_attestation?.independently_audited, false);
  assert(catalogue.products.every(p => p.available_to_sell && p.ordering_enabled));
  assert(parsed.every(p => p.availability === "in_stock"));
});


test("Nutraxin product search metadata, UK shipping and breadcrumb discovery", () => {
  const products = new Map(catalogue.products.map(p => [p.sku, p]));
  for (const item of parsed) {
    const p = products.get(item.id);
    const html = read("products/nutraxin/" + p.slug + "/index.html");
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    assert(title && title.length <= 60, "Title exceeds search display target: " + p.sku);
    assert(!title.includes(" | Nutraxin | "), "Product title repeats brand: " + p.sku);
    const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/)?.[1];
    const twitterTitle = html.match(/<meta name="twitter:title" content="([^"]+)"/)?.[1];
    assert.equal(ogTitle, title);
    assert.equal(twitterTitle, title);
    const twitterDescription = html.match(/<meta name="twitter:description" content="([^"]+)"/)?.[1];
    const siteDescription = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
    assert.equal(twitterDescription, siteDescription, "Social preview cannot retain B2B-only product copy");
    const nodes = [...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)]
      .map(m => JSON.parse(m[1]));
    const webpage = nodes.find(node => node["@type"] === "WebPage");
    const product = nodes.find(node => node["@type"] === "Product");
    const breadcrumbs = nodes.find(node => node["@type"] === "BreadcrumbList");
    assert.equal(webpage.name, title);
    assert.equal(webpage.mainEntity["@id"], item.link + "#product");
    assert.equal(breadcrumbs.itemListElement.length, 3);
    assert.equal(breadcrumbs.itemListElement.at(-1).item, item.link);
    assert.equal(product.offers.shippingDetails.shippingRate.value,
      (catalogue.provisional_uk_delivery_charge_pence / 100).toFixed(2));
    assert.equal(product.offers.shippingDetails.shippingDestination.addressCountry, "GB");
    const related = html.match(/<section[^>]+data-nutraxin-related="true"[\s\S]*?<\/section>/)?.[0];
    assert(related, "Missing crawlable same-range related links: " + p.sku);
    const others = registered.products.filter(x => x.range ===
      registered.products.find(x => x.sku === p.sku).range && x.sku !== p.sku);
    assert(others.some(x => related.includes('/products/nutraxin/' + x.slug + '/')));
  }
});

test("UK 19-pack GTIN evidence, uniqueness and promotional variant exclusions", () => {
  assert.equal(ukGtins.market, "GB");
  assert.equal(ukGtins.manufacturerVerified, false,
    "Evidence remains owner-confirmed, not manufacturer-certified");
  assert.equal(ukGtins.products.length, 19);
  assert.equal(gtinBySku.size, 19);
  const codes = ukGtins.products.map(entry => entry.gtin13);
  assert.equal(new Set(codes).size, 19);
  assert(codes.every(validEan13));
  assert(ukGtins.products.every(entry => entry.sourceUrl.startsWith("https://")));
  assert.equal(gtinBySku.get("NUT-UK-VMAX-E15").gtin13, "8680512630708");
  assert.equal(gtinBySku.get("NUT-UK-CG-T30").gtin13, "8680512630357");
  assert(!codes.includes("8680512634140"), "Never use 1+1 promo GTIN for single pack");
  assert(!codes.includes("8680512631392"), "Never use 3-for-2 promo GTIN for single pack");
  assert.equal(parsed.length, gtinBySku.size);
});

test("All 19 products have source-qualified answer-first content, UK-only sale terms and brand authority", () => {
  for (const p of registered.products) {
    const data = catalogue.products.find(item => item.sku === p.sku);
    const file = read("products/nutraxin/" + p.slug + "/index.html");
    const entry = parsed.find(item => item.id === p.sku);
    assert(data && entry);
    assert(entry.description.includes(p.packSize));
    assert(entry.description.includes(p.dosageForm));
    assert(entry.description.includes(p.servingText.toLowerCase()));
    assert(entry.description.length >= 350,
      "Description lacks sufficient source-based shopping detail: " + p.sku);
    assert(file.includes('data-nutraxin-answers="true"'),
      "No visible questions and answers for " + p.sku);
    assert(file.includes("Is worldwide shipping available?"));
    assert(file.includes("International retail availability has not been confirmed."));
    assert(file.includes("How should I use this supplement?"));
    assert(file.includes("What does the catalogue list for"));
    assert(file.includes("nutraxin.uk.com/products/"));
    assert(!file.includes('"@type":"FAQPage"'),
      "Avoid adding unsupported FAQ rich-result promises");
    const schemas = [...file.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)]
      .map(m => JSON.parse(m[1]));
    const product = schemas.find(node => node["@type"] === "Product");
    assert.equal(product.brand.name, "Nutraxin");
    assert.equal(product.brand.url, "https://nutraxin.uk.com/");
    assert.equal(product.description, entry.description);
  }
});
test("Collection has crawlable direct links to every exact product landing page", () => {
  const collection = read("products/nutraxin/index.html");
  for (const product of registered.products) {
    assert(collection.includes('href="/products/nutraxin/' + product.slug + '/"'),
      "Collection missing a direct product link: " + product.sku);
  }
});

const keywordMap = JSON.parse(read("assets/data/nutraxin-uk-search-intents.json"));
test("19 product search descriptions and support links are source-aligned", () => {
  assert.equal(keywordMap.market, "GB");
  assert.equal(keywordMap.products.length, 19);
  const bySku = new Map(keywordMap.products.map(x => [x.sku, x]));
  assert.equal(bySku.size, 19);
  for (const product of catalogue.products) {
    const intent = bySku.get(product.sku);
    assert(intent && intent.slug === product.slug && intent.primaryQuery.endsWith(" UK"));
    const html = read("products/nutraxin/" + product.slug + "/index.html");
    assert(html.includes('meta name="description" content="' + intent.metaDescription.replaceAll("&","&amp;") + '"'));
    assert(html.includes('href="/contact/?enquiry=Nutraxin%20order%20support"'));
    const nodes = [...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)].map(m => JSON.parse(m[1]));
    assert.equal(nodes.find(n => n["@type"] === "WebPage")?.description, intent.metaDescription);
  }
});

test("Nutraxin support email and delivery-returns policy are linked from each offer", () => {
  for (const product of catalogue.products) {
    const html = read("products/nutraxin/" + product.slug + "/index.html");
    assert(html.includes('mailto:support@novapharmhealthcare.com'));
    assert(html.includes('href="/legal/returns/"'));
  }
  const policy = read("legal/returns/index.html");
  assert(policy.includes("support@novapharmhealthcare.com"));
  assert(policy.includes("14 days"));
  assert(policy.includes("NovaPharm Healthcare Ltd"));
  assert(!/return(s)? (directly |to )?Polar Speed/i.test(policy),
    "Do not publish an unconfirmed warehouse consumer-return destination");
});

test("Nutraxin Bag exposes return rights and support before payment", () => {
  for (const path of ["products/nutraxin/bag/index.html", "scripts/apply-corporate-product-discipline.mjs"]) {
    const content = read(path);
    assert(content.includes('<span>I accept the <a href="/legal/returns/">Nutraxin delivery, returns and refunds policy</a> and understand'), "Preserve the reviewed direct checkout policy link (#1172) in " + path);
    assert(content.includes("support@novapharmhealthcare.com"), "Support contact missing in " + path);
    assert(content.includes('data-nx-consumer-terms'), "Bag terms checkbox missing in " + path);
  }
});


test("UK generic discovery is visible and aligned with all 19 Shopping offers", () => {
  for (const item of keywordMap.products) {
    assert(item.secondaryQueries.length >= 8, item.sku);
    assert(item.secondaryQueries.some(query => !query.toLowerCase().includes("nutraxin")), item.sku);
    const html = read("products/nutraxin/" + item.slug + "/index.html");
    assert.equal((html.match(/data-nutraxin-discovery="true"/g) || []).length, 1);
    assert(parsed.find(p => p.id === item.sku).description.startsWith(item.discoveryCopy + " "));
  }
  assert(read("products/nutraxin/index.html").includes("Nutraxin Vitamins &amp; Supplements UK | NovaPharm"));
});
