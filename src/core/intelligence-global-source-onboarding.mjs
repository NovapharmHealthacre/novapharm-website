/**
 * Enterprise onboarding coverage for ALL entries in the NovaPharm source registry.
 * This is metadata classification, NOT ingestion, an actual API connector, a
 * licence, legal advice, production authorisation or a customer endpoint.
 */
import { sourcePlans } from "./intelligence-global-source-gateway.mjs";
import { globalSourceAliases } from "./intelligence-global-source-aliases.mjs";

export const GLOBAL_SOURCE_COVERAGE_VERSION="novapharm.intelligence.source-coverage.v1";
export const EXPECTED_SOURCE_CANDIDATES=101;
export const APPROVED_ONBOARDING_MODES=Object.freeze([
  "API","API-review","Restricted/API","Beta API","API/Download",
  "Portal","Download","Download-review","Portal/Restricted",
  "Portal/Download","Download/Portal","Discovery","API/Portal",
  "Access-review","FHIR-review","Download/Restricted",
  "API/Access-review","Download/API-review"
]);

export const CANDIDATE_API_BINDINGS=Object.freeze({
  "global-global-us-clinicaltrials-gov":"global-clinicaltrials",
  "global-global-europe-pmc":"global-europepmc",
  "global-global-ncbi-pubmed":"global-pubmed",
  "global-global-chembl":"global-chembl",
  "global-global-pubchem":"global-pubchem",
  "europe-spain-aemps-cima":"es-aemps-cima",
  "north-america-united-states-fda-openfda":"us-fda-drugsfda",
  "north-america-canada-health-canada-drug-product-database":"ca-health-canada-dpd"
});
const RE_KEY=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CURRENT_SOURCE_STATUS="METADATA_ONLY_NO_RUNTIME_CONNECTION";

function deny(why){throw new Error("Global source onboarding rejected: "+why);}
function cleanCandidate(candidate){
  if(!candidate||typeof candidate!=="object"||
     typeof candidate.candidateKey!=="string"||!RE_KEY.test(candidate.candidateKey)||
     typeof candidate.provider!=="string"||!candidate.provider.trim()||
     typeof candidate.country!=="string"||!candidate.country.trim()||
     typeof candidate.region!=="string"||!candidate.region.trim()||
     typeof candidate.mode!=="string"||!APPROVED_ONBOARDING_MODES.includes(candidate.mode)||
     typeof candidate.domains!=="string"||!candidate.domains.trim()||
     candidate.rightsStatus!=="not-reviewed"||
     candidate.integrationStatus!=="candidate-only"||
     candidate.dataAdmission!=="not-admitted"||
     candidate.authorityVerification!=="pending"||
     candidate.termsReview!=="pending"||
     candidate.activeAdapterId!==null||
     candidate.licenceEvidenceId!==null||
     !Array.isArray(candidate.allowedUses)||candidate.allowedUses.length!==0){
    deny("candidate state invalid");
  }
  let url;
  try{url=new URL(candidate.url);}catch{deny("candidate URL");}
  if(url.protocol!=="https:"||url.username||url.password||url.hash||!url.hostname){
    deny("untrusted source reference URL");
  }
}
function routeFromMode(mode){
  if(mode.includes("Restricted")||mode.includes("Access-review")||mode==="FHIR-review")return "ACCESS_OR_INTERFACE_REVIEW";
  if(mode.includes("API"))return "DOCUMENTED_API_CANDIDATE";
  if(mode.includes("Download"))return "VERSIONED_OFFICIAL_FILE_CANDIDATE";
  if(mode.includes("Portal"))return "PORTAL_OR_LICENSED_EXPORT_REVIEW";
  return "PUBLISHER_DISCOVERY_REQUIRED";
}
function sourceBlockers(route,hasAdapter){
  return Object.freeze([
    "VERIFY_PUBLISHER_AUTHORITY_AND_ENDPOINT",
    "VERIFY_SOURCE_TERMS_AND_COMMERCIAL_AI_REDISTRIBUTION_RIGHTS",
    "TEST_UPSTREAM_SCHEMA_RATE_LIMITS_AND_REPLAY",
    "ACCEPT_NATIVE_IDENTITIES_AND_CANONICAL_DATA_QA",
    "ENFORCE_SIGNED_TENANT_RIGHTS_AND_PROTECTED_PUBLICATION",
    ...(hasAdapter?[]:["IMPLEMENT_RIGHTS_GATED_ADAPTER_OR_OFFICIAL_FILE_READER"]),
    ...(route==="ACCESS_OR_INTERFACE_REVIEW"?["OBTAIN_VENDOR_OR_REGULATOR_ACCESS_APPROVAL"]:[]),
    ...(route==="PORTAL_OR_LICENSED_EXPORT_REVIEW"?["CONFIRM_OFFICIAL_EXPORT_MECHANISM_NO_SCRAPING_ASSUMED"]:[])
  ]);
}
export function buildGlobalSourceOnboardingCoverage(registry,{adapterPlans=sourcePlans,aliases=globalSourceAliases}={}){
  if(!Array.isArray(registry)||registry.length!==EXPECTED_SOURCE_CANDIDATES){
    deny("expected 101 candidate registry entries");
  }
  if(!adapterPlans||typeof adapterPlans!=="object"||!Array.isArray(aliases)){
    deny("trusted adapter catalogue");
  }
  const keys=new Set();
  const entries=registry.map(candidate=>{
    cleanCandidate(candidate);
    if(keys.has(candidate.candidateKey))deny("duplicate candidate key");
    keys.add(candidate.candidateKey);
    const plannedAdapter=CANDIDATE_API_BINDINGS[candidate.candidateKey]||null;
    const adapter=plannedAdapter&&Object.hasOwn(adapterPlans,plannedAdapter)?plannedAdapter:null;
    const bridge=aliases.find(x=>x.candidateKey===candidate.candidateKey);
    if(bridge&&(bridge.sourceRightsIndependentlyApproved!==false||
      bridge.sourceAdmissionComplete!==false||
      bridge.allowsCustomerAccess!==false||
      bridge.allowsProductionIngestion!==false))deny("unsafe source bridge");
    const route=routeFromMode(candidate.mode);
    const source=Object.freeze({
      candidateKey:candidate.candidateKey,
      jurisdictionLabel:candidate.country,
      region:candidate.region,
      provider:candidate.provider,
      dataDomains:candidate.domains,
      officialReferenceUrl:candidate.url,
      advertisedAccessMode:candidate.mode,
      onboardingRoute:route,
      implementationId:adapter||bridge?.existingSourceId||null,
      engineeringState:adapter?"BOUNDED_API_PREVIEW_CODE_ONLY":
        bridge?"PRIVATE_DISCOVERY_ALIAS_ONLY":"NO_ADAPTER_IMPLEMENTED",
      sourceVerification:"PENDING",
      sourceRights:"NOT_REVIEWED",
      commercialAndAiReuseApproved:false,
      authorisedApiResponseSeen:false,
      productionRuntimeConnected:false,
      liveDataReceived:false,
      sourceRecordsAdmitted:false,
      mobileDataEnabled:false,
      requiredGates:sourceBlockers(route,Boolean(adapter||bridge))
    });
    return source;
  });
  const unknownBinding=Object.keys(CANDIDATE_API_BINDINGS).filter(key=>!keys.has(key));
  if(unknownBinding.length)deny("coded adapter mapping refers to missing registry source");
  for(const row of entries){
    if(row.engineeringState==="BOUNDED_API_PREVIEW_CODE_ONLY" && row.onboardingRoute!=="DOCUMENTED_API_CANDIDATE"){
      deny("coded API source missing API mode");
    }
  }
  const count=(predicate)=>entries.filter(predicate).length;
  return Object.freeze({
    contract:GLOBAL_SOURCE_COVERAGE_VERSION,
    totalSourceCandidates:entries.length,
    distinctJurisdictionAndGlobalLabels:new Set(entries.map(x=>x.jurisdictionLabel)).size,
    advertisedApiRelated:count(x=>x.advertisedAccessMode.includes("API")),
    advertisedDownloadOnlyRelated:count(x=>!x.advertisedAccessMode.includes("API")&&x.advertisedAccessMode.includes("Download")),
    advertisedPortalDiscoveryOther:count(x=>!x.advertisedAccessMode.includes("API")&&!x.advertisedAccessMode.includes("Download")),
    codedApiPreviewCandidates:count(x=>x.engineeringState==="BOUNDED_API_PREVIEW_CODE_ONLY"),
    privateSourceAliasCandidates:count(x=>x.engineeringState==="PRIVATE_DISCOVERY_ALIAS_ONLY"),
    liveSourceConnections:0,
    admittedSourceDatasets:0,
    customerExposedSourceDatasets:0,
    sourceEntries:Object.freeze(entries)
  });
}
export function assertAllCountriesLive(_coverage){
  deny("country-complete runtime coverage cannot be asserted from source metadata");
}
