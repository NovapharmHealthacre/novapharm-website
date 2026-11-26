import { createHash } from "node:crypto";
import { assertInternalEvaluationPermit } from "./intelligence-global-evidence-contract.mjs";
const origin="https://api.nfz.gov.pl";
const paths=Object.freeze({"pl-nfz-active-substances":"/app-stat-api-pl/active-substances","pl-nfz-programs":"/app-stat-api-pl/drug-programs"});
const MAX=262144;
export function buildNfzDictionaryPlan({sourceId,page=1,limit=10}={}) {
 if(!Object.hasOwn(paths,sourceId)||!Number.isSafeInteger(page)||page<1||page>1000||!Number.isSafeInteger(limit)||limit<1||limit>10) throw Error("Invalid NFZ dictionary request");
 const url=new URL(paths[sourceId],origin);
 for(const [k,v] of Object.entries({page,limit,format:"json"}))url.searchParams.set(k,String(v));
 return Object.freeze({sourceId,country:"PL",domain:"drug-program-dictionary",page,limit,url:url.href});
}
export function validateNfzDictionary(plan,payload){
 if(!payload||payload.errors||!Array.isArray(payload.data)||payload.data.length>plan.limit)throw Error("Unexpected NFZ dictionary schema");
 for(const s of payload.data) if(typeof s!=="string"||s.length<1||s.length>512||/[\p{Cc}\p{Cf}\p{Cs}]/u.test(s))throw Error("Invalid NFZ dictionary label");
 return Object.freeze([...payload.data]);
}
export function createNfzDictionaryReader({authorize,transport=globalThis.fetch,now=Date.now}={}){
 if(typeof authorize!=="function"||typeof transport!=="function"||typeof now!=="function")throw Error("Trusted backend required");
 let lastRequest=-Infinity;
 let running=false;
 return Object.freeze({async read({sourceId,tenantId,page=1,limit=10}={}){
 const plan=buildNfzDictionaryPlan({sourceId,page,limit});
 if(typeof tenantId!=="string"||!/^[A-Za-z0-9_-]{2,64}$/.test(tenantId))throw Error("Invalid tenant");
 const context={sourceId,tenantId,country:plan.country,domain:plan.domain,purpose:"internal-evaluation"};
 const first=await authorize(context); const start=now();
 const grant=assertInternalEvaluationPermit({permit:first,...context,now:start});
 if(running||start-lastRequest<1000)throw Error("NFZ reader throttled");
 lastRequest=start;running=true;
 try{
 const response=await transport(plan.url,{method:"GET",redirect:"error",credentials:"omit",cache:"no-store",headers:{accept:"application/json"},signal:AbortSignal.timeout(6000)});
 if(!response?.ok||response.redirected||(response.url&&response.url!==plan.url)||!response.headers?.get("content-type")?.toLowerCase().includes("json")||!response.body?.getReader)throw Error("Invalid upstream response");
 const length=response.headers.get("content-length");
 if(length!==null&&(!/^\d+$/.test(length)||Number(length)>MAX))throw Error("Invalid upstream length");
 const stream=response.body.getReader();const chunks=[];let size=0;
 try{while(true){const {done,value}=await stream.read();if(done)break;size+=value.byteLength;if(size>MAX)throw Error("NFZ response too large");chunks.push(Buffer.from(value));}}finally{await stream.cancel().catch(()=>{});stream.releaseLock();}
 const bytes=Buffer.concat(chunks);
 const values=validateNfzDictionary(plan,JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes)));
 const second=await authorize(context);const end=now();
 const verified=assertInternalEvaluationPermit({permit:second,...context,now:end});
 if(end<start||end-start>11000||["receiptId","licenseId","rightsVersion","validUntil"].some(k=>verified[k]!==grant[k]))throw Error("NFZ rights changed");
 // Dictionary strings are not canonical medicine identifiers. Preserve exact values only.
 return Object.freeze({contract:"novapharm.intelligence.nfz-dictionary-evaluation.v1",sourceId,country:"PL",page,labels:values,sourceAttribution:"https://api.nfz.gov.pl/",sourceResponseSha256:createHash("sha256").update(bytes).digest("hex"),rightsReceiptId:verified.receiptId,identityResolved:false,canPublish:false,customerLive:false});
 }finally{running=false;}
 }});
}
