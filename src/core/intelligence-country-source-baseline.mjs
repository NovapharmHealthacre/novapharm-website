/**
 * Canonical 2026-11-17 country-to-authority registry source keys.
 * Independent, reviewed coverage baseline: not a licence or live API claim.
 * Changes to source scope must modify both this pinned baseline and the
 * discovery registry in an explicitly reviewed PR.
 */
export const EXPECTED_COUNTRY_SOURCE_KEYS = Object.freeze({
  "Global": Object.freeze([
    "global-global-us-clinicaltrials-gov",
    "global-global-europe-pmc",
    "global-global-ncbi-pubmed",
    "global-global-chembl",
    "global-global-pubchem",
    "global-global-un-comtrade",
    "global-global-epo-ops",
    "global-global-who-global-health-observatory",
    "global-global-who-umc-vigiaccess",
  ]),
  "European Union / EEA": Object.freeze([
    "europe-european-union-eea-ema-pms-public-api",
    "europe-european-union-eea-ema-esmp",
    "europe-european-union-eea-ted",
  ]),
  "United Kingdom": Object.freeze([
    "europe-united-kingdom-nhsbsa-english-prescribing-dataset",
    "europe-united-kingdom-mhra-products",
  ]),
  "Ireland": Object.freeze([
    "europe-ireland-hpra-authorised-medicines",
  ]),
  "France": Object.freeze([
    "europe-france-ansm-bdpm",
    "europe-france-open-medic",
  ]),
  "Spain": Object.freeze([
    "europe-spain-aemps-cima",
  ]),
  "Italy": Object.freeze([
    "europe-italy-aifa-osmed-and-authorised-lists",
  ]),
  "Germany": Object.freeze([
    "europe-germany-bfarm-amice-pharmnet-bund",
  ]),
  "Netherlands": Object.freeze([
    "europe-netherlands-meb-medicines-evaluation-board",
    "europe-netherlands-gip-databank",
  ]),
  "Belgium": Object.freeze([
    "europe-belgium-famhp-sam",
  ]),
  "Denmark": Object.freeze([
    "europe-denmark-medicinpriser-api",
  ]),
  "Sweden": Object.freeze([
    "europe-sweden-fass-and-tlv",
  ]),
  "Norway": Object.freeze([
    "europe-norway-dmp-medicine-fhir-service",
  ]),
  "Finland": Object.freeze([
    "europe-finland-fimea",
  ]),
  "Poland": Object.freeze([
    "europe-poland-nfz-drug-program-statistics",
    "europe-poland-urpl",
  ]),
  "Czechia": Object.freeze([
    "europe-czechia-sukl",
  ]),
  "Austria": Object.freeze([
    "europe-austria-basg",
  ]),
  "Switzerland": Object.freeze([
    "europe-switzerland-swissmedic",
  ]),
  "Portugal": Object.freeze([
    "europe-portugal-infarmed-sns-transparencia",
  ]),
  "Hungary": Object.freeze([
    "europe-hungary-nngyk-ogyei",
  ]),
  "Ukraine": Object.freeze([
    "europe-ukraine-state-expert-center-register",
  ]),
  "Russia": Object.freeze([
    "europe-russia-ministry-of-health-grls",
  ]),
  "Greece": Object.freeze([
    "europe-greece-eof",
  ]),
  "Romania": Object.freeze([
    "europe-romania-anmdmr",
  ]),
  "Bulgaria": Object.freeze([
    "europe-bulgaria-bda",
  ]),
  "Croatia": Object.freeze([
    "europe-croatia-halmed",
  ]),
  "Slovenia": Object.freeze([
    "europe-slovenia-jazmp",
  ]),
  "Slovakia": Object.freeze([
    "europe-slovakia-sukl",
  ]),
  "Estonia": Object.freeze([
    "europe-estonia-state-agency-of-medicines",
  ]),
  "Latvia": Object.freeze([
    "europe-latvia-state-agency-of-medicines",
  ]),
  "Lithuania": Object.freeze([
    "europe-lithuania-state-medicines-control-agency",
  ]),
  "Serbia": Object.freeze([
    "europe-serbia-alims",
  ]),
  "Türkiye": Object.freeze([
    "europe-turkiye-titck",
  ]),
  "United States": Object.freeze([
    "north-america-united-states-fda-openfda",
    "north-america-united-states-cms-data",
  ]),
  "Canada": Object.freeze([
    "north-america-canada-health-canada-drug-product-database",
    "north-america-canada-canada-vigilance",
  ]),
  "Mexico": Object.freeze([
    "north-america-mexico-cofepris",
  ]),
  "Brazil": Object.freeze([
    "latin-america-brazil-anvisa-and-cmed",
  ]),
  "Argentina": Object.freeze([
    "latin-america-argentina-anmat",
  ]),
  "Chile": Object.freeze([
    "latin-america-chile-isp-and-chilecompra",
  ]),
  "Colombia": Object.freeze([
    "latin-america-colombia-invima-and-sismed",
  ]),
  "Peru": Object.freeze([
    "latin-america-peru-digemid",
  ]),
  "Ecuador": Object.freeze([
    "latin-america-ecuador-arcsa",
  ]),
  "Uruguay": Object.freeze([
    "latin-america-uruguay-ministry-of-public-health",
  ]),
  "India": Object.freeze([
    "asia-pacific-india-cdsco-sugam",
    "asia-pacific-india-nppa-pharma-sahi-daam",
    "asia-pacific-india-abdm-drug-registry",
    "asia-pacific-india-ctri",
  ]),
  "China": Object.freeze([
    "asia-pacific-china-nmpa",
  ]),
  "Japan": Object.freeze([
    "asia-pacific-japan-pmda-mhlw",
  ]),
  "South Korea": Object.freeze([
    "asia-pacific-south-korea-mfds-openapi",
    "asia-pacific-south-korea-hira",
  ]),
  "Taiwan": Object.freeze([
    "asia-pacific-taiwan-tfda-and-nhi",
  ]),
  "Singapore": Object.freeze([
    "asia-pacific-singapore-hsa-data-gov-sg",
  ]),
  "Malaysia": Object.freeze([
    "asia-pacific-malaysia-npra-kkmnow",
  ]),
  "Indonesia": Object.freeze([
    "asia-pacific-indonesia-bpom-satu-data",
  ]),
  "Thailand": Object.freeze([
    "asia-pacific-thailand-thai-fda-data-go-th",
  ]),
  "Vietnam": Object.freeze([
    "asia-pacific-vietnam-drug-administration-of-vietnam",
  ]),
  "Philippines": Object.freeze([
    "asia-pacific-philippines-fda-philippines",
  ]),
  "Pakistan": Object.freeze([
    "asia-pacific-pakistan-drap",
  ]),
  "Bangladesh": Object.freeze([
    "asia-pacific-bangladesh-dgda-dghs-fhir",
  ]),
  "Nepal": Object.freeze([
    "asia-pacific-nepal-dda",
  ]),
  "Sri Lanka": Object.freeze([
    "asia-pacific-sri-lanka-nmra",
  ]),
  "Australia": Object.freeze([
    "oceania-australia-tga-artg",
    "oceania-australia-pbs",
  ]),
  "New Zealand": Object.freeze([
    "oceania-new-zealand-medsafe-nzulm",
  ]),
  "Saudi Arabia": Object.freeze([
    "middle-east-saudi-arabia-sfda",
  ]),
  "United Arab Emirates": Object.freeze([
    "middle-east-united-arab-emirates-mohap-ede",
  ]),
  "Israel": Object.freeze([
    "middle-east-israel-ministry-of-health-medicines-register",
  ]),
  "Jordan": Object.freeze([
    "middle-east-jordan-jfda-open-data",
  ]),
  "Oman": Object.freeze([
    "middle-east-oman-ministry-of-health",
  ]),
  "Qatar": Object.freeze([
    "middle-east-qatar-ministry-of-public-health",
  ]),
  "Bahrain": Object.freeze([
    "middle-east-bahrain-nhra",
  ]),
  "Kuwait": Object.freeze([
    "middle-east-kuwait-ministry-of-health",
  ]),
  "South Africa": Object.freeze([
    "africa-south-africa-sahpra",
    "africa-south-africa-department-of-health-sep",
  ]),
  "Nigeria": Object.freeze([
    "africa-nigeria-nafdac-greenbook",
  ]),
  "Kenya": Object.freeze([
    "africa-kenya-ppb",
  ]),
  "Ghana": Object.freeze([
    "africa-ghana-fda-ghana",
  ]),
  "Tanzania": Object.freeze([
    "africa-tanzania-tmda",
  ]),
  "Rwanda": Object.freeze([
    "africa-rwanda-rwanda-fda",
  ]),
  "Morocco": Object.freeze([
    "africa-morocco-open-data-ammps",
  ]),
  "Egypt": Object.freeze([
    "africa-egypt-egyptian-drug-authority",
  ]),
  "Algeria": Object.freeze([
    "africa-algeria-ministry-of-pharmaceutical-industry",
  ]),
  "Ethiopia": Object.freeze([
    "africa-ethiopia-efda",
  ]),
  "Uganda": Object.freeze([
    "africa-uganda-nda",
  ]),
});
export const EXPECTED_JURISDICTIONS = 79;
export const EXPECTED_NATIONAL_JURISDICTIONS = 77;
export const EXPECTED_SOURCE_REFERENCES = 101;
export const EXPECTED_GROUP_LABELS = Object.freeze(["Global", "European Union / EEA"]);
// EU/EEA and Global remain groups, not additional national jurisdictions.
export function assertExactCountrySourceCoverage(sourceRows) {
  if (!Array.isArray(sourceRows)) throw new Error("Country coverage baseline rejected: missing sources");
  const actual = new Map();
  for (const source of sourceRows) {
    if (!source || typeof source !== "object" ||
        typeof source.country !== "string" ||
        typeof source.candidateKey !== "string") {
      throw new Error("Country coverage baseline rejected: invalid source");
    }
    if (!actual.has(source.country)) actual.set(source.country, []);
    actual.get(source.country).push(source.candidateKey);
  }
  const expectedCountries = Object.keys(EXPECTED_COUNTRY_SOURCE_KEYS);
  if (expectedCountries.length !== EXPECTED_JURISDICTIONS ||
      sourceRows.length !== EXPECTED_SOURCE_REFERENCES ||
      actual.size !== EXPECTED_JURISDICTIONS) {
    throw new Error("Country coverage baseline rejected: missing or extra jurisdictions");
  }
  for (const country of expectedCountries) {
    const keys = actual.get(country);
    const required = EXPECTED_COUNTRY_SOURCE_KEYS[country];
    if (!keys || keys.length !== required.length ||
        new Set(keys).size !== required.length ||
        required.some(key => !keys.includes(key))) {
      throw new Error("Country coverage baseline rejected: source key missing, replaced or duplicated for " + country);
    }
  }
  return Object.freeze({
    baselineVersion: "2026-11-17",
    nationalCountries: EXPECTED_NATIONAL_JURISDICTIONS,
    jurisdictions: EXPECTED_JURISDICTIONS,
    sources: EXPECTED_SOURCE_REFERENCES,
    exactSourceKeysPresent: true,
    sourceRightsReviewed: false,
    customerLiveCountriesVerified: 0
  });
}
