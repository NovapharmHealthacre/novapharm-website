/**
 * Four vendor-neutral enterprise read models built on the same rights-aware
 * server gateway. No side effects, provider data fetching, medical advice,
 * forecast inference or customer publication.
 *
 * Every record has already passed authoritative tenant/source-rights checks,
 * immutable payload checks, late revocation rechecks and a durable read audit
 * within readGovernedEnterpriseRecords. No public route may inject callbacks
 * or runtime authority from a client.
 */
import { readGovernedEnterpriseRecords } from "./intelligence-enterprise-governed-read.mjs";

const criticality = Object.freeze(["critical","high","medium","low","informational"]);

function evidenceReference(row) {
 return Object.freeze({
  sourceId:row.sourceId,sourceVersion:row.sourceVersion,
  evidenceSha256:row.evidenceSha256,recordId:row.recordId,
  observedAt:row.observedAt
 });
}

function ontologyView(records) {
 const nodes=new Set();
 const edges=records.map(row=>{
  nodes.add(row.payload.subjectId);
  nodes.add(row.payload.objectId);
  return Object.freeze({
   subjectId:row.payload.subjectId,predicate:row.payload.predicate,
   objectId:row.payload.objectId,evidence:evidenceReference(row)
  });
 });
 return Object.freeze({
  kind:"governed_ontology_graph",
  nodeCount:nodes.size,edgeCount:edges.length,
  nodes:Object.freeze([...nodes].sort()),edges:Object.freeze(edges)
 });
}

function securityView(records) {
 const bySeverity=Object.fromEntries(criticality.map(level=>[level,0]));
 let unresolved=0;
 const findings=records.map(row=>{
  const {findingId,severity,disposition}=row.payload;
  bySeverity[severity]++;
  if(disposition==="open")unresolved++;
  return Object.freeze({
   findingId,severity,disposition,
   evidence:evidenceReference(row)
  });
 });
 return Object.freeze({
  kind:"governed_security_findings",
  findingCount:findings.length,openCount:unresolved,
  bySeverity:Object.freeze(bySeverity),
  findings:Object.freeze(findings)
 });
}

function marketsView(records) {
 // Preserve exact original observations. Different sources, regions, units,
 // dates and source versions are NEVER collapsed into invented market totals.
 const groups=new Map();
 for(const row of records){
  const {metricId,value,unit,region,observationType}=row.payload;
  const key=JSON.stringify([metricId,unit,region]);
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(Object.freeze({
   observedAt:row.observedAt,value,observationType,
   evidence:evidenceReference(row)
  }));
 }
 const series=[...groups.entries()].sort(([a],[b])=>a.localeCompare(b))
 .map(([key,items])=>{
  const [metricId,unit,region]=JSON.parse(key);
  return Object.freeze({
   metricId,unit,region,seriesType:"actual_observations_only",
   totalOrMarketShareComputed:false,
   points:Object.freeze(items.sort((a,b)=>
    a.observedAt.localeCompare(b.observedAt)||
    a.evidence.recordId.localeCompare(b.evidence.recordId)))
  });
 });
 return Object.freeze({
  kind:"governed_observed_market_series",
  seriesCount:series.length,observationCount:records.length,
  noInterpolation:true,noForecast:true,
  notEvidenceOfDispensingSalesOrStock:true,
  series:Object.freeze(series)
 });
}

function novaView(records) {
 const references=records.map(row=>Object.freeze({
  evidenceId:row.payload.evidenceId,
  contentSha256:row.payload.contentSha256,
  evidence:evidenceReference(row)
 }));
 return Object.freeze({
  kind:"governed_nova_reference_inventory",
  referenceCount:references.length,
  inferencePerformed:false,modelCalled:false,medicalAdviceProvided:false,
  references:Object.freeze(references)
 });
}

const transforms=Object.freeze({
 foundry_ops:ontologyView,
 cloud_security:securityView,
 pharma_markets:marketsView,
 nova_research:novaView
});

/**
 * Use an independently authenticated private server session and only trusted
 * adapters. A denied/empty source, stale rights, missing audit or wrong tenant
 * always propagates as a denial; never substitute a fictional "zero" result.
 */
export async function readEnterpriseResearchView(options={}){
 const snapshot=await readGovernedEnterpriseRecords(options);
 const transform=transforms[snapshot.capability];
 if(!transform)throw Object.assign(new Error("Enterprise read model unavailable."),{
  code:"enterprise_research_view_denied",statusCode:403
 });
 const view=transform(snapshot.records);
 return Object.freeze({
  contract:"novapharm.intelligence.enterprise-evidence-view.v1",
  workspaceId:snapshot.workspaceId,capability:snapshot.capability,
  asOf:snapshot.asOf,purpose:snapshot.purpose,
  auditEventId:snapshot.auditEventId,recordDigest:snapshot.recordDigest,
  vendorMode:snapshot.vendorMode,
  nativeVendorConnected:false,productionCertified:false,
  customerReleaseApproved:false,
  view
 });
}
