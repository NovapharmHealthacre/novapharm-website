import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (name) => readFileSync(path.join(root, name), "utf8");

test("Expo preview shares all five offline Nova ML methods with protected web metadata", () => {
  const ui = read("native/novapharm-intelligence-mobile/App.tsx");
  const catalogue = read("apps/portal/data/nova-ml-modules.ts");
  assert.match(ui, /novaMlAlignmentResearchMethods/);
  assert.match(ui, /novaMlSparseCircuitAssurance/);
  assert.match(ui, /<MultimodalReviewScreen/);
  assert.match(ui, /novaMlSparseResearchMethod/);
  assert.match(ui, /novaMlWorkspaceCatalogue/);
  assert.match(ui, /title="Nova ML research"/);
  assert.match(ui, /screen: "research", label: "Research"/);
  assert.match(catalogue, /export const novaMlSparseResearchMethod/);
  assert.match(catalogue, /export const novaMlAlignmentResearchMethods/);
  assert.equal((catalogue.match(/id: "(reward_proxy_sweep|critique_assistance|instruction_conformance|offline_multiagent_scenario_scoreboard)"/g) ?? []).length, 4);
  assert.match(catalogue, /l0_sparse_feature_gates/);
  assert.match(ui, /No model weights, clinical predictions, independent ground truth/);
});

test("the five research use cases remain blocked in central AI governance", () => {
  const register = JSON.parse(read("docs/ai-use-case-register.json"));
  for (const id of [
    "l0-structured-sparsity-research",
    "reward-proxy-overoptimization",
    "human-assisted-critiques",
    "instruction-following-evaluation",
    "offline-multiagent-operational-simulation",
  ]) {
    const item = register.roadmapOnly.find((entry) => entry.id === id);
    assert.ok(item, "Missing governed research use case: " + id);
    assert.equal(item.maturity, "research-only");
    assert.equal(item.productionApproved, false);
    assert.equal(item.customerVisible, false);
  }
});

test("mobile research remains a static, accessible preview with no model or permissions", () => {
  const ui = read("native/novapharm-intelligence-mobile/App.tsx");
  assert.match(ui, /accessibilityRole="tab"/);
  assert.match(ui, /researchStatus/);
  assert.match(ui, /Not production approved/);
  assert.match(ui, /No live medicine data/);
  assert.doesNotMatch(ui, /\bfetch\(|\bXMLHttpRequest\b|AsyncStorage|SecureStore|Authorization:|\.predict\(|\bmodel\.run\(|\bWebView\b/);
  const pkg = JSON.parse(read("native/novapharm-intelligence-mobile/package.json"));
  assert.equal(pkg.private, true);
  const expo = JSON.parse(read("native/novapharm-intelligence-mobile/app.json")).expo;
  assert.equal(expo.ios.bundleIdentifier, undefined);
  assert.equal(expo.android.package, undefined);
});
