import assert from "node:assert/strict";
import { sourcePlans } from "../src/core/intelligence-global-source-gateway.mjs";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildCountryReleaseLedger, assertAllCountrySourcesLive,
  EXPECTED_SOURCE_COUNT, EXPECTED_NATIONAL_COUNTRIES, EXPECTED_GROUPS
} from "../src/core/intelligence-country-release-ledger.mjs";

import { COUNTRY_ISO2, SOURCE_GROUP_CODES, requireCountryOrGroupCode } from "../src/core/intelligence-country-iso-identifiers.mjs";
import { EXPECTED_COUNTRY_SOURCE_KEYS, assertExactCountrySourceCoverage } from "../src/core/intelligence-country-source-baseline.mjs";

const source = JSON.parse(readFileSync(new URL(
  "../docs/intelligence/global-pharma-sources-20261117.json", import.meta.url
), "utf8")).sources;
const ledger = buildCountryReleaseLedger(source);
const candidates = () => source.map(x => ({ ...x }));

test("all 101 distinct regulator/research source candidates are represented exactly once", () => {
  assert.equal(ledger.totalSources, EXPECTED_SOURCE_COUNT);
  assert.equal(ledger.sourceRows.length, source.length);
  assert.deepEqual(
    new Set(ledger.sourceRows.map(x => x.candidateKey)),
    new Set(source.map(x => x.candidateKey))
  );
  assert.equal(ledger.sourceCandidateRegistrationPercent, 100);
  assert.equal(ledger.jurisdictionLabels, 79);
  assert.equal(ledger.countries.reduce((n,c) => n + c.candidateSourceCount, 0), 101);
  assert.equal(ledger.countries.length, 79);
  assert.equal(ledger.nationalCountries, EXPECTED_NATIONAL_COUNTRIES);
  assert.equal(ledger.supranationalAndGlobalGroups, EXPECTED_GROUPS);
});

test("all 77 country names are included; EU/EEA and Global are NOT fictitious countries", () => {
  const national = ledger.countries.filter(x => x.groupType === "NATIONAL");
  assert.equal(national.length, 77);
  const expected = [
    "United Kingdom","Ireland","France","Spain","Italy","Germany",
    "Netherlands","Belgium","Denmark","Sweden","Norway","Finland",
    "Poland","Czechia","Austria","Switzerland","Portugal","Hungary",
    "Ukraine","Russia","Greece","Romania","Bulgaria","Croatia",
    "Slovenia","Slovakia","Estonia","Latvia","Lithuania","Serbia","Türkiye",
    "United States","Canada","Mexico",
    "Brazil","Argentina","Chile","Colombia","Peru","Ecuador","Uruguay",
    "India","China","Japan","South Korea","Taiwan","Singapore","Malaysia",
    "Indonesia","Thailand","Vietnam","Philippines","Pakistan","Bangladesh",
    "Nepal","Sri Lanka",
    "Australia","New Zealand",
    "Saudi Arabia","United Arab Emirates","Israel","Jordan","Oman","Qatar",
    "Bahrain","Kuwait",
    "South Africa","Nigeria","Kenya","Ghana","Tanzania","Rwanda",
    "Morocco","Egypt","Algeria","Ethiopia","Uganda"
  ];
  assert.equal(expected.length, 77);
  assert.deepEqual(
    national.map(x => x.country).sort(),
    [...expected].sort()
  );
  const groups = ledger.countries.filter(x => x.groupType !== "NATIONAL");
  assert.deepEqual(groups.map(x => x.country).sort(), ["European Union / EEA", "Global"]);
});

test("source coverage by region agrees with all original source rows, never counts codes as national integration", () => {
  const expected = {
    "Global": 9,
    "Europe": 38,
    "North America": 5,
    "Latin America": 7,
    "Asia Pacific": 19,
    "Oceania": 3,
    "Middle East": 8,
    "Africa": 12
  };
  const actual = Object.fromEntries(Object.keys(expected).map(region => [
    region, ledger.sourceRows.filter(x => x.region === region).length
  ]));
  assert.deepEqual(actual, expected);
  // Count adapter contracts from the actual merged release catalogue,
  // so the ledger automatically reflects #830 once that PR is merged.
  assert.equal(ledger.sourceOnlyAdapterCount, Object.keys(sourcePlans).length);
  assert.equal(ledger.sourceOnlyAdapterCoveragePercent,
    Number((100 * Object.keys(sourcePlans).length / 101).toFixed(2)));
  const codes = ledger.sourceRows.filter(x => x.adapterContractMerged);
  for (const name of ["Global", "Spain", "Canada", "United States"]) {
    assert.ok(codes.some(x => x.country === name), name);
  }
  assert.ok(codes.filter(x => x.country === "Global").length >= 2);
  assert.ok(codes.filter(x => x.groupType === "NATIONAL").length >= 3);
});

test("one and every source and country fails closed against production activation", () => {
  for (const item of ledger.sourceRows) {
    assert.equal(item.canPublish, false);
    assert.equal(item.liveConnectionVerified, false);
    assert.equal(item.sourceRightsVerified, false);
    assert.equal(item.nationalMedicineIdentityReconciled, false);
    assert.equal(item.tenantIsolatedProductionAccessVerified, false);
    assert.equal(item.commercialAndAiReuseVerified, false);
    assert.equal(item.verifiedCompletionPercent, 0);
    assert.ok(item.remainingReleaseGates.length >= 7);
    assert.ok(item.nextStep.length >= 20);
  }
  for (const country of ledger.countries) {
    assert.equal(country.customerEnabled, false);
    assert.equal(country.verifiedProductionCompletionPercent, 0);
    assert.equal(country.releaseDecision, "BLOCKED_PENDING_ALL_SOURCE_SPECIFIC_GATES");
    assert.equal(country.nextSteps.length, country.candidateSourceCount);
  }
  assert.deepEqual([
    ledger.verifiedLicensedSources,
    ledger.verifiedIngestedSources,
    ledger.verifiedProductionSources,
    ledger.verifiedProductionCountries
  ], [0,0,0,0]);
  assert.throws(() => assertAllCountrySourcesLive(ledger), /unverified/);
});

test("routes give country-specific next actions, not a generic fake API-for-everyone", () => {
  const by = (s) => ledger.countries.find(x => x.country === s);
  assert.equal(by("India").candidateSourceCount, 4);
  assert.equal(by("France").candidateSourceCount, 2);
  assert.equal(by("United Kingdom").candidateSourceCount, 2);
  assert.equal(by("South Africa").candidateSourceCount, 2);
  const uk = ledger.sourceRows.find(x => x.country === "United Kingdom" && x.provider.includes("MHRA"));
  assert.equal(uk.route, "OFFICIAL_PORTAL_EXPORT_REVIEW");
  const singapore = ledger.sourceRows.find(x => x.country === "Singapore");
  assert.equal(singapore.route, "DOCUMENTED_API_VERIFICATION_AND_ADAPTER");
  const india = ledger.sourceRows.find(x => x.country === "India" && x.provider.includes("ABDM"));
  assert.equal(india.route, "ACCESS_AND_REGULATORY_APPROVAL");
  assert.ok(india.remainingReleaseGates.includes("OFFICIAL_AUTHENTICATED_ACCESS_OR_VENDOR_APPROVAL"));
  const greece = ledger.sourceRows.find(x => x.country === "Greece");
  assert.equal(greece.route, "PUBLISHER_DISCOVERY");
  const ukSource = ledger.sourceRows.find(x => x.country === "United Kingdom" && x.provider.includes("MHRA"));
  assert.ok(ukSource.remainingReleaseGates.includes("OFFICIAL_EXPORT_CONFIRMED_NO_PORTAL_SCRAPING_ASSUMED"));
  const australia = by("Australia");
  assert.equal(australia.candidateSourceCount, 2);
  assert.ok(australia.nextSteps.some(x => x.source.includes("PBS")));
});

test("candidate metadata and caller-supplied fake source rights cannot promote any country", () => {
  const bads = [
    (s) => { s[0].rightsStatus = "approved"; },
    (s) => { s[0].integrationStatus = "live"; },
    (s) => { s[0].dataAdmission = "admitted"; },
    (s) => { s[0].activeAdapterId = "approved"; },
    (s) => { s[0].allowedUses = ["commercial-ai-redistribution"]; },
    (s) => { s[0].authorityVerification = "approved"; },
    (s) => { s[0].candidateKey = "__proto__"; },
    (s) => { s[0].url = "http://official.example/path"; },
    (s) => { s[0].url = "https://127.0.0.1/metadata"; },
    (s) => { s[0].url = "https://example.local/metadata"; },
    (s) => { s[0].url = "https://user:password@example.gov/path"; },
    (s) => { s[0].mode = "API_LIVE"; },
    (s) => { s[1].candidateKey = s[0].candidateKey; }
  ];
  for (const tamper of bads) {
    const altered = candidates();
    tamper(altered);
    assert.throws(() => buildCountryReleaseLedger(altered), /Country release ledger rejected/);
  }
  assert.throws(() => buildCountryReleaseLedger(source.slice(1)), /expected immutable/);
  assert.throws(() => buildCountryReleaseLedger(null), /expected immutable/);
});

test("caller-supplied fake adapters cannot inflate committed code or production status", () => {
  const unchanged = buildCountryReleaseLedger(source, {
    releasedPlans: { "invented-live-source": {}, "global-clinicaltrials": {} },
    verifiedProductionCountries: 77,
    canPublish: true
  });
  assert.equal(unchanged.sourceOnlyAdapterCount, Object.keys(sourcePlans).length);
  assert.equal(unchanged.verifiedLicensedSources, 0);
  assert.equal(unchanged.verifiedProductionCountries, 0);
  assert.equal(unchanged.sourceCandidateRegistrationPercent, 100);
});

test("ledger is immutable at each level and contains no record-level patient or API material", () => {
  assert.ok(Object.isFrozen(ledger));
  assert.ok(Object.isFrozen(ledger.sourceRows));
  assert.ok(Object.isFrozen(ledger.countries));
  assert.ok(Object.isFrozen(ledger.countries[0]));
  assert.ok(Object.isFrozen(ledger.sourceRows[0].remainingReleaseGates));
  assert.ok(Object.isFrozen(ledger.countries[0].nextSteps));
  assert.ok(!JSON.stringify(ledger).includes("apiKey"));
  assert.ok(!JSON.stringify(ledger).includes("accessToken"));
});


test("ISO 3166-1 identities are exact for all 77 national jurisdictions, never EU/Global", () => {
  assert.equal(Object.keys(COUNTRY_ISO2).length, 77);
  assert.equal(Object.values(COUNTRY_ISO2).filter(code => /^[A-Z]{2}$/.test(code)).length, 77);
  assert.equal(new Set(Object.values(COUNTRY_ISO2)).size, 77);
  assert.equal(requireCountryOrGroupCode("United Kingdom"), "GB");
  assert.equal(requireCountryOrGroupCode("Türkiye"), "TR");
  assert.equal(requireCountryOrGroupCode("South Korea"), "KR");
  assert.equal(requireCountryOrGroupCode("Taiwan"), "TW");
  assert.equal(requireCountryOrGroupCode("South Africa"), "ZA");
  assert.equal(requireCountryOrGroupCode("Global"), "GLOBAL");
  assert.equal(requireCountryOrGroupCode("European Union / EEA"), "EU-EEA");
  assert.equal(Object.keys(SOURCE_GROUP_CODES).length, 2);
  assert.throws(() => requireCountryOrGroupCode("Atlantis"), /Unknown/);
  assert.throws(() => requireCountryOrGroupCode("__proto__"), /Unknown/);
  for (const item of ledger.sourceRows) {
    assert.equal(item.countryCode, requireCountryOrGroupCode(item.country));
  }
  for (const item of ledger.countries) {
    assert.equal(item.countryCode, requireCountryOrGroupCode(item.country));
  }
});


test("per-country engineering percentages are reproducible, bounded and never production percentages", () => {
  const merged = Object.keys(sourcePlans).length;
  const expectedMean = Number((20 + 20 * merged / 101).toFixed(2));
  assert.equal(ledger.engineeringMilestonePercent, expectedMean);
  for (const source of ledger.sourceRows) {
    assert.equal(source.engineeringMilestonePercent, source.adapterContractMerged ? 40 : 20);
    assert.equal(source.verifiedCompletionPercent, 0);
    assert.equal(source.liveConnectionVerified, false);
  }
  for (const c of ledger.countries) {
    assert.equal(c.engineeringMilestonePercent,
      Number((20 + (20 * c.codedAdapterCandidateCount / c.candidateSourceCount)).toFixed(2)));
    assert.equal(c.verifiedProductionCompletionPercent, 0);
    assert.ok(c.engineeringMilestonePercent <= 40);
  }
  assert.equal(ledger.countries.find(c => c.country === "Spain").engineeringMilestonePercent, 40);
  assert.equal(ledger.countries.find(c => c.country === "United States").engineeringMilestonePercent, 30);
  assert.equal(ledger.countries.find(c => c.country === "Canada").engineeringMilestonePercent, 30);
  assert.equal(ledger.countries.find(c => c.country === "India").engineeringMilestonePercent, 20);
});


test("source candidates cannot silently move between countries or publishers", () => {
  const tamper = [
    (s) => { s[0].country = "Spain"; },
    (s) => { s[0].region = "Europe"; },
    (s) => { s[0].provider = "Another trial publisher"; },
    (s) => { s.find(x => x.country === "India").country = "Singapore"; },
    (s) => { s.find(x => x.country === "Australia").provider = "Another PBS vendor"; }
  ];
  for (const mutate of tamper) {
    const registry = candidates();
    mutate(registry);
    assert.throws(
      () => buildCountryReleaseLedger(registry),
      /source region, country or publisher identity does not match candidate key/
    );
  }
  assert.equal(buildCountryReleaseLedger(source).totalSources, 101);
});


test("untrusted registry display metadata cannot smuggle hidden characters or fake domains", () => {
  const edits=[
    x => { x[0].provider += "\u202e"; },
    x => { x[0].provider += "\n"; },
    x => { x[0].region = "Global\u200b"; },
    x => { x[0].domains += "\u2066"; },
    x => { x[0].domains = null; },
    x => { x[0].domains = "A".repeat(241); },
    x => { x[0].note += "\r"; },
    x => { x[0].note = ""; },
    x => { x[0].note = "<fake-link>" + "\n"; }
  ];
  for(const change of edits){
    const rows=candidates();
    change(rows);
    assert.throws(()=>buildCountryReleaseLedger(rows), /Country release ledger rejected/);
  }
});


test("pinned national baseline accounts for every required source, not just 77 names or 101 slots", () => {
  const evidence = assertExactCountrySourceCoverage(source);
  assert.deepEqual(evidence, {
    baselineVersion: "2026-11-17",
    nationalCountries: 77,
    jurisdictions: 79,
    sources: 101,
    exactSourceKeysPresent: true,
    sourceRightsReviewed: false,
    customerLiveCountriesVerified: 0
  });
  assert.ok(Object.isFrozen(EXPECTED_COUNTRY_SOURCE_KEYS));
  assert.equal(Object.keys(EXPECTED_COUNTRY_SOURCE_KEYS).length, 79);
  assert.equal(
    Object.values(EXPECTED_COUNTRY_SOURCE_KEYS).reduce((sum, keys) => sum + keys.length, 0),
    101
  );
  for (const [country, keys] of Object.entries(EXPECTED_COUNTRY_SOURCE_KEYS)) {
    assert.ok(Object.isFrozen(keys), country);
    assert.ok(keys.length >= 1, country);
    const observed = source.filter(s => s.country === country).map(s => s.candidateKey);
    assert.deepEqual(observed.slice().sort(), keys.slice().sort(), country);
  }
  assert.equal(EXPECTED_COUNTRY_SOURCE_KEYS.India.length, 4);
  assert.equal(EXPECTED_COUNTRY_SOURCE_KEYS["United Kingdom"].length, 2);
  assert.equal(EXPECTED_COUNTRY_SOURCE_KEYS["European Union / EEA"].length, 3);
  assert.equal(EXPECTED_COUNTRY_SOURCE_KEYS.Global.length, 9);
  assert.equal(EXPECTED_COUNTRY_SOURCE_KEYS.Australia.length, 2);
});

test("cannot replace one source with a plausible new authority and still claim full country coverage", () => {
  const replacements = [
    [ "India", "CDSCO / SUGAM", "Alternative Indian national authority" ],
    [ "United Kingdom", "MHRA Products", "Fictional UK medicines register" ],
    [ "Australia", "PBS", "Fictional schedule supplier" ],
    [ "Global", "ChEMBL", "Other global compounds provider" ],
    [ "European Union / EEA", "TED", "Other EU procurement source" ]
  ];
  for (const [country, original, replacement] of replacements) {
    const amended = candidates();
    const row = amended.find(x => x.country === country &&
      x.provider.toLowerCase().includes(original.toLowerCase()));
    assert.ok(row, original);
    row.provider = replacement;
    const slug = value => value.normalize("NFKD").replace(/\p{M}/gu, "")
      .toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
    row.candidateKey = [row.region,row.country,row.provider].map(slug).join("-");
    assert.equal(amended.length, 101);
    assert.equal(new Set(amended.map(x => x.country)).size, 79);
    assert.throws(() => buildCountryReleaseLedger(amended),
      /Country coverage baseline rejected: source key missing, replaced or duplicated/);
  }
});


test("hybrid API/portal/restricted countries retain every required source access gate", () => {
  const needsPortal = source.filter(x => x.mode.includes("Portal"));
  const needsAccess = source.filter(x =>
    x.mode.includes("Restricted") || x.mode.includes("Access-review") ||
    x.mode === "FHIR-review");
  assert.ok(needsPortal.length >= 20);
  assert.ok(needsAccess.length >= 5);
  for (const original of needsPortal) {
    const candidate = ledger.sourceRows.find(x => x.candidateKey === original.candidateKey);
    assert.ok(candidate, original.candidateKey);
    assert.ok(candidate.remainingReleaseGates.includes(
      "OFFICIAL_EXPORT_CONFIRMED_NO_PORTAL_SCRAPING_ASSUMED"
    ), original.country + " " + original.mode);
  }
  for (const original of needsAccess) {
    const candidate = ledger.sourceRows.find(x => x.candidateKey === original.candidateKey);
    assert.ok(candidate.remainingReleaseGates.includes(
      "OFFICIAL_AUTHENTICATED_ACCESS_OR_VENDOR_APPROVAL"
    ), original.country + " " + original.mode);
  }
  const germany = ledger.sourceRows.find(x =>
    x.country === "Germany" && x.advertisedMode === "Portal/Restricted");
  assert.ok(germany);
  assert.ok(germany.remainingReleaseGates.includes(
    "OFFICIAL_EXPORT_CONFIRMED_NO_PORTAL_SCRAPING_ASSUMED"));
  assert.ok(germany.remainingReleaseGates.includes(
    "OFFICIAL_AUTHENTICATED_ACCESS_OR_VENDOR_APPROVAL"));
  for(const country of ["Chile", "Colombia"]) {
    const hybrid = ledger.sourceRows.find(x =>
      x.country === country && x.advertisedMode === "API/Portal");
    assert.ok(hybrid.remainingReleaseGates.includes(
      "OFFICIAL_EXPORT_CONFIRMED_NO_PORTAL_SCRAPING_ASSUMED"), country);
  }
});
