import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { enterpriseResearchCapabilities, readGovernedEnterpriseRecords }
  from "../src/core/intelligence-enterprise-governed-read.mjs";

const workspaceId="tenant_alpha";
const asOf="2026-11-12T12:00:00Z";
const now=Date.parse("2026-11-13T12:00:00Z");
const authority={principalId:"founder_001", workspaceId,authorityRevision:"rev-001",
 accessScopes:["intelligence:research"],verified:true};
const payloads={
 foundry_ops:{subjectId:"medicine_001",predicate:"classified_as",objectId:"code_001"},
 cloud_security:{findingId:"finding_001",severity:"high",disposition:"open"},
 pharma_markets:{metricId:"dispensed_items",value:123,unit:"items",observationType:"observed",region:"GB"},
 nova_research:{evidenceId:"evidence_001",contentSha256:"b".repeat(64)}
};
const hash=p=>createHash("sha256").update(JSON.stringify(p)).digest("hex");
function sample(capability,overrides={}){
 const payload=payloads[capability];
 return {recordId:"record_001",workspaceId,capability,sourceId:"source_001",sourceVersion:"version_001",
 evidenceSha256:"a".repeat(64),payloadSha256:hash(payload),state:"accepted",isSynthetic:false,
 observedAt:"2026-11-11T08:00:00Z",recordedAt:"2026-11-12T08:00:00Z",payload,...overrides};
}
function grant(capability,overrides={}){
 return {workspaceId,sourceId:"source_001",sourceVersion:"version_001",status:"active",revokedAt:null,
 verifiedByRightsAuthority:true,rightsRevision:"rights_rev001",decisionSha256:"c".repeat(64),
 allowedPurposes:["enterprise_internal_research"],allowedCapabilities:[capability],
 validFrom:"2026-11-01T00:00:00Z",validUntil:null,...overrides};
}
function setup(capability,overrides={}){
 const events=[];
 const input={authority,capability,asOf,clock:()=>now,
 loadRecords:async req=>{events.push(["read",req]);return[sample(capability)];},
 resolveSourceGrant:async req=>{events.push(["rights",req]);return grant(capability);},
 verifyCurrentAuthority:async req=>{events.push(["verify",req]);return true;},
 recordAudit:async req=>{events.push(["audit",req]);return{committed:true,eventId:req.eventId};},
 ...overrides};
 return {input,events};
}
const denied={code:"enterprise_research_denied",statusCode:403};

test("four enterprise capabilities return bounded audited records without vendor claims",async()=>{
 assert.deepEqual(enterpriseResearchCapabilities,
  ["foundry_ops","cloud_security","pharma_markets","nova_research"]);
 for(const capability of enterpriseResearchCapabilities){
  const {input,events}=setup(capability);
  const result=await readGovernedEnterpriseRecords(input);
  assert.equal(result.contract,"novapharm.intelligence.enterprise-read.v1");
  assert.equal(result.nativeVendorConnected,false);
  assert.equal(result.productionCertified,false);
  assert.equal(result.records.length,1);
  assert.deepEqual(result.records[0].payload,payloads[capability]);
  assert.equal(result.recordDigest.length,64);
  assert.match(result.auditEventId,/^[a-f0-9-]{36}$/);
  assert.deepEqual(events.map(x=>x[0]),["verify","read","rights","verify","audit","verify"]);
  assert.deepEqual(events[3][1].sourceRightsRevisions,
   [{source:["source_001","version_001"],revision:"rights_rev001"}]);
  assert.equal(events[4][1].noRawSourceText,true);
  assert.equal(JSON.stringify(result).includes("rights_rev001"),false);
 }
});

test("invalid principal, vendor mode, date or mandatory callbacks fail before storage",async()=>{
 for(const props of [
  {authority:{...authority,verified:false}},
  {authority:{...authority,workspaceId:"../../wrong"}},
  {authority:{...authority,workspaceId:{toString:()=>"tenant_alpha"}}},
  {authority:{...authority,accessScopes:["customer"]}},
  {authority:{...authority,principalId:"xx"}},
  {capability:"unregistered_vendor"}, {nativeVendor:true},
  {limit:21}, {limit:0}, {asOf:"invalid"}, {asOf:"2026-02-30T00:00:00Z"},
  {asOf:"2026-12-12T00:00:00Z"},
  {recordAudit:null}
 ]){
  let called=0;
  const {input}=setup("nova_research",{...props,loadRecords:async()=>{called++;return[];}});
  await assert.rejects(readGovernedEnterpriseRecords(input),denied);
  assert.equal(called,0,JSON.stringify(props));
 }
});

test("session refusal prevents any data load and late revocation prevents release",async()=>{
 let reads=0;
 const s=setup("foundry_ops",{
  verifyCurrentAuthority:async()=>false,
  loadRecords:async()=>{reads++;return[sample("foundry_ops")];}
 });
 await assert.rejects(readGovernedEnterpriseRecords(s.input),denied);
 assert.equal(reads,0);
 let reviews=0;
 const late=setup("nova_research",{verifyCurrentAuthority:async()=>++reviews<3});
 await assert.rejects(readGovernedEnterpriseRecords(late.input),denied);
 assert.equal(reviews,3);
 assert.equal(late.events.filter(x=>x[0]==="audit").length,1);
});

test("wrong tenant, duplicates, synthetic, altered, future and unapproved observations deny",async()=>{
 const cap="pharma_markets";
 for(const rows of [
  [sample(cap,{workspaceId:"tenant_beta"})],
  [sample(cap),sample(cap)],
  [sample(cap,{isSynthetic:true})],
  [sample(cap,{state:"review_pending"})],
  [sample(cap,{payload:{...payloads[cap],value:999}})],
  [sample(cap,{observedAt:"2026-11-15T08:00:00Z"})],
  [sample(cap,{recordedAt:"2026-11-14T08:00:00Z"})],
  [sample(cap,{recordedAt:"2026-11-12T18:00:00Z"})],
  [sample(cap,{observedAt:"2026-11-12T11:00:00Z",recordedAt:"2026-11-12T10:00:00Z"})],
  [sample(cap,{payload:{...payloads[cap],observationType:"forecast"},
   payloadSha256:hash({...payloads[cap],observationType:"forecast"})})],
  [sample(cap,{payload:{...payloads[cap],value:Infinity},
   payloadSha256:hash({...payloads[cap],value:Infinity})})],
  [sample(cap,{patientId:"patient_123"})], []
 ]){
  const {input}=setup(cap,{loadRecords:async()=>rows});
  await assert.rejects(readGovernedEnterpriseRecords(input),denied);
 }
});

test("revoked, expired, wrong-capability or inconsistent grants deny",async()=>{
 for(const overrides of [
  {status:"pending"},{revokedAt:"2026-11-12T09:00:00Z"},
  {workspaceId:"tenant_beta"},{sourceVersion:"different"},
  {verifiedByRightsAuthority:false},{decisionSha256:"bad"},
  {allowedPurposes:["wrong_purpose"]},{allowedCapabilities:["foundry_ops"]},
  {validFrom:"2026-11-14T00:00:00Z"},
  {validUntil:"2026-11-12T00:00:00Z"}
 ]){
  const cap="nova_research";
  const {input}=setup(cap,{resolveSourceGrant:async()=>grant(cap,overrides)});
  await assert.rejects(readGovernedEnterpriseRecords(input),denied);
 }
 let version=0;
 const {input}=setup("nova_research",{
  loadRecords:async()=>[sample("nova_research"),sample("nova_research",{recordId:"record_002"})],
  resolveSourceGrant:async()=>grant("nova_research",{rightsRevision:"rights_rev00"+(++version)})
 });
 await assert.rejects(readGovernedEnterpriseRecords(input),denied);
});

test("audit refusal, missing receipt or mismatched event fails closed",async()=>{
 for(const response of [undefined,{committed:false},{committed:true,eventId:"other_001"}]){
  const {input}=setup("cloud_security",{recordAudit:async()=>response});
  await assert.rejects(readGovernedEnterpriseRecords(input),denied);
 }
});

test("schema validation denies invalid payloads in each capability",async()=>{
 const bad=[
  ["foundry_ops",{subjectId:"medicine_001",predicate:"prescribe",objectId:"code_001"}],
  ["cloud_security",{findingId:"finding_001",severity:"unknown",disposition:"open"}],
  ["cloud_security",{findingId:"finding_001",severity:"high",disposition:"risk_accepted"}],
  ["pharma_markets",{metricId:"metric_001",value:12,unit:"items",observationType:"synthetic",region:"GB"}],
  ["nova_research",{evidenceId:"evidence_001",contentSha256:"invalid"}]
 ];
 for(const [capability,payload] of bad){
  const {input}=setup(capability,{
   loadRecords:async()=>[sample(capability,{payload,payloadSha256:hash(payload)})]
  });
  await assert.rejects(readGovernedEnterpriseRecords(input),denied);
 }
});
