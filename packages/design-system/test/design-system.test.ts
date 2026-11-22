import assert from "node:assert/strict";
import test from "node:test";
import { componentRegistry, designSystemCss, designTokens, propertyDirection, reducedMotionCss, layoutOrganizationPolicy } from "../src/index.ts";

test("shared foundation retains distinct property directions", () => {
  assert.equal(Object.keys(propertyDirection).length, 4);
  assert.notEqual(propertyDirection.corporate, propertyDirection.nit);
  assert.notEqual(propertyDirection.founder, propertyDirection.portal);
});

test("tokens preserve controlled branding and usable interaction dimensions", () => {
  assert.equal(designTokens.colour.novapharmRed, "#9D1B32");
  assert.equal(designTokens.colour.novapharmRedText, "#68101F");
  assert.equal(designTokens.colour.warmWhite, "#FBFAEF");
  assert.equal(designTokens.colour.porcelainWhite, "#F8F7F3");
  assert.equal(designTokens.colour.sovereignBlack, "#0B0B0E");
  assert.equal(designTokens.colour.porcelainStone, "#DEDCD5");
  assert.equal(designTokens.materials.content.canvas, "#FBFAEF");
  assert.equal(designTokens.materials.content.grouped, "#F8F7F3");
  assert.equal(designTokens.radius.card, "8px");
  assert.equal(designTokens.layout.touchTarget, "44px");
  assert.match(reducedMotionCss(), /prefers-reduced-motion/);
  assert.match(designSystemCss, /focus-visible/);
  assert.match(designSystemCss, /min-height:44px/);
  assert.match(designSystemCss, /@media print/);
  assert.match(designSystemCss, /@page \{ size: A4/);
  assert.match(designSystemCss, /np-document-viewer__content/);
  assert.equal(componentRegistry.length, 28);
});

test("the governed registry covers every required component family", () => {
  const required = [
    "group-box", "collection-view", "split-view", "disclosure", "navigation", "mega-menu", "breadcrumbs", "hero", "editorial-section", "leadership-card",
    "product-explorer", "data-table", "accessible-chart", "timeline", "form-field", "dialog",
    "drawer", "tabs", "search", "filters", "error-state", "empty-state", "loading-state",
    "portal-control-bar", "file-upload", "approval-status", "audit-history", "document-viewer",
  ];
  assert.deepEqual([...componentRegistry].sort(), required.sort());
});
test("HIG typography supports coherent native families, scalable reading and data accuracy", () => {
  assert.match(designTokens.typography.uiFamily, /system-ui/);
  assert.match(designTokens.typography.monoFamily, /ui-monospace/);
  assert.equal(designTokens.typography.readingLeading, 1.65);
  assert.equal(designTokens.typography.interfaceLeading, 1.45);
  assert.equal(designTokens.typography.readingMeasure, "68ch");
  assert.match(designTokens.typography.display, /clamp/);
  assert.match(designSystemCss, /font-optical-sizing:auto/);
  assert.match(designSystemCss, /overflow-wrap:break-word/);
  assert.match(designSystemCss, /font-variant-numeric:tabular-nums/);
  assert.match(designSystemCss, /prefers-contrast:more/);
});

test("Apple layout becomes a cross-estate decision contract without overwriting existing branding", () => {
  assert.deepEqual(layoutOrganizationPolicy.estates, ["corporate", "technology", "founder", "status", "portal", "intelligence", "distribution"]);
  assert.equal(Object.keys(layoutOrganizationPolicy.patterns).length, 10);
  assert.equal(layoutOrganizationPolicy.patterns.collections.web.includes("CollectionView"), true);
  assert.equal(layoutOrganizationPolicy.patterns.columnViews.web.includes("ColumnBrowser"), true);
  assert.equal(layoutOrganizationPolicy.patterns.disclosureControls.web.includes("details/summary"), true);
  assert.equal(layoutOrganizationPolicy.patterns.outlineViews.web.includes("OutlineView"), true);
  assert.equal(layoutOrganizationPolicy.patterns.tabViews.avoid.includes("more than six"), true);
  assert.deepEqual(layoutOrganizationPolicy.acceptance.browsers, ["Chromium", "WebKit"]);
  assert.ok(layoutOrganizationPolicy.acceptance.states.includes("authorized and denied"));
});
