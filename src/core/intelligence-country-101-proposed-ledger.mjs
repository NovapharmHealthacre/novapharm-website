/**
 * Read-only geographic expansion of the 77-country/101-source release ledger.
 * The 24 additional jurisdictions have ZERO registered pharmaceutical sources.
 * No caller-supplied flags can grant upstream access or production publication.
 */
import { buildCountryReleaseLedger } from "./intelligence-country-release-ledger.mjs";
import { COUNTRY_ISO2 } from "./intelligence-country-iso-identifiers.mjs";

export const COUNTRY_101_LEDGER_CONTRACT = "novapharm.intelligence.country-101-scope-ledger.v1";
export const PROPOSED_NEW_COUNTRY_ISO2 = Object.freeze({
  "Cyprus":"CY","Iceland":"IS","Liechtenstein":"LI","Luxembourg":"LU","Malta":"MT",
  "Bolivia":"BO","Costa Rica":"CR","Dominican Republic":"DO","Guatemala":"GT","Panama":"PA","Paraguay":"PY",
  "Armenia":"AM","Cambodia":"KH","Georgia":"GE","Mongolia":"MN","Myanmar":"MM",
  "Botswana":"BW","Cameroon":"CM","Côte d’Ivoire":"CI","Namibia":"NA","Senegal":"SN","Tunisia":"TN","Zambia":"ZM","Zimbabwe":"ZW"
});
const REGION_COUNT = Object.freeze({Europe:5,Americas:6,Asia:5,Africa:8});
const fail = why => {throw new Error("101-country proposed ledger rejected: "+why);};
const newCountryState = "GEOGRAPHIC_RESEARCH_SCOPE_ONLY_NO_DATA_SOURCE";
const registeredState = "REGISTERED_SOURCE_CANDIDATE_NO_APPROVED_DATA";

export function buildProposedCountry101Ledger(registry, plan) {
  if (!registry || typeof registry!=="object" || Array.isArray(registry) ||
      !Array.isArray(registry.sources)) fail("invalid source registry");
  const base = buildCountryReleaseLedger(registry.sources);
  if (!plan || typeof plan!=="object" || Array.isArray(plan) ||
      plan.schema!=="novapharm.intelligence.country-101-scope-proposal.v1" ||
      plan.baselineNationalCountries!==77 || plan.baselineSourceCandidates!==101 ||
      plan.targetDistinctNationalCountries!==101 ||
      !Array.isArray(plan.baselineNonCountryGroups) ||
      plan.baselineNonCountryGroups.length!==2 ||
      plan.baselineNonCountryGroups[0]!=="European Union / EEA" ||
      plan.baselineNonCountryGroups[1]!=="Global" ||
      !Array.isArray(plan.proposedCountries) || plan.proposedCountries.length!==24) {
    fail("scope proposal identity or totals");
  }
  if (base.nationalCountries!==77 || base.totalSources!==101 ||
      base.supranationalAndGlobalGroups!==2 ||
      Object.keys(PROPOSED_NEW_COUNTRY_ISO2).length!==24 ||
      Object.keys(COUNTRY_ISO2).length!==77) fail("baseline source and jurisdiction boundaries");
  const priorCodes = new Set(Object.values(COUNTRY_ISO2));
  const newCodes = new Set();
  const newNames = new Set();
  const regionalCounts = {Europe:0,Americas:0,Asia:0,Africa:0};
  const additional = plan.proposedCountries.map(entry => {
    if (!entry || typeof entry!=="object" || Array.isArray(entry) ||
        typeof entry.country!=="string" ||
        !Object.hasOwn(PROPOSED_NEW_COUNTRY_ISO2,entry.country) ||
        entry.iso2!==PROPOSED_NEW_COUNTRY_ISO2[entry.country] ||
        !Object.hasOwn(regionalCounts,entry.region) ||
        typeof entry.authorityDirectory!=="string" ||
        !/^https:\/\/(?:www\.ema\.europa\.eu|www\.paho\.org|www\.who\.int|risp\.auda-nepad\.org)\//u.test(entry.authorityDirectory) ||
        entry.apiEndpoint!==null || entry.apiValidated!==false ||
        entry.sourceDiscovery!=="pending" ||
        entry.rightsStatus!=="not-reviewed" ||
        entry.datasetAdmitted!==false || entry.customerCountryLive!==false ||
        priorCodes.has(entry.iso2) || newCodes.has(entry.iso2) ||
        newNames.has(entry.country) || Object.hasOwn(COUNTRY_ISO2,entry.country)) {
      fail("unverified or spoofed added national research scope");
    }
    regionalCounts[entry.region]++;
    newCodes.add(entry.iso2);
    newNames.add(entry.country);
    return Object.freeze({
      country:entry.country,
      countryCode:entry.iso2,
      region:entry.region,
      groupType:"NATIONAL",
      scopeOrigin:"PROPOSED_RESEARCH_COUNTRY",
      sourceCandidateCount:0,
      codedAdapterCandidateCount:0,
      engineeringMilestonePercent:0,
      readiness:newCountryState,
      sourceRightsVerified:false,
      acceptedDatasets:0,
      customerEnabled:false,
      verifiedProductionCompletionPercent:0,
      releaseDecision:"BLOCKED_PENDING_OFFICIAL_SOURCE_DISCOVERY_AND_ALL_RELEASE_GATES",
      nextAction:"Identify an authoritative medicine-level dataset and verify source access, rights and schema"
    });
  });
  for (const [region,needed] of Object.entries(REGION_COUNT)) {
    if (regionalCounts[region]!==needed) fail("regional scope substitution");
  }
  const baselineCountries=base.countries.filter(x=>x.groupType==="NATIONAL").map(c=>{
    if (!Object.hasOwn(COUNTRY_ISO2,c.country) || COUNTRY_ISO2[c.country]!==c.countryCode ||
        newCodes.has(c.countryCode)) fail("baseline country identity collision");
    return Object.freeze({
      country:c.country,
      countryCode:c.countryCode,
      region:c.region,
      groupType:"NATIONAL",
      scopeOrigin:"EXISTING_DISCOVERY_REGISTER",
      sourceCandidateCount:c.candidateSourceCount,
      codedAdapterCandidateCount:c.codedAdapterCandidateCount,
      engineeringMilestonePercent:c.engineeringMilestonePercent,
      readiness:registeredState,
      sourceRightsVerified:false,
      acceptedDatasets:0,
      customerEnabled:false,
      verifiedProductionCompletionPercent:0,
      releaseDecision:"BLOCKED_PENDING_ALL_SOURCE_SPECIFIC_GATES",
      nextAction:"Approve publisher rights, bounded source intake, independent snapshot and production acceptance"
    });
  });
  if (baselineCountries.length!==77 || additional.length!==24 ||
      new Set([...baselineCountries,...additional].map(x=>x.countryCode)).size!==101) {
    fail("101 unique national identities");
  }
  const rows=Object.freeze([...baselineCountries,...additional]
    .sort((a,b)=>a.country.localeCompare(b.country,"en")));
  if (rows.reduce((n,x)=>n+x.sourceCandidateCount,0)!==base.nationalSourceCandidates ||
      rows.some(x=>x.customerEnabled || x.sourceRightsVerified ||
        x.verifiedProductionCompletionPercent!==0 || x.acceptedDatasets!==0)) {
    fail("source or production evidence inflation");
  }
  return Object.freeze({
    contract:COUNTRY_101_LEDGER_CONTRACT,
    scope:"PROPOSED_GEOGRAPHIC_COVERAGE_NOT_LICENSED_DATA_OR_PRODUCTION",
    distinctNationalCountries:101,
    existingNationalCountries:77,
    newResearchOnlyCountries:24,
    existingSourceCandidates:base.totalSources,
    nationalSourceCandidates:base.nationalSourceCandidates,
    nationalCountriesWithNoRegisteredDataSource:24,
    euEeaAndGlobalSourceGroups:2,
    verifiedLicensedNationalSources:0,
    verifiedNationalDatasetsAdmitted:0,
    verifiedCustomerLiveCountries:0,
    countryRows:rows
  });
}

export function assertProposedCountriesProductionReady(_report) {
  fail("proposed national scope and source discovery are not production readiness");
}
