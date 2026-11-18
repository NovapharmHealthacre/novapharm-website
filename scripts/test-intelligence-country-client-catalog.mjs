import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import test from "node:test";
import {buildProposedCountry101Ledger} from "../src/core/intelligence-country-101-proposed-ledger.mjs";
const read=name=>readFileSync(new URL("../"+name,import.meta.url),"utf8");
const registry=JSON.parse(read("docs/intelligence/global-pharma-sources-20261117.json"));
const proposal=JSON.parse(read("docs/intelligence/country-101-scope-proposal-20261118.json"));
const shared=JSON.parse(read("docs/intelligence/country-101-client-catalog-20261118.json"));

test("web, Android and iOS share exactly 101 scoped country candidates with zero live medicine data",()=>{
  const canonical=buildProposedCountry101Ledger(registry,proposal);
  assert.equal(shared.contract,"novapharm.intelligence.country-client-catalog.v1");
  assert.equal(shared.countries.length,101);
  assert.equal(shared.summary.distinctNationalCountries,101);
  assert.equal(shared.summary.registeredNationalCountries,77);
  assert.equal(shared.summary.addedResearchOnlyNationalCountries,24);
  assert.equal(shared.summary.sourceCandidatesAcrossAllGroups,101);
  assert.equal(shared.summary.nationalSourceCandidates,89);
  assert.equal(shared.summary.euEeaAndGlobalSourceCandidates,12);
  assert.equal(shared.summary.verifiedLicensedNationalSources,0);
  assert.equal(shared.summary.customerLiveNationalCountries,0);
  assert.equal(shared.liveMedicineRowsIncluded,false);
  assert.equal(shared.notForClinicalOrCommercialDecisions,true);
  assert.deepEqual(shared.countries.map(c=>c.iso2),canonical.countryRows.map(c=>c.countryCode));
  const candidateSourceCount=shared.countries.reduce((n,c)=>n+c.candidateSourceCount,0);
  assert.equal(candidateSourceCount,89);
  assert.equal(shared.countries.filter(c=>c.candidateSourceCount===0).length,24);
  assert.equal(new Set(shared.countries.map(c=>c.iso2)).size,101);
  for(const c of shared.countries){
    assert.equal(c.datasetAdmission,"not-admitted");
    assert.equal(c.customerLive,false);
    assert.equal(c.commercialAndAiReuseApproved,false);
    assert.equal(c.verifiedProductionCompletionPercent,0);
    assert.equal(c.coverage,"source-candidates-only");
    assert.equal(c.candidateSourceCount,c.candidateSources.length);
    const expected=registry.sources.filter(s=>s.country===c.country);
    assert.deepEqual(c.candidateSources.map(s=>s.candidateKey),expected.map(s=>s.candidateKey));
    for(const s of c.candidateSources){
      assert.equal(s.rightsStatus,"not-reviewed");
      assert.equal(s.integrationStatus,"candidate-only");
      assert.ok(s.referenceUrl.startsWith("https://"));
      const u=new URL(s.referenceUrl);
      assert.equal(u.username,"");
      assert.equal(u.password,"");
      assert.equal(u.hash,"");
      assert.equal(u.protocol,"https:");
    }
  }
});

test("client candidate metadata must reproduce byte-for-byte from the independently gated registry",()=>{
  const check=spawnSync(process.execPath,[
    new URL("../scripts/generate-intelligence-country-client-catalog.mjs",import.meta.url).pathname,
    "--check"
  ],{encoding:"utf8",timeout:10000});
  assert.equal(check.status,0,check.stderr||check.stdout);
  assert.match(check.stdout,/101-country client catalogue verified/);
});

test("web portal renders candidates only through existing protected Data Sources workspace",()=>{
  const page=read("apps/portal/components/medicines-intelligence.tsx");
  const panel=read("apps/portal/components/country-source-coverage.tsx");
  const routes=read("apps/portal/data/routes.ts");
  assert.match(page,/import \{ CountrySourceCoverage \}/);
  assert.match(page,/current === "data-sources"\) central =[\s\S]*?<CountrySourceCoverage \/>/);
  assert.match(routes,/\/portal\/executive-platform\/medicines-intelligence\//);
  assert.match(routes,/"data-sources"/);
  assert.match(panel,/country-101-client-catalog-20261118\.json/);
  assert.match(panel,/Customer-live countries/);
  assert.doesNotMatch(panel,/\bfetch\s*\(|\bgatewayJson\s*\(|\bAuthorization\b|access_token|client_secret/i);
});

test("same offline public-source catalogue is used on Expo iOS and Android, with no upstream or credential access",()=>{
  const app=read("native/novapharm-intelligence-mobile/App.tsx");
  const panel=read("native/novapharm-intelligence-mobile/CountryDirectoryScreen.tsx");
  assert.match(app,/screen: "countries", label: "Countries"/);
  assert.match(app,/<CountryDirectoryScreen\s*\/>/);
  assert.match(panel,/country-101-client-catalog-20261118\.json/);
  assert.match(panel,/\bFlatList\b/);
  assert.match(panel,/\baccessibilityLabel=/);
  assert.match(panel,/No live medicine records/);
  assert.doesNotMatch(panel,/\bfetch\s*\(|XMLHttpRequest|Authorization:|access_token|client_secret|SecureStore|AsyncStorage/i);
  const nativePackage=JSON.parse(read("native/novapharm-intelligence-mobile/package.json"));
  assert.equal(nativePackage.private,true);
  assert.equal(JSON.parse(read("native/novapharm-intelligence-mobile/app.json")).expo.ios.bundleIdentifier,undefined);
  assert.equal(JSON.parse(read("native/novapharm-intelligence-mobile/app.json")).expo.android.package,undefined);
});
