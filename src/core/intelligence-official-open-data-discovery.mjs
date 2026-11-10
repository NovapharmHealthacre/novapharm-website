/**
 * Official open-data METADATA discovery for NHSBSA EPD and ONS.
 *
 * This is not a licensed medicine-data ingestion, medical advice, or verified
 * observed-market dataset. Only schema/publisher metadata can leave this module.
 * Never treat a successful HTTP request as source-rights acceptance.
 * Production use requires approved endpoints, external networking, retention,
 * provenance, schema and release tests. No patient or buyer data is sent.
 */
const SOURCES = Object.freeze({
  nhsbsa_english_prescribing: Object.freeze({
    url: "https://opendata.nhsbsa.net/api/3/action/package_show?id=english-prescribing-data-epd",
    publisher: "NHS Business Services Authority",
    sourceId: "nhsbsa_english_prescribing",
  }),
  ons_population: Object.freeze({
    url: "https://api.beta.ons.gov.uk/v1/datasets?limit=5",
    publisher: "Office for National Statistics",
    sourceId: "ons_population",
  }),
});

function reject(code) {
  return Object.assign(new Error("Official-source discovery unavailable."), { code });
}

function text(value, max = 180) {
  return typeof value === "string" ? value.trim().slice(0, max) : null;
}

const safeUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["opendata.nhsbsa.net", "api.beta.ons.gov.uk"].includes(url.hostname)
      ? url.href : null;
  } catch {
    return null;
  }
};

/**
 * Returns bounded publisher metadata only. Does not persist data, assert
 * commercial rights or expose arbitrary URLs to a privileged HTTP client.
 */
export async function discoverOfficialOpenData({
  sourceId,
  fetchImpl = globalThis.fetch,
  release,
} = {}) {
  const source = Object.hasOwn(SOURCES, sourceId) ? SOURCES[sourceId] : null;
  if (!source) throw reject("source_not_allowed");
  if (release?.verifiedServerSide !== true || release?.metadataDiscoveryApproved !== true) {
    throw reject("source_release_not_approved");
  }
  if (typeof fetchImpl !== "function") throw reject("fetch_unavailable");
  const result = await fetchImpl(source.url, {
    method: "GET",
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(6500),
    redirect: "error",
  });
  if (!result || result.ok !== true) throw reject("publisher_unavailable");
  const payload = await result.json();
  let items = [];
  if (sourceId === "nhsbsa_english_prescribing") {
    if (payload?.success !== true || typeof payload.result !== "object" || !payload.result) {
      throw reject("publisher_schema_unexpected");
    }
    items = [{
      id: text(payload.result.id || payload.result.name),
      title: text(payload.result.title),
      version: text(payload.result.version),
      license: text(payload.result.license_id || payload.result.license_title),
      sourceUrl: safeUrl(payload.result.url) || source.url,
    }];
  } else {
    if (!Array.isArray(payload?.items)) throw reject("publisher_schema_unexpected");
    items = payload.items.slice(0, 5).map((item) => ({
      id: text(item.id),
      title: text(item.title),
      version: null,
      license: null,
      sourceUrl: source.url,
    })).filter((item) => item.id);
  }
  return Object.freeze({
    sourceId: source.sourceId,
    publisher: source.publisher,
    discoveryUrl: source.url,
    sourceType: "official_publisher_metadata",
    records: items,
    dataRightsVerified: false,
    observedMedicineMetricsAvailable: false,
    readyForCustomerInsights: false,
    nextStep: "approve_dataset_license_schema_and_provenance_before_ingestion",
  });
}
