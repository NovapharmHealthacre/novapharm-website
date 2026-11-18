/**
 * Spanish AEMPS CIMA: fixed official public medicine detail, one-record
 * connectivity proof. No tenancy, persistence, publication or clinical use.
 * Protected customer data-admission and terms checks are separate controls.
 */
import { createHash } from "node:crypto";
import { assertInternalEvaluationPermit } from "./intelligence-global-evidence-contract.mjs";
import { buildSourceSnapshotQuarantine, classifySourceSnapshotReplay } from "./intelligence-source-snapshot-quarantine.mjs";

export const ES_CIMA_PROBE = Object.freeze({
  sourceId:"es-aemps-cima",
  country:"ES",
  registryCandidateKey:"europe-spain-aemps-cima",
  publisher:"Agencia Española de Medicamentos y Productos Sanitarios",
  url:"https://cima.aemps.es/cima/rest/medicamento?nregistro=51347",
  documentation:"https://sede.aemps.gob.es/datos-abiertos/",
  officialRegistrationNumber:"51347",
  recordsRequested:1
});
const MAX_BYTES=65536;
const DEADLINE_MS=20000;
const fail=reason=>{throw new Error("CIMA public source observation denied: "+reason);};
const text=(x,max=300)=>typeof x==="string" && x.length>0 &&
  x.length<=max && !/[\p{Cc}\p{Cf}\p{Cs}]/u.test(x);
const nativeId=x=>typeof x==="string" && /^[0-9]{1,16}$/u.test(x);

export function validateCimaMedicineSample(value){
  if(!value||typeof value!=="object"||Array.isArray(value) ||
     value.nregistro!==ES_CIMA_PROBE.officialRegistrationNumber ||
     !text(value.nombre,300) ||
     !Array.isArray(value.principiosActivos) ||
     value.principiosActivos.length<1 || value.principiosActivos.length>30 ||
     !Array.isArray(value.presentaciones) ||
     value.presentaciones.length<1 || value.presentaciones.length>80 ||
     typeof value.comerc!=="boolean" ||
     typeof value.receta!=="boolean" ||
     !value.principiosActivos.every(x=>x && text(x.nombre,240)) ||
     !value.presentaciones.every(x=>x && nativeId(x.cn) && text(x.nombre,300))){
    fail("publisher schema or Spanish native medicine identifiers");
  }
  return Object.freeze({
    recordCount:1,
    registrationIdentifierValidated:true,
    validatedPresentationCount:value.presentaciones.length,
    validatedIngredientCount:value.principiosActivos.length,
    datasetClassification:"ES_authorised_medicine_detail_not_stock",
    currentRetailStockOrPriceVerified:false
  });
}
async function bounded(response){
  if(!response || response.ok!==true || response.redirected===true){
    fail("publisher rejected or redirected request");
  }
  if(typeof response.url==="string" && response.url!=="" &&
     response.url!==ES_CIMA_PROBE.url)fail("unexpected publisher endpoint");
  const mime=response.headers?.get?.("content-type")||"";
  if(!/\bapplication\/(?:json|[a-z0-9.+-]+\+json)\b/iu.test(mime)){
    fail("invalid source content type");
  }
  const advertised=response.headers?.get?.("content-length");
  if(advertised!=null && advertised!==""){
    const n=Number(advertised);
    if(!Number.isSafeInteger(n)||n<0||n>MAX_BYTES)fail("invalid response length");
  }
  if(!response.body||typeof response.body.getReader!=="function"){
    fail("unbounded response");
  }
  const reader=response.body.getReader(),parts=[];
  let bytes=0;
  try {
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      if(!(value instanceof Uint8Array))fail("invalid response chunk");
      bytes+=value.byteLength;
      if(bytes>MAX_BYTES)fail("oversized response");
      parts.push(value);
    }
  }catch(e){
    if(e?.message?.startsWith("CIMA public source observation denied:"))throw e;
    fail("source stream unavailable");
  }finally{
    try{await reader.cancel()}catch{}
    try{reader.releaseLock()}catch{}
  }
  if(bytes<1)fail("empty source response");
  const raw=new Uint8Array(bytes);
  let offset=0;
  for(const x of parts){raw.set(x,offset);offset+=x.length;}
  let parsed;
  try{parsed=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(raw));}
  catch{fail("malformed UTF-8 or JSON");}
  return {parsed,bytes,rawBytes:raw,hash:createHash("sha256").update(raw).digest("hex")};
}
export async function probeCimaPublicMedicine({
  transport=globalThis.fetch,now=()=>Date.now()
}={}){
  if(typeof transport!=="function"||typeof now!=="function")fail("trusted transport and clock");
  let started;
  try{started=now()}catch{fail("invalid observation clock")}
  if(!Number.isSafeInteger(started)||started<0)fail("invalid observation clock");
  let response;
  try{
    response=await transport(ES_CIMA_PROBE.url,{
      method:"GET",redirect:"error",credentials:"omit",cache:"no-store",
      headers:{accept:"application/json"},
      signal:AbortSignal.timeout(DEADLINE_MS)
    });
  }catch{fail("official publisher connection unavailable")}
  const data=await bounded(response);
  const sample=validateCimaMedicineSample(data.parsed);
  let finished;
  try{finished=now()}catch{fail("invalid observation clock")}
  if(!Number.isSafeInteger(finished)||finished<started||
     finished-started>DEADLINE_MS+5000)fail("invalid observation clock");
  return Object.freeze({
    contract:"novapharm.intelligence.es-cima-official-live-probe.v1",
    sourceId:ES_CIMA_PROBE.sourceId,
    registryCandidateKey:ES_CIMA_PROBE.registryCandidateKey,
    country:"ES",
    publisher:ES_CIMA_PROBE.publisher,
    officialEndpoint:ES_CIMA_PROBE.url,
    retrievedAt:new Date(finished).toISOString(),
    responseSha256:data.hash,upstreamPayloadBytes:data.bytes,
    schemaBoundRecords:sample.recordCount,
    presentationCount:sample.validatedPresentationCount,
    ingredientCount:sample.validatedIngredientCount,
    registrationIdentifierValidated:true,
    datasetClassification:sample.datasetClassification,
    publicPublisherResponded:true,
    sourceUseRightsIndependentlyReviewed:false,
    sourceDatasetAdmitted:false,
    signedCustomerProductionReadVerified:false,
    clinicalDecisionReady:false,
    commercialDecisionReady:false,
    countryCustomerLive:false,
    canPublish:false,
    rawMedicineRecordsRetained:false
  });
}


/**
 * Internal live CIMA medicine sample to bounded source snapshot quarantine.
 *
 * The publisher's medicine detail lacks an authenticated snapshot-release
 * timestamp. A trusted server-side release inventory supplies the dates and
 * legally approved source-use decisions; their mere shape is NOT a legal grant.
 * No external record, medicine, or sensitive patient data is returned or saved.
 */
export function createCimaLiveSourceQuarantineReader({
  authorize, releaseInventory, transport=globalThis.fetch,
  now=()=>Date.now()
}={}){
  if(typeof authorize!=="function" || typeof releaseInventory!=="function" ||
     typeof transport!=="function" || typeof now!=="function"){
    fail("independent rights authorizer, release inventory, transport and clock required");
  }
  function clock(){
    let value;
    try{value=now();}catch{fail("trusted clock unavailable");}
    if(!Number.isSafeInteger(value)||value<0)fail("invalid trusted clock");
    return value;
  }
  function grantFor(permit,context,at){
    try{
      return assertInternalEvaluationPermit({permit,...context,now:at});
    }catch{fail("trusted source rights not approved");}
  }
  function validEvidence(receipt){
    return receipt && typeof receipt==="object" &&
      receipt.contract==="novapharm.intelligence.es-cima-live-quarantine.v1" &&
      receipt.sourceId===ES_CIMA_PROBE.sourceId && receipt.country==="ES" &&
      typeof receipt.tenantId==="string" &&
      receipt.manifest?.sourceKey===ES_CIMA_PROBE.sourceId &&
      receipt.manifest?.jurisdiction==="ES" &&
      receipt.manifest?.datasetKey==="es-cima-medicine-detail" &&
      receipt.manifest?.resourceId==="es-cima-nregistro-51347" &&
      receipt.manifest?.resourceUrl===ES_CIMA_PROBE.url &&
      receipt.manifest?.intakeState==="QUARANTINED_INTERNAL_EVALUATION" &&
      receipt.manifest?.canPublish===false &&
      receipt.manifest?.productionAccepted===false &&
      receipt.sourceSampleQuarantined===true &&
      receipt.legalCommercialAndAiUseRightsVerified===false &&
      receipt.productionAccepted===false && receipt.canPublish===false &&
      receipt.customerReadEnabled===false;
  }
  return Object.freeze({
    async evaluate({tenantId}={}){
      if(typeof tenantId!=="string" ||
         !/^[A-Za-z0-9_-]{2,64}$/u.test(tenantId)){
        fail("invalid protected tenant identity");
      }
      const context={
        sourceId:ES_CIMA_PROBE.sourceId,tenantId,
        country:"ES",domain:"medicine-regulatory",
        purpose:"internal-evaluation"
      };
      const initialAt=clock();
      let firstPermission;
      try{firstPermission=await authorize(context);}
      catch{fail("trusted source rights unavailable before fetch");}
      const beforeFetch=clock();
      if(beforeFetch<initialAt)fail("clock rollback before fetch");
      const first=grantFor(firstPermission,context,beforeFetch);
      let response;
      try{
        response=await transport(ES_CIMA_PROBE.url,{
          method:"GET",redirect:"error",credentials:"omit",cache:"no-store",
          headers:{accept:"application/json"},
          signal:AbortSignal.timeout(DEADLINE_MS)
        });
      }catch{fail("official publisher connection unavailable");}
      const body=await bounded(response);
      const sample=validateCimaMedicineSample(body.parsed);
      const afterFetch=clock();
      if(afterFetch<beforeFetch||afterFetch>=Date.parse(first.validUntil)){
        fail("source rights expired or clock rolled back during fetch");
      }
      let release;
      try{release=await releaseInventory({
        sourceId:ES_CIMA_PROBE.sourceId,
        country:"ES",
        officialRegistrationNumber:ES_CIMA_PROBE.officialRegistrationNumber
      });}
      catch{fail("trusted publisher release catalogue unavailable");}
      if(!release || typeof release!=="object" || Array.isArray(release) ||
         release.datasetKey!=="es-cima-medicine-detail" ||
         release.resourceId!=="es-cima-nregistro-51347" ||
         release.officialRegistrationNumber!==ES_CIMA_PROBE.officialRegistrationNumber){
        fail("publisher release catalogue identity mismatch");
      }
      let manifest;
      try{
        manifest=buildSourceSnapshotQuarantine({
          sourceKey:ES_CIMA_PROBE.sourceId,
          jurisdiction:"ES",
          publisher:ES_CIMA_PROBE.publisher,
          datasetKey:release.datasetKey,
          resourceId:release.resourceId,
          resourceUrl:ES_CIMA_PROBE.url,
          expectedOrigin:new URL(ES_CIMA_PROBE.url).origin,
          mediaType:"application/json",
          schemaVersion:release.schemaVersion,
          observationStart:release.observationStart,
          observationEnd:release.observationEnd,
          publishedOn:release.publishedOn,
          fetchedAt:new Date(afterFetch).toISOString(),
          bytes:body.rawBytes
        });
      }catch{fail("publisher release evidence failed snapshot quarantine");}
      const afterManifest=clock();
      if(afterManifest<afterFetch||afterManifest>=Date.parse(first.validUntil)){
        fail("source rights expired during source quarantine");
      }
      let secondPermission;
      try{secondPermission=await authorize(context);}
      catch{fail("trusted source rights unavailable after quarantine");}
      const finished=clock();
      if(finished<afterManifest||finished>=Date.parse(first.validUntil)){
        fail("source rights expired after quarantine");
      }
      const second=grantFor(secondPermission,context,finished);
      if(second.receiptId!==first.receiptId ||
         second.licenseId!==first.licenseId ||
         second.rightsVersion!==first.rightsVersion ||
         second.validUntil!==first.validUntil){
        fail("source rights changed during quarantine");
      }
      return Object.freeze({
        contract:"novapharm.intelligence.es-cima-live-quarantine.v1",
        sourceId:ES_CIMA_PROBE.sourceId,
        registryCandidateKey:ES_CIMA_PROBE.registryCandidateKey,
        tenantId,country:"ES",
        sourceSchemaBoundRecords:sample.recordCount,
        validatedPresentationCount:sample.validatedPresentationCount,
        validatedIngredientCount:sample.validatedIngredientCount,
        sourceResponseSha256:body.hash,
        rightsReceiptId:second.receiptId,
        manifest,
        sourceHttpReadConfirmed:true,
        sourceSampleQuarantined:true,
        publisherReleaseDatesIndependentlyVerified:false,
        legalCommercialAndAiUseRightsVerified:false,
        countryMedicineIdentifiersReconciled:false,
        protectedCustomerDeploymentVerified:false,
        productionAccepted:false,
        customerReadEnabled:false,
        canPublish:false,
        rawMedicineRecordsRetained:false
      });
    },
    compareReplay(previous,next){
      if(!Array.isArray(previous) || !validEvidence(next) ||
         previous.some(p=>!validEvidence(p) || p.tenantId!==next.tenantId)){
        fail("invalid or cross-tenant source replay receipts");
      }
      let outcome;
      try{
        outcome=classifySourceSnapshotReplay(
          previous.map(p=>p.manifest),next.manifest);
      }catch{fail("invalid source replay metadata");}
      return Object.freeze({
        contract:"novapharm.intelligence.es-cima-replay-review.v1",
        tenantId:next.tenantId,
        sourceId:ES_CIMA_PROBE.sourceId,
        decision:outcome.decision,
        canPublish:false,
        productionAccepted:false
      });
    }
  });
}
