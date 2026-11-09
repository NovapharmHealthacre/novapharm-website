const OPENFDA_LABEL_ENDPOINT = "https://api.fda.gov/drug/label.json";
const MAX_RESULTS = 5;

function invalid(message) {
  return Object.assign(new Error(message), { statusCode: 400 });
}

function unavailable() {
  return Object.assign(new Error("The FDA label service is unavailable. No regulatory status has been inferred."), { statusCode: 503 });
}

function forbidden() {
  return Object.assign(new Error("Executive Medicines Intelligence access required."), { statusCode: 403 });
}

function normaliseDrugName(value) {
  const drug = String(value ?? "").normalize("NFKC").trim().replace(/\s+/gu, " ");
  if (!/^[a-zA-Z][a-zA-Z0-9 -]{1,79}$/u.test(drug)) {
    throw invalid("Enter a medicine generic name (2–80 letters, numbers, spaces or hyphens).");
  }
  return drug;
}

function boundedStrings(value, maxItems = 4) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string").slice(0, maxItems).map((item) => item.slice(0, 160))
    : [];
}

function mapRecord(raw) {
  const record = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const fda = record.openfda && typeof record.openfda === "object" ? record.openfda : {};
  return {
    recordId: typeof record.id === "string" ? record.id.slice(0, 128) : null,
    setId: typeof record.set_id === "string" ? record.set_id.slice(0, 128) : null,
    effectiveDate: typeof record.effective_time === "string" && /^\d{8}$/u.test(record.effective_time) ? record.effective_time : null,
    genericNames: boundedStrings(fda.generic_name),
    brandNames: boundedStrings(fda.brand_name),
    applicationNumbers: boundedStrings(fda.application_number),
    productTypes: boundedStrings(fda.product_type),
  };
}

/**
 * Read-only public US drug label discovery, never an approval, clinical advice,
 * market fact, or cross-jurisdiction product identity resolution.
 * Caller must enforce board/admin session and per-user rate limits.
 */
export async function searchOpenFdaLabels(drugName, context, options = {}) {
  if (!context?.accessScopes?.includes("board") && !context?.accessScopes?.includes("admin")) throw forbidden();
  const query = normaliseDrugName(drugName);
  const requestUrl = new URL(OPENFDA_LABEL_ENDPOINT);
  requestUrl.searchParams.set("search", `openfda.generic_name:"${query}"`);
  requestUrl.searchParams.set("limit", String(MAX_RESULTS));
  const apiKey = options.apiKey ?? process.env.OPENFDA_API_KEY;
  if (apiKey) requestUrl.searchParams.set("api_key", String(apiKey));
  const fetchImpl = options.fetchImpl ?? fetch;
  let response;
  try {
    response = await fetchImpl(requestUrl.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
      redirect: "error",
    });
  } catch {
    throw unavailable();
  }
  const metadata = {
    query,
    sourceId: "us.fda.openfda-labels",
    publisher: "US Food and Drug Administration",
    jurisdiction: "United States",
    sourceEndpoint: OPENFDA_LABEL_ENDPOINT,
    retrievedAt: new Date().toISOString(),
    recordType: "published-drug-label",
    limitations: [
      "Drug label records are not proof of current marketing authorisation, stock, supply, safety or price.",
      "openFDA record identifiers are not a cross-jurisdiction canonical medicine identity.",
      "Do not rely on this service for medical diagnosis, treatment or regulated decisions.",
    ],
  };
  if (response.status === 404) {
    return { ...metadata, dataState: "no_source_matches", records: [], truncated: false };
  }
  if (response.status === 429 || response.status >= 500 || !response.ok) throw unavailable();
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw unavailable();
  }
  if (!payload || !Array.isArray(payload.results)) throw unavailable();
  const records = payload.results.slice(0, MAX_RESULTS).map(mapRecord);
  return {
    ...metadata,
    dataState: records.length ? "public_source_observations" : "no_source_matches",
    records,
    truncated: Number(payload.meta?.results?.total) > MAX_RESULTS,
    matchedCountReported: Number.isSafeInteger(payload.meta?.results?.total) ? payload.meta.results.total : null,
  };
}
