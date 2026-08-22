import assert from "node:assert/strict";
import test from "node:test";
import { componentRegistry, designSystemCss, designTokens, propertyDirection, reducedMotionCss } from "../src/index.ts";

test("shared foundation retains distinct property directions", () => {
  assert.equal(Object.keys(propertyDirection).length, 4);
  assert.notEqual(propertyDirection.corporate, propertyDirection.nit);
  assert.notEqual(propertyDirection.founder, propertyDirection.portal);
});

test("tokens preserve controlled branding and usable interaction dimensions", () => {
  assert.equal(designTokens.colour.novapharmRed, "#E3120B");
  assert.equal(designTokens.colour.novapharmRedText, "#B30E09");
  assert.equal(designTokens.radius.card, "8px");
  assert.equal(designTokens.layout.touchTarget, "44px");
  assert.match(reducedMotionCss(), /prefers-reduced-motion/);
  assert.match(designSystemCss, /focus-visible/);
  assert.match(designSystemCss, /min-height:44px/);
  assert.equal(componentRegistry.length, 24);
});

test("the governed registry covers every required component family", () => {
  const required = [
    "navigation", "mega-menu", "breadcrumbs", "hero", "editorial-section", "leadership-card",
    "product-explorer", "data-table", "accessible-chart", "timeline", "form-field", "dialog",
    "drawer", "tabs", "search", "filters", "error-state", "empty-state", "loading-state",
    "portal-control-bar", "file-upload", "approval-status", "audit-history", "document-viewer",
  ];
  assert.deepEqual([...componentRegistry].sort(), required.sort());
});
