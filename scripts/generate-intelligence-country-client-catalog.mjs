#!/usr/bin/env node
/**
 * Deterministic, OFFLINE source candidate catalogue shared by protected web
 * and Expo iOS/Android research previews. No HTTP, rights grants or medicine rows.
 */
import {readFileSync,writeFileSync} from "node:fs";
import {buildProposedCountry101Ledger} from "../src/core/intelligence-country-101-proposed-ledger.mjs";
const readJSON = name=>JSON.parse(readFileSync(new URL("../docs/intelligence/"+name,import.meta.url),"utf8"));
const sourceRegistry=readJSON("global-pharma-sources-20261117.json");
const proposal=readJSON("country-101-scope-proposal-20261118.json");
const nationalLedger=buildProposedCountry101Ledger(sourceRegistry,proposal);
const research=readJSON("country-101-new-24-publisher-research-20261118.json");
if(research.contract!=="novapharm.intelligence.24-national-publisher-research-leads.v1" ||
  research.leads?.length!==24 || research.commercialAndAiReuseApproved!==false ||
  research.apiConnectionsEnabled!==false || research.medicineRecordsIncluded!==false ||
  research.customerPublishedCountries!==0)throw new Error("Unexpected research-lead admission claim");
const researchByCountry=new Map();
for(const lead of research.leads){
  if(!lead || typeof lead!=="object" || !/^[A-Z]{2}$/.test(lead.iso2) ||
    researchByCountry.has(lead.iso2) || typeof lead.publisherName!=="string" ||
    lead.publisherName.trim().length<3 || !lead.referenceUrl ||
    typeof lead.leadType!=="string" || typeof lead.caveat!=="string" ||
    lead.caveat.trim().length<20 || lead.apiEndpoint!==null ||
    lead.apiValidated!==false || lead.rightsStatus!=="not-reviewed" ||
    lead.dataAdmission!=="not-admitted" || lead.customerLive!==false ||
    lead.sourceDiscovery!=="official-reference-identified-not-integrated"){
    throw new Error("Unapproved or malformed research lead");
  }
  const url=new URL(lead.referenceUrl);
  if(url.protocol!=="https:" || url.username || url.password || url.hash || url.port ||
    !/^[a-z0-9.-]+$/i.test(url.hostname) || url.hostname==="localhost"){
    throw new Error("Research lead reference URL not approved for offline metadata");
  }
  researchByCountry.set(lead.iso2,lead);
}
if(researchByCountry.size!==24)throw new Error("Not all 24 research jurisdictions have a publisher lead");
const sourcesByCountry=new Map();
for(const source of sourceRegistry.sources){
  const items=sourcesByCountry.get(source.country)||[];
  items.push(source);
  sourcesByCountry.set(source.country,items);
}
const entries=nationalLedger.countryRows.map(row=>{
  const sources=sourcesByCountry.get(row.country)||[];
  if(sources.length!==row.sourceCandidateCount)throw new Error("National source count mismatch: "+row.country);
  const isNew=row.scopeOrigin==="PROPOSED_RESEARCH_COUNTRY";
  const lead=researchByCountry.get(row.countryCode)||null;
  if((isNew&&!lead)||(!isNew&&lead)||
    (lead&&(lead.country!==row.country||lead.region!==row.region||lead.iso2!==row.countryCode))) {
    throw new Error("Research lead identity/scope does not match 101-country ledger: "+row.country);
  }
  const candidateSources=sources.map(s=>{
    if(s.rightsStatus!=="not-reviewed"||s.integrationStatus!=="candidate-only"||
      s.activeAdapterId!==null||s.dataAdmission!=="not-admitted"||
      typeof s.url!=="string"||!s.url.startsWith("https://")) {
      throw new Error("Source rights or URL rejected: "+s.candidateKey);
    }
    return {
      candidateKey:s.candidateKey,
      provider:s.provider,
      domains:s.domains,
      mode:s.mode,
      referenceUrl:s.url,
      rightsStatus:"not-reviewed",
      integrationStatus:"candidate-only"
    };
  });
  return {
    country:row.country,
    iso2:row.countryCode,
    region:row.region,
    coverage:row.scopeOrigin==="PROPOSED_RESEARCH_COUNTRY" ? "research-geography-only" : "source-candidates-only",
    scopeOrigin:row.scopeOrigin,
    candidateSourceCount:row.sourceCandidateCount,
    candidateSources,
    publisherResearchLead:lead ? {
      publisherName:lead.publisherName,
      referenceUrl:lead.referenceUrl,
      leadType:lead.leadType,
      caveat:lead.caveat,
      status:"publisher-reference-only-not-integrated",
      rightsStatus:"not-reviewed"
    } : null,
    datasetAdmission:"not-admitted",
    commercialAndAiReuseApproved:false,
    customerLive:false,
    verifiedProductionCompletionPercent:0,
    nextEvidenceGate:row.nextAction
  };
});
const artifact={
  contract:"novapharm.intelligence.country-client-catalog.v1",
  asOf:"2026-11-18",
  audience:"Protected web and offline Expo iOS/Android source discovery only",
  dataClassification:"public-publisher-reference-metadata-only",
  notForClinicalOrCommercialDecisions:true,
  liveMedicineRowsIncluded:false,
  summary:{
    distinctNationalCountries:nationalLedger.distinctNationalCountries,
    registeredNationalCountries:nationalLedger.existingNationalCountries,
    addedResearchOnlyNationalCountries:nationalLedger.newResearchOnlyCountries,
    sourceCandidatesAcrossAllGroups:nationalLedger.existingSourceCandidates,
    nationalSourceCandidates:nationalLedger.nationalSourceCandidates,
    euEeaAndGlobalSourceCandidates:nationalLedger.existingSourceCandidates-nationalLedger.nationalSourceCandidates,
    verifiedLicensedNationalSources:0,
    customerLiveNationalCountries:0
  },
  countries:entries
};
const body=JSON.stringify(artifact,null,2)+"\n";
const file=new URL("../docs/intelligence/country-101-client-catalog-20261118.json",import.meta.url);
if(process.argv.length!==3 || !["--check","--write"].includes(process.argv[2])){
  throw new Error("Usage: node scripts/generate-intelligence-country-client-catalog.mjs --check|--write");
}
if(process.argv[2]==="--write"){
  writeFileSync(file,body,{flag:"w"});
}else{
  if(readFileSync(file,"utf8")!==body)throw new Error("Country client catalogue is stale or has diverged from canonical source evidence");
}
console.log("101-country client catalogue verified; zero licensed or customer-live national datasets");
