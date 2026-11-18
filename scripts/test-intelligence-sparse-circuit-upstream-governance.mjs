import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("upstream provenance, licence discrepancy and independent weights rights remain documented", () => {
  const review = read("docs/intelligence/SPARSE_CIRCUIT_UPSTREAM_SOURCE_REVIEW_20261118.md");
  for (const marker of [
    "dbf1fe0d27b76c19e10d2a715f28c2e5da535e08",
    "Apache License 2.0", "MIT License", "viz_data.pkl",
    "model weights", "independent", "untrusted pickle"
  ]) assert.ok(review.includes(marker), "Missing upstream review control: " + marker);
  assert.match(review, /not incorporated into the production dependency graph/i);
  assert.match(review, /does not vendor or import/i);
});

test("research code does not fetch or deserialize upstream executable model objects", () => {
  const candidatePaths = [
    "scripts/research/tiny-sparse-transformer-experiment.py",
    "scripts/research/toy-sparse-circuit-intervention.mjs",
    "scripts/research/validate-trained-sparse-transformer-report.mjs",
    "native/novapharm-intelligence-apple/NovaSparseCircuitReader.swift",
    "native/novapharm-intelligence-apple/NovaSparseCircuitResearchView.swift",
    "native/novapharm-intelligence-android/app/src/main/java/com/novapharm/intelligence/research/NovaSparseCircuitReader.kt",
    "native/novapharm-intelligence-android/app/src/main/java/com/novapharm/intelligence/research/NovaSparseCircuitResearchScreen.kt",
    "apps/portal/components/nova-ml-workspaces.tsx"
  ];
  const forbidden = /\b(?:pickle|cloudpickle|dill|joblib)\.(?:load|loads)\s*\(|\btorch\.load\s*\(|\b(?:requests\.(?:get|post)|urllib\.request|HttpURLConnection|OkHttpClient|URLSession|WebClient)\b|\bfetch\s*\(/;
  for (const path of candidatePaths) {
    const code = read(path);
    assert.doesNotMatch(code, forbidden, "Unapproved external-model access: " + path);
    assert.doesNotMatch(code, /https?:\/\/openaipublic\.blob\.core\.windows\.net/);
  }
});
