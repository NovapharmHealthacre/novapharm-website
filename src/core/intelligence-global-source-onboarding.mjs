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
  "europe-poland-nfz-drug-program-statistics":"pl-nfz-drug-program",
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
  // Discovery metadata must not normalize private, loopback, literal-IP or
  // local-development destinations into an ostensibly trusted HTTPS source.
  // Source activation still requires separate publisher and legal review.
  const hostname = url.hostname.toLowerCase();
  const labels = hostname.split(".");
  if (url.port || labels.length < 2 ||
      !/^[a-z0-9.-]+$/u.test(hostname) ||
      labels.some(label => !label || label.startsWith("-") || label.endsWith("-")) ||
      /^\d+\.\d+\.\d+\.\d+$/u.test(hostname) ||
      hostname.startsWith("[") ||
      ["localhost","local","internal","test","invalid","example","onion"].includes(labels.at(-1))) {
    deny("untrusted source reference host");
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

/**
 * Official publisher-page pre-screen, 19 Nov 2026. These are public terms
 * references, NOT grants, legal sign-off, source responses or ingestion.
 * Country-level customer release remains governed by separate signed
 * dataset/field/use-specific rights and independent production acceptance.
 */
export const PUBLIC_PUBLISHER_TERMS_PRESCREEN_20261119 = Object.freeze({
  "north-america-united-states-fda-openfda": Object.freeze({
    termsUrl: "https://open.fda.gov/terms/",
    scope: "Drugs@FDA machine-readable regulatory search, not all FDA submissions",
    publishedTermsPosture: "CC0_DEFAULT_WITH_THIRD_PARTY_EXCEPTIONS",
    outstanding: Object.freeze([
      "Pin the exact endpoint and response fields",
      "Exclude or clear copyrightable private-party submissions and warned fields",
      "Record attribution, rate limits, terms checksum and independently signed permitted-use decision"
    ])
  }),
  "europe-spain-aemps-cima": Object.freeze({
    termsUrl: "https://sede.aemps.gob.es/datos-abiertos/",
    scope: "AEMPS CIMA REST catalogue, not non-CIMA licensed dossiers",
    publishedTermsPosture: "OFFICIAL_OPEN_DATA_LISTING_ATTRIBUTION_CONDITIONS",
    outstanding: Object.freeze([
      "Check the current CIMA REST and AEMPS legal notices together",
      "Resolve bulk, cache, derivative and commercial/AI-use conditions for the exact CIMA fields",
      "Record the current notice checksum and independently signed permitted-use decision"
    ])
  }),
  "north-america-canada-health-canada-drug-product-database": Object.freeze({
    termsUrl: "https://open.canada.ca/data/en/dataset/bf55e42a-63cb-4556-bfd8-44f26e5a36fe",
    scope: "Health Canada Drug Product Database publication; API and file versions must be matched",
    publishedTermsPosture: "PUBLISHED_OPEN_GOVERNMENT_LICENCE_CANADA",
    outstanding: Object.freeze([
      "Bind API and file fields to the exact licensed DPD publication/version",
      "Confirm excluded third-party content, attribution and intended commercial/AI uses",
      "Record exact resource checksum and independently signed permitted-use decision"
    ])
  }),
  "europe-united-kingdom-nhsbsa-english-prescribing-dataset": Object.freeze({
    termsUrl: "https://opendata.nhsbsa.net/pages/terms-and-conditions",
    scope: "NHSBSA EPD with SNOMED dataset; code systems and terminology have separate rights",
    publishedTermsPosture: "DATASET_SPECIFIC_OGL_WITH_THIRD_PARTY_TERMINOLOGY",
    outstanding: Object.freeze([
      "Record the exact EPD dataset resource licence, version and publisher attribution",
      "Independently clear SNOMED CT, BNF and dm+d fields for the requested uses",
      "Obtain source/reviewer grant and complete immutable row-level admission"
    ])
  }),
  "global-global-us-clinicaltrials-gov": Object.freeze({
    termsUrl: "https://clinicaltrials.gov/terms-conditions",
    scope: "ClinicalTrials.gov trial registry metadata, not third-party works in trial records",
    publishedTermsPosture: "PUBLIC_REGISTRY_WITH_THIRD_PARTY_CONTENT_CAVEAT",
    outstanding: Object.freeze([
      "Identify copyrighted third-party record content and permitted metadata fields",
      "Check attribution, data version, intended commercial/AI uses and retention",
      "Record a signed source/field/use decision before production access"
    ])
  })
});

/**
 * Complete, read-only worklist across 101 source CANDIDATES, not 101 licensed
 * national feeds. A publisher's open-data notice is insufficient for tenant
 * rights, AI reuse, regulatory identity reconciliation or customer publication.
 *
 * No caller argument can turn a public terms link into a signed grant.
 */
export function buildPublisherRightsPrescreenWorklist(registry) {
  const coverage = buildGlobalSourceOnboardingCoverage(registry);
  const knownKeys = new Set(coverage.sourceEntries.map(entry => entry.candidateKey));
  const unknownScreenedKeys = Object.keys(PUBLIC_PUBLISHER_TERMS_PRESCREEN_20261119)
    .filter(key => !knownKeys.has(key));
  if (unknownScreenedKeys.length !== 0) deny("publisher terms review references an unknown registry source");
  const sourceEntries = coverage.sourceEntries.map(entry => {
    const evidence = PUBLIC_PUBLISHER_TERMS_PRESCREEN_20261119[entry.candidateKey] ?? null;
    return Object.freeze({
      candidateKey: entry.candidateKey,
      jurisdictionLabel: entry.jurisdictionLabel,
      provider: entry.provider,
      onboardingRoute: entry.onboardingRoute,
      proposedAdapterId: entry.implementationId,
      officialReferenceUrl: entry.officialReferenceUrl,
      publisherTermsUrl: evidence?.termsUrl ?? null,
      termsPosture: evidence?.publishedTermsPosture ?? "UNASSESSED",
      termsScreeningStatus: evidence
        ? "PUBLIC_NOTICE_LOCATED_LEGAL_ACCEPTANCE_PENDING"
        : "PUBLIC_TERMS_NOT_YET_SCREENED",
      datasetScope: evidence?.scope ?? null,
      outstandingRightsRequirements: evidence?.outstanding ?? Object.freeze([
        "Locate current official publisher terms for exact dataset and intended use",
        "Obtain independent rights acceptance before source admission"
      ]),
      exactDatasetVersion: null,
      termsSha256IndependentlyVerified: null,
      signedGrantReceiptSha256: null,
      legallyAcceptedUses: Object.freeze([]),
      productionRightsGranted: false,
      liveIngestedRecordCount: 0,
      productionDatasetAdmitted: false,
      customerLive: false
    });
  });
  return Object.freeze({
    contract: "novapharm.intelligence.publisher-terms-prescreen.v1",
    reviewedOn: "2026-11-19",
    totalSourceCandidates: sourceEntries.length,
    publicPublisherNoticesLocated: sourceEntries.filter(row => row.publisherTermsUrl !== null).length,
    independentlyLicensedSourceCandidates: 0,
    customerLiveSourceCandidates: 0,
    sourceEntries: Object.freeze(sourceEntries)
  });
}

export function assertAllCountriesLive(_coverage){
  deny("country-complete runtime coverage cannot be asserted from source metadata");
}
