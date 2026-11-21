import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const body = readFileSync(".github/workflows/materialize-product-media.yml", "utf8");

test("licensed media CI cannot write branches or publish, even when manually dispatched", () => {
  assert.match(body, /^permissions:\s*\n\s*contents:\s*read\s*$/m);
  assert.doesNotMatch(body, /\bcontents:\s*write\b|\bgit\s+push\b|\bgit\s+commit\b|\bpull_request_target:/);
  assert.match(body, /persist-credentials:\s*false/);
  assert.match(body, /ref:\s*\$\{\{\s*github\.event\.pull_request\.head\.sha\s*\|\|\s*github\.sha\s*\}\}/);
  assert.match(body, /Enforce media-only mutation boundary/);
  assert.match(body, /npm run products:validate/);
  assert.match(body, /npm run security:scan/);
  assert.match(body, /No source commits, branch pushes, PR mutation, release, or public image artifact upload is permitted/);
});
