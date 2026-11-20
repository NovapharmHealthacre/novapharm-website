import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildSixSurfaceMatrix, SURFACES } from "./build-hig-six-surface-acceptance.mjs";

const registerBytes = readFileSync("docs/design/apple-hig-172-topic-acceptance-register.json");
const register = JSON.parse(registerBytes);
const inventory = JSON.parse(readFileSync("docs/design/apple-hig-runtime-source-scope-20261120.json"));
const owner = JSON.parse(readFileSync("config/intelligence/owner-production-constraints.json"));
const create = (r = register, o = owner) =>
  buildSixSurfaceMatrix({register: r, inventory, owner: o, registerBytes});

test("owner-selected six distinct surfaces produce a traceable 172-by-six evidence matrix", () => {
  assert.deepEqual(SURFACES.map(s => s.id),
    ["corporate", "portal", "intelligence", "distribution", "ios", "android"]);
  assert.deepEqual(SURFACES.map(s => s.platform),
    ["web", "web", "web", "web", "ios", "android"]);
  const matrix = create();
  assert.equal(matrix.topics.length, 172);
  assert.equal(matrix.completion.reviewRecorded, 172);
  assert.equal(matrix.completion.platformDecisions, 516);
  assert.equal(matrix.completion.surfaceCells, 1032);
  assert.equal(matrix.completion.applicableProposals, 684);
  assert.equal(matrix.completion.notApplicableProposals, 348);
  assert.equal(matrix.completion.fullyAcceptedTopics, 0);
  assert.equal(matrix.completion.acceptedWholeTopicNotApplicable, 0);
  assert.equal(matrix.completion.independentlyAcceptedSurfaceCells, 0);
  assert.equal(matrix.gates.ownerControlledReleaseSignoff, "not_granted");
});

test("every proposed applicable surface still needs actual deployed evidence and reviewer", () => {
  const matrix = create();
  for (const topic of matrix.topics) {
    assert.equal(Object.keys(topic.surfaces).length, 6);
    for (const surface of SURFACES) {
      const cell = topic.surfaces[surface.id];
      assert.equal(cell.independentAcceptance, false);
      assert.equal(cell.independentReviewerApprovalReceipt, null);
      assert.equal(cell.observedLiveDeployedSha, null);
      assert.equal(cell.ownerReleaseApprovalReceipt, null);
      assert.ok(cell.evidenceRequirements.length >= 4);
      assert.ok(cell.inheritedRationale);
      if (cell.inheritedPlatformProposal === "not_applicable") {
        assert.equal(cell.surfaceDisposition, "proposed_not_applicable_requires_independent_review");
      } else {
        assert.equal(cell.surfaceDisposition, "surface_applicability_review_pending");
      }
    }
  }
});

test("source only cannot claim remote-independent acceptance even when a source topic is marked verified", () => {
  const altered = structuredClone(register);
  altered.topics[0].implementation = "verified";
  const candidate = create(altered);
  assert.equal(candidate.completion.sourceClaimedVerifiedTopics, 1);
  assert.equal(candidate.completion.fullyAcceptedTopics, 0);
  assert.equal(candidate.topics[0].independentProductionReadbackDisposition,
    "not_verified_by_this_source_only_generator");
});

test("owner signoff change is recorded but never self-certifies a topic", () => {
  const changedOwner = structuredClone(owner);
  changedOwner.productionSignoff = "granted";
  const report = create(register, changedOwner);
  assert.equal(report.gates.ownerControlledReleaseSignoff, "granted");
  assert.equal(report.completion.independentlyAcceptedSurfaceCells, 0);
});

test("reject missing platform decisions instead of silently assuming not-applicability", () => {
  const altered = structuredClone(register);
  delete altered.topics[0].platformApplicability.ios;
  assert.throws(() => create(altered), /missing ios applicability decision/);
});
