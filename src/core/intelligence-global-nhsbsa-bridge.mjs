/**
 * NHSBSA EPD global-registry bridge; offline sample only.
 * No HTTP, bulk import, external licence grant or customer publication.
 */
import {resolveGlobalSourceAlias,globalSourceAliases} from "./intelligence-global-source-aliases.mjs";
import {assertInternalEvaluationPermit} from "./intelligence-global-evidence-contract.mjs";
import {buildSourceSnapshotQuarantine} from "./intelligence-source-snapshot-quarantine.mjs";

const ALIAS=globalSourceAliases.find(x=>x.existingSourceId==="nhsbsa.epd");
const ORIGIN="https://opendata.nhsbsa.net";
const DOMAIN="prescribing-utilisation";
function deny(why){throw new Error("NHSBSA source bridge rejected: "+why);}
function monthlyPeriod(value){
  const match=/^(\d{4})-(0[1-9]|1[0-2])$/.exec(value||"");
  if(!match||Number(match[1])<2015||Number(match[1])>2100)deny("reporting period");
  return {start:value+"-01",end:new Date(Date.UTC(Number(match[1]),Number(match[2]),0)).toISOString().slice(0,10)};
}
function sourceResource(metadata){
  const id=metadata?.resourceId;
  if(typeof id!=="string"||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id))deny("resource identifier");
  let url;
  try{url=new URL(metadata.resourceUrl);}catch{deny("resource URL");}
  if(url.origin!==ORIGIN||url.username||url.password||url.search||url.hash||
    !url.pathname.startsWith("/dataset/"+ALIAS.exactDatasetSlug+"/resource/"+id))deny("source URL");
  return url.toString();
}
export function createNhsbsaGlobalSampleBridge({authorize,now=()=>Date.now()}={}){
  if(typeof authorize!=="function"||typeof now!=="function"||!ALIAS)deny("trusted dependencies");
  return Object.freeze({
    async evaluate({candidateKey,registry,tenantId,metadata,rawBytes}={}){
      if(candidateKey!==ALIAS.candidateKey||typeof tenantId!=="string"||
        !/^[A-Za-z0-9_-]{2,64}$/.test(tenantId))deny("source and tenant");
      const alias=resolveGlobalSourceAlias(candidateKey,registry);
      if(!alias||alias.existingSourceId!=="nhsbsa.epd"||alias.jurisdiction!=="GB-ENG"||
        alias.discoveryOnly!==true||alias.customerVisible!==false||
        alias.productionDataAdmitted!==false)deny("private source alias");
      if(!metadata||typeof metadata.schemaVersion!=="string"||
        !/^epd-snomed-string-[a-z0-9-]{2,60}$/.test(metadata.schemaVersion))deny("SNOMED string version");
      const dates=monthlyPeriod(metadata.reportingPeriod);
      const resourceUrl=sourceResource(metadata);
      const current=now();
      if(!Number.isFinite(current))deny("server clock");
      const grant=await authorize({tenantId,sourceId:"nhsbsa.epd",country:"GB-ENG",domain:DOMAIN,purpose:"internal-evaluation"});
      const receipt=assertInternalEvaluationPermit({
        permit:grant,tenantId,sourceId:"nhsbsa.epd",country:"GB-ENG",domain:DOMAIN,now:current
      });
      const manifest=buildSourceSnapshotQuarantine({
        sourceKey:"nhsbsa.epd",jurisdiction:"GB-ENG",
        publisher:"NHS Business Services Authority",
        datasetKey:ALIAS.exactDatasetSlug,resourceId:metadata.resourceId,
        resourceUrl,expectedOrigin:ORIGIN,mediaType:"text/csv",
        schemaVersion:metadata.schemaVersion,
        observationStart:dates.start,observationEnd:dates.end,
        publishedOn:metadata.publishedOn,
        fetchedAt:new Date(current).toISOString(),bytes:rawBytes
      });
      return Object.freeze({
        contract:"novapharm.intelligence.nhsbsa-epd-bridge.v1",
        tenantId,sourceId:"nhsbsa.epd",jurisdiction:"GB-ENG",
        publisherDataset:ALIAS.exactDatasetSlug,
        reportingPeriod:metadata.reportingPeriod,originalSNOMEDCodeType:"string",
        sourceRightsReceipt:receipt.receiptId,
        manifest,
        rowParsing:"REQUIRES_EXISTING_GOVERNED_EPD_PARSER",
        canPublish:false,productionAccepted:false,
        customerVisible:false,privateProbeEnabled:false,bulkImportEnabled:false
      });
    }
  });
}
