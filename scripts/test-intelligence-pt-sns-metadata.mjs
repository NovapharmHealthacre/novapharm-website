import test from "node:test";
import assert from "node:assert/strict";
import {buildSnsMetadataPlan,validateSnsMetadata,createSnsMetadataReader,SOURCE_ID} from "../src/core/intelligence-pt-sns-metadata.mjs";
const datasetId="despesa-com-medicamentos-no-ambulatorio-sns",body={dataset_id:datasetId,fields:[{name:"test_field",type:"text"}]};
test("SNS metadata binds an exact allowed dataset and never returns medicine facts",()=>{
 const plan=buildSnsMetadataPlan(datasetId);
 assert.equal(new URL(plan.url).origin,"https://transparencia.sns.gov.pt");
 assert.throws(()=>buildSnsMetadataPlan("../evil"));
 assert.throws(()=>validateSnsMetadata(plan,{...body,dataset_id:"wrong"}));
 assert.throws(()=>validateSnsMetadata(plan,{...body,fields:[...body.fields,...body.fields]}));
 const result=validateSnsMetadata(plan,body);assert.equal(result.canPublish,false);assert.equal(result.monetaryFactsIncluded,false);
});
test("SNS reader requires rights and shared quota, and rejects revocation",async()=>{
 const now=()=>Date.parse("2026-11-26T12:00:00.000Z"),grant={decision:"approved",rightsStatus:"approved",sourceId:SOURCE_ID,tenantId:"tenant1",country:"PT",domain:"dataset-catalogue",purpose:"internal-evaluation",allowedUses:["internal-evaluation"],receiptId:"receipt1",licenseId:"license1",rightsVersion:"v1",issuedAt:"2026-11-26T11:00:00.000Z",validUntil:"2026-11-26T13:00:00.000Z",revokedAt:null};
 let calls=0;const transport=async()=>{calls++;return new Response(JSON.stringify(body),{headers:{"content-type":"application/json"}})};
 const reader=options=>createSnsMetadataReader({authorize:async()=>grant,acquireSharedQuota:async()=>({allowed:true}),transport,now,...options});
 const request={datasetId,tenantId:"tenant1"};
 await assert.rejects(reader({authorize:async()=>null}).read(request));
 await assert.rejects(reader({acquireSharedQuota:async()=>({allowed:false})}).read(request));assert.equal(calls,0);
 assert.equal((await reader({}).read(request)).customerLive,false);
 let checks=0;await assert.rejects(reader({authorize:async()=>++checks===1?grant:{...grant,revokedAt:"revoked"}}).read(request));
});
