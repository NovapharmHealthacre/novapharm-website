import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Run only after the complete public generator, editorial transforms and SHA
// stamping. The public-site build must not silently ship a retired browser
// theme colour on one of its separately generated canonical routes.
const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");
const palette = JSON.parse(read("config/brand-neutrals.json"));
const identities = JSON.parse(read("config/brand-identities.json"));
const register = JSON.parse(read("seo/generated/page-metadata-register.json"));
assert.equal(palette.primary, "#FBFAEF", "Owner-approved primary white changed");
assert.equal(palette.secondary, "#F8F7F3", "Owner-approved secondary white changed");
assert.equal(palette.black, "#0B0B0E", "Owner-approved default black changed");
assert.equal(palette.divider, "#DEDCD5", "Owner-approved divider changed");
assert.equal(identities.neutralPalette.primaryWhite.hex, palette.primary);
assert.ok(Array.isArray(register) && register.length >= 60,
  "Canonical public page inventory is incomplete");

// These three commercial routes are generated before SEO enhancement. Their
// inclusion prevents a shallow but numerically sufficient canonical index.
const registeredRoutes = new Set(register.map((page) => page.route));
for (const route of ["/distribution/", "/market-access/", "/markets/"]) {
  assert.ok(registeredRoutes.has(route), "Required public commercial route absent from SEO register: " + route);
}

const errors = [];
let checked = 0;
for (const page of register) {
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
  "Public PWA background must use Royal Mineral White");
assert.equal(webManifest.theme_color?.toUpperCase(), identities.brands.healthcare.hex,
  "Healthcare PWA accent must retain Royal Cochineal Crimson");

assert.deepEqual(errors, [], "Royal browser theme mismatches after all build-time transforms");
assert.equal(checked, register.length);
console.log("Verified " + checked + " canonical public pages and PWA metadata against Royal Mineral White.");
