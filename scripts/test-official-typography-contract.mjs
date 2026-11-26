import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/* Design contract: the website may reference OS-provided fonts, never distribute
   the uploaded SF Pro / SF Compact / SF Mono / New York DMG font binaries. */
const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");
const sources = [
  "assets/css/tokens.css",
  "assets/css/corporate-product-discipline.css",
  "apps/corporate/app/design-system.css",
  "apps/portal/app/apple-pharma-portal.css",
  "apps/portal/app/employee-distribution.css",
  "apps/technology/styles/base-1.css",
  "apps/status/app/globals.css",
  "apps/founder/app/base.css",
];
for (const path of sources) {
  const css = read(path);
  assert.ok(css.length > 0, path + " must exist");
  assert.doesNotMatch(css, /@font-face\s*\{[^}]*font-family\s*:\s*['"]?(?:SF Pro|SF Compact|SF Mono|New York)/is, path + " must not embed Apple fonts");
  assert.doesNotMatch(css, /url\([^)]*\.(?:dmg|otf|ttf)(?:[?#][^)]*)?\)/i, path + " must not publish a downloaded font binary");
}
for (const path of [
  "assets/css/tokens.css",
  "apps/corporate/app/design-system.css",
  "apps/portal/app/apple-pharma-portal.css",
  "apps/status/app/globals.css",
]) {
  const css = read(path);
  for (const token of ["--np-type-ui", "--np-type-compact", "--np-type-mono", "--np-type-editorial"]) {
    assert.ok(css.includes(token + ":"), path + " missing " + token);
  }
}
assert.match(read("apps/technology/styles/base-1.css"), /--sans:\s*-apple-system/);
assert.match(read("apps/corporate/app/globals.css"), /body, button, input, select, textarea\s*\{\s*font-family:\s*var\(--np-type-ui/);
assert.match(read("apps/corporate/app/globals.css"), /h1, h2, h3\s*\{[^}]*font-family:\s*var\(--np-type-ui/);
assert.match(read("apps/portal/app/globals.css"), /font-family:\s*var\(--np-type-ui/);
assert.match(read("packages/design-system/src/index.ts"), /editorialFamily:\s*"\x27New York\x27/);
assert.match(read("apps/technology/styles/base-1.css"), /--serif:\s*"New York"/);
assert.match(read("apps/portal/app/employee-distribution.css"), /font-variant-numeric:\s*tabular-nums/);
assert.match(read("assets/css/corporate-product-discipline.css"), /font-variant-numeric:\s*tabular-nums/);

// HIG text style contract: scalable tokens and non-truncating small-screen typography.
for (const path of [
  "assets/css/tokens.css",
  "apps/corporate/app/design-system.css",
  "apps/portal/app/apple-pharma-portal.css",
  "apps/status/app/globals.css",
  "apps/technology/styles/base-1.css",
]) {
  const css = read(path);
  for (const token of [
    "--np-type-body-size", "--np-type-caption-size", "--np-type-lead-size",
    "--np-type-display-size", "--np-type-section-size",
    "--np-type-reading-leading", "--np-type-interface-leading", "--np-type-measure",
  ]) {
    assert.ok(css.includes(token + ":"), path + " missing HIG text style: " + token);
  }
  assert.match(css, /font-optical-sizing:\s*auto/, path + " must preserve optical sizing");
}
for (const path of [
  "assets/css/corporate-product-discipline.css",
  "apps/corporate/app/design-system.css",
  "apps/portal/app/apple-pharma-portal.css",
  "apps/portal/app/employee-distribution.css",
  "apps/technology/styles/base-1.css",
  "apps/status/app/globals.css",
  "apps/founder/app/base.css",
]) {
  const css = read(path);
  assert.match(css, /overflow-wrap:\s*(?:break-word|anywhere)/, path + " must wrap enlarged text");
  assert.match(css, /@media\s*\(max-width:\s*640px\)/, path + " requires responsive text reflow");
}
assert.match(read("packages/design-system/src/index.ts"), /readingLeading:\s*1\.65/);
assert.match(read("packages/design-system/src/styles.ts"), /font-optical-sizing:auto/);

// Guard primary controls that were below the shared 14px caption role.
// This does not impose caption size on noninteractive editorial artwork.
const founderCss = read("apps/founder/app/base.css");
const employeeCss = read("apps/portal/app/employee-distribution.css");
const declarations = (css, selector) => {
  const escaped = selector.replaceAll(".", "\\.");
  const rule = css.match(new RegExp(escaped + "\\s*\\{([^}]*)\\}"));
  assert.ok(rule, "Missing typography control: " + selector);
  return rule[1];
};
for (const selector of [
  ".brand-name", ".site-nav-list a", ".footer-base", ".button", ".text-link",
  ".status-pill", ".breadcrumbs ol", ".article-aside a", ".article-byline",
  ".publication-actions a", ".publication-list a", ".contact-options span",
  ".privacy-inline", ".js .menu-toggle",
]) {
  assert.match(declarations(founderCss, selector), /font-size:\s*0\.875rem/, selector + " must use a legible caption size");
}
for (const selector of [
  ".employee-distribution-shell .employee-primary-nav a",
  ".employee-distribution-shell .portal-search>button",
  ".employee-distribution-shell .user-summary button",
]) {
  assert.match(declarations(employeeCss, selector), /font-size:\s*\.875rem/, selector + " must remain readable");
}
assert.match(declarations(employeeCss, ".employee-distribution-shell .portal-search input"), /font-size:\s*1rem/);
for (const selector of [
  ".employee-distribution-shell .portal-search input",
  ".employee-distribution-shell .portal-search>button",
  ".employee-distribution-shell .user-summary button",
]) {
  assert.match(declarations(employeeCss, selector), /min-height:\s*44px/, selector + " requires 44px touch height");
}
assert.match(employeeCss, /@media\(max-width:570px\)[\s\S]*?\.employee-distribution-shell \.user-summary button\{[^}]*min-height:44px/, "Mobile employee controls must retain 44px touch height");

// Customer workspace hub must use approved semantic tokens instead of the
// former grey/red palette, with readable labels and touch-friendly links.
const portalHubCss=read("apps/portal/app/globals.css");
for (const selector of [".unified-customer-eyebrow",".unified-customer-group a small",".unified-collection-card span",".unified-customer-hub .unified-customer-release-note"]) {
  assert.match(declarations(portalHubCss,selector), /font-size:\s*\.875rem/, selector+" must use the caption role");
}
assert.match(declarations(portalHubCss,".unified-customer-group a"), /min-height:\s*44px/);
assert.match(declarations(portalHubCss,".unified-customer-hub"), /var\(--np-color-canvas, #FFFFFF\)/);
assert.match(declarations(portalHubCss,".unified-collection-card"), /var\(--np-color-surface, #F8F7F3\)/);
assert.match(portalHubCss, /@media \(hover:hover\) and \(pointer:fine\)\{\.unified-customer-group a:hover/);

console.log("NovaPharm Apple HIG typography contract passed across public, corporate, portal, WMS, technology, status, founder and shared React styles.");
