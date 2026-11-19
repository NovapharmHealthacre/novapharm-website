import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {
  buildGlobalSourceOnboardingCoverage,
  CANDIDATE_API_BINDINGS,
  assertAllCountriesLive,
  EXPECTED_SOURCE_CANDIDATES,
  PUBLIC_PUBLISHER_TERMS_PRESCREEN_20261119,
  SOURCE_ONLY_HTTP_PROBE_CI_CHECKPOINTS_20261118,
  buildPublisherRightsPrescreenWorklist
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


test("all 101 candidates have a complete, closed publisher-rights worklist", () => {
  const worklist = buildPublisherRightsPrescreenWorklist(registry);
  assert.equal(worklist.contract, "novapharm.intelligence.publisher-terms-prescreen.v1");
  assert.equal(worklist.totalSourceCandidates, 101);
  assert.equal(worklist.publicPublisherNoticesLocated, 7);
  assert.equal(worklist.publiclyRestrictedBetaBusinessSources, 1);
  assert.equal(worklist.sourceOnlyHttpProbeCiCheckpointCount, 4);
  assert.equal(worklist.independentlyLicensedSourceCandidates, 0);
  assert.equal(worklist.customerLiveSourceCandidates, 0);
  assert.deepEqual(
    new Set(worklist.sourceEntries.map(x => x.candidateKey)),
    new Set(registry.map(x => x.candidateKey))
  );
  for (const entry of worklist.sourceEntries) {
    assert.equal(entry.productionRightsGranted, false);
    assert.equal(entry.customerLive, false);
    assert.equal(entry.productionDatasetAdmitted, false);
    assert.equal(entry.liveIngestedRecordCount, 0);
    assert.equal(entry.termsSha256IndependentlyVerified, null);
    assert.equal(entry.signedGrantReceiptSha256, null);
    assert.deepEqual(entry.legallyAcceptedUses, []);
    assert.ok(entry.outstandingRightsRequirements.length >= 2);
    assert.equal(Object.isFrozen(entry), true);
  }
});

test("seven official publisher notices must never become production licence approvals", () => {
  const worklist = buildPublisherRightsPrescreenWorklist(registry);
  const notices = new Map(worklist.sourceEntries
    .filter(entry => entry.publisherTermsUrl !== null)
    .map(entry => [entry.candidateKey, entry]));
  assert.deepEqual(
    new Set(notices.keys()),
    new Set(Object.keys(PUBLIC_PUBLISHER_TERMS_PRESCREEN_20261119))
  );
  const expected = new Map([
    ["north-america-united-states-fda-openfda", "https://open.fda.gov/terms/"],
    ["europe-spain-aemps-cima", "https://sede.aemps.gob.es/datos-abiertos/"],
    ["europe-european-union-eea-ema-pms-public-api", "https://www.ema.europa.eu/en/documents/other/products-management-services-pms-public-api-terms-conditions_en.pdf"],
    ["asia-pacific-singapore-hsa-data-gov-sg", "https://developers.data.gov.sg/open-data-licence"],
    ["north-america-canada-health-canada-drug-product-database", "https://open.canada.ca/data/en/dataset/bf55e42a-63cb-4556-bfd8-44f26e5a36fe"],
    ["europe-united-kingdom-nhsbsa-english-prescribing-dataset", "https://opendata.nhsbsa.net/pages/terms-and-conditions"],
    ["global-global-us-clinicaltrials-gov", "https://clinicaltrials.gov/terms-conditions"]
  ]);
  for (const [key, url] of expected) {
    const row = notices.get(key);
    assert.ok(row, key);
    assert.equal(row.publisherTermsUrl, url);
    assert.equal(row.termsScreeningStatus, "PUBLIC_NOTICE_LOCATED_LEGAL_ACCEPTANCE_PENDING");
    assert.equal(row.productionRightsGranted, false);
    assert.equal(row.customerLive, false);
    assert.equal(row.exactDatasetVersion, null);
    assert.deepEqual(row.legallyAcceptedUses, []);
    assert.ok(row.outstandingRightsRequirements.every(value => typeof value === "string"));
    assert.equal(Object.isFrozen(row.outstandingRightsRequirements), true);
    assert.equal(new URL(row.publisherTermsUrl).protocol, "https:");
  }
  assert.equal(worklist.sourceEntries.filter(row =>
    row.termsScreeningStatus === "PUBLIC_TERMS_NOT_YET_SCREENED").length, 94);
});

test("public licence notices cannot override tampered registry or proof-of-rights gates", () => {
  const tampered = registry.map((row, i) =>
    i === 0 ? {...row, rightsStatus: "approved", allowedUses: ["commercial", "external-ai"]} : row
  );
  assert.throws(
    () => buildPublisherRightsPrescreenWorklist(tampered),
    /candidate state invalid/
  );
  const worklist = buildPublisherRightsPrescreenWorklist(registry);
  assert.equal(worklist.sourceEntries.some(row => row.productionRightsGranted), false);
  assert.equal(worklist.sourceEntries.some(row => row.customerLive), false);
  assert.equal(worklist.sourceEntries.some(row => row.productionDatasetAdmitted), false);
  assert.equal(worklist.sourceEntries.some(row => row.legallyAcceptedUses.length > 0), false);
  assert.throws(() => assertAllCountriesLive(worklist), /cannot be asserted/);
});

test("four official public HTTP CI receipts are historical and never customer/live rights", () => {
  const worklist = buildPublisherRightsPrescreenWorklist(registry);
  assert.equal(worklist.sourceOnlyHttpProbeCiCheckpointCount, 4);
  const observed = worklist.sourceEntries
    .filter(row => row.sourceOnlyHttpProbeCiCheckpoint !== null);
  assert.deepEqual(
    new Set(observed.map(row => row.candidateKey)),
    new Set(Object.keys(SOURCE_ONLY_HTTP_PROBE_CI_CHECKPOINTS_20261118))
  );
  for (const entry of observed) {
    const checkpoint = entry.sourceOnlyHttpProbeCiCheckpoint;
    const expected = SOURCE_ONLY_HTTP_PROBE_CI_CHECKPOINTS_20261118[entry.candidateKey];
    assert.equal(checkpoint.verifiedCheckpointDate, "2026-11-18");
    assert.equal(checkpoint.stage, "ONE_RECORD_UPSTREAM_CI_ONLY_NOT_PRODUCTION");
    assert.equal(checkpoint.upstreamSourceId, expected.upstreamSourceId);
    assert.equal(checkpoint.pullRequestUrl,
      `https://github.com/NovapharmHealthacre/novapharm-website/pull/${expected.pullRequest}`);
    assert.equal(checkpoint.workflowRunUrl,
      `https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/${expected.workflowRun}`);
    assert.equal(checkpoint.sourceRightsVerified, false);
    assert.equal(checkpoint.productionConnected, false);
    assert.equal(checkpoint.customerLive, false);
    assert.equal(entry.productionRightsGranted, false);
    assert.equal(entry.customerLive, false);
    assert.equal(Object.isFrozen(checkpoint), true);
  }
  assert.equal(worklist.independentlyLicensedSourceCandidates, 0);
  assert.equal(worklist.customerLiveSourceCandidates, 0);
});

test("Singapore HSA data licence and API conditions are separate and do not grant rights", () => {
  const worklist = buildPublisherRightsPrescreenWorklist(registry);
  const hsa = worklist.sourceEntries.find(row =>
    row.candidateKey === "asia-pacific-singapore-hsa-data-gov-sg");
  assert.ok(hsa);
  assert.equal(hsa.publisherTermsUrl, "https://developers.data.gov.sg/open-data-licence");
  assert.equal(hsa.publisherApiTermsUrl, "https://data.gov.sg/privacy-and-terms");
  assert.equal(hsa.officialDatasetUrl,
    "https://data.gov.sg/datasets/d_767279312753558cbf19d48344577084/view");
  assert.match(hsa.termsPosture, /SINGAPORE_ODL_1/);
  assert.equal(hsa.termsScreeningStatus, "PUBLIC_NOTICE_LOCATED_LEGAL_ACCEPTANCE_PENDING");
  assert.equal(hsa.productionRightsGranted, false);
  assert.deepEqual(hsa.legallyAcceptedUses, []);
  assert.equal(hsa.customerLive, false);
  assert.equal(hsa.productionDatasetAdmitted, false);
});

test("EMA PMS beta explicitly forbids business use; no EU commercial source admission", () => {
  const worklist = buildPublisherRightsPrescreenWorklist(registry);
  const ema = worklist.sourceEntries.find(row =>
    row.candidateKey === "europe-european-union-eea-ema-pms-public-api");
  assert.ok(ema);
  assert.equal(ema.jurisdictionLabel, "European Union / EEA");
  assert.equal(ema.publisherExplicitlyForbidsBusinessUse, true);
  assert.equal(ema.publisherRegistrationRequired, true);
  assert.equal(ema.termsPosture, "EMA_PMS_BETA_BUSINESS_USE_NOT_PERMITTED");
  assert.equal(ema.publisherTermsUrl,
    "https://www.ema.europa.eu/en/documents/other/products-management-services-pms-public-api-terms-conditions_en.pdf");
  assert.equal(ema.sourceOnlyHttpProbeCiCheckpoint, null);
  assert.equal(ema.productionRightsGranted, false);
  assert.equal(ema.productionDatasetAdmitted, false);
  assert.equal(ema.customerLive, false);
  assert.deepEqual(ema.legallyAcceptedUses, []);
  assert.ok(ema.outstandingRightsRequirements.some(s =>
    s.includes("Do not use") && s.includes("business")));
  assert.ok(ema.outstandingRightsRequirements.some(s =>
    s.includes("prior EMA authorisation")));
  assert.equal(worklist.publiclyRestrictedBetaBusinessSources, 1);
  assert.equal(worklist.independentlyLicensedSourceCandidates, 0);
  assert.equal(worklist.customerLiveSourceCandidates, 0);
});

test("other publisher pre-screens never inherit EMA restricted beta policy", () => {
  const worklist = buildPublisherRightsPrescreenWorklist(registry);
  const restricted = worklist.sourceEntries.filter(row =>
    row.publisherExplicitlyForbidsBusinessUse);
  assert.deepEqual(restricted.map(row => row.candidateKey),
    ["europe-european-union-eea-ema-pms-public-api"]);
  for (const entry of worklist.sourceEntries) {
    assert.equal(typeof entry.publisherExplicitlyForbidsBusinessUse, "boolean");
    assert.equal(typeof entry.publisherRegistrationRequired, "boolean");
    assert.equal(entry.productionRightsGranted, false);
    assert.equal(entry.customerLive, false);
  }
});
