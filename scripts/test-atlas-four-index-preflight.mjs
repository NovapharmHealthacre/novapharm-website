import assert from "node:assert/strict";
import test from "node:test";
import {
  atlasFourUniqueIndexRequirements,
  inspectAtlasFourUniqueIndexes
} from "../src/data/atlas-four-index-preflight.mjs";

const req = atlasFourUniqueIndexRequirements;
function fake({
  indexes = {}, records = {}, unavailable = null, databaseName = "novapharm_intelligence_production"
} = {}) {
  const mutations = [];
  const calls = [];
  return {
    mutations, calls,
    database: {
      databaseName,
      collection(name) {
        assert.ok(req.some(x => x.collection === name), "Unexpected collection " + name);
        const collection = {
          listIndexes() {
            calls.push({ action: "listIndexes", name });
            if (unavailable === name) throw new Error("connection not available");
            return { toArray: async () => structuredClone(
              indexes[name] ?? [{ name: "_id_", key: { _id: 1 }, unique: true }]
            ) };
          },
          async countDocuments(query, options) {
            calls.push({ action: "countDocuments", name, query, options });
            assert.deepEqual(query, {});
            assert.deepEqual(options, { limit: 1, maxTimeMS: 3000 });
            return Math.min(records[name] ?? 0, 1);
          },
          async createIndex() {
            mutations.push({ name, action: "createIndex" });
            throw new Error("read-only preflight must never mutate Atlas");
          },
          async insertOne() {
            mutations.push({ name, action: "insertOne" });
            throw new Error("read-only preflight must never mutate Atlas");
          }
        };
        return collection;
      }
    }
  };
}
const valid = spec => ({
  name: spec.indexName,
  key: structuredClone(spec.keys),
  unique: true,
  sparse: false,
  collation: { locale: "simple" }
});
const fullyIndexed = () => Object.fromEntries(req.map(x => [
  x.collection, [{ name: "_id_", key: { _id: 1 }, unique: true }, valid(x)]
]));

test("all four schema requirements follow canonical rights and atomic-store keys", async () => {
  const { medicineRightsUniqueIndexSpec } = await import(
    "../src/data/atlas-private-medicine-rights-index.mjs");
  const { atlasG2RequiredUniqueIndexKeys } = await import(
    "../src/data/atlas-medicine-g2-atomic-store.mjs");
  assert.equal(req.length, 4);
  assert.deepEqual(req[0], {
    collection: medicineRightsUniqueIndexSpec.collection,
    indexName: medicineRightsUniqueIndexSpec.name,
    keys: medicineRightsUniqueIndexSpec.keys
  });
  for (const spec of req.slice(1)) {
    assert.equal(spec.indexName, "g2_unique");
    assert.deepEqual(spec.keys, atlasG2RequiredUniqueIndexKeys[spec.collection]);
  }
});

test("unindexed empty production is a migration CANDIDATE, never approved", async () => {
  const x = fake();
  const p = await inspectAtlasFourUniqueIndexes({ database: x.database });
  assert.equal(p.schemaReady, false);
  assert.equal(p.mutationCandidate, true);
  assert.equal(p.inspectionCount, 4);
  assert.deepEqual(p.checks.map(c => c.status), Array(4).fill("missing_unique_index"));
  assert.ok(p.checks.every(c => c.hasDocuments === false && c.requiredUnique === true));
  for (const key of [
    "migrationApproved", "independentBackupVerified", "sourceRightsGranted",
    "productionIngestionApproved", "customerReleaseApproved"
  ]) assert.equal(p[key], false);
  assert.deepEqual(x.mutations, []);
});

test("four valid exact unique indexes certify schema ONLY, never real rights or launch", async () => {
  const x = fake({ indexes: fullyIndexed() });
  const p = await inspectAtlasFourUniqueIndexes({ database: x.database });
  assert.equal(p.schemaReady, true);
  assert.equal(p.mutationCandidate, false);
  assert.deepEqual(p.checks.map(c => c.status), Array(4).fill("verified"));
  assert.equal(p.customerReleaseApproved, false);
  assert.equal(p.productionIngestionApproved, false);
  assert.equal(p.sourceRightsGranted, false);
  assert.deepEqual(x.mutations, []);
});

test("same-key indexes with obsolete names are conflicts, not success", async () => {
  for (const spec of req) {
    const indices = fullyIndexed();
    indices[spec.collection][1].name = "legacy_alternate_unique_name";
    const x = fake({ indexes: indices });
    const p = await inspectAtlasFourUniqueIndexes({ database: x.database });
    assert.equal(p.schemaReady, false);
    assert.equal(p.mutationCandidate, false);
    assert.equal(p.checks.find(c => c.collection === spec.collection)?.status,
      "conflicting_index_requires_review");
    assert.deepEqual(x.mutations, []);
  }
});

test("nonunique, sparse, partial, expiring, hidden or wrong collation indexes all fail closed", async () => {
  const broken = [
    { unique: false },
    { sparse: true },
    { partialFilterExpression: { status: "approved" } },
    { expireAfterSeconds: 86_400 },
    { hidden: true },
    { collation: { locale: "en" } },
    { key: { unexpected: 1 } }
  ];
  for (const mutate of broken) {
    const indices = fullyIndexed();
    Object.assign(indices[req[1].collection][1], mutate);
    const x = fake({ indexes: indices });
    const p = await inspectAtlasFourUniqueIndexes({ database: x.database });
    assert.equal(p.schemaReady, false);
    assert.equal(p.mutationCandidate, false);
    assert.equal(p.checks[1].status, "conflicting_index_requires_review");
  }
});

test("missing indexes with even one production record require reconciliation", async () => {
  const name = req[2].collection;
  const x = fake({ records: { [name]: 1 } });
  const p = await inspectAtlasFourUniqueIndexes({ database: x.database });
  assert.equal(p.checks[2].status, "nonempty_collection_requires_review");
  assert.equal(p.checks[2].hasDocuments, true);
  assert.equal(p.mutationCandidate, false);
  assert.deepEqual(x.mutations, []);
});

test("ambiguous duplicate indexes or unavailable source fail instead of claiming ready", async () => {
  const spec = req[0];
  const indices = fullyIndexed();
  indices[spec.collection].push({ ...valid(spec), name: "second_name_same_keys" });
  const a = await inspectAtlasFourUniqueIndexes({ database: fake({ indexes: indices }).database });
  assert.equal(a.checks[0].status, "conflicting_index_requires_review");
  const b = await inspectAtlasFourUniqueIndexes({
    database: fake({ unavailable: req[3].collection }).database
  });
  assert.equal(b.checks[3].status, "inspection_unavailable");
  assert.equal(b.schemaReady, false);
  assert.equal(b.mutationCandidate, false);
  assert.equal(b.checks[3].hasDocuments, null);
});

test("nonproduction handles and missing driver functions are not accepted", async () => {
  await assert.rejects(inspectAtlasFourUniqueIndexes({
    database: fake({ databaseName: "novapharm_intelligence_preview" }).database
  }), /Trusted production MongoDB/);
  await assert.rejects(inspectAtlasFourUniqueIndexes({
    database: { databaseName: "novapharm_intelligence_production" }
  }), /Trusted production MongoDB/);
});
