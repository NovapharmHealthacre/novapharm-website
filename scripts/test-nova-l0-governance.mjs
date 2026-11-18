import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const file = (name) => readFileSync(new URL(name, root), "utf8");
const json = (name) => JSON.parse(file(name));

test("L0 research has an explicit non-production entry in the authoritative AI model register", () => {
  const register = json("docs/ai-model-register.json");
  const entry = register.models.find((model) => model.id === "novapharm-l0-hard-concrete-research-v0");
  assert.ok(entry, "Missing model research entry");
  assert.equal(entry.productionApproved, false);
  assert.equal(entry.customerVisible, false);
  assert.equal(entry.bundledModel, false);
  assert.equal(entry.remoteModelLoading, false);
  assert.match(entry.securityStatus, /Experimental/i);
  assert.match(entry.modelLicence, /no weights/i);
});

test("AI risk, use-case, and SBOM registers deny unsupported customer or regulated claims", () => {
  const useCase = json("docs/ai-use-case-register.json").roadmapOnly.find((item) => item.id === "l0-structured-sparsity-research");
  assert.ok(useCase);
  assert.equal(useCase.maturity, "research-only");
  assert.equal(useCase.productionApproved, false);
  assert.equal(useCase.customerVisible, false);
  assert.match(useCase.prohibitedUse, /dosing/);
  const component = json("docs/ai-dependency-and-model-sbom.json").components.find((item) => item.name === "Nova L0 hard-concrete research source");
  assert.ok(component);
  assert.equal(component.bundledModel, false);
  assert.equal(component.productionEnabled, false);
  assert.equal(component.noWeightsOrCustomerData, true);
  assert.ok(component.paths.some((path) => path.endsWith("/l0-sparsity.ts")));
});

test("AI system card and risk register exclude sparse models from approved production", () => {
  const systemCard = file("docs/ai-system-card.md");
  const risk = file("docs/ai-risk-register.md");
  assert.match(systemCard, /research-only L0 sparsity boundary/i);
  assert.match(systemCard, /no approved trained weights/i);
  assert.match(risk, /false sparse-model assurance/i);
  assert.match(risk, /source-only/i);
});

test("shared TypeScript adapter remains offline and rejects unreviewed model activation", () => {
  const source = file("packages/medicines-intelligence/src/l0-sparsity.ts");
  for (const phrase of ["l0ActivationProbability", "l0DeterministicGate", "l0SampleGate", "compileL0SparseLinearCandidate", "scoreL0SparseLinearCandidate", 'releaseStatus: "research-only"', "productionApproved: false", "customerVisible: false"]) {
    assert.ok(source.includes(phrase), "Missing L0 research contract: " + phrase);
  }
  assert.doesNotMatch(source, /\bfetch\(|\bXMLHttpRequest\b|\bURLSession\b/);
  assert.match(file("packages/medicines-intelligence/src/index.ts"), /l0-sparsity\.ts/);
});

test("Swift and Android research adapters share the same release-denial and schema identity", () => {
  for (const path of [
    "native/novapharm-intelligence-apple/NovaL0ResearchMath.swift",
    "native/novapharm-intelligence-android/src/main/kotlin/com/novapharm/intelligence/ml/NovaL0ResearchMath.kt",
  ]) {
    const source = file(path);
    assert.match(source, /nova-l0-sparse-linear-candidate-v1/);
    assert.match(source, /research-only/);
    assert.match(source, /nonZeroCount/);
    assert.match(source, /productionApproved/);
    assert.match(source, /customerVisible/);
    assert.doesNotMatch(source, /\bURLSession\b|\bfetch\(|\bHttpURLConnection\b/);
  }
  assert.match(file("native/novapharm-intelligence-apple/Package.swift"), /NovaL0ResearchMath\.swift/);
  assert.match(file("native/novapharm-intelligence-apple/Tests/NovaMLAppleTests.swift"), /testL0ResearchCandidateFailsClosed/);
  assert.match(file("native/novapharm-intelligence-android/src/test/kotlin/com/novapharm/intelligence/ml/NovaL0ResearchMathTest.kt"), /candidate\.copy\(productionApproved = true\)/);
});

test("protected Nova ML catalogue acknowledges research, without adding a fifth module or claiming live capability", () => {
  const catalogue = file("apps/portal/data/nova-ml-modules.ts");
  assert.equal([...catalogue.matchAll(/slug: "(nova-[a-z-]+)"/g)].length, 4);
  assert.match(catalogue, /Research-only L0 hard-concrete feature gates/);
  assert.doesNotMatch(catalogue, /productionApproved: true|customerVisible: true/);
  const guidance = file("docs/intelligence/L0_SPARSE_ML_CROSS_PLATFORM_20261118.md");
  assert.match(guidance, /source-only research candidate/);
  assert.match(guidance, /chronological holdouts/);
});
