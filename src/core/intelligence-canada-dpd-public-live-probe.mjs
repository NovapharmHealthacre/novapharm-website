/**
 * Health Canada official Drug Product Database (DPD) source-live check.
 * One fixed native DIN, a bounded network sample, receipt only.
 * No clinical use, tenant data admission, production or customer publication.
 */
import { createHash } from "node:crypto";

const DIN = "00326925";
const MAX_BYTES = 65536;
const DEADLINE_MS = 20000;
const fail = reason => {throw new Error("Canadian DPD source probe denied: " + reason)};
export const CA_DPD_SOURCE = Object.freeze({
  sourceId: "ca-health-canada-dpd",
  jurisdiction: "CA",
  country: "Canada",
  registryCandidateKey: "north-america-canada-health-canada-drug-product-database",
  publisher: "Health Canada — Drug Product Database",
  officialDocumentation: "https://health-products.canada.ca/api/documentation/dpd-documentation-en.html",
  url: "https://health-products.canada.ca/api/drug/drugproduct/?din="+DIN+"&lang=en&type=json",
  din: DIN,
  dataClass: "regulatory-product-record-not-stock"
});

function noControl(value,max=240) {
  return typeof value==="string" && value.trim().length>0 &&
    value.length<=max && !/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u.test(value);
}
function exactDate(value) {
  return typeof value==="string" &&
    /^\d{4}-\d{2}-\d{2}$/u.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0,10)===value;
}
function classifyNetwork(error) {
  const code=typeof error?.cause?.code==="string" ? error.cause.code :
    typeof error?.code==="string" ? error.code : "";
  if(["UND_ERR_CONNECT_TIMEOUT","UND_ERR_HEADERS_TIMEOUT","ETIMEDOUT"].includes(code) ||
     error?.name==="AbortError"||error?.name==="TimeoutError")return "timeout";
  if(["ENOTFOUND","EAI_AGAIN"].includes(code))return "dns";
  if(["UNABLE_TO_VERIFY_LEAF_SIGNATURE","CERT_HAS_EXPIRED","DEPTH_ZERO_SELF_SIGNED_CERT",
    "ERR_TLS_CERT_ALTNAME_INVALID"].includes(code))return "tls";
  if(["ECONNREFUSED","ECONNRESET","ENETUNREACH","EHOSTUNREACH"].includes(code))return "network";
  return "network-or-policy";
}

/** Return a bounded, native-identity-only count; do not return drug rows. */
export function validateCanadianDpdSample(payload) {
  // The official interface may return an individual object or a one-element
  // array for a filtered DIN. No unbounded collection is accepted.
  const rows=Array.isArray(payload) ? payload : [payload];
  if(rows.length!==1)fail("unverified one-record source schema");
  const x=rows[0];
  if(!x || typeof x!=="object" || Array.isArray(x) ||
     x.drug_identification_number!==DIN ||
     !Number.isSafeInteger(x.drug_code) || x.drug_code<1 ||
     !noControl(x.brand_name,300) ||
     !noControl(x.company_name,300) ||
     !noControl(x.class_name,80) ||
     !exactDate(x.last_update_date)) {
    fail("unverified Canadian DIN and regulatory fields");
  }
  return Object.freeze({
    schemaBoundRecordCount:1,
    sourceNativeDinPreserved:true,
    publisherRecordLastChanged:x.last_update_date,
    currentStockOrRetailPriceVerified:false
  });
}
async function fetchBounded(response) {
  if(!response || response.ok!==true || response.redirected===true){
    fail("publisher response rejected or redirected");
  }
  if(typeof response.url==="string" && response.url!=="" &&
     response.url!==CA_DPD_SOURCE.url)fail("unexpected official source URL");
  const type=response.headers?.get?.("content-type") || "";
  if(!/\bapplication\/(?:json|[a-z0-9.+-]+\+json)\b/iu.test(type)){
    fail("official source content type");
  }
  const declared=response.headers?.get?.("content-length");
  if(declared!=null && declared!==""){
    const n=Number(declared);
    if(!Number.isSafeInteger(n)||n<0||n>MAX_BYTES)fail("oversized upstream reply");
  }
  if(!response.body || typeof response.body.getReader!=="function"){
    fail("missing bounded upstream stream");
  }
  const reader=response.body.getReader();
  let length=0;const fragments=[];
  try {
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      if(!(value instanceof Uint8Array))fail("invalid upstream chunk");
      length+=value.byteLength;
      if(length>MAX_BYTES)fail("oversized upstream reply");
      fragments.push(value);
    }
  }catch(e){
    if(e?.message?.startsWith("Canadian DPD source probe denied:"))throw e;
    fail("upstream stream unavailable");
  }finally{
    try{await reader.cancel()}catch{}
    try{reader.releaseLock()}catch{}
  }
  if(length<1)fail("empty upstream response");
  const bytes=new Uint8Array(length);
  let i=0;
  for(const fragment of fragments){bytes.set(fragment,i);i+=fragment.length}
  let payload;
  try{payload=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes))}
  catch{fail("invalid UTF-8 JSON from publisher")}
  return Object.freeze({payload,bytes:length,
    hash:createHash("sha256").update(bytes).digest("hex")});
}
export async function probeCanadianDpdPublicSource({
  transport=globalThis.fetch,now=()=>Date.now()
}={}){
  if(typeof transport!=="function"||typeof now!=="function"){
    fail("trusted transport or observation clock missing");
  }
  let start;
  try{start=now()}catch{fail("invalid trusted observation clock")}
  if(!Number.isSafeInteger(start)||start<0)fail("invalid trusted observation clock");
  let response;
  try{
    response=await transport(CA_DPD_SOURCE.url,{
      method:"GET",redirect:"error",credentials:"omit",cache:"no-store",
      headers:{accept:"application/json"},
      signal:AbortSignal.timeout(DEADLINE_MS)
    });
  }catch(e){fail("official source network unavailable ("+classifyNetwork(e)+")")}
  const source=await fetchBounded(response);
  const checked=validateCanadianDpdSample(source.payload);
  let end;
  try{end=now()}catch{fail("invalid trusted observation clock")}
  if(!Number.isSafeInteger(end)||end<start||end-start>DEADLINE_MS+5000){
    fail("stale or rolled-back observation");
  }
  return Object.freeze({
    contract:"novapharm.intelligence.ca-dpd-public-source-probe.v1",
    sourceId:CA_DPD_SOURCE.sourceId,
    registryCandidateKey:CA_DPD_SOURCE.registryCandidateKey,
    country:"CA",publisher:CA_DPD_SOURCE.publisher,
    officialSourceUrl:CA_DPD_SOURCE.url,
    sourceObservedAt:new Date(end).toISOString(),
    payloadSha256:source.hash,
    payloadBytes:source.bytes,
    sourceRecordLastUpdated:checked.publisherRecordLastChanged,
    schemaBoundRecords:checked.schemaBoundRecordCount,
    sourceNativeDinPreserved:true,
    officialSourceHttpResponseVerified:true,
    licensedCommercialAiReuseIndependentlyApproved:false,
    publisherDatasetSnapshotAdmitted:false,
    nationalDrugIdentifiersReconciled:false,
    customerProductionDeploymentVerified:false,
    clinicalDecisionReady:false,
    commercialDecisionReady:false,
    customerCountryLive:false,
    canPublish:false,
    rawDrugRecordsRetained:false
  });
}
