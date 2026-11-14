import assert from "node:assert/strict";
import test from "node:test";
import {createHash} from "node:crypto";
import {readEnterpriseResearchView}
 from "../src/core/intelligence-enterprise-evidence-views.mjs";

const workspaceId="tenant_alpha";
const asOf="2026-11-12T12:00:00Z";
const now=Date.parse("2026-11-13T12:00:00Z");
const principal={
 verified:true,principalId:"director_001",workspaceId,
 authorityRevision:"rev-001",accessScopes:["board"]
};
const payloads={
 foundry_ops:{subjectId:"medicine_001",predicate:"classified_as",objectId:"snomed_code_001"},
 cloud_security:{findingId:"finding_001",severity:"high",disposition:"open"},
 pharma_markets:{metricId:"prescribing_items",value:43,unit:"items",region:"GB",observationType:"observed"},
 nova_research:{evidenceId:"evidence_001",contentSha256:"b".repeat(64)}
};
const hash=p=>createHash("sha256").update(JSON.stringify(p)).digest("hex");
function row(capability,overrides={}){
 const payload=payloads[capability];
 return {
  recordId:"record_001",workspaceId,capability,sourceId:"source_001",
  sourceVersion:"version_001",evidenceSha256:"a".repeat(64),
  payloadSha256:hash(payload),state:"accepted",isSynthetic:false,
  observedAt:"2026-11-11T09:00:00Z",recordedAt:"2026-11-12T08:00:00Z",
  payload,...overrides
 };
}
function setup(capability,overrides={}){
 const events=[];
 const input={authority:principal,capability,asOf,clock:()=>now,
  loadRecords:async()=>[row(capability)],
  resolveSourceGrant:async()=>({
   workspaceId,sourceId:"source_001",sourceVersion:"version_001",
   status:"active",revokedAt:null,verifiedByRightsAuthority:true,
   rightsRevision:"rights_rev001",decisionSha256:"c".repeat(64),
   allowedPurposes:["enterprise_internal_research"],
   allowedCapabilities:[capability],validFrom:"2026-11-01T00:00:00Z",
   validUntil:null
  }),
  verifyCurrentAuthority:async()=>{events.push("authority");return true;},
  recordAudit:async e=>{events.push("audit");return {committed:true,eventId:e.eventId};},
  ...overrides};
 return {input,events};
}
test("all four views are derived from the same auditable, denied-by-default gateway",async()=>{
 for(const cap of Object.keys(payloads)){
  const {input,events}=setup(cap);
  const v=await readEnterpriseResearchView(input);
  assert.equal(v.contract,"novapharm.intelligence.enterprise-evidence-view.v1");
  assert.equal(v.capability,cap);
  assert.equal(v.workspaceId,workspaceId);
  assert.equal(v.nativeVendorConnected,false);
  assert.equal(v.productionCertified,false);
  assert.equal(v.customerReleaseApproved,false);
  assert.equal(v.auditEventId.length,36);
  assert.equal(v.recordDigest.length,64);
  assert.equal(events.filter(x=>x==="audit").length,1);
  assert.equal(events.filter(x=>x==="authority").length,3);
  assert.equal(Object.isFrozen(v),true);
  assert.equal(Object.isFrozen(v.view),true);
 }
});

test("Foundry-like ontology preserves distinct identity links and source evidence",async()=>{
 const cap="foundry_ops";
 const {input}=setup(cap,{loadRecords:async()=>[
  row(cap),
  row(cap,{recordId:"record_002",payload:{
   subjectId:"medicine_001",predicate:"related_to",objectId:"study_001"
  },payloadSha256:hash({subjectId:"medicine_001",predicate:"related_to",objectId:"study_001"})})
 ]});
 const v=await readEnterpriseResearchView(input);
 assert.equal(v.view.kind,"governed_ontology_graph");
 assert.equal(v.view.edgeCount,2);
 assert.equal(v.view.nodeCount,3);
 assert.deepEqual(v.view.nodes,["medicine_001","snomed_code_001","study_001"]);
 assert.equal(v.view.edges[0].evidence.sourceId,"source_001");
 assert.equal(v.view.edges[0].evidence.evidenceSha256,"a".repeat(64));
});

test("Prisma-style security findings preserve severity, disposition and source",async()=>{
 const cap="cloud_security";
 const second={findingId:"finding_002",severity:"critical",disposition:"resolved"};
 const {input}=setup(cap,{loadRecords:async()=>[
  row(cap),row(cap,{recordId:"record_002",payload:second,payloadSha256:hash(second)})
 ]});
 const v=await readEnterpriseResearchView(input);
 assert.equal(v.view.kind,"governed_security_findings");
 assert.equal(v.view.findingCount,2);
 assert.equal(v.view.openCount,1);
 assert.equal(v.view.bySeverity.critical,1);
 assert.equal(v.view.bySeverity.high,1);
 assert.equal(v.view.bySeverity.low,0);
 assert.equal(v.view.findings[1].disposition,"resolved");
});

test("Bloomberg-like market observations retain exact as-of dates, units and regions",async()=>{
 const cap="pharma_markets";
 const same={metricId:"prescribing_items",value:52,unit:"items",region:"GB",observationType:"observed"};
 const other={metricId:"prescribing_items",value:7,unit:"items",region:"US",observationType:"observed"};
 const {input}=setup(cap,{loadRecords:async()=>[
  row(cap,{observedAt:"2026-11-09T00:00:00Z"}),
  row(cap,{recordId:"record_002",observedAt:"2026-11-10T00:00:00Z",
   payload:same,payloadSha256:hash(same)}),
  row(cap,{recordId:"record_003",observedAt:"2026-11-10T00:00:00Z",
   payload:other,payloadSha256:hash(other)})
 ]});
 const v=await readEnterpriseResearchView(input);
 assert.equal(v.view.kind,"governed_observed_market_series");
 assert.equal(v.view.seriesCount,2);
 assert.equal(v.view.observationCount,3);
 assert.equal(v.view.noInterpolation,true);
 assert.equal(v.view.noForecast,true);
 const gb=v.view.series.find(x=>x.region==="GB");
 const us=v.view.series.find(x=>x.region==="US");
 assert.equal(gb.points.length,2);
 assert.equal(us.points.length,1);
 assert.deepEqual(gb.points.map(x=>x.value),[43,52]);
 assert.equal(gb.totalOrMarketShareComputed,false);
 assert.equal(us.unit,"items");
 assert.deepEqual(gb.points.map(x=>x.observedAt),
  ["2026-11-09T00:00:00Z","2026-11-10T00:00:00Z"]);
});

test("NOVA view exposes citations without text, inference or medical advice",async()=>{
 const {input}=setup("nova_research");
 const v=await readEnterpriseResearchView(input);
 assert.equal(v.view.referenceCount,1);
 assert.equal(v.view.inferencePerformed,false);
 assert.equal(v.view.modelCalled,false);
 assert.equal(v.view.medicalAdviceProvided,false);
 assert.equal(v.view.references[0].contentSha256,"b".repeat(64));
 assert.equal(JSON.stringify(v).includes("secret"),false);
});

test("empty/unlicensed, out-of-tenant, revoked and untrusted records never become views",async()=>{
 const cases=[
  setup("nova_research",{loadRecords:async()=>[]}).input,
  setup("foundry_ops",{loadRecords:async()=>[row("foundry_ops",{workspaceId:"tenant_beta"})]}).input,
  setup("pharma_markets",{loadRecords:async()=>[row("pharma_markets",{isSynthetic:true})]}).input,
  setup("cloud_security",{verifyCurrentAuthority:async()=>false}).input,
  setup("nova_research",{resolveSourceGrant:async()=>null}).input,
  setup("nova_research",{recordAudit:async()=>({committed:false})}).input
 ];
 for(const input of cases)await assert.rejects(readEnterpriseResearchView(input),{
  code:"enterprise_research_denied",statusCode:403
 });
});
