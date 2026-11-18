import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const json = path => JSON.parse(source(path));
const expected = [
  "reward-proxy-overoptimization",
  "human-assisted-critiques",
  "instruction-following-evaluation",
  "offline-multiagent-operational-simulation"
];

test("all four alignment papers are represented in the roadmap, not live foundations", () => {
  const register = json("docs/ai-use-case-register.json");
  for (const id of expected) {
    const found = register.roadmapOnly.find(x => x.id === id);
    assert.ok(found, "Missing research use-case " + id);
    assert.equal(found.maturity, "research-only");
    assert.equal(found.productionApproved, false);
    assert.equal(found.customerVisible, false);
    assert.ok(!register.implementedFoundations.some(x => x.id === id));
  }
});

test("research code has no network, model execution, production writes or misleading positive approvals", () => {
  const code = source("src/core/ai/nova-alignment-research.mjs");
  for (const method of ["assessRewardProxySweep", "evaluateCritiqueAssistance",
    "evaluateInstructionConformance", "assessOfflineScenarioRollouts"]) {
    assert.match(code, new RegExp("export function " + method));
  }
  for (const flag of ["researchOnly: true", "productionApproved: false",
    "customerVisible: false", "independentGroundTruthVerified: false",
    "dataRightsVerified: false", "humanAdjudicationRequired: true"]) {
    assert.ok(code.includes(flag));
  }
  assert.doesNotMatch(code, /\bfetch\(|\bURLSession\b|\baxios\b|\bXMLHttpRequest\b|\bprocess\.env\b|\bcreateServer\b|\bchild_process\b/);
  assert.match(source("docs/ai-system-card.md"), /source-only.*evaluation contracts/iu);
  assert.match(source("docs/ai-risk-register.md"), /simulation-to-reality transfer/iu);
});

test("existing four protected Nova ML workspaces and twenty-two research workspaces remain unchanged", () => {
  const catalogue = source("apps/portal/data/nova-ml-modules.ts");
  const original = source("apps/portal/data/intelligence-workspaces.ts");
  const slugs = [...catalogue.matchAll(/slug: "(nova-[a-z-]+)"/gu)].map(x => x[1]);
  assert.deepEqual(slugs, ["nova-ml-studio", "nova-core-runtime",
    "nova-device-intelligence", "nova-generative-assist"]);
  assert.equal([...original.matchAll(/slug: "/gu)].length, 22);
  assert.match(catalogue, /novaMlAlignmentResearchMethods/);
  const ui = source("apps/portal/components/nova-ml-workspaces.tsx");
  assert.match(ui, /AI alignment research programme/);
  assert.match(ui, /No model, rewards, critiques, training, operational actions or customer predictions/);
  assert.doesNotMatch(ui, /\bfetch\(|\blocalStorage\b|\.predict\(|requestAuthorization/);
});

test("native candidate receipts cannot imply verified data or deployed models", () => {
  const swift = source("native/novapharm-intelligence-apple/NovaAlignmentResearchReceipt.swift");
  const kotlin = source("native/novapharm-intelligence-android/src/main/kotlin/com/novapharm/intelligence/ml/NovaAlignmentResearchReceipt.kt");
  for (const code of [swift, kotlin]) {
    assert.match(code, /novapharm\.intelligence\.nova-alignment-research\.v1/);
    for (const marker of ["reward_proxy_sweep", "critique_assistance",
      "instruction_conformance", "offline_multiagent_scenario_scoreboard"]) {
      assert.ok(code.includes(marker));
    }
    assert.match(code, /!productionApproved/);
    assert.match(code, /!customerVisible/);
    assert.match(code, /!independentGroundTruthVerified/);
    assert.match(code, /!dataRightsVerified/);
    assert.doesNotMatch(code, /\bURLSession\b|\bfetch\(|\bHttpURLConnection\b/);
  }
  assert.match(source("native/novapharm-intelligence-apple/Package.swift"), /NovaAlignmentResearchReceipt\.swift/);
  assert.match(source("native/novapharm-intelligence-apple/Tests/NovaMLAppleTests.swift"), /testAlignmentResearchReceiptAcceptsOnlyOfflineUnverifiedLabels/);
  assert.match(source("native/novapharm-intelligence-android/src/test/kotlin/com/novapharm/intelligence/ml/NovaAlignmentResearchReceiptTest.kt"), /copy\(productionApproved = true\)/);
});

test("source-only research is listed in model SBOM without bundling a model", () => {
  const sbom = json("docs/ai-dependency-and-model-sbom.json");
  const component = sbom.components.find(x => x.name === "Nova ML alignment research source contracts");
  assert.ok(component);
  assert.equal(component.bundledModel, false);
  assert.equal(component.productionEnabled, false);
  assert.deepEqual(component.externalInferenceProviders, []);
  const research = source("docs/intelligence/NOVA_AI_ALIGNMENT_RESEARCH_20261118.md");
  for (const id of ["2210.10760", "2206.05802", "2203.02155", "1912.06680"]) {
    assert.ok(research.includes(id));
  }
});
