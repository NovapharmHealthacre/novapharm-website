import assert from "node:assert/strict";
import test from "node:test";
import { atlasG2RequiredUniqueIndexKeys } from "../src/data/atlas-medicine-g2-atomic-store.mjs";
import {
  applyAtlasG2UniqueIndexes, inspectAtlasG2UniqueIndexes,
} from "../src/data/atlas-g2-unique-index-migration.mjs";

const names = Object.keys(atlasG2RequiredUniqueIndexKeys);
const goodIndex = (name) => ({
  name: "g2_unique", key: { ...atlasG2RequiredUniqueIndexKeys[name] }, unique: true,
});
function fake({
  records = {}, indexes = {}, name = "novapharm_intelligence_production",
  overrideCreateIndex,
} = {}) {
  const state = Object.fromEntries(names.map(n => [n, {
    count: records[n] ?? 0,
    indexes: [{ name: "_id_", key: { _id: 1 }, unique: true }, ...(indexes[n] ?? [])],
  }]));
  const writes = [];
  const collections = Object.fromEntries(names.map(n => [n, {
    listIndexes() {
      return { toArray: async () => structuredClone(state[n].indexes) };
    },
    async countDocuments(query, options) {
      assert.deepEqual(query, {});
      assert.equal(options.limit, 1);
      return Math.min(state[n].count, 1);
    },
    async createIndex(keys, options) {
      writes.push({ collection: n, keys, options });
      if (overrideCreateIndex) return overrideCreateIndex({ name: n, keys, options, state });
      state[n].indexes.push({ name: options.name, key: { ...keys }, unique: options.unique });
      return options.name;
    },
  }]));
  return { database: {
    databaseName: name, collection: n => collections[n],
  }, writes, state };
}
const permitted = async () => ({
  authorized: true, productionWritesQuiesced: true,
  operatorId: "operator-001", changeTicket: "change-667",
});
const denied = (code) => e => e?.code === code;

test("empty Atlas production collections are index-incomplete without any changes", async () => {
  const sys = fake();
  const view = await inspectAtlasG2UniqueIndexes({ database: sys.database });
  assert.equal(view.ready, false);
  assert.equal(view.mutationRequired, true);
  assert.equal(view.checks.length, 3);
  assert.equal(view.productionIngestionApproved, false);
  assert.equal(view.customerReleaseApproved, false);
  assert.ok(view.checks.every(x => !x.verified && x.empty && x.uniqueRequired && x.indexName === "g2_unique"));
  assert.deepEqual(sys.writes, []);
});

test("no independent authority, invalid audit callback or unquiesced production cannot mutate", async () => {
  for (const auth of [
    undefined, async () => true, async () => ({ authorized: true }),
    async () => ({ ...await permitted(), productionWritesQuiesced: false }),
    async () => ({ ...await permitted(), operatorId: null }),
  ]) {
    const sys = fake();
    await assert.rejects(
      applyAtlasG2UniqueIndexes({ database: sys.database, verifyMigrationAuthority: auth }),
      denied(auth ? "independent_approval_required" : "approval_callback_missing"),
    );
    assert.equal(sys.writes.length, 0);
  }
  const sys = fake();
  await assert.rejects(applyAtlasG2UniqueIndexes({
    database: sys.database, verifyMigrationAuthority: permitted,
    afterVerifiedIndex: "not callable",
  }), denied("invalid_audit_callback"));
  assert.deepEqual(sys.writes, []);
});

test("approved migration creates exactly three unique constraints and audits each", async () => {
  const sys = fake();
  const receipts = [];
  const result = await applyAtlasG2UniqueIndexes({
    database: sys.database,
    verifyMigrationAuthority: permitted,
    afterVerifiedIndex: async receipt => {
      receipts.push(receipt);
      return { persisted: true };
    },
  });
  assert.deepEqual(result.changed, names);
  assert.equal(result.ready, true);
  assert.equal(result.customerReleaseApproved, false);
  assert.equal(result.productionIngestionApproved, false);
  assert.equal(receipts.length, 3);
  assert.deepEqual(sys.writes.map(x => x.collection), names);
  for (const w of sys.writes) {
    assert.deepEqual(w.keys, atlasG2RequiredUniqueIndexKeys[w.collection]);
    assert.equal(w.options.unique, true);
    assert.equal(w.options.name, "g2_unique");
  }
  assert.equal((await inspectAtlasG2UniqueIndexes({ database: sys.database })).ready, true);
  const again = await applyAtlasG2UniqueIndexes({ database: sys.database, verifyMigrationAuthority: async () => {
    throw new Error("already compliant must not request new authorization");
  } });
  assert.deepEqual(again.changed, []);
  assert.equal(sys.writes.length, 3);
});

test("partial migration resumes safely without replacing already correct unique indexes", async () => {
  const sys = fake({ indexes: { [names[0]]: [goodIndex(names[0])] } });
  const result = await applyAtlasG2UniqueIndexes({
    database: sys.database, verifyMigrationAuthority: permitted,
  });
  assert.equal(result.ready, true);
  assert.deepEqual(result.changed, names.slice(1));
  assert.equal(sys.writes.length, 2);
});

test("any existing records in a collection missing its unique index block the entire run", async () => {
  for (const name of names) {
    const sys = fake({ records: { [name]: 1 } });
    await assert.rejects(inspectAtlasG2UniqueIndexes({ database: sys.database }),
      denied("nonempty_collection_requires_reconciliation"));
    await assert.rejects(applyAtlasG2UniqueIndexes({
      database: sys.database, verifyMigrationAuthority: permitted,
    }), denied("nonempty_collection_requires_reconciliation"));
    assert.deepEqual(sys.writes, []);
  }
});

test("nonunique, conflicting, sparse and partial G2 indexes fail instead of silently repairing", async () => {
  for (const wrong of [
    { name: "g2_unique", unique: false },
    { name: "g2_unique", unique: true, sparse: true },
    { name: "g2_unique", unique: true, partialFilterExpression: { status: "active" } },
    { name: "not_g2_unique", unique: false },
  ]) {
    const first = names[0];
    const sys = fake({ indexes: {
      [first]: [{
        key: { ...atlasG2RequiredUniqueIndexKeys[first] },
        ...wrong,
      }],
    } });
    await assert.rejects(applyAtlasG2UniqueIndexes({
      database: sys.database, verifyMigrationAuthority: permitted,
    }), denied("incompatible_existing_index"));
    assert.deepEqual(sys.writes, []);
  }
});

test("wrong database and failed native driver readback never claim completion", async () => {
  const wrong = fake({ name: "novapharm_staging" });
  await assert.rejects(inspectAtlasG2UniqueIndexes({ database: wrong.database }),
    denied("wrong_database_or_missing_private_driver"));
  const sys = fake({ overrideCreateIndex: ({ options }) => options.name });
  await assert.rejects(applyAtlasG2UniqueIndexes({
    database: sys.database, verifyMigrationAuthority: permitted,
  }), denied("index_creation_unverified"));
  assert.equal(sys.writes.length, 1);
});

test("missing durable migration audit fails closed and never declares release", async () => {
  const sys = fake();
  await assert.rejects(applyAtlasG2UniqueIndexes({
    database: sys.database, verifyMigrationAuthority: permitted,
    afterVerifiedIndex: async () => ({ persisted: false }),
  }), denied("migration_audit_failed"));
  assert.equal(sys.writes.length, 1);
  const state = await inspectAtlasG2UniqueIndexes({ database: sys.database });
  assert.equal(state.ready, false);
  assert.equal(state.customerReleaseApproved, false);
});
