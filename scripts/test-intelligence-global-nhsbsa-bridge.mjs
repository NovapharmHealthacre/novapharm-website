import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {createNhsbsaGlobalSampleBridge} from "../src/core/intelligence-global-nhsbsa-bridge.mjs";

const registry=JSON.parse(readFileSync(new URL("../docs/intelligence/global-pharma-sources-20261117.json",import.meta.url),"utf8")).sources;
const key="europe-united-kingdom-nhsbsa-english-prescribing-dataset";
const uuid="12345678-1234-1234-1234-123456789abc";
const metadata={
  resourceId:uuid,
  resourceUrl:"https://opendata.nhsbsa.net/dataset/english-prescribing-dataset-epd-with-snomed-code/resource/"+uuid,
  reportingPeriod:"2026-08",publishedOn:"2026-09-20",
  schemaVersion:"epd-snomed-string-v1"
};
const args={
  registry,candidateKey:key,tenantId:"tenant-01",metadata,
  rawBytes:Buffer.from("YEAR_MONTH,BNF_CODE,SNOMED_CODE,ITEMS\n2026-08,EXAMPLE,0001234,1\n")
};
function permit(ctx,extra={}){
 return {...ctx,decision:"approved",rightsStatus:"approved",allowedUses:["internal-evaluation"],
   receiptId:"receipt-epd-001",licenseId:"evaluation-license-001",rightsVersion:"v1",
   issuedAt:"2026-11-17T18:00:00.000Z",validUntil:"2026-11-17T20:00:00.000Z",
   revokedAt:null,...extra};
}
const make=(authorize=async ctx=>permit(ctx))=>createNhsbsaGlobalSampleBridge({
  authorize,now:()=>Date.parse("2026-11-17T19:00:00.000Z")
});
test("reuse private England-only NHSBSA alias and string SNOMED without publishing",async()=>{
  const r=await make().evaluate(args);
  assert.equal(r.sourceId,"nhsbsa.epd");
  assert.equal(r.jurisdiction,"GB-ENG");
  assert.equal(r.manifest.observationEnd,"2026-08-31");
  assert.equal(r.originalSNOMEDCodeType,"string");
  assert.equal(r.manifest.canPublish,false);
  assert.equal(r.manifest.datasetKey,"english-prescribing-dataset-epd-with-snomed-code");
  assert.equal(r.privateProbeEnabled,false);
  assert.equal(r.bulkImportEnabled,false);
  assert.equal(r.customerVisible,false);
  assert.equal(r.rowParsing,"REQUIRES_EXISTING_GOVERNED_EPD_PARSER");
  assert.ok(!JSON.stringify(r).includes("0001234"));
});
test("deny retired dataset, unpinned host, query token and numeric-code claim",async()=>{
  for(const overrides of [
    {metadata:{...metadata,resourceUrl:"https://opendata.nhsbsa.net/dataset/english-prescribing-data-epd/resource/"+uuid}},
    {metadata:{...metadata,resourceUrl:"https://evil.example/data/"+uuid}},
    {metadata:{...metadata,resourceUrl:metadata.resourceUrl+"?token=unsafe"}},
    {metadata:{...metadata,schemaVersion:"numeric-snomed"}},
    {metadata:{...metadata,reportingPeriod:"2026-13"}},
    {metadata:{...metadata,publishedOn:"2026-08-10"}},
    {rawBytes:Buffer.alloc(262145,1)},
    {candidateKey:"unknown"}
  ]) await assert.rejects(make().evaluate({...args,...overrides}));
});
test("deny cross-tenant rights, revoked rights and a prematurely activated candidate",async()=>{
  await assert.rejects(make(async c=>permit(c,{tenantId:"another-tenant"})).evaluate(args),/not approved/);
  await assert.rejects(make(async c=>permit(c,{revokedAt:"2026-11-17T18:30:00.000Z"})).evaluate(args),/not approved/);
  const changed=registry.map(x=>x.candidateKey===key?{...x,rightsStatus:"approved",activeAdapterId:"nhsbsa.epd"}:x);
  await assert.rejects(make().evaluate({...args,registry:changed}),/may not be activated/);
});
