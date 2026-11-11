import assert from "node:assert/strict";
import test from "node:test";
import {
  assessFreePreviewInventory, freePreviewAtlasCollections,
  freePreviewAtlasTarget, planFreePreviewAtlasBootstrap,
} from "../src/data/atlas-free-preview.mjs";

const cluster = Object.freeze({
  projectId: freePreviewAtlasTarget.projectId,
  clusterId: freePreviewAtlasTarget.clusterId,
  name: freePreviewAtlasTarget.clusterName,
  provider: "AWS", region: "EU_NORTH_1", instanceType: "FREE",
  state: "IDLE", paused: false,
});
const release = Object.freeze({
  environment: "preview", customerAccessEnabled: false,
  recurringBillingEnabled: false, sourceRightsAccepted: false,
  publicNetworkAllowed: false, patientDataAllowed: false,
});

test("manifest pins the free cluster and never grants customer access", () => {
  const p = planFreePreviewAtlasBootstrap({ cluster, release });
  assert.equal(p.database, "novapharm_intelligence_preview");
  assert.equal(p.collections.length, 8);
  assert.equal(p.indexes.length, 8);
  assert.equal(new Set(p.collections).size, 8);
  assert.deepEqual(new Set(p.indexes.map(i => i.collection)), new Set(p.collections));
  assert.equal(p.customerMedicineAccessAllowed, false);
  assert.equal(p.stripeRecurringBillingAllowed, false);
  assert.equal(p.novaInferenceAllowed, false);
  assert.equal(p.requiresExplicitOperatorApplication, true);
});

test("paid tier, wrong project, region, cluster or state are rejected", () => {
  for (const bad of [
    { projectId: "other-project" }, { clusterId: "other-cluster" },
    { name: "novapharm-staging" }, { region: "EU_WEST_1" },
    { instanceType: "DEDICATED" }, { state: "CREATING" }, { paused: true },
  ]) assert.throws(() => planFreePreviewAtlasBootstrap({ cluster: { ...cluster, ...bad }, release }), /Unapproved/);
});

test("customer, billing, licence, network and patient switches cannot be enabled", () => {
  for (const field of [
    "customerAccessEnabled", "recurringBillingEnabled", "sourceRightsAccepted",
    "publicNetworkAllowed", "patientDataAllowed",
  ]) assert.throws(() => planFreePreviewAtlasBootstrap({ cluster, release: { ...release, [field]: true } }), /fail closed/);
  assert.throws(() => planFreePreviewAtlasBootstrap({ cluster, release: { ...release, environment: "production" } }), /fail closed/);
  assert.throws(() => planFreePreviewAtlasBootstrap({ cluster, release: {} }), /fail closed/);
});

test("empty or unaccepted collection inventory remains unavailable", () => {
  const blank = assessFreePreviewInventory({ collections: [], counts: {} });
  assert.equal(blank.schemaPresent, false);
  assert.equal(blank.missingCollections.length, 8);
  assert.equal(blank.acceptedMedicineRows, 0);
  assert.equal(blank.licensedSourceRightsVerified, false);
  assert.equal(blank.customerAccessAllowed, false);
  assert.equal(blank.stripeBillingAllowed, false);
  const names = Object.values(freePreviewAtlasCollections);
  const present = assessFreePreviewInventory({
    collections: names,
    counts: Object.fromEntries(names.map(name => [name, 100])),
  });
  assert.equal(present.schemaPresent, true);
  assert.equal(present.enterpriseProductionAccepted, false);
  assert.equal(present.acceptedMedicineRows, 0);
});

test("unverified counts, duplicates and missing inventory fail closed", () => {
  assert.throws(() => assessFreePreviewInventory({}), /incomplete/);
  assert.throws(() => assessFreePreviewInventory({ collections: ["a", "a"], counts: {} }), /duplicate/);
  const names = Object.values(freePreviewAtlasCollections);
  assert.throws(() => assessFreePreviewInventory({ collections: names, counts: {} }), /not independently verified/);
  assert.throws(() => assessFreePreviewInventory({
    collections: names,
    counts: Object.fromEntries(names.map(name => [name, -1])),
  }), /not independently verified/);
});
