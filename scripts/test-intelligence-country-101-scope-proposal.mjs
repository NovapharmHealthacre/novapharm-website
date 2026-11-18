import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { COUNTRY_ISO2 } from "../src/core/intelligence-country-iso-identifiers.mjs";

const root = new URL("../", import.meta.url);
const registry = JSON.parse(readFileSync(new URL("docs/intelligence/global-pharma-sources-20261117.json", root), "utf8"));
const proposal = JSON.parse(readFileSync(new URL("docs/intelligence/country-101-scope-proposal-20261118.json", root), "utf8"));
const directoryOrigins = new Set(["www.ema.europa.eu","www.paho.org","www.who.int","risp.auda-nepad.org"]);
const normalized = value => String(value).normalize("NFKC").trim().toLocaleLowerCase("en");
const EXPANSION_ISO2 = Object.freeze({
  Cyprus:"CY",Iceland:"IS",Liechtenstein:"LI",Luxembourg:"LU",Malta:"MT",
  Bolivia:"BO","Costa Rica":"CR","Dominican Republic":"DO",Guatemala:"GT",Panama:"PA",Paraguay:"PY",
  Armenia:"AM",Cambodia:"KH",Georgia:"GE",Mongolia:"MN",Myanmar:"MM",
  Botswana:"BW",Cameroon:"CM","Côte d’Ivoire":"CI",Namibia:"NA",Senegal:"SN",Tunisia:"TN",Zambia:"ZM",Zimbabwe:"ZW"
});

export function auditCountry101Proposal(baseline, plan) {
  assert.equal(baseline.schema,"novapharm.intelligence.global-source-candidates.v2");
  assert.equal(plan.schema,"novapharm.intelligence.country-101-scope-proposal.v1");
  assert.ok(Array.isArray(baseline.sources));
  assert.equal(baseline.sources.length,plan.baselineSourceCandidates);
  assert.equal(baseline.sources.length,101,"Source candidate count must be separate from country count");
  assert.deepEqual(plan.baselineNonCountryGroups,["European Union / EEA","Global"]);
  const countryLabels = [...new Set(baseline.sources.map(x=>x.country))];
  const existing = new Set(countryLabels.filter(x=>!plan.baselineNonCountryGroups.includes(x)).map(normalized));
  assert.equal(existing.size,plan.baselineNationalCountries);
  assert.equal(existing.size,77,"Existing 77-country source baseline must be separately preserved");
  assert.equal(Object.keys(COUNTRY_ISO2).length,77,"Canonical ISO registry must cover baseline countries");
  const baselineCodes = new Set(Object.values(COUNTRY_ISO2));
  assert.equal(baselineCodes.size,77,"Baseline ISO identities cannot duplicate");
  for(const country of Object.keys(COUNTRY_ISO2)) {
    assert.ok(existing.has(normalized(country)),"Canonical country identity is missing from source registry: "+country);
  }
  assert.equal(Object.keys(EXPANSION_ISO2).length,24,"24 new names require independent immutable ISO mapping");
  assert.equal(plan.targetDistinctNationalCountries,101);
  assert.ok(Array.isArray(plan.proposedCountries));
  assert.equal(plan.proposedCountries.length,24,"The geographic scope gap must be exactly 24 nations");
  const keys = new Set(), codes = new Set(), counters = {Europe:0,Americas:0,Asia:0,Africa:0};
  for(const entry of plan.proposedCountries) {
    assert.equal(typeof entry.country,"string");
    assert.ok(entry.country.trim().length>1 && entry.country.length<=80);
    assert.ok(!/[\p{Cc}\p{Cf}\p{Cs}]/u.test(entry.country),"No hidden or bidi control in country label");
    const key=normalized(entry.country);
    assert.ok(!existing.has(key),"Proposed country already exists in baseline: "+entry.country);
    assert.ok(!keys.has(key),"Duplicate proposed country: "+entry.country);keys.add(key);
    assert.match(entry.iso2,/^[A-Z]{2}$/u);
    assert.ok(!baselineCodes.has(entry.iso2),"Proposed ISO code already used by a baseline country: "+entry.iso2);
    assert.ok(Object.hasOwn(EXPANSION_ISO2,entry.country),"Unapproved country replacement");
    assert.equal(entry.iso2,EXPANSION_ISO2[entry.country],"Country name and ISO code mismatch");
    assert.ok(!codes.has(entry.iso2),"Duplicate ISO code: "+entry.iso2);codes.add(entry.iso2);
    assert.ok(Object.hasOwn(counters,entry.region),"Unsupported region");
    counters[entry.region]++;
    const uri=new URL(entry.authorityDirectory);
    assert.equal(uri.protocol,"https:");
    assert.ok(directoryOrigins.has(uri.hostname),"Research reference must remain in an authoritative directory");
    assert.equal(uri.username,"");assert.equal(uri.password,"");
    assert.equal(entry.sourceDiscovery,"pending");
    assert.equal(entry.apiEndpoint,null,"No unverified national API or synthetic integration URL");
    assert.equal(entry.apiValidated,false);
    assert.equal(entry.rightsStatus,"not-reviewed");
    assert.equal(entry.datasetAdmitted,false);
    assert.equal(entry.customerCountryLive,false);
  }
  assert.deepEqual(counters,{Europe:5,Americas:6,Asia:5,Africa:8});
  assert.equal(existing.size+keys.size,plan.targetDistinctNationalCountries);
  return Object.freeze({
    existingNationalCountries:existing.size,
    proposedResearchCountries:keys.size,
    proposedDistinctNationalScope:existing.size+keys.size,
    sourceCandidates:baseline.sources.length,
    apiIntegrationsEstablishedByProposal:0,
    rightsApprovedByProposal:0,
    customerLiveCountriesEstablishedByProposal:0
  });
}

test("source registry remains 101 candidates in 77 countries; proposal adds 24 unique countries only",()=>{
  assert.deepEqual(auditCountry101Proposal(registry,proposal),{
    existingNationalCountries:77,
    proposedResearchCountries:24,
    proposedDistinctNationalScope:101,
    sourceCandidates:101,
    apiIntegrationsEstablishedByProposal:0,
    rightsApprovedByProposal:0,
    customerLiveCountriesEstablishedByProposal:0
  });
});

test("duplicate or existing national country cannot inflate proposed 101-country scope",()=>{
  const changed=structuredClone(proposal);
  changed.proposedCountries[0].country="United States";
  assert.throws(()=>auditCountry101Proposal(registry,changed),/already exists/);
  changed.proposedCountries[0].country=changed.proposedCountries[1].country;
  assert.throws(()=>auditCountry101Proposal(registry,changed),/Duplicate proposed country/);
});

test("fabricated API, approved rights, publication or unauthorized directory fails closed",()=>{
  for(const patch of [
    {apiEndpoint:"https://example.com/all-drugs.json"},
    {apiValidated:true},
    {rightsStatus:"approved"},
    {datasetAdmitted:true},
    {customerCountryLive:true},
    {authorityDirectory:"https://attacker.example/medicines"}
  ]){
    const changed=structuredClone(proposal);
    Object.assign(changed.proposedCountries[0],patch);
    assert.throws(()=>auditCountry101Proposal(registry,changed));
  }
});

test("count and ISO spoofing cannot silently reclassify 101 candidate sources as countries",()=>{
  for(const patch of [
    {baselineSourceCandidates:100},
    {baselineNationalCountries:101},
    {targetDistinctNationalCountries:102}
  ]) {
    assert.throws(()=>auditCountry101Proposal(registry,{...proposal,...patch}));
  }
  const changed=structuredClone(proposal);
  changed.proposedCountries[0].iso2=changed.proposedCountries[1].iso2;
  assert.throws(()=>auditCountry101Proposal(registry,changed),/(Duplicate ISO code|Country name and ISO code mismatch)/);
  const baselineCollision=structuredClone(proposal);
  baselineCollision.proposedCountries[0].iso2="GB";
  assert.throws(()=>auditCountry101Proposal(registry,baselineCollision),/already used by a baseline country/);
  const wrongIso=structuredClone(proposal);
  wrongIso.proposedCountries[0].iso2="ZZ";
  assert.throws(()=>auditCountry101Proposal(registry,wrongIso),/Country name and ISO code mismatch/);
});
