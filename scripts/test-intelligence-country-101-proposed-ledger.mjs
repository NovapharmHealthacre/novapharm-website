import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {
  buildProposedCountry101Ledger,
  assertProposedCountriesProductionReady,
  PROPOSED_NEW_COUNTRY_ISO2
} from "../src/core/intelligence-country-101-proposed-ledger.mjs";
import {COUNTRY_ISO2} from "../src/core/intelligence-country-iso-identifiers.mjs";
const registry=JSON.parse(readFileSync(new URL("../docs/intelligence/global-pharma-sources-20261117.json",import.meta.url),"utf8"));
const proposal=JSON.parse(readFileSync(new URL("../docs/intelligence/country-101-scope-proposal-20261118.json",import.meta.url),"utf8"));
const build=(r=registry,p=proposal)=>buildProposedCountry101Ledger(r,p);

test("101 distinct national release rows, not 101 connected medicine feeds",()=>{
  const report=build();
  assert.equal(report.distinctNationalCountries,101);
  assert.equal(report.countryRows.length,101);
  assert.equal(report.existingNationalCountries,77);
  assert.equal(report.newResearchOnlyCountries,24);
  assert.equal(report.existingSourceCandidates,101);
  assert.equal(report.nationalSourceCandidates,89);
  assert.equal(report.nationalCountriesWithNoRegisteredDataSource,24);
  assert.equal(report.verifiedLicensedNationalSources,0);
  assert.equal(report.verifiedNationalDatasetsAdmitted,0);
  assert.equal(report.verifiedCustomerLiveCountries,0);
  assert.equal(new Set(report.countryRows.map(x=>x.countryCode)).size,101);
  assert.equal(report.countryRows.filter(x=>x.scopeOrigin==="PROPOSED_RESEARCH_COUNTRY").length,24);
  assert.equal(report.countryRows.filter(x=>x.scopeOrigin==="EXISTING_DISCOVERY_REGISTER").length,77);
  for(const row of report.countryRows){
    assert.equal(row.sourceRightsVerified,false);
    assert.equal(row.customerEnabled,false);
    assert.equal(row.acceptedDatasets,0);
    assert.equal(row.verifiedProductionCompletionPercent,0);
    assert.match(row.releaseDecision,/^BLOCKED_/u);
  }
  for(const row of report.countryRows.filter(x=>x.scopeOrigin==="PROPOSED_RESEARCH_COUNTRY")){
    assert.equal(row.sourceCandidateCount,0);
    assert.equal(row.codedAdapterCandidateCount,0);
    assert.equal(row.engineeringMilestonePercent,0);
    assert.equal(row.countryCode,PROPOSED_NEW_COUNTRY_ISO2[row.country]);
  }
  for(const row of report.countryRows.filter(x=>x.scopeOrigin==="EXISTING_DISCOVERY_REGISTER")){
    assert.equal(row.countryCode,COUNTRY_ISO2[row.country]);
    assert.ok(row.sourceCandidateCount>=1);
  }
  assert.equal(Object.isFrozen(report),true);
  assert.equal(Object.isFrozen(report.countryRows),true);
  assert.ok(report.countryRows.every(Object.isFrozen));
  assert.throws(()=>assertProposedCountriesProductionReady(report),/not production readiness/);
});

test("missing country and invented approved data cannot pass geographic audit",()=>{
  const cases=[
    p=>p.proposedCountries.pop(),
    p=>{p.proposedCountries[0].country="United States"},
    p=>{p.proposedCountries[0].iso2="GB"},
    p=>{p.proposedCountries[0].iso2="ZZ"},
    p=>{p.proposedCountries[0].apiEndpoint="https://example.org/medicines"},
    p=>{p.proposedCountries[0].apiValidated=true},
    p=>{p.proposedCountries[0].sourceDiscovery="approved"},
    p=>{p.proposedCountries[0].rightsStatus="approved"},
    p=>{p.proposedCountries[0].datasetAdmitted=true},
    p=>{p.proposedCountries[0].customerCountryLive=true},
    p=>{p.proposedCountries[0].authorityDirectory="https://evil.example/"},
    p=>{p.proposedCountries[0].region="North America"},
    p=>{p.targetDistinctNationalCountries=102},
    p=>{p.baselineNationalCountries=78},
    p=>{p.baselineSourceCandidates=100},
    p=>{p.baselineNonCountryGroups=["Global","European Union / EEA"]}
  ];
  for(const edit of cases){
    const changed=structuredClone(proposal);
    edit(changed);
    assert.throws(()=>build(registry,changed));
  }
});

test("original 101 sources remain canonical and cannot be manufactured by the country expansion",()=>{
  const changed=structuredClone(registry);
  changed.sources.pop();
  assert.throws(()=>build(changed,proposal),/101-source/);
  const first=structuredClone(registry);
  first.sources[0].rightsStatus="approved";
  assert.throws(()=>build(first,proposal));
  const second=structuredClone(registry);
  second.sources[0].activeAdapterId="invented";
  assert.throws(()=>build(second,proposal));
  const third=structuredClone(registry);
  third.sources[0].integrationStatus="live";
  assert.throws(()=>build(third,proposal));
});
