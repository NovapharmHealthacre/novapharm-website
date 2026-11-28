import test from "node:test";
import assert from "node:assert/strict";
import {atlasFourUniqueIndexRequirements as required} from "../src/data/atlas-four-index-preflight.mjs";
import {inspectFirstCountryIndexReadiness,runFirstCountryFourIndexMigration} from "../src/data/atlas-first-country-four-index-orchestration.mjs";

function fixture({occupied=null,conflict=null}={}) {
  const indexes=new Map(required.map(s=>[s.collection,[{name:"_id_",key:{_id:1},unique:true}]]));
  if(conflict)indexes.get(conflict).push({name:"g2_unique",key:{wrong:1},unique:false});
  const changes=[],calls=[];
  const database={
    databaseName:"novapharm_intelligence_production",
    collection(name){
      if(!indexes.has(name))throw Error("Unknown collection");
      return {
        listIndexes(){return {toArray:async()=>structuredClone(indexes.get(name))}},
        async countDocuments(filter,options){return name===occupied?1:0},
        async createIndex(key,opts){
          assert.equal(opts.unique,true);
          assert.equal(opts.sparse,false);
          assert.equal(opts.collation?.locale,"simple");
          assert.deepEqual(opts.writeConcern,{w:"majority"});
          changes.push(name);
          indexes.get(name).push({key:structuredClone(key),name:opts.name,unique:true,sparse:false,collation:{locale:"simple"}});
          return opts.name;
        }
      };
    }
  };
  return {database,changes,calls,indexes};
}
const proof={
  approved:true,independentMfaVerified:true,changeSignatureVerified:true,
  backupRestoreVerified:true,productionWritesQuiesced:true,
  database:"novapharm_intelligence_production",
  operatorId:"operator-001",changeTicket:"Change-20261126-Atlas",
  backupEvidenceId:"restore-validated-001"
};
const audit=(events,ok=true)=>async event=>{events.push(event);return {persisted:ok}};
test("dry run inspects four indexes and never creates or grants anything",async()=>{
 const f=fixture();
 const r=await runFirstCountryFourIndexMigration({database:f.database});
 assert.equal(r.mode,"read-only"); assert.equal(r.ready,false);assert.equal(r.preflight.mutationCandidate,true);
 assert.equal(r.productionIngestionApproved,false);assert.equal(r.customerReleaseApproved,false);
 assert.deepEqual(f.changes,[]);
});
test("missing approval, unsigned change or missing restore proof fail before mutation",async()=>{
 for(const override of [null,{...proof,backupRestoreVerified:false},{...proof,changeSignatureVerified:false}]){
   const f=fixture(),events=[];
   await assert.rejects(runFirstCountryFourIndexMigration({
     database:f.database,apply:true,verifyChange:async()=>override,
     writeDurableAudit:audit(events)
   }),/denied/);
   assert.deepEqual(f.changes,[]);
 }
});
test("four exact unique indexes install only via independently verified private agent and durable audit",async()=>{
 const f=fixture(),events=[];
 const r=await runFirstCountryFourIndexMigration({
   database:f.database,apply:true,verifyChange:async()=>proof,
   writeDurableAudit:audit(events)
 });
 assert.equal(r.ready,true);
 assert.deepEqual(r.changed,required.map(x=>x.collection));
 assert.equal(events.filter(e=>e.event==="unique_index_verified").length,4);
 assert.equal(events.at(-1).event,"four_index_schema_ready");
 assert.equal(r.customerReleaseApproved,false);
 assert.equal((await inspectFirstCountryIndexReadiness({database:f.database})).schemaReady,true);
 const repeat=await runFirstCountryFourIndexMigration({database:f.database,apply:true});
 assert.equal(repeat.mode,"read-only");assert.deepEqual(repeat.changed,[]);
});
test("occupied, conflicting and unavailable collections never cause first-time indexes",async()=>{
 for(const kind of ["occupied","conflict"]){
   const f=fixture({[kind]:required[1].collection});
   await assert.rejects(runFirstCountryFourIndexMigration({
     database:f.database,apply:true,verifyChange:async()=>proof,writeDurableAudit:async()=>({persisted:true})
   }),/unsafe_index_state/);
   assert.deepEqual(f.changes,[]);
 }
});
test("durable pre-authorization audit is required before first write",async()=>{
 const f=fixture(),events=[];
 await assert.rejects(runFirstCountryFourIndexMigration({
  database:f.database,apply:true,verifyChange:async()=>proof,writeDurableAudit:audit(events,false)
 }),/durable_audit_unavailable/);
 assert.deepEqual(f.changes,[]);
});
test("changed or revoked authority on a second verification blocks first index",async()=>{
 const f=fixture();let n=0;
 await assert.rejects(runFirstCountryFourIndexMigration({
  database:f.database,apply:true,
  verifyChange:async()=>++n===1?proof:{...proof,approved:false},
  writeDurableAudit:async()=>({persisted:true})
 }),/denied/);
 assert.deepEqual(f.changes,[]);
});

test("independent approval revocation between G2 index writes stops partial migration safely",async()=>{
 const f=fixture(),events=[];let checks=0;
 await assert.rejects(runFirstCountryFourIndexMigration({
  database:f.database,apply:true,
  verifyChange:async()=>++checks>=5?{...proof,approved:false}:proof,
  writeDurableAudit:audit(events)
 }),/denied|revoked/);
 assert.deepEqual(f.changes,required.slice(0,2).map(x=>x.collection));
 assert.equal(events.filter(e=>e.event==="unique_index_verified").length,2);
 assert.ok(!events.some(e=>e.event==="four_index_schema_ready"));
 assert.equal((await inspectFirstCountryIndexReadiness({database:f.database})).schemaReady,false);
});
