import { createHash } from "node:crypto";
import { assertInternalEvaluationPermit } from "./intelligence-global-evidence-contract.mjs";
export const SOURCE_ID="sg-hsa-company-licences";
export const DATASET_ID="d_bf50ce0f3f42f69d7acd50635afa62da";
const MAX_BYTES=262144;
const columns=["Companyname","Licensetype","Activitytype","DosageForm","Expirydate"];
const contextBase=Object.freeze({sourceId:SOURCE_ID,country:"SG",domain:"establishment-licensing",purpose:"internal-evaluation"});
export function buildHsaCompanyLicencePlan({limit=5,offset=0}={}){
 if(!Number.isSafeInteger(limit)||limit<1||limit>10||!Number.isSafeInteger(offset)||offset<0||offset>10000)throw Error("Invalid HSA page");
 const u=new URL("https://data.gov.sg/api/action/datastore_search");
 u.searchParams.set("resource_id",DATASET_ID);u.searchParams.set("limit",String(limit));u.searchParams.set("offset",String(offset));
 return Object.freeze({url:u.href,limit,offset});
}
const safe=(v,optional=false)=>typeof v==="string"&&v.length<=512&&(optional||v.trim().length>0)&&!/[\p{Cc}\p{Cf}\p{Cs}]/u.test(v);
function date(v){
 if(!safe(v)||!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v))throw Error("Invalid HSA expiry");
 const [d,m,y]=v.split("/").map(Number); const dt=new Date(Date.UTC(y,m-1,d));
 if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d)throw Error("Invalid HSA expiry");
 return dt.toISOString().slice(0,10);
}
export function validateHsaCompanyLicences(plan,body){
 const r=body?.result;
 if(body?.success!==true||r?.resource_id!==DATASET_ID||!Array.isArray(r.fields)||columns.some(c=>r.fields.filter(f=>f?.id===c).length!==1)||!Array.isArray(r.records)||r.records.length>plan.limit)throw Error("HSA resource/schema mismatch");
 return Object.freeze(r.records.map(row=>{
 if(!safe(row?.Companyname)||!safe(row?.Licensetype)||!safe(row?.Activitytype??"",true)||!safe(row?.DosageForm??"",true))throw Error("Invalid HSA licence fields");
 return Object.freeze({companyName:row.Companyname,licenceType:row.Licensetype,activityType:row.Activitytype??"",dosageForm:row.DosageForm??"",sourceExpiry:row.Expirydate,expiryDate:date(row.Expirydate),canonicalCompanyId:null,licenceCurrentlyValid:null});
 }));
}
export function createHsaCompanyLicenceReader({authorize,acquireSharedQuota,transport=globalThis.fetch,now=Date.now}={}){
 if([authorize,acquireSharedQuota,transport,now].some(f=>typeof f!=="function"))throw Error("Trusted rights service and shared quota required");
 return Object.freeze({async read({tenantId,limit=5,offset=0}={}){
 if(typeof tenantId!=="string"||!/^[A-Za-z0-9_-]{2,64}$/.test(tenantId))throw Error("Invalid tenant");
 const plan=buildHsaCompanyLicencePlan({limit,offset});const context={...contextBase,tenantId};
 const permit=await authorize(context);const start=now();const grant=assertInternalEvaluationPermit({permit,...context,now:start});
 const quota=await acquireSharedQuota(Object.freeze({sourceId:SOURCE_ID,tenantId}));
 if(quota?.allowed!==true)throw Error("Shared HSA quota unavailable");
 const sendAt=now();if(!Number.isSafeInteger(sendAt)||sendAt<start||sendAt>=Date.parse(grant.validUntil))throw Error("HSA approval expired");
 const res=await transport(plan.url,{method:"GET",redirect:"error",credentials:"omit",cache:"no-store",headers:{accept:"application/json"},signal:AbortSignal.timeout(6000)});
 if(!res?.ok||res.redirected||(res.url&&res.url!==plan.url)||!res.headers?.get("content-type")?.toLowerCase().includes("json")||!res.body?.getReader)throw Error("Invalid HSA response");
 const len=res.headers.get("content-length");if(len!==null&&(!/^\d+$/.test(len)||Number(len)>MAX_BYTES))throw Error("Invalid HSA length");
 const reader=res.body.getReader(),parts=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BYTES)throw Error("HSA response too large");parts.push(Buffer.from(value));}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 const bytes=Buffer.concat(parts);const rows=validateHsaCompanyLicences(plan,JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes)));
 const permit2=await authorize(context);const end=now();const finalGrant=assertInternalEvaluationPermit({permit:permit2,...context,now:end});
 if(end<sendAt||end-sendAt>11000||["receiptId","licenseId","rightsVersion","validUntil"].some(k=>finalGrant[k]!==grant[k]))throw Error("HSA rights changed");
 return Object.freeze({contract:"novapharm.intelligence.hsa-establishment-licensing-evaluation.v1",sourceId:SOURCE_ID,jurisdiction:"SG",datasetId:DATASET_ID,observedAt:new Date(end).toISOString(),responseSha256:createHash("sha256").update(bytes).digest("hex"),rightsReceiptId:finalGrant.receiptId,records:rows,stockAvailabilityVerified:false,companyIdentityResolved:false,canPublish:false,productionAccepted:false,customerLive:false});
 }});
}
