/**
 * NovaPharm Intelligence country/source release ledger.
 * Complete registry coverage, not complete pharmaceutical integration.
 * Read-only metadata. Never uses an untrusted flag as proof of a licence,
 * ingested medicine records, clinical validation or live customer access.
 */
import { sourcePlans } from "./intelligence-global-source-gateway.mjs";
import { COUNTRY_ISO2, requireCountryOrGroupCode } from "./intelligence-country-iso-identifiers.mjs";
import { assertExactCountrySourceCoverage } from "./intelligence-country-source-baseline.mjs";

export const COUNTRY_LEDGER_CONTRACT = "novapharm.intelligence.country-release-ledger.v1";
export const EXPECTED_SOURCE_COUNT = 101;
export const EXPECTED_NATIONAL_COUNTRIES = 77;
export const EXPECTED_GROUPS = 2;
const GLOBAL = "Global";
const EEA = "European Union / EEA";
const RE_KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const MODES = new Set([
  "API","API-review","Restricted/API","Beta API","API/Download",
  "Portal","Download","Download-review","Portal/Restricted",
  "Portal/Download","Download/Portal","Discovery","API/Portal",
  "Access-review","FHIR-review","Download/Restricted",
  "API/Access-review","Download/API-review"
]);
const KNOWN_SOURCE_BINDINGS = Object.freeze({
  "global-global-us-clinicaltrials-gov": "global-clinicaltrials",
  "global-global-europe-pmc": "global-europepmc",
  "global-global-ncbi-pubmed": "global-pubmed",
  "global-global-chembl": "global-chembl",
  "global-global-pubchem": "global-pubchem",
  "europe-poland-nfz-drug-program-statistics": "pl-nfz-drug-program",
  "north-america-united-states-fda-openfda": "us-fda-drugsfda",
  "north-america-canada-health-canada-drug-product-database": "ca-health-canada-dpd",
  "europe-spain-aemps-cima": "es-aemps-cima"
});
const GATES = Object.freeze([
  "AUTHORITATIVE_PUBLISHER_AND_ENDPOINT_VERIFIED",
  "SOURCE_SPECIFIC_RIGHTS_AND_COMMERCIAL_AI_REUSE_APPROVED",
  "BOUNDED_ADAPTER_OR_OFFICIAL_DOWNLOAD_READER_TESTED",
  "VERSIONED_AUTHENTIC_UPSTREAM_SNAPSHOT_OBTAINED",
  "ORIGINAL_IDENTIFIERS_PRESERVED_AND_QUALITY_RECONCILED",
  "PROTECTED_TENANT_SCOPED_RUNTIME_AND_REVOCATION_TESTED",
  "PRODUCTION_DEPLOYMENT_AND_CUSTOMER_READ_VERIFIED"
]);
const EXTRA_GATES = Object.freeze({
  ACCESS: "OFFICIAL_AUTHENTICATED_ACCESS_OR_VENDOR_APPROVAL",
  PORTAL: "OFFICIAL_EXPORT_CONFIRMED_NO_PORTAL_SCRAPING_ASSUMED"
});
const fail = (reason) => { throw new Error("Country release ledger rejected: " + reason); };
const own = (obj, key) => Object.hasOwn(obj, key);

function validatedReference(url) {
  if (typeof url !== "string" || url.length > 2048) fail("official reference URL");
  let u;
  try { u = new URL(url); } catch { fail("official reference URL"); }
  const host = u.hostname.toLowerCase();
  if (u.protocol !== "https:" || u.username || u.password || u.hash || u.port ||
      !host || host.startsWith("[") || !/^[a-z0-9.-]+$/u.test(host) ||
      host.split(".").length < 2 || host.split(".").some(x => !x || x[0] === "-" || x.endsWith("-")) ||
      /^\d+\.\d+\.\d+\.\d+$/u.test(host) ||
      ["localhost","local","internal","invalid","example","test","onion"].includes(host.split(".").at(-1))) {
    fail("untrusted official reference URL");
  }
  return u.toString();
}
function sourceRoute(mode) {
  if (mode.includes("Restricted") || mode.includes("Access-review") || mode === "FHIR-review") {
    return "ACCESS_AND_REGULATORY_APPROVAL";
  }
  if (mode.includes("API")) return "DOCUMENTED_API_VERIFICATION_AND_ADAPTER";
  if (mode.includes("Download")) return "OFFICIAL_VERSIONED_DOWNLOAD_READER";
  if (mode.includes("Portal")) return "OFFICIAL_PORTAL_EXPORT_REVIEW";
  return "PUBLISHER_DISCOVERY";
}
function nextStep(source) {
  switch (source.route) {
    case "ACCESS_AND_REGULATORY_APPROVAL":
      return "Obtain source owner access/terms approval, then verify permitted authenticated dataset or FHIR contract";
    case "DOCUMENTED_API_VERIFICATION_AND_ADAPTER":
      return source.adapterContractMerged
        ? "Review terms and real upstream API schema, then collect a protected versioned QA snapshot"
        : "Verify current API documentation/rights and implement a bounded national-source adapter";
    case "OFFICIAL_VERSIONED_DOWNLOAD_READER":
      return "Verify official release file, schema, terms and publication dates; implement a bounded file ingest";
    case "OFFICIAL_PORTAL_EXPORT_REVIEW":
      return "Confirm a licensed publisher export or API; do not infer that a human portal can be scraped";
    default:
      return "Identify an authoritative machine-readable source and legally permitted retrieval mechanism";
  }
}
function officialCandidateSlug(value) {
  // Strictly bind the authority key to its own region, jurisdiction and
  // publisher. A valid ISO country alone is insufficient if a candidate's
  // original source is silently reassigned to a different country.
  return value.normalize("NFKD").replace(/\p{M}/gu, "")
    .toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
}
function cleanDescription(value, maxChars) {
  return typeof value === "string" && value.trim().length > 0 &&
    value.length <= maxChars &&
    !/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u.test(value);
}
function cleanSource(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      !RE_KEY.test(input.candidateKey || "") ||
      !cleanDescription(input.country, 100) ||
      !cleanDescription(input.region, 70) ||
      !cleanDescription(input.provider, 180) ||
      !cleanDescription(input.domains, 240) ||
      !cleanDescription(input.note, 240) ||
      !MODES.has(input.mode) ||
      input.rightsStatus !== "not-reviewed" || input.integrationStatus !== "candidate-only" ||
      input.dataAdmission !== "not-admitted" || input.activeAdapterId !== null ||
      input.authorityVerification !== "pending" || input.termsReview !== "pending" ||
      input.licenceEvidenceId !== null ||
      !Array.isArray(input.allowedUses) || input.allowedUses.length !== 0) {
    fail("untrusted registry candidate or falsely promoted rights");
  }
  const expectedIdentity = [input.region, input.country, input.provider]
    .map(officialCandidateSlug).join("-");
  if (input.candidateKey !== expectedIdentity) {
    fail("source region, country or publisher identity does not match candidate key");
  }
  validatedReference(input.url);
}
function classify(country) {
  if (country === GLOBAL) return "GLOBAL_RESEARCH_GROUP";
  if (country === EEA) return "SUPRANATIONAL_GROUP";
  return "NATIONAL";
}

/** A source registry is the only input. Approvals are never accepted from it. */
export function buildCountryReleaseLedger(registry) {
  if (!Array.isArray(registry) || registry.length !== EXPECTED_SOURCE_COUNT) {
    fail("expected immutable 101-source candidate inventory");
  }
  // Independently pin every country-to-publisher key from the owner-requested
  // baseline. A different source cannot silently replace a registered one.
  assertExactCountrySourceCoverage(registry);
  const seen = new Set();
  const sourceRows = registry.map(input => {
    cleanSource(input);
    if (seen.has(input.candidateKey)) fail("duplicate source candidate");
    seen.add(input.candidateKey);
    const expectedAdapter = own(KNOWN_SOURCE_BINDINGS, input.candidateKey)
      ? KNOWN_SOURCE_BINDINGS[input.candidateKey] : null;
    // Trust only the adapter catalogue imported from committed source code;
    // callers cannot inject fake release plans or claim a PR was merged.
    const merged = Boolean(expectedAdapter && own(sourcePlans, expectedAdapter));
    const route = sourceRoute(input.mode);
    const extra = [];
    if (route === "ACCESS_AND_REGULATORY_APPROVAL") extra.push(EXTRA_GATES.ACCESS);
    if (route === "OFFICIAL_PORTAL_EXPORT_REVIEW") extra.push(EXTRA_GATES.PORTAL);
    return Object.freeze({
      candidateKey: input.candidateKey,
      region: input.region,
      country: input.country,
      countryCode: requireCountryOrGroupCode(input.country),
      groupType: classify(input.country),
      provider: input.provider,
      dataDomains: input.domains,
      officialReferenceUrl: input.url,
      advertisedMode: input.mode,
      route,
      adapterContractId: merged ? expectedAdapter : null,
      adapterContractMerged: merged,
      // Engineering milestone proxy: registry=20%, merged bounded adapter=+20%.
      // No rights, data or deployment is inferred from this percentage.
      engineeringMilestonePercent: merged ? 40 : 20,
      currentStatus: merged ? "SOURCE_ONLY_ADAPTER_NO_DATA" : "DISCOVERY_CANDIDATE_NO_DATA",
      sourceRightsVerified: false,
      liveConnectionVerified: false,
      authenticatedSnapshotAccepted: false,
      nationalMedicineIdentityReconciled: false,
      tenantIsolatedProductionAccessVerified: false,
      commercialAndAiReuseVerified: false,
      verifiedCompletionPercent: 0,
      releaseDecision: "NOT_AUTHORISED_FOR_PRODUCTION",
      canPublish: false,
      remainingReleaseGates: Object.freeze([...GATES, ...extra]),
      nextStep: nextStep({ route, adapterContractMerged: merged })
    });
  });
  const buckets = new Map();
  for (const item of sourceRows) {
    const key = item.country;
    if (!buckets.has(key)) buckets.set(key, []);
    const bucket = buckets.get(key);
    if (bucket.some(x => x.region !== item.region)) fail("jurisdiction spans inconsistent regions");
    bucket.push(item);
  }
  const nationalCount = [...buckets.keys()].filter(x => classify(x) === "NATIONAL").length;
  const groupsCount = [...buckets.keys()].filter(x => classify(x) !== "NATIONAL").length;
  if (nationalCount !== EXPECTED_NATIONAL_COUNTRIES || groupsCount !== EXPECTED_GROUPS ||
      Object.keys(COUNTRY_ISO2).length !== EXPECTED_NATIONAL_COUNTRIES ||
      new Set(Object.values(COUNTRY_ISO2)).size !== EXPECTED_NATIONAL_COUNTRIES) {
    fail("expected 77 national countries, EU/EEA and Global");
  }
  const countries = [...buckets].map(([country, sources]) => Object.freeze({
    country, countryCode: requireCountryOrGroupCode(country),
    region: sources[0].region,
    groupType: classify(country),
    candidateSourceCount: sources.length,
    sourceCandidateKeys: Object.freeze(sources.map(x => x.candidateKey)),
    sourceProviders: Object.freeze(sources.map(x => x.provider)),
    codedAdapterCandidateCount: sources.filter(x => x.adapterContractMerged).length,
    engineeringMilestonePercent: Number((sources.reduce((sum, x) =>
      sum + x.engineeringMilestonePercent, 0) / sources.length).toFixed(2)),
    sourceRightsVerified: false,
    liveConnectionsVerified: 0,
    acceptedDatasets: 0,
    customerEnabled: false,
    verifiedProductionCompletionPercent: 0,
    releaseDecision: "BLOCKED_PENDING_ALL_SOURCE_SPECIFIC_GATES",
    nextSteps: Object.freeze(sources.map(x => Object.freeze({
      source: x.provider, candidateKey: x.candidateKey, action: x.nextStep
    })))
  }));
  const mergedCount = sourceRows.filter(x => x.adapterContractMerged).length;
  return Object.freeze({
    contract: COUNTRY_LEDGER_CONTRACT,
    scope: "SOURCE_DISCOVERY_AND_SOURCE_ONLY_CODE_NOT_PRODUCTION",
    totalSources: sourceRows.length,
    nationalCountries: nationalCount,
    supranationalAndGlobalGroups: groupsCount,
    jurisdictionLabels: countries.length,
    sourceCandidateRegistrationPercent: 100,
    sourceOnlyAdapterCount: mergedCount,
    sourceOnlyAdapterCoveragePercent: Number((100 * mergedCount / sourceRows.length).toFixed(2)),
    engineeringMilestonePercent: Number((sourceRows.reduce((sum,x) =>
      sum + x.engineeringMilestonePercent, 0) / sourceRows.length).toFixed(2)),
    verifiedLicensedSources: 0,
    verifiedIngestedSources: 0,
    verifiedProductionSources: 0,
    verifiedProductionCountries: 0,
    sourceRows: Object.freeze(sourceRows),
    countries: Object.freeze(countries)
  });
}
export function assertAllCountrySourcesLive(_ledger) {
  fail("unverified country or regulator data cannot be certified as live");
}
