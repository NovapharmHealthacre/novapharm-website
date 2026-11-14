/**
 * Official MHRA search-discovery adapter via the documented GOV.UK Search API.
 *
 * Bounded read-only publisher-metadata discovery, NOT an exhaustive medicines
 * recall feed, clinical safety decision, or verified recall record.
 */
import { createHash } from "node:crypto";

const ENDPOINT = "https://www.gov.uk/api/search.json";
const ORGANISATION = "medicines-and-healthcare-products-regulatory-agency";
const THEMES = Object.freeze({
  medicines_recall: "medicines recall",
  medical_device: "medical device safety",
  drug_safety: "drug safety update",
  patient_safety: "national patient safety alert MHRA",
});
const SHA = value => createHash("sha256").update(value, "utf8").digest("hex");
const deny = (code, statusCode = 403) =>
  Object.assign(new Error("Private MHRA source discovery unavailable."), { code, statusCode });
const text = (value, max = 300) =>
  typeof value === "string" && value.trim().length > 0 &&
  !/[\u0000-\u001f\u007f]/u.test(value)
    ? value.trim().slice(0, max) : null;

function searchInput({ theme, query, limit, start }) {
  if (!Object.hasOwn(THEMES, theme)) throw deny("unsupported_mhra_theme", 400);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 10 ||
      !Number.isSafeInteger(start) || start < 0 || start > 100)
    throw deny("invalid_pagination", 400);
  if (query != null && (typeof query !== "string" || query.length > 75 ||
       !/^[a-zA-Z0-9 ./'()+-]{2,75}$/u.test(query.trim())))
    throw deny("invalid_source_query", 400);
  return { theme, query: query == null ? null : query.trim(), limit, start };
}
function safeGovUkLink(value) {
  if (typeof value !== "string" || !/^\/[a-z0-9][a-z0-9/_-]{1,400}$/iu.test(value) ||
      value.includes("//") || value.includes("..")) return null;
  return "https://www.gov.uk" + value;
}
function safeDate(value) {
  if (typeof value !== "string" || value.length > 50 || !/^\d{4}-\d{2}-\d{2}/u.test(value)) return null;
  return Number.isFinite(Date.parse(value)) ? value : null;
}

/**
 * Strict private board review. Session and flag must come from a separately
 * authenticated HTTP layer and server-only configuration, never from a query.
 */
export async function discoverMhraOfficialAlerts({
  theme = "medicines_recall", query = null, limit = 5, start = 0,
  privateReviewEnabled = false, serverVerifiedBoardSession = false,
  fetchImpl = globalThis.fetch, clock = Date.now,
} = {}) {
  if (privateReviewEnabled !== true || serverVerifiedBoardSession !== true)
    throw deny("private_review_not_enabled");
  const input = searchInput({ theme, query, limit, start });
  if (typeof fetchImpl !== "function" || typeof clock !== "function")
    throw deny("source_transport_unavailable", 503);
  const current = clock();
  if (!Number.isSafeInteger(current) || current <= 0)
    throw deny("invalid_server_clock", 503);
  const url = new URL(ENDPOINT);
  url.searchParams.set("q", [THEMES[input.theme], input.query].filter(Boolean).join(" "));
  url.searchParams.set("count", String(input.limit));
  url.searchParams.set("start", String(input.start));
  url.searchParams.set("order", "-public_timestamp");
  url.searchParams.set("filter_organisations", ORGANISATION);
  url.searchParams.set("fields", "link,title,description,public_timestamp");
  let response;
  try {
    response = await fetchImpl(url, {
      method: "GET", redirect: "error", signal: AbortSignal.timeout(8000),
      headers: { accept: "application/json" },
    });
  } catch { throw deny("publisher_network_unavailable", 502); }
  if (response?.ok !== true) throw deny("publisher_response_unavailable", 502);
  if (!String(response.headers?.get?.("content-type") || "").toLowerCase().includes("json"))
    throw deny("publisher_content_type_invalid", 502);
  if (Number(response.headers?.get?.("content-length") || 0) > 500_000)
    throw deny("publisher_response_too_large", 502);
  let raw;
  try { raw = await response.text(); }
  catch { throw deny("publisher_body_unreadable", 502); }
  if (!raw || Buffer.byteLength(raw, "utf8") > 500_000)
    throw deny("publisher_response_too_large", 502);
  let payload;
  try { payload = JSON.parse(raw); }
  catch { throw deny("publisher_json_invalid", 502); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
      !Array.isArray(payload.results) || payload.results.length > input.limit ||
      !Number.isSafeInteger(payload.total) || payload.total < 0)
    throw deny("publisher_search_schema_invalid", 502);

  const results = payload.results.map(row => {
    if (!row || typeof row !== "object" || Array.isArray(row))
      throw deny("publisher_result_invalid", 502);
    const link = safeGovUkLink(row.link);
    const title = text(row.title, 280);
    if (!link || !title) throw deny("publisher_result_invalid", 502);
    return Object.freeze({
      title, url: link, description: text(row.description, 380),
      publicTimestamp: safeDate(row.public_timestamp),
      issuingOrganisation: "MHRA (GOV.UK organisation search filter)",
      sourceAuthorityVerifiedIndividually: false,
      clinicalSafetyDecisionReviewed: false,
      recallCaseAuthenticated: false,
    });
  });
  return Object.freeze({
    contract: "novapharm.private-mhra-govuk-alert-discovery.v1",
    source: "GOV.UK public Search API",
    organisationFilter: ORGANISATION, searchTheme: input.theme,
    sourceQuery: input.query, totalPublisherSearchMatches: payload.total,
    start: input.start, limit: input.limit, fetchedAt: new Date(current).toISOString(),
    responseSha256: SHA(raw), results: Object.freeze(results),
    officialRecallRegisterReconciled: false, fullSafetyFeedCoverageVerified: false,
    sourceRightsReviewedForCustomerPublication: false, customerAccessAllowed: false,
    status: "private_search_metadata_unreviewed",
    warning: "Search discovery is not an exhaustive live recall feed. Confirm on the official MHRA safety-alert record before any inventory/quarantine or distribution action.",
  });
}
