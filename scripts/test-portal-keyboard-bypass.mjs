import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(path, "utf8");

test("all Portal view types expose a shared, focusable keyboard bypass", () => {
  const layout = read("apps/portal/app/layout.tsx");
  const client = read("apps/portal/components/portal-client.tsx");
  assert.match(layout, /<a className="portal-skip-link" href="#portal-content">Skip to portal content<\/a>/);
  assert.match(layout, /<section id="portal-content" aria-label="Portal content" tabIndex=\{-1\}/);
  assert.ok(layout.indexOf('className="portal-skip-link"') <
    layout.indexOf('id="portal-content"'), "Bypass must precede protected or login content");
  for (const branch of ["login", "password-change", "entra-complete", "module"]) {
    assert.ok(client.includes(branch), "Missing governed portal route kind: " + branch);
  }
});

test("bypass is high-contrast, at least 44 CSS px, and works in RTL", () => {
  const css = read("apps/portal/app/globals.css");
  assert.match(css, /\.portal-skip-link\s*\{[^}]*z-index:\s*10000;/s);
  assert.match(css, /\.portal-skip-link\s*\{[^}]*min-height:\s*44px;/s);
  assert.match(css, /\.portal-skip-link\s*\{[^}]*inset-inline-start:\s*12px;/s);
  assert.match(css, /\.portal-skip-link:focus(?:,|\s*\{)/);
  assert.match(css, /\.portal-skip-link:focus-visible\s*\{[^}]*transform:\s*none;/s);
});

test("actual Chromium and WebKit acceptance checks keyboard focus and activation", () => {
  const testSource = read("apps/portal/test/browser-acceptance.ts");
  assert.match(testSource, /async function verifyKeyboardBypass\(/);
  assert.match(testSource, /await page\.keyboard\.press\("Tab"\)/);
  assert.match(testSource, /await page\.keyboard\.press\("Enter"\)/);
  assert.match(testSource, /document\.activeElement\?\.id/);
  assert.match(testSource, /verifyKeyboardBypass\(page, .*anonymous sign-in/);
  assert.match(testSource, /verifyKeyboardBypass\(page, .*authenticated customer dashboard/);
  const workflow = read(".github/workflows/browser-acceptance.yml");
  assert.match(workflow, /Unified Chromium and WebKit acceptance/);
  assert.match(workflow, /Run all portal roles, routes and responsive viewports/);
  assert.match(workflow, /run:\s*npm run portal:test:browser/);
});

test("corporate main landmark is a real keyboard bypass destination", () => {
  const layout = read("apps/corporate/app/layout.tsx");
  const css = read("apps/corporate/app/globals.css");
  const browser = read("apps/corporate/test/browser-acceptance.ts");
  assert.match(layout, /<a className="skip-link" href="#main-content">Skip to main content<\/a>/);
  assert.match(layout, /<main id="main-content" lang="en-GB" data-np-untranslated tabIndex=\{-1\}/);
  assert.match(css, /\.skip-link\s*\{[^}]*min-height:\s*44px;/s);
  assert.match(css, /\.skip-link\s*\{[^}]*inset-inline-start:\s*12px;/s);
  assert.match(browser, /await page\.keyboard\.press\("Tab"\)/);
  assert.match(browser, /await page\.keyboard\.press\("Enter"\)/);
  assert.match(browser, /document\.activeElement\?\.id\), "main-content"/);
});


test("authorised Portal search supports Escape from result links and preserves keyboard focus", () => {
  const dashboard = read("apps/portal/components/dashboard.tsx");
  assert.match(dashboard, /const dismissSearch = useCallback\(\(\) => \{/);
  assert.match(dashboard, /\+\+searchGeneration\.current;\s*setSearchOpen\(false\);\s*setSearchResults\(\[\]\);/);
  assert.match(dashboard, /const withinSearch = active === searchInputRef\.current \|\|/);
  assert.match(dashboard, /active instanceof Element && active\.closest\("\\.portal-search"\) !== null/);
  assert.match(dashboard, /event\.key === "Escape" && withinSearch/);
  assert.match(dashboard, /setSearchAnnouncement\("Search cleared\."\);\s*searchInputRef\.current\?\.focus\(\);/);
  assert.match(dashboard, /aria-controls=\{searchOpen \? searchResultsId : undefined\} aria-expanded=\{searchOpen\}/);
  assert.match(dashboard, /aria-label="Close search results" onClick=\{dismissSearch\}/);
  assert.match(dashboard, /setSearchFailure\(null\);\s*setSearchAnnouncement\("Search results closed\."\);/);
});
