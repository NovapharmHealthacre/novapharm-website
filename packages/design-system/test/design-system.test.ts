import assert from "node:assert/strict";
import test from "node:test";
import { designTokens, propertyDirection, reducedMotionCss } from "../src/index.ts";

test("shared foundation retains distinct property directions", () => {
  assert.equal(Object.keys(propertyDirection).length, 4);
  assert.notEqual(propertyDirection.corporate, propertyDirection.nit);
  assert.notEqual(propertyDirection.founder, propertyDirection.portal);
});

test("tokens preserve controlled branding and usable interaction dimensions", () => {
  assert.equal(designTokens.colour.novapharmRed, "#be3035");
  assert.equal(designTokens.radius.card, "8px");
  assert.equal(designTokens.layout.touchTarget, "44px");
  assert.match(reducedMotionCss(), /prefers-reduced-motion/);
});
