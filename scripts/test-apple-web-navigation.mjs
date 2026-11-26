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
const corporateDesktopNav = read("apps/corporate/components/desktop-navigation.tsx");
const publicHome = read("index.html");
const publicMenuScript = read("assets/js/novapharm.js");
const homepageLegacyNavigation = read("apps/corporate/app/homepage-editorial.css");

test("the actual corporate web header uses compact dark navigation and visible keyboard focus", () => {
  assert.match(design, /--npd-header:\s*52px/);
  assert.doesNotMatch(design, /letter-spacing:\s*-[\d.]+(?:em|px|rem)/i, "Navigation must not use out-of-policy negative letter spacing");
  assert.match(design, /--header:\s*52px/);
  assert.match(design, /background(?:-color)?:\s*#171719/);
  assert.match(design, /body\[data-page\] header\.site-header\.npd-header/);
  assert.match(design, /\.npd-menu\.nav-toggle \[data-menu-label\]/);
  assert.match(design, /\.npd-global-nav\.site-nav > a\[aria-current="page"\]/);
  assert.match(design, /\.npd-global-nav\.site-nav/);
  assert.match(design, /\.desktop-nav/);
  assert.match(design, /min-height:\s*44px/);
  assert.match(design, /:focus-visible/);
  assert.match(design, /prefers-reduced-motion/);
  assert.match(design, /\@media \(pointer: coarse\)/);
  assert.match(design, /html\[data-np-estate="corporate"\] \.site-header \.brand img \{ filter: none; \}/);
  assert.match(design, /forced-colors:\s*active/);
  assert.match(design, /\.mobile-menu nav a:focus-visible/);
  assert.match(design, /background: #3a3a3e/);
  assert.match(design, /\@media \(max-width: 1180px\)/);
  assert.match(design, /\@media \(max-width: 1300px\)/);
});

test("managed homepage's high-specificity editorial CSS cannot darken labels or hide the portal action", () => {
  assert.match(homepageLegacyNavigation, /color: #d6d6da/, "Homepage editorial navigation must retain legible light ink");
  assert.doesNotMatch(homepageLegacyNavigation, /color: #151518/, "Legacy dark homepage navigation ink must not return");
  assert.match(design, /body:has\(\.nph-editorial-home\) \.site-header \.desktop-nav > a/);
  assert.match(design, /body:has\(\.nph-editorial-home\) \.site-header \.desktop-nav > a:last-child/);
  assert.match(design, /\.desktop-nav > a\[href="\/technology\/"\]::before/);
  assert.match(design, /font-size: 12\.5px/);
});

test("the published bundle is exactly the design source tail", () => {
  assert.match(builder, /\["apple-web-navigation\.css", null\]/);
  assert.match(publicEntry, /@import url\("\.\/apple-web-navigation\.css"\);/);
  assert.ok(bundle.endsWith(`/* Source: apple-web-navigation.css */\n${design.trim()}\n`));
});

test("Next.js corporate imports the same stylesheet and preserves the owner-approved Sovereign Crimson brand asset", () => {
  assert.match(corporateLayout, /assets\/css\/apple-web-navigation\.css/);
  assert.match(corporateBrand, /novapharm-healthcare-logo\.svg/);
  assert.match(design, /filter: grayscale\(1\) brightness\(0\) invert\(1\)/);
  assert.match(corporateHeader, /<DesktopNavigation items=\{publicNavigation\} portalOrigin=\{portalOrigin\} locale=\{locale\}/);
  assert.match(corporateDesktopNav, /<nav className="desktop-nav"/);
  assert.match(corporateDesktopNav, /aria-current=\{!isPortal \? currentCorporateNavigationAriaValue\(pathname, href\) : undefined\}/);
  assert.match(corporateDesktopNav, /const isPortal = href === "\/portal\/";/);
  assert.match(corporateHeader, /<MobileNavigation/);
});

test("site destinations and native keyboard/browser commands remain intact", () => {
  for (const item of ["Company", "Capabilities", "Oncology", "Products", "Contact", "Secure Portal"]) {
    assert.ok(publicHome.includes(item), `Missing public navigation item: ${item}`);
  }
  assert.match(publicHome, /data-nav-toggle/);
  assert.match(publicHome, /data-mega-trigger/);
  assert.doesNotMatch(publicMenuScript, /trigger\.addEventListener\("click"/, "Native click and Enter must navigate");
  assert.match(publicMenuScript, /trigger\.addEventListener\("pointerenter"/);
  assert.match(publicMenuScript, /event\.key !== "ArrowDown"/);
  assert.doesNotMatch(corporateDesktopNav, /onClick=\{\(event\)/, "Managed category links must not cancel navigation");
  assert.match(publicMenuScript, /event\.preventDefault\(\)/);
  assert.match(publicMenuScript, /panel\?\.querySelector\("a"\)\?\.focus/);
  assert.doesNotMatch(design, /Apple logo|apple\.com\/assets/);
});
