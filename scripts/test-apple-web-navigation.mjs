import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");
const design = read("assets/css/apple-web-navigation.css");
const bundle = read("assets/css/novapharm.bundle.css");
const builder = read("scripts/build-css-bundle.mjs");
const publicEntry = read("assets/css/novapharm.css");
const corporateLayout = read("apps/corporate/app/layout.tsx");
const corporateBrand = read("apps/corporate/components/brand.tsx");
const corporateHeader = read("apps/corporate/components/site-header.tsx");
const publicHome = read("index.html");
const publicMenuScript = read("assets/js/novapharm.js");

test("the actual corporate web header uses compact dark navigation and visible keyboard focus", () => {
  assert.match(design, /--npd-header:\s*52px/);
  assert.match(design, /--header:\s*52px/);
  assert.match(design, /background(?:-color)?:\s*#171719/);
  assert.match(design, /\.npd-global-nav\.site-nav/);
  assert.match(design, /\.desktop-nav/);
  assert.match(design, /min-height:\s*44px/);
  assert.match(design, /:focus-visible/);
  assert.match(design, /prefers-reduced-motion/);
  assert.match(design, /forced-colors:\s*active/);
  assert.match(design, /\@media \(max-width: 1180px\)/);
  assert.match(design, /\@media \(max-width: 1300px\)/);
});

test("the published bundle is exactly the design source tail", () => {
  assert.match(builder, /\["apple-web-navigation\.css", null\]/);
  assert.match(publicEntry, /@import url\("\.\/apple-web-navigation\.css"\);/);
  assert.ok(bundle.endsWith(`/* Source: apple-web-navigation.css */\n${design.trim()}\n`));
});

test("Next.js corporate imports the same stylesheet and preserves the original approved brand asset", () => {
  assert.match(corporateLayout, /assets\/css\/apple-web-navigation\.css/);
  assert.match(corporateBrand, /novapharm-healthcare-logo\.png/);
  assert.match(design, /filter: grayscale\(1\) brightness\(0\) invert\(1\)/);
  assert.match(corporateHeader, /<nav className="desktop-nav"/);
  assert.match(corporateHeader, /<MobileNavigation/);
});

test("site destinations and native keyboard/browser commands remain intact", () => {
  for (const item of ["Company", "Capabilities", "Oncology", "Products", "Contact", "Secure Portal"]) {
    assert.ok(publicHome.includes(item), `Missing public navigation item: ${item}`);
  }
  assert.match(publicHome, /data-nav-toggle/);
  assert.match(publicHome, /data-mega-trigger/);
  assert.match(publicMenuScript, /trigger\.addEventListener\("click", \(event\) =>/);
  assert.match(publicMenuScript, /event\.metaKey \|\| event\.ctrlKey \|\| event\.altKey/);
  assert.match(publicMenuScript, /event\.preventDefault\(\)/);
  assert.match(publicMenuScript, /panel\.querySelector\("a"\)\?\.focus/);
  assert.doesNotMatch(design, /Apple logo|apple\.com\/assets/);
});
