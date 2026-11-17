import assert from "node:assert/strict";
import {test} from "node:test";
import {assessGlobalSourcePageQuality} from "../src/core/intelligence-global-intake-quality.mjs";
import {createGlobalSourceIntakeEvaluator} from "../src/core/intelligence-global-intake-workflow.mjs";

const NOW=Date.parse("2026-11-17T19:00:00.000Z");
const metadata={
  resourceId:"clinicaltrials-page-20261117",schemaVersion:"clinicaltrials-v2-json",
  observationStart:"2026-11-12",observationEnd:"2026-11-16",publishedOn:"2026-11-17"
};
const trial=(id,title)=>({protocolSection:{identificationModule:{nctId:id,briefTitle:title}}});
const reader=createGlobalSourceIntakeEvaluator({
  now:()=>NOW,
  authorize:async context=>({
    ...context,decision:"approved",rightsStatus:"approved",
    allowedUses:["internal-evaluation"],receiptId:"review-20261117-001",
    rightsVersion:"rights-v1",licenseId:"licensed-review-only",
    issuedAt:"2026-11-17T18:00:00.000Z",
    validUntil:"2026-11-17T20:00:00.000Z",revokedAt:null
  })
});
const query=(studies,limit=5)=>({
  tenantId:"tenant-01",sourceId:"global-clinicaltrials",
  term:"Apixaban",limit,metadata,rawBytes:Buffer.from(JSON.stringify({studies}))
});
test("single source record remains non-admitted, even without quality warnings",async()=>{
  const r=await reader.evaluate(query([trial("NCT12345678","Investigational example")]));
  assert.deepEqual(r.pageQuality.reviewReasons,[]);
  assert.equal(r.pageQuality.pageRowsReturned,1);
  assert.equal(r.pageQuality.selectedRows,1);
  assert.equal(r.pageQuality.sourcePopulationCompleteness,"NOT_DEMONSTRATED");
  assert.equal(r.pageQuality.qualityDecision,"INDEPENDENT_REVIEW_REQUIRED");
  assert.equal(r.pageQuality.downstreamCustomerPublicationAllowed,false);
  assert.equal(r.evidence.canPublish,false);
});
test("a short preview page cannot claim comprehensive national coverage",async()=>{
  const rows=Array.from({length:7},(_,i)=>trial("NCT"+String(i).padStart(8,"0"),"Research "+i));
  const r=await reader.evaluate(query(rows,5));
  assert.equal(r.pageQuality.pageRowsReturned,7);
  assert.equal(r.pageQuality.selectedRows,5);
  assert.ok(r.pageQuality.reviewReasons.includes("PAGE_TRUNCATED_BY_EVALUATION_LIMIT"));
  assert.equal(r.pageQuality.sourcePopulationCompleteness,"NOT_DEMONSTRATED");
});
test("duplicate national identifiers are counted, retained as ambiguity and denied",async()=>{
  const r=await reader.evaluate(query([trial("NCT00000001","One"),trial("NCT00000001","Two")]));
  assert.equal(r.pageQuality.uniqueSourceIds,1);
  assert.ok(r.pageQuality.reviewReasons.includes("DUPLICATE_SOURCE_LOCAL_IDENTIFIERS"));
  assert.equal(r.pageQuality.canonicalMedicineMappings,"UNRESOLVED");
  assert.equal(r.canPublish,false);
});
test("incomplete local identifiers and labels must not silently disappear",async()=>{
  const r=await reader.evaluate(query([trial("NCT00000002","Valid"),trial("NCT00000003",null)]));
  assert.equal(r.pageQuality.pageRowsReturned,2);
  assert.equal(r.pageQuality.selectedRows,1);
  assert.ok(r.pageQuality.reviewReasons.includes("UNMAPPED_OR_INCOMPLETE_SOURCE_ROW"));
});
test("empty source pages cannot be fabricated as confirmed medicine absence",async()=>{
  const r=await reader.evaluate(query([]));
  assert.ok(r.pageQuality.reviewReasons.includes("NO_RECORDS_IN_RETURNED_PAGE"));
  assert.equal(r.pageQuality.pageRowsReturned,0);
  assert.equal(r.pageQuality.sourcePopulationCompleteness,"NOT_DEMONSTRATED");
});
test("forged publishable preview or unmatched source identity fails closed",async()=>{
  const r=await reader.evaluate(query([trial("NCT00000001","Sample")]));
  const args={
    sourceId:r.sourceId,raw:{studies:[trial("NCT00000001","Sample")]},
    normalized:r.evidence,manifest:r.manifest,limit:5
  };
  assert.throws(()=>assessGlobalSourcePageQuality({...args,normalized:{...r.evidence,canPublish:true}}),/rejected/);
  assert.throws(()=>assessGlobalSourcePageQuality({...args,manifest:{...r.manifest,sourceKey:"us-fda-drugsfda"}}),/rejected/);
});
