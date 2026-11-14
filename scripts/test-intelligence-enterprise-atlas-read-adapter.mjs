import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { createEnterpriseAtlasReadAdapters }
  from "../src/data/intelligence-enterprise-atlas-read-adapter.mjs";
import {readGovernedEnterpriseRecords}
  from "../src/core/intelligence-enterprise-governed-read.mjs";

const workspaceId="tenant_alpha",capability="nova_research",asOf="2026-11-12T12:00:00Z";
const payload={evidenceId:"evidence_001",contentSha256:"b".repeat(64)};
const row={
 recordId:"record_001",workspaceId,capability,sourceId:"source_001",
 sourceVersion:"version_001",evidenceSha256:"a".repeat(64),
 payloadSha256:createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
 state:"accepted",isSynthetic:false,observedAt:"2026-11-11T08:00:00Z",
 recordedAt:"2026-11-12T08:00:00Z",payload
};
const grant={
 workspaceId,sourceId:"source_001",sourceVersion:"version_001",
 status:"active",revokedAt:null,verifiedByRightsAuthority:true,
 rightsRevision:"rights_rev001",decisionSha256:"c".repeat(64),
 allowedPurposes:["enterprise_internal_research"],allowedCapabilities:[capability],
 validFrom:"2026-11-01T00:00:00Z",validUntil:null
};
function collection(rows,reads=[]){
 return {
  find(filter,options){
   reads.push({filter,options});
   return {limit(limit){reads.at(-1).limit=limit;return {
    toArray:async()=>rows
   }}};
  }
 };
}
function adapter(rows=[row],rights=[grant]){
 const observedRecords=[],observedRights=[];
 const handlers=createEnterpriseAtlasReadAdapters({
  recordsCollection:collection(rows,observedRecords),
  rightsCollection:collection(rights,observedRights)
 });
 return {handlers,observedRecords,observedRights};
}
const request={workspaceId,capability,asOf,limit:10,purpose:"enterprise_internal_research"};
const rightRequest={workspaceId,sourceId:"source_001",sourceVersion:"version_001",capability,purpose:"enterprise_internal_research"};
const denied={code:"enterprise_atlas_read_denied",statusCode:403};

test("bounded Atlas source reads use server-owned tenant filters and explicit projection",async()=>{
 const {handlers,observedRecords,observedRights}=adapter();
 assert.deepEqual(await handlers.loadRecords(request),[row]);
 assert.deepEqual(await handlers.resolveSourceGrant(rightRequest),grant);
 assert.deepEqual(observedRecords[0].filter,{
  workspaceId,capability,state:"accepted",isSynthetic:false,
  observedAt:{$lte:asOf},recordedAt:{$lte:asOf}
 });
 assert.equal(observedRecords[0].limit,11);
 assert.equal(observedRecords[0].options.projection._id,0);
 assert.equal(observedRecords[0].options.projection.patientId,undefined);
 assert.deepEqual(observedRights[0].filter,{
  workspaceId,sourceId:"source_001",sourceVersion:"version_001"
 });
 assert.equal(observedRights[0].options.projection._id,0);
 assert.equal(observedRights[0].limit,2);
});
test("rights registry absent is never inferred as an active grant",async()=>{
 const {handlers}=adapter([row],[]);
 assert.equal(await handlers.resolveSourceGrant(rightRequest),null);
 const result=readGovernedEnterpriseRecords({
  authority:{principalId:"founder_001",workspaceId,authorityRevision:"rev-001",
   verified:true,accessScopes:["intelligence:research"]},
  capability,asOf,clock:()=>Date.parse("2026-11-13T12:00:00Z"),
  ...handlers,verifyCurrentAuthority:async()=>true,
  recordAudit:async(req)=>({committed:true,eventId:req.eventId})
 });
 await assert.rejects(result,{code:"enterprise_research_denied",statusCode:403});
});
test("read-only adapter composes with gateway for a synthetic test fixture only",async()=>{
 const {handlers}=adapter();
 let verifications=0,audits=0;
 const result=await readGovernedEnterpriseRecords({
  authority:{principalId:"founder_001",workspaceId,authorityRevision:"rev-001",
   verified:true,accessScopes:["intelligence:research"]},
  capability,asOf,clock:()=>Date.parse("2026-11-13T12:00:00Z"),
  ...handlers,verifyCurrentAuthority:async()=>{verifications++;return true;},
  recordAudit:async(req)=>{audits++;return {committed:true,eventId:req.eventId};}
 });
 assert.equal(result.productionCertified,false);
 assert.equal(result.nativeVendorConnected,false);
 assert.equal(result.records.length,1);
 assert.equal(verifications,3);
 assert.equal(audits,1);
});
test("right grant duplicates and overlimit results fail closed",async()=>{
 const dup=adapter([row],[grant,grant]);
 await assert.rejects(dup.handlers.resolveSourceGrant(rightRequest),denied);
 const overflow=adapter([row,row]);
 await assert.rejects(overflow.handlers.loadRecords({...request,limit:1}),denied);
});
test("out-of-scope, future, unapproved or hidden fields always deny",async()=>{
 const bad=[
  {...row,workspaceId:"tenant_beta"},
  {...row,capability:"cloud_security"},
  {...row,recordedAt:"2026-11-13T00:00:00Z"},
  {...row,state:"pending"},
  {...row,isSynthetic:true},
  {...row,patientId:"patient_001"}
 ];
 for(const r of bad){
  const {handlers}=adapter([r]);
  await assert.rejects(handlers.loadRecords(request),denied);
 }
 const {handlers}=adapter([row],[{...grant,secretToken:"must_never_escape"}]);
 await assert.rejects(handlers.resolveSourceGrant(rightRequest),denied);
});
test("malformed dates, Mongo selectors and unknown vendor capabilities deny before query",async()=>{
 const records=[],rights=[];
 const handlers=createEnterpriseAtlasReadAdapters({
  recordsCollection:collection([row],records),rightsCollection:collection([grant],rights)
 });
 for(const options of [
  {...request,workspaceId:{$ne:""}}, {...request,asOf:"2026-02-30T00:00:00Z"},
  {...request,limit:21},{...request,capability:"bloomberg_native"},
  {...request,purpose:"customer_public"}
 ])await assert.rejects(handlers.loadRecords(options),denied);
 for(const options of [
  {...rightRequest,sourceId:{$ne:""}}, {...rightRequest,workspaceId:"tenant/evil"},
  {...rightRequest,purpose:"public_ai"}
 ])await assert.rejects(handlers.resolveSourceGrant(options),denied);
 assert.equal(records.length,0);
 assert.equal(rights.length,0);
});
