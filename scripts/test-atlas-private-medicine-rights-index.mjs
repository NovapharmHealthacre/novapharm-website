import assert from "node:assert/strict";
import test from "node:test";
import {ensurePrivateMedicineRightsUniqueIndex, medicineRightsUniqueIndexSpec as spec}
  from "../src/data/atlas-private-medicine-rights-index.mjs";

const unique = {name: spec.name, key: spec.keys, unique: true, collation: {locale: "simple"}};
function fake(initial = [{name: "_id_", key: {_id: 1}, unique: true}], count = 0) {
  let indexes = [...initial], writes = 0, authorizations = 0;
  const collection = {
    listIndexes: () => ({toArray: async () => [...indexes]}),
    countDocuments: async (filter, opts) => {
      assert.deepEqual(filter, {}); assert.deepEqual(opts, {limit: 1});
      return count === 0 ? 0 : 1;
    },
    createIndex: async (keys, opts) => {
      writes++;
      assert.deepEqual(keys, spec.keys);
      assert.equal(opts.name, spec.name);
      assert.equal(opts.unique, true);
      assert.equal(opts.sparse, false);
      assert.deepEqual(opts.collation, {locale: "simple"});
      assert.deepEqual(opts.writeConcern, {w: "majority"});
      indexes.push({name: opts.name, key: keys, unique: true, collation: opts.collation});
      return opts.name;
    }
  };
  const database = {databaseName: spec.database,
    collection: name => {assert.equal(name, spec.collection); return collection;}};
  return {database, collection,
    approval: async p => {authorizations++; assert.equal(p.rightsGranted,false);
      assert.equal(p.customerAccessEnabled,false); return true;},
    totals: () => ({writes, authorizations})};
}
test("default remains dry-run and does not touch index", async () => {
  const x=fake();
  const y=await ensurePrivateMedicineRightsUniqueIndex({database:x.database});
  assert.equal(y.status, "review_required");
  assert.deepEqual(x.totals(), {writes:0,authorizations:0});
});
test("existing correct index is idempotent", async () => {
  const x=fake([unique],1);
  const y=await ensurePrivateMedicineRightsUniqueIndex({database:x.database});
  assert.equal(y.status, "verified");
  assert.equal(x.totals().writes,0);
});
test("independently approved empty collection gets majority unique index", async () => {
  const x=fake();
  const y=await ensurePrivateMedicineRightsUniqueIndex({
    database:x.database,apply:true,changeTicket:"NPI-CHANGE-20261113",authorizeMigration:x.approval
  });
  assert.equal(y.status,"created_and_verified");
  assert.equal(y.rightsGranted,false);
  assert.deepEqual(x.totals(), {writes:1,authorizations:1});
});
test("nonempty or wrong database denies writes", async () => {
  const x=fake(undefined,5);
  await assert.rejects(ensurePrivateMedicineRightsUniqueIndex({
    database:x.database,apply:true,changeTicket:"NPI-CHANGE-20261113",
    authorizeMigration:x.approval
  }),/Nonempty rights/);
  await assert.rejects(ensurePrivateMedicineRightsUniqueIndex({
    database:{...x.database,databaseName:"novapharm_staging"}
  }),/Trusted private/);
  assert.equal(x.totals().writes,0);
});
test("missing approval, invalid ticket and rejected authority deny", async () => {
  const x=fake();
  for (const args of [
    {apply:true},
    {apply:true,changeTicket:"no",authorizeMigration:x.approval},
    {apply:true,changeTicket:"NPI-CHANGE-20261113",authorizeMigration:async()=>false}
  ]) await assert.rejects(ensurePrivateMedicineRightsUniqueIndex({
    database:x.database,...args}),/authority required|approval denied/);
  assert.equal(x.totals().writes,0);
});
test("conflicting index properties deny mutation", async () => {
  for(const i of [
    {...unique,unique:false},
    {...unique,sparse:true},
    {...unique,partialFilterExpression:{status:"active"}},
    {...unique,key:{workspace_id:1}},
    {...unique,collation:{locale:"en"}},
    {...unique,expireAfterSeconds:30}
  ]) {
    const x=fake([i]);
    await assert.rejects(ensurePrivateMedicineRightsUniqueIndex({database:x.database}),
      /Conflicting rights/);
    assert.equal(x.totals().writes,0);
  }
});
test("forged createIndex acknowledgment is not successful", async () => {
  const x=fake(); x.collection.createIndex=async()=>spec.name;
  await assert.rejects(ensurePrivateMedicineRightsUniqueIndex({
    database:x.database,apply:true,changeTicket:"NPI-CHANGE-20261113",
    authorizeMigration:x.approval}),/not verified/);
});
test("corrupt inventory and wrong apply type deny", async () => {
  const x=fake();
  x.collection.listIndexes=()=>({toArray:async()=>new Array(33).fill({})});
  await assert.rejects(ensurePrivateMedicineRightsUniqueIndex({database:x.database}),
    /Invalid index inventory/);
  const y=fake();
  await assert.rejects(ensurePrivateMedicineRightsUniqueIndex({
    database:y.database,apply:"true"}),/Invalid migration mode/);
});


import {
  ensureG2PrivateMedicineUniqueIndexes, g2MedicineUniqueIndexSpecs
} from "../src/data/atlas-private-medicine-rights-index.mjs";

function g2Fixture({missing = null, nonempty = null, conflicting = null} = {}) {
  const collections = {};
  let writes = 0, approvals = 0;
  for (const [name, spec] of Object.entries(g2MedicineUniqueIndexSpecs)) {
    const indexes = [{name: "_id_", key: {_id: 1}, unique: true}];
    if (name !== missing && name !== conflicting) indexes.push({
      name: spec.name, key: spec.keys, unique: true, collation: {locale:"simple"}
    });
    if (name === conflicting) indexes.push({name: spec.name, key: spec.keys, unique:false});
    collections[name] = {
      listIndexes:()=>({toArray:async()=>[...indexes]}),
      countDocuments:async()=>name===nonempty ? 1 : 0,
      createIndex:async(keys,opts)=>{
        writes++;
        assert.deepEqual(keys, spec.keys);
        assert.equal(opts.unique, true);
        assert.equal(opts.name, spec.name);
        assert.deepEqual(opts.writeConcern, {w:"majority"});
        indexes.push({name:opts.name,key:keys,unique:true,collation:opts.collation});
        return opts.name;
      }
    };
  }
  const database = {databaseName:spec.database,
    collection:name=>{assert.ok(collections[name]);return collections[name];}};
  const authorizeMigration = async p=>{
    approvals++;
    assert.equal(p.rightsGranted,false);
    assert.equal(p.customerAccessEnabled,false);
    return true;
  };
  return {database,authorizeMigration,stats:()=>({writes,approvals})};
}
const names = Object.keys(g2MedicineUniqueIndexSpecs);
test("three G2 compound constraints are dry-run verified without writes", async()=>{
  const x=g2Fixture({missing:names[0]});
  const result=await ensureG2PrivateMedicineUniqueIndexes({database:x.database});
  assert.deepEqual(result.pending,[names[0]]);
  assert.equal(x.stats().writes,0);
});
test("reviewed private G2 migration creates only missing indexes with exact unique majority options", async()=>{
  const x=g2Fixture({missing:names[1]});
  const result=await ensureG2PrivateMedicineUniqueIndexes({
    database:x.database,apply:true,changeTicket:"NPI-CHANGE-G2-20261113",
    authorizeMigration:x.authorizeMigration
  });
  assert.equal(result.status,"created_and_verified");
  assert.deepEqual(result.applied,[names[1]]);
  assert.deepEqual(x.stats(),{writes:1,approvals:1});
});
test("missing approval, nonempty data and conflicting G2 indexes deny writes",async()=>{
  for(const defect of [
    {nonempty:names[2], missing:names[2]},
    {conflicting:names[1], missing:names[0]}
  ]){
    const x=g2Fixture(defect);
    await assert.rejects(ensureG2PrivateMedicineUniqueIndexes({
      database:x.database,apply:true,changeTicket:"NPI-CHANGE-G2-20261113",
      authorizeMigration:x.authorizeMigration
    }),/Nonempty|Conflicting/);
    assert.equal(x.stats().writes,0);
  }
  const x=g2Fixture({missing:names[0]});
  await assert.rejects(ensureG2PrivateMedicineUniqueIndexes({
    database:x.database,apply:true,changeTicket:"NPI-CHANGE-G2-20261113"
  }),/authority required/);
  assert.equal(x.stats().writes,0);
});


test("source rights refuse a grant inserted after independent operator approval", async()=>{
  const x=fake();
  let reads=0;
  x.collection.countDocuments=async()=>++reads === 1 ? 0 : 1;
  await assert.rejects(ensurePrivateMedicineRightsUniqueIndex({
    database:x.database,apply:true,changeTicket:"NPI-CHANGE-20261113",
    authorizeMigration:x.approval
  }),/changed during migration approval/);
  assert.deepEqual(x.totals(),{writes:0,authorizations:1});
});
test("source rights refuse a conflicting index created during independent approval", async()=>{
  const x=fake();
  let reads=0;
  x.collection.listIndexes=()=>({toArray:async()=> {
    reads++;
    return reads===1 ? [{name:"_id_",key:{_id:1},unique:true}] :
      [{name:spec.name,key:spec.keys,unique:false}];
  }});
  await assert.rejects(ensurePrivateMedicineRightsUniqueIndex({
    database:x.database,apply:true,changeTicket:"NPI-CHANGE-20261113",
    authorizeMigration:x.approval
  }),/changed during migration approval/);
  assert.equal(x.totals().writes,0);
});
test("G2 refuses newly inserted evidence after an approved read-only preflight",async()=>{
  const x=g2Fixture({missing:names[0]});
  let reads=0;
  x.database.collection(names[0]).countDocuments=async()=>++reads===1?0:1;
  await assert.rejects(ensureG2PrivateMedicineUniqueIndexes({
    database:x.database,apply:true,changeTicket:"NPI-CHANGE-G2-20261113",
    authorizeMigration:x.authorizeMigration
  }),/G2 collection changed during migration approval/);
  assert.equal(x.stats().writes,0);
});
