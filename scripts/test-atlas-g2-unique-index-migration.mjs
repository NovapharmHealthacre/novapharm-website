import assert from "node:assert/strict";
import test from "node:test";
import {
  g2UniqueIndexRequirements, planAtlasG2UniqueIndexes,
  applyAtlasG2UniqueIndexes
} from "../src/data/atlas-g2-unique-index-migration.mjs";

const approved = Object.freeze({
  environment: "private_schema_only", changeId: "NPI_SCHEMA_CHANGE_20261114",
  customerAccessEnabled: false, ingestionEnabled: false,
  independentReviewerVerified: true, operatorConfirmedBackup: true
});
function makeDatabase({ nonempty = null, colliding = null, missing = null,
  failCreate = null, failedReadback = null, initialUnique = [] } = {}) {
  const records = new Map();
  const writes = [];
  for (const req of g2UniqueIndexRequirements) {
    if (req.collection === missing) continue;
    const indexes = [{ name: "_id_", key: { _id: 1 }, unique: true }];
    if (initialUnique.includes(req.collection)) {
      indexes.push({ name: req.name, key: req.key, unique: true });
    } else if (req.collection === colliding) {
      indexes.push({ name: req.name, key: { unexpected: 1 }, unique: false });
    }
    records.set(req.collection, { docs: req.collection === nonempty ? 1 : 0, indexes });
  }
  const db = {
    databaseName: "novapharm_intelligence_production",
    listCollections(filter, opts) {
      assert.deepEqual(filter, {});
      assert.deepEqual(opts, {nameOnly:true});
      return {toArray:async() => [...records.keys()].map(name=>({name}))};
    },
    collection(name) {
      if (!records.has(name)) throw Error("Missing collection " + name);
      const item = records.get(name);
      return {
        listIndexes() {
          return {toArray:async() => item.indexes.map(x=>({...x}))};
        },
        async countDocuments(filter) {
          assert.deepEqual(filter, {});
          return item.docs;
        },
        async createIndex(key, options) {
          writes.push({ name, key, options });
          if (name === failCreate) throw Error("simulated transient operator failure");
          const req = g2UniqueIndexRequirements.find(x=>x.collection === name);
          assert.deepEqual(key,req.key);
          assert.deepEqual(options,{
            name:req.name,unique:true,sparse:false,
            collation:{locale:"simple"}
          });
          if (name !== failedReadback) {
            item.indexes.push({
              key:{...key}, name:options.name, unique:true,
              sparse:false, collation:{locale:"simple"}
            });
          }
          return req.name;
        }
      };
    }
  };
  return { db, writes, records };
}
function error(code) {
  return err => err?.code === code;
}

test("dry-run inspects all four collections and never creates indexes", async () => {
  const x = makeDatabase();
  const plan = await planAtlasG2UniqueIndexes({database:x.db});
  assert.equal(plan.ready,false);
  assert.equal(plan.safeToApply,true);
  assert.equal(plan.sourceRightsGranted,false);
  assert.equal(plan.customerAccessEnabled,false);
  assert.equal(plan.collections.length,4);
  assert.deepEqual(plan.collections.map(y=>y.documentCount),[0,0,0,0]);
  assert.deepEqual(x.writes,[]);
});

test("independently approved operator applies exactly four unique indexes and confirms readback",async()=>{
  const x=makeDatabase();
  const result=await applyAtlasG2UniqueIndexes({database:x.db,approval:approved});
  assert.equal(result.applied,true);
  assert.equal(result.ready,true);
  assert.equal(result.createdIndexNames.length,4);
  assert.equal(result.sourceRightsGranted,false);
  assert.equal(result.productionAdmissionEnabled,false);
  assert.equal(x.writes.length,4);
  const after=await planAtlasG2UniqueIndexes({database:x.db});
  assert.equal(after.ready,true);
  assert.deepEqual(after.collections.map(y=>y.exactUniqueIndexPresent),
    [true,true,true,true]);
});

test("migration is idempotent with exact matching unique indexes",async()=>{
  const x=makeDatabase({initialUnique:g2UniqueIndexRequirements.map(t=>t.collection)});
  const result=await applyAtlasG2UniqueIndexes({database:x.db,approval:approved});
  assert.equal(result.ready,true);
  assert.deepEqual(result.createdIndexNames,[]);
  assert.equal(x.writes.length,0);
});

test("missing independent approval never writes any schema",async()=>{
  const changes=[
    undefined, {}, {...approved,independentReviewerVerified:false},
    {...approved,operatorConfirmedBackup:false},
    {...approved,ingestionEnabled:true},
    {...approved,customerAccessEnabled:true},
    {...approved,changeId:"bad"}
  ];
  for(const approval of changes){
    const x=makeDatabase();
    await assert.rejects(
      applyAtlasG2UniqueIndexes({database:x.db,approval}),
      error("independent_schema_change_approval_required")
    );
    assert.equal(x.writes.length,0);
  }
});

test("nonempty, missing or conflicting target collections block the entire migration",async()=>{
  for(const req of g2UniqueIndexRequirements) {
    const setups=[
      {nonempty:req.collection},
      {missing:req.collection},
      {colliding:req.collection}
    ];
    for(const opt of setups){
      const x=makeDatabase(opt);
      await assert.rejects(
        applyAtlasG2UniqueIndexes({database:x.db,approval:approved})
      );
      assert.equal(x.writes.length,0);
    }
  }
});

test("never operate against a different or ambiguous database handle",async()=>{
  const x=makeDatabase();
  x.db.databaseName="novapharm_staging";
  await assert.rejects(planAtlasG2UniqueIndexes({database:x.db}),
    error("wrong_or_untrusted_database"));
  await assert.rejects(applyAtlasG2UniqueIndexes({database:x.db,approval:approved}),
    error("wrong_or_untrusted_database"));
  assert.equal(x.writes.length,0);
});

test("new ingestion being enabled blocks the change regardless of approval",async()=>{
  const x=makeDatabase();
  await assert.rejects(
    applyAtlasG2UniqueIndexes({database:x.db,approval:approved,
      productionAdmissionEnabled:true}),
    error("independent_schema_change_approval_required")
  );
  assert.equal(x.writes.length,0);
});

test("failed creates require inspected idempotent retry; never claim atomic multi-collection rollback",async()=>{
  const failOn=g2UniqueIndexRequirements[2].collection;
  const x=makeDatabase({failCreate:failOn});
  await assert.rejects(applyAtlasG2UniqueIndexes({database:x.db,approval:approved}),
    /simulated transient operator failure/);
  assert.equal(x.writes.length,3);
  const plan=await planAtlasG2UniqueIndexes({database:x.db});
  assert.equal(plan.ready,false);
  assert.deepEqual(plan.collections.map(y=>y.exactUniqueIndexPresent),
    [true,true,false,false]);
  const fresh=makeDatabase({
    initialUnique:g2UniqueIndexRequirements.slice(0,2).map(y=>y.collection)
  });
  const retry=await applyAtlasG2UniqueIndexes({database:fresh.db,approval:approved});
  assert.equal(retry.ready,true);
  assert.equal(fresh.writes.length,2);
});

test("index creation response without durable index readback is not accepted",async()=>{
  const x=makeDatabase({
    failedReadback:g2UniqueIndexRequirements[0].collection
  });
  await assert.rejects(
    applyAtlasG2UniqueIndexes({database:x.db,approval:approved}),
    error("index_readback_not_attested")
  );
  assert.equal(x.writes.length,1);
});
