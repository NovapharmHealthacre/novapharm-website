import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const read = (p) => readFileSync(resolve(root, p), "utf8");
const master = read("src/content/nutraxin-showcase.html").trim();
const page = read("products/nutraxin/index.html");
const css = read("assets/css/nutraxin-lineup.css");
const script = read("scripts/apply-corporate-product-discipline.mjs");
const register = JSON.parse(read("apps/corporate/data/nutraxin-product-register.json"));
const corporateRenderer = read("apps/corporate/components/page-renderer.tsx");
const corporateLayout = read("apps/corporate/app/layout.tsx");
const products = [...register.products].sort((a,b)=>a.catalogueOrder-b.catalogueOrder);
const ranges = [...new Set(products.map(p=>p.range))];
const marker = "data-nx-product-slug=";

assert.equal(products.length,19,"The approved catalogue must contain 19 products");
assert.equal(ranges.length,6,"The approved catalogue must contain six ranges");
assert.equal((master.match(/class="nx-product-card"/g)||[]).length,19,"All 19 product cards must appear exactly once");
assert.equal((master.match(/class="nx-range-section nx-range-section-/g)||[]).length,6,"All six ranges must appear");
assert.equal((master.match(/<h1\b/g)||[]).length,1,"One page title");
assert.equal((master.match(/<main\b/g)||[]).length,1,"One main landmark");
assert.equal((master.match(/<section\b/g)||[]).length,(master.match(/<\/section>/g)||[]).length,"Balanced page sections");
const cardPattern = /<a class="nx-product-card" href="[^"]+" data-nx-product-slug="([a-z0-9-]+)">[\\s\\S]*?[<][/]a>/gu;
const originalCards = [...master.matchAll(cardPattern)];
const publishedCards = [...page.matchAll(cardPattern)];
assert.equal(originalCards.length, 19, "Approved original Nutraxin catalogue has exactly 19 cards");
assert.equal(publishedCards.length, 19, "Published Nutraxin catalogue preserves all 19 cards");
for (let index = 0; index < originalCards.length; index++) {
  assert.equal(publishedCards[index][0], originalCards[index][0], "Published Nutraxin card content must remain byte-for-byte identical to the approved master");
  const publishedWrapper = `<div class="nx-product-card-shell">${originalCards[index][0]}<div class="nx-product-publisher">`;
  assert.ok(page.includes(publishedWrapper), "Published Nutraxin card must have its approved publisher evidence wrapper");
}
assert.equal((page.match(/class="nx-product-card-shell"/g) || []).length, 19, "Exactly one publisher wrapper per approved catalogue card");
assert.equal((page.match(/class="nx-product-publisher"/g) || []).length, 19, "Exactly one publisher evidence reference per product");
assert.ok(page.includes(master.slice(0, master.indexOf('<a class="nx-product-card"'))), "Published introduction must preserve the approved master layout");
assert.ok(page.includes('href="/assets/css/nutraxin-lineup.css"'),"Scoped CSS must load");
assert.ok(script.includes('const original = read("src/content/nutraxin-showcase.html")'),"Site build must preserve the master layout");
assert.ok(script.includes('href="/assets/css/nutraxin-lineup.css"'),"Site build must preserve the scoped stylesheet");
assert.ok(script.includes('<div class="nx-product-card-shell">\${card}<div class="nx-product-publisher">'), "Site build must preserve official publisher evidence alongside every original card");
assert.ok(corporateRenderer.includes('className="nx-featured-grid"'),"Next.js source must include the same highlights section");
assert.ok(corporateRenderer.includes('className="nx-product-grid"'),"Next.js source must include product cards");
assert.ok(corporateRenderer.includes('ranges.map((range, rangeIndex)'),"Next.js source must render all six ranges");
assert.ok(corporateLayout.includes('import "../../../assets/css/nutraxin-lineup.css";'),"Next.js build must import the shared scoped styles");
assert.ok(css.includes("@media(max-width:600px)"),"Mobile display rules required");
assert.ok(css.includes("prefers-reduced-motion:reduce"),"Respect reduced-motion user preference");
assert.ok(master.includes("not a consumer store"),"B2B status requires explicit disclosure");
assert.ok(!/<button\b|<form\b|\bAdd to basket\b|\bBuy now\b|\bIn stock\b|\b£\d+/i.test(master),"Do not fake a commercial storefront");
assert.ok(!/lucide|<svg\b|<i\b|emoji/gi.test(master),"Use typography rather than generic UI icons");
const slugs = [...master.matchAll(/data-nx-product-slug="([^"]+)"/g)].map(m=>m[1]);
assert.equal(slugs.length,new Set(slugs).size,"Duplicate Nutraxin product cards are prohibited");
for(const product of products) {
  assert.ok(slugs.includes(product.slug),"Missing catalogue product "+product.slug);
  assert.ok(master.includes('/products/nutraxin/'+product.slug+'/'),"Missing canonical product detail route "+product.slug);
  assert.ok(master.includes('/assets/media/products/nutraxin/'+product.imageBase+'-800.avif'),"Missing optimised pack media "+product.slug);
  for(const extension of [".png","-480.avif","-800.avif","-480.webp","-800.webp"]) {
    const file='assets/media/products/nutraxin/'+product.imageBase+(extension.startsWith(".")?extension:extension);
    assert.ok(existsSync(resolve(root,file)),"Missing image "+file);
  }
}
for (const range of ranges) {
  const id = range.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/-$/,"");
  assert.ok(master.includes('id="nx-'+id+'"'),"Missing range anchor "+range);
}
console.log("Nutraxin Apple-inspired lineup: 19 products, six ranges, canonical links, original media, responsible disclosures, source and responsive styles verified.");
