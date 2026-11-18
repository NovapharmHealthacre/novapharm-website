import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
// A literal-host test intentionally denies the hostname anywhere in candidate
// source, including nested URL strings and prefix/suffix lookalikes. Unlike a
// URL regex, it cannot accidentally accept a host merely by partial matching.
const hasUnapprovedBlobHost = source => source.includes("openaipublic.blob.core.windows.net");

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
    assert.equal(hasUnapprovedBlobHost(code), false, "Unapproved model-host reference: " + path);
  }
});

test("blob-host denial covers nested links, alternate schemes and lookalikes", () => {
  for (const text of [
    "https://openaipublic.blob.core.windows.net/model.pkl",
    "https://evil.example/?next=https://openaipublic.blob.core.windows.net/model.pkl",
    "https://openaipublic.blob.core.windows.net.evil.example/model.pkl",
    "blob://openaipublic.blob.core.windows.net/checkpoint"
  ]) assert.equal(hasUnapprovedBlobHost(text), true);
  assert.equal(hasUnapprovedBlobHost("https://unrelated.example/approved.json"), false);
});
