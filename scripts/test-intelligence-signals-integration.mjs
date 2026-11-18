import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
test("the protected Nova ML view actually includes the Signals and technical evidence register", () => {
  const ml = read("apps/portal/components/nova-ml-workspaces.tsx");
  const component = read("apps/portal/components/nova-signals-research.tsx");
  const catalogue = read("apps/portal/data/nova-signals-research.ts");
  const css = read("apps/portal/components/nova-signals-research.module.css");
  assert.match(ml, /<NovaSignalsResearch\s*\/>/);
  assert.match(ml, /import \{ NovaSignalsResearch \}/);
  assert.match(component, /aria-labelledby="nova-signals-evidence"/);
  assert.match(component, /target="_blank" rel="noopener noreferrer"/);
  assert.match(component, /Research, not live operations/);
  assert.match(css, /focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(ml + component + catalogue, /fetch\(|XMLHttpRequest|navigator\.mediaDevices|getUserMedia\(|SpeechRecognition\(|new WebSocket\(/);
  assert.equal((catalogue.match(/id: "[a-z0-9-]+", group:/g) ?? []).length, 15);
  assert.match(catalogue, /OpenAI Signals/);
  assert.match(catalogue, /Whisper/);
  assert.match(catalogue, /Triton/);
});
test("all 15 registered references have human-limited use and primary source links", () => {
  const catalogue = read("apps/portal/data/nova-signals-research.ts");
  const { signalsRegisteredSources } = await import("../src/ai/intelligence-openai-signals.mjs");
  for (const id of signalsRegisteredSources) assert.ok(catalogue.includes('id: "' + id + '"'), id);
  assert.equal((catalogue.match(/url: "https:\/\/(?:openai\.com|cdn\.openai\.com)\//g) ?? []).length, 15);
  assert.equal((catalogue.match(/adaptation: "/g) ?? []).length, 15);
  assert.equal((catalogue.match(/boundary: "/g) ?? []).length, 15);
});
test("native policy candidates have no model execution or network calls and are compiled via CI", () => {
  const sw = read("native/novapharm-intelligence-apple/NovaSignalsResearch.swift");
  const kt = read("native/novapharm-intelligence-android/NovaSignalsResearch.kt");
  const manifest = read("native/novapharm-intelligence-apple/Package.swift");
  const swiftTest = read("native/novapharm-intelligence-apple/Tests/NovaMLAppleTests.swift");
  const kotlinTest = read("native/novapharm-intelligence-android/NovaSignalsResearchTest.kt");
  assert.match(manifest, /"NovaSignalsResearch.swift"/);
  assert.match(swiftTest, /testSignalsResearchIsAlwaysReviewOnlyAndRejectsUnsafeCrossRoleUse/);
  assert.match(kotlinTest, /NovaSignalsResearchPolicy\.assess/);
  for (const text of [sw, kt]) {
    assert.match(text, /executionEnabled/);
    assert.match(text, /"review-only"/);
    assert.match(text, /"blocked"/);
    assert.match(text, /"personal-data-not-admitted"/);
    assert.match(text, /"autonomous-decision-prohibited"/);
    assert.match(text, /"zero-budget-only"/);
    assert.doesNotMatch(text, /URLSession|OkHttp|Retrofit|java\.net|HttpClient|AWSClient|ProcessBuilder/);
  }
});
test("source document is candid about non-deployment, attribution and owner constraints", () => {
  const doc = read("docs/intelligence/openai-signals-whisper-triton-integration-20261118.md");
  const owner = JSON.parse(read("config/intelligence/owner-production-constraints.json"));
  assert.match(doc, /CC BY 4\.0/);
  assert.match(doc, /No Signals dataset bytes imported/);
  assert.match(doc, /not an individual/);
  assert.match(doc, /not a live/i);
  assert.equal(owner.productionSignoff, "not_granted");
  assert.equal(owner.initialInfrastructureBudget.monthlyCapGbp, 0);
});
