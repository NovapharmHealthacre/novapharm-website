import { createHash } from "node:crypto";
import { assertInternalEvaluationPermit } from "./intelligence-global-evidence-contract.mjs";
export const SOURCE_ID="pt-sns-dataset-metadata";
const ids=Object.freeze(["despesa-com-medicamentos-no-ambulatorio-sns","evolucao-da-dispensa-de-medicamentos"]);
const MAX=262144;
const base=Object.freeze({sourceId:SOURCE_ID,country:"PT",domain:"dataset-catalogue",purpose:"internal-evaluation"});
export function buildSnsMetadataPlan(datasetId){
 if(!ids.includes(datasetId))throw Error("Unknown SNS dataset");
 return Object.freeze({datasetId,url:"https://transparencia.sns.gov.pt/api/explore/v2.1/catalog/datasets/"+datasetId});
}
const safe=(v,n)=>typeof v==="string"&&v.length>0&&v.length<=n&&!/[\p{Cc}\p{Cf}\p{Cs}]/u.test(v);
export function validateSnsMetadata(plan,body){
 if(body?.dataset_id!==plan.datasetId||!Array.isArray(body.fields)||body.fields.length<1||body.fields.length>128)throw Error("SNS dataset/schema mismatch");
 const fields=body.fields.map(f=>{if(!safe(f?.name,128)||!safe(f?.type,64))throw Error("Invalid SNS field");return Object.freeze({name:f.name,type:f.type});});
 if(new Set(fields.map(f=>f.name)).size!==fields.length)throw Error("Duplicate SNS field");
 return Object.freeze({datasetId:plan.datasetId,fields:Object.freeze(fields),medicineRecordsIncluded:false,monetaryFactsIncluded:false,canPublish:false});
}
export function createSnsMetadataReader({authorize,acquireSharedQuota,transport=globalThis.fetch,now=Date.now}={}){
 if([authorize,acquireSharedQuota,transport,now].some(f=>typeof f!=="function"))throw Error("Trusted backend dependencies required");
 return Object.freeze({async read({tenantId,datasetId}={}){
 if(typeof tenantId!=="string"||!/^[A-Za-z0-9_-]{2,64}$/.test(tenantId))throw Error("Invalid tenant");
 const plan=buildSnsMetadataPlan(datasetId),context={...base,tenantId};
 const permit=await authorize(context),start=now(),grant=assertInternalEvaluationPermit({permit,...context,now:start});
 const quota=await acquireSharedQuota(Object.freeze({sourceId:SOURCE_ID,tenantId}));if(quota?.allowed!==true)throw Error("SNS quota unavailable");
 const send=now();if(!Number.isSafeInteger(send)||send<start||send>=Date.parse(grant.validUntil))throw Error("SNS approval expired");
 const response=await transport(plan.url,{method:"GET",redirect:"error",credentials:"omit",cache:"no-store",headers:{accept:"application/json"},signal:AbortSignal.timeout(6000)});
 if(!response?.ok||response.redirected||(response.url&&response.url!==plan.url)||!response.headers?.get("content-type")?.toLowerCase().includes("json")||!response.body?.getReader)throw Error("Invalid SNS response");
 const sizeHeader=response.headers.get("content-length");if(sizeHeader!==null&&(!/^\d+$/.test(sizeHeader)||Number(sizeHeader)>MAX))throw Error("SNS response too large");
 const stream=response.body.getReader(),chunks=[];let size=0;
 try{while(true){const {done,value}=await stream.read();if(done)break;size+=value.byteLength;if(size>MAX)throw Error("SNS response too large");chunks.push(Buffer.from(value));}}finally{await stream.cancel().catch(()=>{});stream.releaseLock();}
 const bytes=Buffer.concat(chunks),metadata=validateSnsMetadata(plan,JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes)));
 const permit2=await authorize(context),end=now(),checked=assertInternalEvaluationPermit({permit:permit2,...context,now:end});
 if(end<send||end-send>11000||["receiptId","licenseId","rightsVersion","validUntil"].some(k=>checked[k]!==grant[k]))throw Error("SNS rights changed");
 return Object.freeze({...metadata,contract:"novapharm.intelligence.sns-metadata-evaluation.v1",sourceId:SOURCE_ID,jurisdiction:"PT",observedAt:new Date(end).toISOString(),sourceResponseSha256:createHash("sha256").update(bytes).digest("hex"),rightsReceiptId:checked.receiptId,productionAccepted:false,customerLive:false});
 }});
}
