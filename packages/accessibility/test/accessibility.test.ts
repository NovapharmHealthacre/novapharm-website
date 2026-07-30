import assert from "node:assert/strict";
import test from "node:test";
import { acceptanceViewports, requiredManualChecks, viewportKey, wcagTarget } from "../src/index.ts";

test("acceptance matrix includes all required viewport sizes", () => {
  assert.equal(acceptanceViewports.length, 7);
  assert.deepEqual(acceptanceViewports.map(({ width, height }) => viewportKey(width, height)), [
    "1440x900", "1920x1080", "1024x1366", "768x1024", "390x844", "430x932", "375x667"
  ]);
});

test("manual evidence remains mandatory alongside automation", () => {
  assert.equal(wcagTarget, "WCAG 2.2 AA");
  assert.ok(requiredManualChecks.includes("keyboard-navigation"));
  assert.ok(requiredManualChecks.includes("screen-reader-status"));
});
