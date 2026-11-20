/**
 * Independent 21-check UK Nutraxin audit.
 * Not the GSC Wizard audit, not a Google Merchant approval, and not proof of indexing.
 * --local validates committed pages/feed; --live validates the exact *deployed* source.
 * A mismatched live feed blocks all release acceptance.
 */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const live = process.argv.includes("--live");
const origin = "https://novapharmhealthcare.com";
const read = path => readFileSync(join(root, path));
const catalogue = JSON.parse(read("assets/data/nutraxin-retail-catalogue.json").toString());
const register = JSON.parse(read("docs/nutraxin-product-register.json").toString());
const gtinRegister = JSON.parse(read("assets/data/nutraxin-gtin-uk.json").toString());
const expectedFeed = read("shopping/nutraxin-uk.tsv").toString();
const header = expectedFeed.trimEnd().split("\n")[0].split("\t");
const rows = expectedFeed.trimEnd().split("\n").slice(1).map(line => {
  const cells = line.split("\t");
  assert.equal(cells.length, header.length, "Malformed feed row");
  return Object.fromEntries(header.map((key, i) => [key, cells[i]]));
});
assert.equal(rows.length, 19, "Expected all 19 UK Nutraxin rows");
const bySku = new Map(catalogue.products.map(p => [p.sku, p]));
const refs = new Map(register.products.map(p => [p.sku, p]));
const gtins = new Map(gtinRegister.products.map(p => [p.sku, p]));
const required = ["id", "title", "description", "link", "image_link", "availability",
  "price", "condition", "brand", "gtin", "product_type", "google_product_category",
  "shipping(country:price)"];
assert.deepEqual(header, required, "Feed schema drift");
assert.equal(new Set(rows.map(x => x.id)).size, 19);
assert.equal(gtinRegister.market, "GB");
const allChecks = [
  "required_attributes", "title_length", "description_length", "duplicate_titles",
  "duplicate_descriptions", "duplicate_images", "duplicate_urls", "gtin_presence",
  "category_presence", "product_type_presence", "image_presence", "image_min_size",
  "image_square_ratio", "repeated_title_words", "page_http_status",
  "page_images_missing_from_feed", "jsonld_product_schema", "price_mismatch",
  "title_consistency", "h1_count", "title_element_count"
];
assert.equal(allChecks.length, 21);
const results = Object.fromEntries(allChecks.map(key =>
  [key, { passed: 0, failed: 0, deferred: 0, warnings: 0, failures: [], advisories: [] }]));
const acceptance = { passed: 0, failed: 0, failures: [] };
function check(key, sku, fn, advisory = false) {
  try {
    const ok = fn();
    if (ok === null) { results[key].deferred++; return; }
    if (ok === false) throw new Error("Condition false");
    results[key].passed++;
  } catch (err) {
    if (advisory) {
      results[key].warnings++;
      results[key].advisories.push({ sku, note: String(err?.message || err) });
    } else {
      results[key].failed++;
      results[key].failures.push({ sku, error: String(err?.message || err) });
    }
  }
}
function gate(sku, fn) {
  try { assert(fn()); acceptance.passed++; }
  catch (err) { acceptance.failed++; acceptance.failures.push({sku, error:String(err?.message || err)}); }
}
function ean13(v) {
  if (typeof v !== "string" || !/^\d{13}$/.test(v)) return false;
  const d = [...v].map(Number);
  const sum = d.slice(0, 12).reduce((a, n, i) => a + n * (i % 2 ? 3 : 1), 0);
  return (10 - sum % 10) % 10 === d[12];
}
function pngSize(data) {
  if (!Buffer.isBuffer(data) || data.length < 24 ||
    data.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") return null;
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
}
function matches(html, pattern) { return [...html.matchAll(pattern)]; }
function parseNodes(html) {
  return matches(html, /<script type="application\/ld\+json">([^<]+)<\/script>/g)
    .map(x => JSON.parse(x[1]));
}
async function loadLive(path, binary = false) {
  const target = new URL(path, origin);
  target.searchParams.set("_audit_source", process.env.GITHUB_SHA || "manual");
  const response = await fetch(target, {
    redirect: "follow", headers: { "Cache-Control": "no-cache, no-store" },
    signal: AbortSignal.timeout(20000)
  });
  const resolved = new URL(response.url);
  assert.equal(resolved.origin, origin, "Public content redirects off approved host");
  assert.equal(response.status, 200, target.pathname + " HTTP " + response.status);
  const content = Buffer.from(await response.arrayBuffer());
  assert(content.length > 100, "Response is empty or truncated");
  return { body: binary ? content : content.toString("utf8"),
    type: response.headers.get("content-type") || "", status: response.status };
}
if (live) {
  const published = await loadLive("/shopping/nutraxin-uk.tsv");
  assert(!published.body.toLowerCase().startsWith("<!doctype html"), "Feed is HTML");
  assert.equal(published.body, expectedFeed,
    "BLOCKED: Live feed is NOT this commit's feed. Deploy/verify before auditing.");
}
const samples = [];
for (const row of rows) {
  const sku = row.id, p = bySku.get(sku), ref = refs.get(sku), g = gtins.get(sku);
  let html = "", image = Buffer.alloc(0), pageStatus = null, loadError = null;
  try {
    if (!p || !ref || !g) throw new Error("Incomplete SKU mapping");
    if (live) {
      const page = await loadLive("/products/nutraxin/" + p.slug + "/");
      pageStatus = page.status;
      if (!page.type.toLowerCase().includes("text/html")) throw new Error("Not HTML: " + page.type);
      html = page.body;
      image = (await loadLive(new URL(row.image_link).pathname, true)).body;
    } else {
      html = read("products/nutraxin/" + p.slug + "/index.html").toString();
      image = read("assets/media/products/nutraxin/" + ref.imageBase + ".png");
    }
  } catch (err) { loadError = String(err?.message || err); }
  const nodes = (() => { try { return parseNodes(html); } catch { return []; } })();
  const prod = nodes.find(n => n["@type"] === "Product" && n.sku === sku);
  const offer = prod?.offers;
  const pageTitle = html.match(/<title>([^<]+)<\/title>/i)?.[1] || "";
  const h1s = matches(html, /<h1\b[^>]*>/gi);
  const titles = matches(html, /<title\b[^>]*>/gi);
  const imgPath = (() => { try { return new URL(row.image_link).pathname; } catch { return ""; } })();
  const dimensions = pngSize(image);
  const expectedPrice = p ? (p.retail_price_pence / 100).toFixed(2) : "";
  const expectedStock = p && catalogue.delivery_verified && catalogue.checkout_enabled &&
    catalogue.payment_collection_enabled && p.ordering_enabled && p.available_to_sell
    ? "in_stock" : "out_of_stock";
  check("required_attributes", sku, () => {
    assert(required.every(key => typeof row[key] === "string" && row[key].length > 0));
    assert(row.link.startsWith(origin + "/products/nutraxin/"));
    assert.equal(row.condition, "new"); assert.equal(row.brand, "Nutraxin");
    assert.equal(row.availability, expectedStock);
    assert.equal(row["shipping(country:price)"],
      "GB:" + (catalogue.provisional_uk_delivery_charge_pence / 100).toFixed(2) + " GBP");
  });
  check("title_length", sku, () => assert(row.title.length >= 20 && row.title.length <= 150));
  check("description_length", sku, () =>
    assert(row.description.length >= 350 && row.description.length <= 5000));
  check("duplicate_titles", sku, () => assert.equal(rows.filter(x => x.title === row.title).length, 1));
  check("duplicate_descriptions", sku, () =>
    assert.equal(rows.filter(x => x.description === row.description).length, 1));
  check("duplicate_images", sku, () =>
    assert.equal(rows.filter(x => x.image_link === row.image_link).length, 1));
  check("duplicate_urls", sku, () => assert.equal(rows.filter(x => x.link === row.link).length, 1));
  check("gtin_presence", sku, () => {
    assert(ean13(row.gtin) && g);
    assert.equal(row.gtin, g.gtin13);
    assert.equal(g.pack, p.pack);
  });
  check("category_presence", sku, () =>
    assert.equal(row.google_product_category, "525"));
  check("product_type_presence", sku, () =>
    assert(row.product_type.startsWith("Food Supplements > ")));
  check("image_presence", sku, () =>
    assert(row.image_link.startsWith(origin + "/assets/media/products/nutraxin/")));
  check("image_min_size", sku, () =>
    assert(dimensions && dimensions[0] >= 500 && dimensions[1] >= 500,
      "Missing/unreadable image or below 500px; " + (loadError || "")));
  check("image_square_ratio", sku, () =>
    assert(dimensions && Math.abs(dimensions[0] / dimensions[1] - 1) <= 0.1,
      "Image not approximately square"), true);
  check("repeated_title_words", sku, () => {
    for (const word of ["sachets", "effervescent", "chewable"]) {
      const count = matches(row.title.toLowerCase(), new RegExp("\\b" + word + "\\b", "g")).length;
      assert(count <= 1, word + " repeated");
    }
  });
  check("page_http_status", sku, () => {
    if (!live) return null; // Must not label a local file as HTTP 200.
    assert.equal(pageStatus, 200, loadError || "Page not HTTP 200");
  });
  check("page_images_missing_from_feed", sku, () => {
    assert(html.includes('src="' + imgPath + '"'), "Primary image missing from <img> fallback");
    assert.equal(prod?.image, row.image_link, "Product schema image mismatch");
  });
  check("jsonld_product_schema", sku, () => {
    assert(prod && offer && !loadError, loadError || "Product/Offer missing");
    assert.equal(prod.gtin13, row.gtin);
    assert.equal(prod.brand?.name, "Nutraxin");
    assert.equal(prod.brand?.url, "https://nutraxin.uk.com/");
    assert.equal(prod.image, row.image_link);
    assert.equal(prod.description, row.description);
    assert.equal(offer.url, row.link);
    assert.equal(offer.priceCurrency, "GBP");
    assert.equal(offer.shippingDetails?.shippingDestination?.addressCountry, "GB");
  });
  check("price_mismatch", sku, () => {
    assert.equal(row.price, expectedPrice + " GBP");
    assert.equal(offer?.price, expectedPrice);
    assert.equal(offer?.availability, "https://schema.org/" +
      (expectedStock === "in_stock" ? "InStock" : "OutOfStock"));
    assert(html.includes("£" + expectedPrice), "Approved price not visible");
  });
  check("title_consistency", sku, () => {
    assert(pageTitle.startsWith("Nutraxin "));
    assert(pageTitle.includes("NovaPharm") || pageTitle.endsWith(" UK"));
    assert(html.includes('property="og:title" content="' + pageTitle + '"'));
    assert(html.includes('name="twitter:title" content="' + pageTitle + '"'));
  });
  check("h1_count", sku, () => assert.equal(h1s.length, 1));
  check("title_element_count", sku, () => assert.equal(titles.length, 1));
  gate(sku, () => html.startsWith("<!DOCTYPE html>") &&
    /<html[^>]*lang="en-GB"/i.test(html) &&
    html.includes('rel="canonical" href="' + row.link + '"') &&
    html.includes('data-nutraxin-answers="true"') &&
    html.includes("International retail availability has not been confirmed.") &&
    !html.includes('"@type":"FAQPage"') &&
    offer?.shippingDetails?.shippingDestination?.addressCountry === "GB");
  samples.push({ sku, gtin: row.gtin, http: live ? pageStatus : "not-tested",
    imageWidth: dimensions?.[0] ?? null, imageHeight: dimensions?.[1] ?? null,
    imageQualityTarget1500: Boolean(dimensions && dimensions[0] >= 1500 && dimensions[1] >= 1500),
    descriptionCharacters: row.description.length, url: row.link, loadError });
}
const summary = Object.fromEntries(Object.entries(results).map(([k, v]) =>
  [k, { passed: v.passed, failed: v.failed, deferred: v.deferred, warnings: v.warnings,
    failures: v.failures, advisories: v.advisories }]));
const failed = Object.values(results).reduce((a, s) => a + s.failed, 0) + acceptance.failed;
const deferred = Object.values(results).reduce((a, s) => a + s.deferred, 0);
const warnings = Object.values(results).reduce((a, s) => a + s.warnings, 0);
const report = { kind: "independent-nutraxin-21-check", mode: live ? "live" : "source",
  date: new Date().toISOString(), requiredChecks: 21, products: rows.length,
  sourceCommit: process.env.GITHUB_SHA || null, liveFeedExactlyMatchesSource: live ? true : null,
  failed, deferred, warnings, checks: summary, seoGeoAeoGates: acceptance, samples,
  limits: ["This is NOT GSC Wizard's audit and does not read Google Merchant Center.",
    "This does not prove Google indexing, ranking, real-world fulfilment, GTIN manufacturer ownership or rich-result display.",
    "Source mode cannot check HTTP; production requires --live after deploy.",
    "Google Merchant policy approval and UK Search Console impressions require Google account access."] };
if (process.env.NUTRAXIN_AUDIT_REPORT) {
  mkdirSync(dirname(resolve(process.env.NUTRAXIN_AUDIT_REPORT)), {recursive:true});
  writeFileSync(resolve(process.env.NUTRAXIN_AUDIT_REPORT), JSON.stringify(report, null, 2) + "\n");
}
console.log(JSON.stringify({mode:report.mode, products:19, checks:21, failed, deferred, warnings,
  aeoGates:acceptance, imageQualityTarget1500:samples.filter(x=>x.imageQualityTarget1500).length},
  null, 2));
if (failed) process.exitCode = 1;
