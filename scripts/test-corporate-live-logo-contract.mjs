import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("live browser acceptance waits for a drawable logo but keeps a hard failure for missing assets", () => {
  const src = readFileSync("scripts/test-corporate-live-acceptance.mjs", "utf8");
  const waitIndex = src.indexOf("await page.waitForFunction(() => {");
  const stateIndex = src.indexOf("const state = await page.evaluate(() => {");
  assert.ok(waitIndex !== -1 && stateIndex > waitIndex,
    "Image readiness must be checked before collecting the DOM snapshot");
  assert.match(src, /logo\\.complete && logo\\.naturalWidth > 0/);
  assert.match(src, /timeout: 8000, polling: 100/);
  assert.match(src, /if \\(!state\\.logo\\) row\\.issues\\.push\\("Header logo not loaded"\\);/);
  assert.match(src, /if \\(response\\?\\.status\\(\\) !== 200\\) row\\.issues\\.push/);
  assert.doesNotMatch(src, /route\\s*===\\s*["']\\/about\\/["']\\s*&&\\s*engineName/);
});
