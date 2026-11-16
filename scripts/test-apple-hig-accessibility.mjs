import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");
const entry = read("assets/css/novapharm.css");
const source = read("assets/css/novapharm-hig-accessibility.css");
const bundle = read("assets/css/novapharm.bundle.css");
const bundler = read("scripts/build-css-bundle.mjs");
const navigation = read("assets/js/novapharm.js");

assert.ok(entry.includes('@import url("./novapharm-hig-accessibility.css");'), "Site CSS entrypoint missing accessibility guardrails");
assert.ok(bundler.includes('["novapharm-hig-accessibility.css", null]'), "Generated bundle must include accessibility guardrails");
assert.ok(bundle.includes("/* Source: novapharm-hig-accessibility.css */"), "Checked-in production bundle missing accessibility source");
assert.ok(bundle.includes(source.trim()), "The checked-in production bundle must contain the exact reviewed accessibility stylesheet");
for (const pattern of [
  /--np-accessibility-contract:\s*1/,
  /:focus-visible/,
  /min-height:\s*44px/,
  /scroll-margin-block-start/,
  /prefers-reduced-motion:\s*reduce/,
  /prefers-contrast:\s*more/,
  /forced-colors:\s*active/
]) assert.match(source, pattern, `Missing required accessibility contract: ${pattern}`);

for (const pattern of [
  /aria-current/,
  /const normaliseNavigationPath/,
  /setAttribute\("aria-label", isOpen \?/,
  /event\.key === "Escape"/,
  /megaHeader\.addEventListener\("focusin"/
]) assert.match(navigation, pattern, `Missing keyboard/VoiceOver behaviour: ${pattern}`);

execFileSync(process.execPath, ["--check", resolve("assets/js/novapharm.js")], { stdio: "pipe" });
for (const path of ["index.html", "legal/accessibility/index.html"]) {
  const html = read(path);
  assert.match(html, /<html\s[^>]*lang="en-GB"/, `${path}: document language missing`);
  assert.match(html, /class="skip-link"\s+href="#main"/, `${path}: skip to content missing`);
  assert.match(html, /<main\s+id="main"/, `${path}: accessible main landmark missing`);
}
// Prevent a regression in authentication announcements and the public 22-workspace preview.
// These are additive source contracts; real browser/assistive-technology testing is separate.
const login = read("assets/js/portal-login.js");
assert.match(login, /setAttribute\("aria-live", "polite"\)/, "Portal sign-in needs a polite screen-reader status announcement");
assert.match(login, /setAttribute\("aria-busy", "true"\)/, "Portal sign-in should communicate in-flight authentication");
for (const path of ["assets/js/portal-login.js", "assets/js/intelligence-workspace-product.js", "assets/js/intelligence-workspace-embedded.js"]) {
  execFileSync(process.execPath, ["--check", resolve(path)], { stdio: "pipe" });
}
for (const [scriptPath, cssPath] of [
  ["assets/js/intelligence-workspace-product.js", "assets/css/intelligence-workspace-product.css"],
  ["assets/js/intelligence-workspace-embedded.js", "assets/css/intelligence-workspace-embedded.css"]
]) {
  const js = read(scriptPath);
  const css = read(cssPath);
  assert.match(js, /setAttribute\('role','group'\)/, `${scriptPath}: render accessible category button groups`);
  assert.ok(js.includes('aria-pressed="${state.category'), `${scriptPath}: selected category must be announced`);
  assert.match(js, /class="chart-data"/, `${scriptPath}: chart must offer a data table`);
  assert.match(js, /e\.key!=='Tab'/, `${scriptPath}: modal must trap keyboard navigation`);
  assert.match(css, /\.tab\[aria-pressed=true\]/, `${cssPath}: selected category state must remain visible`);
  assert.match(css, /\.chart-data summary:focus-visible/, `${cssPath}: chart data summary needs visible focus`);
  assert.ok(!/aria-selected/.test(css), `${cssPath}: no obsolete ARIA tab styling`);
}
const workspace = read("technology/workspaces/index.html");
assert.match(workspace, /<main class="section"/, "Standalone Intelligence preview requires a main landmark");
assert.match(workspace, /id="tabs" class="tabs" role="group"/, "Standalone category selection must be a labelled button group");

// Security-sensitive React workspaces: require accessible UI metadata without
// changing protected endpoints, access scopes, price calculation or WMS authority.
const liveLogin = read("apps/portal/components/login-panel.tsx");
assert.ok(liveLogin.includes('aria-busy={busy}'), "React sign-in must expose the in-progress state");
assert.ok(liveLogin.includes('role="status" aria-live="polite"'), "React sign-in must announce outcomes");
const medicines = read("apps/portal/components/medicines-intelligence.tsx");
for (const token of ['aria-expanded={menuOpen}', 'aria-expanded={filtersOpen}', 'aria-controls="medicines-navigation-panel"', 'aria-controls="medicines-context-panel"', 'closeOnEscape']) {
  assert.ok(medicines.includes(token), `Authenticated Intelligence navigation missing ${token}`);
}
const wmsPilot = read("apps/portal/components/wms-pilot-feedback-panel.tsx");
for (const token of ['aria-busy={saving}', 'scope="row"', 'aria-label="Your workspace results']) {
  assert.ok(wmsPilot.includes(token), `Private WMS feedback accessibility missing ${token}`);
}
const wmsEvidence = read("apps/portal/components/wms-recorded-evidence-studio.tsx");
for (const token of ['aria-label="Scrollable recorded WMS exceptions"', 'scope="row"', 'Showing {worklist.length} matching recorded exceptions']) {
  assert.ok(wmsEvidence.includes(token), `Private WMS evidence accessibility missing ${token}`);
}

console.log("Apple HIG accessibility web contracts: verified source, bundle, labels, focus, motion and landmarks.");

for (const pattern of [
  /const focusWithinActiveMega = \(\) =>/,
  /if \(!activeTrigger\) return false/,
  /activeTrigger === focused/,
  /panel\.classList\.contains\("is-open"\) && panel\.contains\(focused\)/,
  /megaHeader\.addEventListener\("pointerleave", \(\) => \{\s*if \(!focusWithinActiveMega\(\)\) closeMega\(\);/
]) {
  assert.match(navigation, pattern, "Desktop menu must retain a visible keyboard-focused panel during pointer leave");
}

/* Mobile 390px browser geometry found standalone footer links at ~19px tall.
   This is a comfort enhancement; WCAG 2.5.8 may allow spacing exceptions. */
assert.match(read("index.html"), /<footer class="site-footer npd-footer">/,
  "The customer-facing public footer must use the approved layout shell");
assert.match(source, /body \.npd-footer \.npd-footer-top div > a:not\(\.footer-brand\)/,
  "Public footer navigation needs a minimum pointer target");
assert.match(source, /body \.npd-footer \.npd-footer-legal :is\(a, button\)/,
  "Footer legal links and the cookie settings control need a minimum pointer target");
assert.match(source, /body \.npd-footer \.npd-footer-bottom a/,
  "Footer company registration link must also receive a minimum pointer target");
assert.match(source, /min-height:\s*28px;/,
  "Public footer touch targets must be at least 28 CSS pixels tall");
