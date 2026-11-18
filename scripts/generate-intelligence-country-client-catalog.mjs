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
const sourcesByCountry=new Map();
for(const source of sourceRegistry.sources){
  const items=sourcesByCountry.get(source.country)||[];
  items.push(source);
  sourcesByCountry.set(source.country,items);
}
const entries=nationalLedger.countryRows.map(row=>{
  const sources=sourcesByCountry.get(row.country)||[];
  if(sources.length!==row.sourceCandidateCount)throw new Error("National source count mismatch: "+row.country);
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
    coverage:"source-candidates-only",
    scopeOrigin:row.scopeOrigin,
    candidateSourceCount:row.sourceCandidateCount,
    candidateSources,
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
