/**
 * Internal-only global source intake review, WITHOUT upstream network access,
 * source-rights grants, storage, database writes or a customer-facing route.
 *
 * An independent, trusted backend fetcher supplies RAW bounded bytes and a
 * protected authorizer supplies a source-/country-/tenant-bound decision.
 *
 * This module makes a connection between the five source-adapter candidate
 * schemas, rights validation and immutable quarantine manifests.
 * A caller may not treat this as independent legal or signature verification.
 */
import {
  buildGovSourcePlan,
  normaliseGovSourceResult
} from "./intelligence-global-source-gateway.mjs";
import {
  assertInternalEvaluationPermit,
  buildEvaluationEnvelope
} from "./intelligence-global-evidence-contract.mjs";
import {
  buildSourceSnapshotQuarantine,
  classifySourceSnapshotReplay
} from "./intelligence-source-snapshot-quarantine.mjs";
import {assessGlobalSourcePageQuality} from "./intelligence-global-intake-quality.mjs";

const MAX_BYTES=262144;
const EVALUATION_CONTRACT="novapharm.intelligence.global-intake-evaluation.v1";
const DATASETS=Object.freeze({
  "us-fda-drugsfda":Object.freeze({publisher:"US Food and Drug Administration",datasetKey:"fda-drugsfda"}),
  "global-clinicaltrials":Object.freeze({publisher:"ClinicalTrials.gov",datasetKey:"clinicaltrials-v2"}),
  "ca-health-canada-dpd":Object.freeze({publisher:"Health Canada",datasetKey:"drug-product-database"}),
  "global-europepmc":Object.freeze({publisher:"Europe PMC",datasetKey:"europepmc-search"}),
  "es-aemps-cima":Object.freeze({publisher:"Agencia Espanola de Medicamentos y Productos Sanitarios",datasetKey:"aemps-cima"})
});
function reject(message){throw new Error("Global source intake rejected: "+message);}
function decodeSourceBytes(bytes){
  if(!(bytes instanceof Uint8Array)||bytes.byteLength<1||bytes.byteLength>MAX_BYTES)reject("bounded source bytes");
  let parsed;
  try{parsed=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));}
  catch{reject("source JSON");}
  return parsed;
}
function validateTenant(tenantId){
  if(typeof tenantId!=="string"||!/^[A-Za-z0-9_-]{2,64}$/.test(tenantId))reject("tenant");
}
function assertPreviousEntry(record,tenantId){
  if(!record||record.contract!==EVALUATION_CONTRACT||record.tenantId!==tenantId||
    record.canPublish!==false||record.productionAccepted!==false||!record.manifest||
    record.manifest.canPublish!==false||record.evidence?.canPublish!==false)reject("cross-tenant or untrusted previous receipt");
}
export function createGlobalSourceIntakeEvaluator({authorize,now=()=>Date.now()}={}){
  if(typeof authorize!=="function"||typeof now!=="function")reject("trusted backend authorizer");
  return Object.freeze({
    async evaluate({sourceId,term,limit=5,tenantId,metadata,rawBytes}={}){
      validateTenant(tenantId);
      const plan=buildGovSourcePlan({sourceId,term,limit});
      const dataset=DATASETS[plan.sourceId];
      if(!dataset)reject("unregistered source");
      if(!metadata||typeof metadata!=="object"||Array.isArray(metadata))reject("metadata");

      // Authorize BEFORE parsing raw content or making any quarantine record.
      const authorisedAt=now();
      if(!Number.isFinite(authorisedAt))reject("server clock");
      const decision=await authorize({
        tenantId,sourceId,country:plan.country,domain:plan.domain,
        purpose:"internal-evaluation"
      });
      const grant=assertInternalEvaluationPermit({
        permit:decision,sourceId,tenantId,country:plan.country,
        domain:plan.domain,now:authorisedAt
      });
      const raw=decodeSourceBytes(rawBytes);
      const normalized=normaliseGovSourceResult(plan,raw);
      const fetchedAt=new Date(authorisedAt).toISOString();

      // Publication/observation dates and version are supplied by a trusted
      // backend source release inventory, never guessed from HTTP response
      // arrival or user-controlled parameters.
      const manifest=buildSourceSnapshotQuarantine({
        sourceKey:plan.sourceId,
        jurisdiction:plan.country,
        publisher:dataset.publisher,
        datasetKey:dataset.datasetKey,
        resourceId:metadata.resourceId,
        schemaVersion:metadata.schemaVersion,
        resourceUrl:plan.url,
        expectedOrigin:new URL(plan.url).origin,
        mediaType:"application/json",
        observationStart:metadata.observationStart,
        observationEnd:metadata.observationEnd,
        publishedOn:metadata.publishedOn,
        fetchedAt,
        bytes:rawBytes
      });
      const evidence=buildEvaluationEnvelope({
        plan,normalized,raw,grant,capturedAt:authorisedAt
      });
      const pageQuality=assessGlobalSourcePageQuality({
        sourceId,raw,normalized,manifest,limit
      });
      return Object.freeze({
        contract:EVALUATION_CONTRACT,
        tenantId,
        sourceId,
        country:plan.country,
        domain:plan.domain,
        sourceRightsReceipt:grant.receiptId,
        manifest,
        evidence,
        pageQuality,
        canPublish:false,
        productionAccepted:false,
        sourceRightsIndependentlyVerified:false,
        admissionDecision:"DENIED_UNTIL_INDEPENDENT_RIGHTS_AND_DATA_ADMISSION"
      });
    },
    compareReplay(previous,next){
      if(!Array.isArray(previous)||!next||
        typeof next.tenantId!=="string")reject("replay entries");
      validateTenant(next.tenantId);
      assertPreviousEntry(next,next.tenantId);
      previous.forEach((x)=>assertPreviousEntry(x,next.tenantId));
      const result=classifySourceSnapshotReplay(previous.map(x=>x.manifest),next.manifest);
      return Object.freeze({...result,tenantId:next.tenantId});
    }
  });
}
export function assertGlobalIntakeCustomerReady(_candidate){
  reject("independent source rights, canonical identity and customer data admission required");
}
