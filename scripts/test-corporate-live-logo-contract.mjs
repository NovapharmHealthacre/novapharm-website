import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("live browser acceptance awaits an actual drawable logo and still fails missing assets", () => {
  const src = readFileSync("scripts/test-corporate-live-acceptance.mjs", "utf8");
  const waitIndex = src.indexOf("await page.waitForFunction(() => {");
  const stateIndex = src.indexOf("const state = await page.evaluate(() => {");
  assert.ok(waitIndex !== -1 && stateIndex > waitIndex,
    "Logo readiness must be checked before collecting the DOM snapshot");
  assert.ok(src.includes("logo.complete && logo.naturalWidth > 0"),
    "Wait for nonzero decoded dimensions, not just an image element");
  assert.ok(src.includes("timeout: 8000, polling: 100"),
    "Bound the wait instead of masking genuinely broken resources");
  assert.ok(src.includes('if (!state.logo) row.issues.push("Header logo not loaded");'),
    "Missing images must remain release-blocking errors");
  assert.ok(src.includes('if (response?.status() !== 200) row.issues.push'),
    "HTTP failures must remain release-blocking errors");
  assert.ok(src.includes('if (expectedSHA && state.sourceSha[0] !== expectedSHA) row.issues.push'),
    "A stale live release must still be detected");
});
