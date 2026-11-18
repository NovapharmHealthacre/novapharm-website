import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {
  buildGlobalSourceOnboardingCoverage,
  CANDIDATE_API_BINDINGS,
  assertAllCountriesLive,
  EXPECTED_SOURCE_CANDIDATES
} from "../src/core/intelligence-global-source-onboarding.mjs";
import {sourcePlans} from "../src/core/intelligence-global-source-gateway.mjs";
const registry=JSON.parse(readFileSync(new URL("../docs/intelligence/global-pharma-sources-20261117.json",import.meta.url),"utf8")).sources;
const coverage=buildGlobalSourceOnboardingCoverage(registry);

test("every one of 101 global source candidates is routed with identity and outstanding production gates",()=>{
  assert.equal(coverage.totalSourceCandidates,EXPECTED_SOURCE_CANDIDATES);
  assert.equal(coverage.distinctJurisdictionAndGlobalLabels,79);
  assert.deepEqual(new Set(coverage.sourceEntries.map(x=>x.candidateKey)),new Set(registry.map(x=>x.candidateKey)));
  for(const entry of coverage.sourceEntries){
    assert.ok(entry.onboardingRoute);
    assert.ok(entry.officialReferenceUrl.startsWith("https://"));
    assert.ok(entry.requiredGates.length>=5);
    assert.equal(entry.productionRuntimeConnected,false);
    assert.equal(entry.authorisedApiResponseSeen,false);
    assert.equal(entry.sourceRecordsAdmitted,false);
    assert.equal(entry.mobileDataEnabled,false);
    assert.equal(entry.commercialAndAiReuseApproved,false);
    assert.equal(entry.sourceRights,"NOT_REVIEWED");
  }
  assert.equal(coverage.liveSourceConnections,0);
  assert.equal(coverage.admittedSourceDatasets,0);
  assert.equal(coverage.customerExposedSourceDatasets,0);
});
test("modes are explicitly classified; API page != working API and downloads need distinct flow",()=>{
  assert.equal(coverage.advertisedApiRelated,35);
  assert.equal(coverage.advertisedDownloadOnlyRelated,26);
  assert.equal(coverage.advertisedPortalDiscoveryOther,40);
  assert.equal(coverage.advertisedApiRelated+coverage.advertisedDownloadOnlyRelated+coverage.advertisedPortalDiscoveryOther,101);
  const example=coverage.sourceEntries.find(x=>x.candidateKey==="asia-pacific-malaysia-npra-kkmnow");
  assert.equal(example.onboardingRoute,"VERSIONED_OFFICIAL_FILE_CANDIDATE");
  assert.equal(example.productionRuntimeConnected,false);
});
test("all mapped API bindings must exist as code or remain explicit unfunded work",()=>{
  for(const [key,adapter] of Object.entries(CANDIDATE_API_BINDINGS)){
    const row=coverage.sourceEntries.find(x=>x.candidateKey===key);
    assert.ok(row);
    if(Object.hasOwn(sourcePlans,adapter)){
      assert.equal(row.engineeringState,"BOUNDED_API_PREVIEW_CODE_ONLY");
      assert.equal(row.implementationId,adapter);
    }else{
      assert.equal(row.engineeringState,"NO_ADAPTER_IMPLEMENTED");
      assert.equal(row.implementationId,null);
    }
  }
});
test("existing NHSBSA alias remains private/discovery-only, not a licensed customer data feed",()=>{
  const row=coverage.sourceEntries.find(x=>x.candidateKey==="europe-united-kingdom-nhsbsa-english-prescribing-dataset");
  assert.equal(row.implementationId,"nhsbsa.epd");
  assert.equal(row.engineeringState,"PRIVATE_DISCOVERY_ALIAS_ONLY");
  assert.equal(row.productionRuntimeConnected,false);
});
test("registry tampering and fake rights approval cannot self-create an API connection",()=>{
  assert.throws(()=>buildGlobalSourceOnboardingCoverage(registry.slice(1)),/expected 101/);
  const fake=registry.map((x,i)=>i===0?{...x,rightsStatus:"approved"}:x);
  assert.throws(()=>buildGlobalSourceOnboardingCoverage(fake),/candidate state/);
  const fake2=registry.map((x,i)=>i===0?{...x,mode:"API-LIVE"}:x);
  assert.throws(()=>buildGlobalSourceOnboardingCoverage(fake2),/candidate state/);
  const duplicate=registry.map((x,i)=>i===1?{...x,candidateKey:registry[0].candidateKey}:x);
  assert.throws(()=>buildGlobalSourceOnboardingCoverage(duplicate),/duplicate candidate/);
  assert.throws(()=>assertAllCountriesLive(coverage),/cannot be asserted/);
});

test("unreviewed source registry rejects private and malformed HTTPS hosts", () => {
  const unsafeUrls = [
    "https://127.0.0.1/admin",
    "https://0177.0.0.1/metadata",
    "https://[::1]/private",
    "https://localhost/preview",
    "https://dataset.local/private",
    "https://service.internal/private",
    "https://dataset.example.test/data",
    "https://official.gov:8443/preview",
    "https://-bad.gov/data",
    "https://bad-.gov/data",
    "https://gov..example/data"
  ];
  for (const url of unsafeUrls) {
    const tampered = registry.map((entry, i) => i === 0 ? { ...entry, url } : entry);
    assert.throws(() => buildGlobalSourceOnboardingCoverage(tampered),
      /untrusted source reference (host|URL)/, url);
  }
  assert.equal(buildGlobalSourceOnboardingCoverage(registry).totalSourceCandidates, 101);
});
