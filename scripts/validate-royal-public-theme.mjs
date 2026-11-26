import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { pageMeta, leadership } from "../src/content/site-content.mjs";
import { resolve } from "node:path";

// Run only after the complete public generator, editorial transforms and SHA
// stamping. The public-site build must not silently ship a retired browser
// theme colour on one of its separately generated canonical routes.
const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");
const palette = JSON.parse(read("config/brand-neutrals.json"));
const identities = JSON.parse(read("config/brand-identities.json"));
const register = JSON.parse(read("seo/generated/page-metadata-register.json"));
assert.equal(palette.primary, "#FFFFFF", "Owner-approved primary white changed");
assert.equal(palette.secondary, "#F8F7F3", "Owner-approved secondary white changed");
assert.equal(palette.black, "#0B0B0E", "Owner-approved default black changed");
assert.equal(palette.divider, "#DEDCD5", "Owner-approved divider changed");
assert.equal(identities.neutralPalette.primaryWhite.hex, palette.primary);
assert.ok(Array.isArray(register), "Canonical SEO register must be an array");

// The checked-in register has 58 prior-generation pages; a full current
// build adds Distribution, Market Access, Markets and ESCO (62 expected today).
// Never hard-code that count: enforce the same complete governed source inventory
// as enhance-seo-authority, including dynamic Insights and Nutraxin files.
const retiredOrCompatibilitySlugs = new Set([
  "search", "technology/ai-governance", "product-portfolio",
  "product-portfolio/nutraxin"
]);
const expectedCanonicalFiles = new Set([
  ...Object.keys(pageMeta)
    .filter((slug) => !retiredOrCompatibilitySlugs.has(slug))
    .map((slug) => slug ? slug + "/index.html" : "index.html"),
  ...leadership.map((profile) => "leadership/" + profile.slug + "/index.html"),
  ...readdirSync(resolve("src/content/insights"))
    .filter((name) => name.endsWith(".json"))
    .map((name) => "news-insights/" +
      JSON.parse(read("src/content/insights/" + name)).slug + "/index.html"),
  "our-story/index.html",
  "products/esco/index.html",
  "account-application/index.html"
]);
const nutraxinDirectory = resolve("products/nutraxin");
if (existsSync(nutraxinDirectory)) {
  for (const entry of readdirSync(nutraxinDirectory, { withFileTypes: true })) {
    if (entry.isDirectory() && existsSync(resolve(nutraxinDirectory, entry.name, "index.html"))) {
      expectedCanonicalFiles.add("products/nutraxin/" + entry.name + "/index.html");
    }
  }
}
const registeredFiles = register.map((page) => page.file);
assert.equal(new Set(registeredFiles).size, registeredFiles.length,
  "Duplicate canonical public-page records");
assert.deepEqual([...registeredFiles].sort(), [...expectedCanonicalFiles].sort(),
  "Canonical SEO register differs from the complete governed public-page source inventory");

// These three commercial routes are generated before SEO enhancement. Their
// inclusion prevents a shallow but numerically sufficient canonical index.
const registeredRoutes = new Set(register.map((page) => page.route));
for (const route of ["/distribution/", "/market-access/", "/markets/", "/our-story/"]) {
  assert.ok(registeredRoutes.has(route), "Required public commercial route absent from SEO register: " + route);
}

// Late commerce/basket routes and the reviewed public portal landing are added
// outside the SEO canonical register. They still publish HTML and must conform.
const latePublicPages = [
  "products/marketplace/index.html",
  "products/track/index.html",
  "products/strategic-portfolio/index.html",
  "products/esco/bag/index.html",
  "portal/index.html",
  "404.html"
];
const allPublicPages = [
  ...register,
  ...latePublicPages.filter((file) => !register.some((page) => page.file === file))
    .map((file) => ({ file }))
];
const errors = [];
let checked = 0;
for (const page of allPublicPages) {
  assert.match(page.file, /^(?!\/)(?!.*\.\.\/)[a-zA-Z0-9/_-]+\.html$/,
    "Unsafe canonical page path");
  const html = read(page.file);
  const headEnd = html.indexOf("</head>");
  if (headEnd < 0) {
    errors.push(page.file + ": missing <head> terminator");
    continue;
  }
  const head = html.slice(0, headEnd);
  const tags = head.match(/<meta\b[^>]*\bname\s*=\s*["']theme-color["'][^>]*>/gi) ?? [];
  if (tags.length !== 1) {
    errors.push(page.file + ": expected exactly one browser theme tag, found " + tags.length);
    continue;
  }
  const actual = tags[0].match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1];
  if (actual?.toUpperCase() !== palette.primary) {
    errors.push(page.file + ": theme " + String(actual) + " is not " + palette.primary);
    continue;
  }
  checked++;
}
const webManifest = JSON.parse(read("manifest.webmanifest"));
assert.equal(webManifest.background_color?.toUpperCase(), palette.primary,
  "Public PWA background must use Pure White");
assert.equal(webManifest.theme_color?.toUpperCase(), identities.brands.healthcare.hex,
  "Healthcare PWA accent must retain Royal Cochineal Crimson");

assert.deepEqual(errors, [], "Pure White browser theme mismatches after all build-time transforms");
assert.equal(checked, allPublicPages.length);
console.log("Verified " + checked + " canonical and approved late public pages plus PWA metadata against Pure White.");
