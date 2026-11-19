import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const load = (p) => JSON.parse(readFileSync(path.join(root, p), "utf8"));
const registry = load("docs/intelligence/global-pharma-sources-20261117.json");
const schema = load("docs/intelligence/global-source-candidate-v2.schema.json");

test("all 101 global source candidates have unique stable machine keys", () => {
  assert.equal(registry.schema, schema.properties.schema.const);
  assert.equal(registry.sources.length, 101);
  const keys = registry.sources.map((row) => row.candidateKey);
  assert.equal(new Set(keys).size, keys.length);
  for (const row of registry.sources) {
    assert.match(row.candidateKey, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.match(row.url, /^https:\/\//);
    assert.ok(row.provider && row.country && row.region && row.mode && row.domains);
    assert.ok(row.note);
    assert.ok(schema.properties.sources.items.required.every((key) => Object.hasOwn(row, key)));
  }
});

test("registry never creates a licence, verified data source, or live adapter", () => {
  for (const row of registry.sources) {
    assert.equal(row.rightsStatus, "not-reviewed");
    assert.equal(row.integrationStatus, "candidate-only");
    assert.equal(row.authorityVerification, "pending");
    assert.equal(row.termsReview, "pending");
    assert.equal(row.verifiedOn, null);
    assert.equal(row.licenceEvidenceId, null);
    assert.deepEqual(row.allowedUses, []);
    assert.equal(row.activeAdapterId, null);
    assert.equal(row.dataAdmission, "not-admitted");
  }
});
test("global and national candidate labels are not evidence of full country coverage", () => {
  assert.ok(registry.cautions.some((c) => /rights|licen/i.test(c)));
  assert.ok(registry.sources.some((s) => s.country === "Global"));
  assert.ok(registry.sources.some((s) => s.country === "United Kingdom"));
  assert.ok(registry.sources.some((s) => s.country === "India"));
});
