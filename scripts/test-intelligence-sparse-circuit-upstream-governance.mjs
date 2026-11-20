import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
// Discover every URL scheme independently, including nested URLs in query text.
// Always compare the *parsed hostname* rather than a substring of the full URL:
// unrelated domains may contain the same characters in their paths or names.
// No network request occurs during this static source-code governance check.
const hasUnapprovedBlobHost = source => {
  for (const match of source.matchAll(/\b(?:https?|blob):\/\//gi)) {
    const candidate = source.slice(match.index).split(/[\s"'`<>\\);,\]}]/, 1)[0];
    try {
      if (new URL(candidate).hostname === "openaipublic.blob.core.windows.net") return true;
    } catch {
      // Malformed text cannot be an approved remote model source.
      // The separate test below rejects all model-loading/network APIs.
    }
  }
  return false;
};

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

test("URL host governance rejects actual forbidden hosts, including nested links", () => {
  for (const text of [
    "https://openaipublic.blob.core.windows.net/model.pkl",
    "https://evil.example/?next=https://openaipublic.blob.core.windows.net/model.pkl",
    "blob://openaipublic.blob.core.windows.net/checkpoint",
    "HTTPS://OPENAIPUBLIC.BLOB.CORE.WINDOWS.NET/model.pkl"
  ]) assert.equal(hasUnapprovedBlobHost(text), true, text);
  for (const text of [
    "https://openaipublic.blob.core.windows.net.evil.example/model.pkl",
    "https://evilopenaipublic.blob.core.windows.net/model.pkl",
    "https://unrelated.example/openaipublic.blob.core.windows.net/model.pkl",
    "https://unrelated.example/approved.json"
  ]) assert.equal(hasUnapprovedBlobHost(text), false, text);
});
