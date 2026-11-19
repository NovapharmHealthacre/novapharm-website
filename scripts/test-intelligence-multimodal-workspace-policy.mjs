import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { multimodalWorkspacePolicy, assessMultimodalWorkspacePolicy, multimodalProhibitedDecisions } from "../src/core/intelligence-multimodal-workspace-policy.mjs";
import { workspaceCapabilityDependencies } from "../src/core/intelligence-22-workspace-readiness.mjs";

const source = readFileSync(new URL("../apps/portal/data/intelligence-workspaces.ts", import.meta.url), "utf8");
const catalogueSlugs = [...source.matchAll(/\{ slug: "([^"]+)", title: /gu)].map(([, slug]) => slug);

test("all and only the canonical 22 workspaces inherit a multimodal policy", () => {
  assert.equal(catalogueSlugs.length, 22);
  assert.deepEqual(new Set(Object.keys(multimodalWorkspacePolicy)), new Set(catalogueSlugs));
  assert.deepEqual(new Set(Object.keys(workspaceCapabilityDependencies)), new Set(catalogueSlugs));
  assert.ok(multimodalProhibitedDecisions.includes("medicine_identity_verification"));
  assert.ok(multimodalProhibitedDecisions.includes("quality_release"));
});

test("every 22-workspace multimodal policy defaults to no model, no publication and human review", () => {
  for (const slug of catalogueSlugs) {
    const p = assessMultimodalWorkspacePolicy(slug);
    assert.equal(p.workspaceSlug,slug);
    assert.equal(p.state,"research_plan_only");
    assert.equal(p.researchBasisContract, "novapharm.intelligence.multimodal.research-basis.v1");
    assert.equal(p.researchDimensionCount,7);
    assert.equal(p.requiresIndependentSourceRights,true);
    assert.equal(p.requiresAuthenticatedTenantAuthority,true);
    assert.equal(p.requiresHumanReleaseApproval,true);
    assert.equal(p.modelInferenceEnabled,false);
    assert.equal(p.productionAccepted,false);
    assert.equal(p.canPublish,false);
    assert.equal(p.decisionReady,false);
    assert.ok(Object.isFrozen(p));
  }
});
test("unknown or prototype pollution strings never inherit a policy", () => {
  for (const slug of ["__proto__", "constructor", "custom", "", null, [], {}]) {
    const p = assessMultimodalWorkspacePolicy(slug);
    assert.equal(p.state,"blocked_unknown_workspace");
    assert.equal(p.workspaceSlug,null);
    assert.equal(p.modelInferenceEnabled,false);
    assert.equal(p.canPublish,false);
  }
});
