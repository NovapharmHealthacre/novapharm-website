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
    assert.equal(c.coverage,c.candidateSourceCount===0 ? "research-geography-only" : "source-candidates-only");
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
  assert.match(panel,/<Text style=\{styles\.name\} accessibilityRole="header">/);
  assert.doesNotMatch(panel,/<View style=\{\[styles\.card,[^\n]*\}\s+accessible\b/,
    "An accessible parent card can hide its nested publisher button from assistive technology");
  assert.match(panel,/No live medicine records/);
  assert.doesNotMatch(panel,/\bfetch\s*\(|XMLHttpRequest|Authorization:|access_token|client_secret|SecureStore|AsyncStorage/i);
  const nativePackage=JSON.parse(read("native/novapharm-intelligence-mobile/package.json"));
  assert.equal(nativePackage.private,true);
  assert.equal(JSON.parse(read("native/novapharm-intelligence-mobile/app.json")).expo.ios.bundleIdentifier,undefined);
  assert.equal(JSON.parse(read("native/novapharm-intelligence-mobile/app.json")).expo.android.package,undefined);
});

test("owner-supplied 77-country source requirements remain provenance-labelled and offline across web/iOS/Android", () => {
  const owner = JSON.parse(read("docs/intelligence/owner-national-pharma-source-brief-20261120.json"));
  assert.equal(owner.contract, "novapharm.intelligence.owner-national-source-brief.v1");
  assert.equal(owner.visibility, "internal-reference-metadata-only");
  assert.equal(owner.source.independentlyVerified, false);
  assert.equal(owner.noPatientOrMedicineRecords, true);
  assert.equal(owner.doesNotConferDataLicence, true);
  assert.equal(owner.executableApisEnabled, false);
  assert.equal(owner.distributionOrAiReuseApproved, false);
  assert.equal(owner.summary.ownerListedNationalCountries, 77);
  assert.equal(owner.summary.sourceReferenceLinks, 86);
  assert.equal(owner.summary.customerLiveSources, 0);
  assert.equal(owner.countries.length, 77);
  assert.equal(new Set(owner.countries.map(c => c.iso2)).size, 77);
  const canonical = shared.countries.filter(c => c.candidateSourceCount > 0);
  assert.deepEqual(owner.countries.map(c => c.iso2).sort(), canonical.map(c => c.iso2).sort());
  assert.equal(owner.countries.reduce((n, c) => n + c.references.length, 0), 86);
  for (const country of owner.countries) {
    assert.ok(country.pharmaceuticalDataRequired.length > 5);
    assert.ok(country.sourceAccessAsSupplied.length > 3);
    assert.equal(country.rightsStatus, "not-reviewed");
    assert.equal(country.dataAdmission, "not-admitted");
    assert.equal(country.liveApiConnected, false);
    for (const ref of country.references) {
      const url = new URL(ref.url);
      assert.equal(url.protocol, "https:");
      assert.equal(url.username, "");
      assert.equal(url.password, "");
      assert.equal(url.hash, "");
      assert.equal(ref.sourceVerified, false);
      assert.equal(ref.accessLicensed, false);
      assert.equal(ref.apiConnected, false);
      assert.equal(url.searchParams.has("utm_source"), false);
    }
  }
  const web = read("apps/portal/components/country-source-coverage.tsx");
  const native = read("native/novapharm-intelligence-mobile/CountryDirectoryScreen.tsx");
  assert.match(web, /owner-national-pharma-source-brief-20261120\\.json/);
  assert.match(native, /owner-national-pharma-source-brief-20261120\\.json/);
  assert.match(web, /Owner-supplied pharmaceutical research brief/);
  assert.match(native, /Owner-supplied national research requirements/);
  assert.doesNotMatch(native, /\\bfetch\\s*\\(|XMLHttpRequest|Authorization:|client_secret|access_token/i);
  assert.doesNotMatch(web, /\\bfetch\\s*\\(|gatewayJson\\s*\\(|Authorization:|client_secret|access_token/i);
});
