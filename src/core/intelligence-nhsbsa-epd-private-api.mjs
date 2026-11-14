/**
 * Private, bounded, read-only NHSBSA EPD CKAN Action API integration.
 *
 * This is intentionally NOT the customer medicines catalogue or a licensed
 * terminology service. The only external host is opendata.nhsbsa.net; the
 * resource UUID comes from the publisher's current package_show metadata.
 * The response projects out all medicine names, BNF/SNOMED fields and
 * practice identifiers. Nothing is stored or treated as accepted evidence.
 */
import { createHash } from "node:crypto";

const BASE = "https://opendata.nhsbsa.net";
const DATASET = "english-prescribing-dataset-epd-with-snomed-code";
const PERIOD = /^20\d{2}-(0[1-9]|1[0-2])$/u;
const RESOURCE = /^EPD_SNOMED_(20\d{2})(0[1-9]|1[0-2])$/u;
const UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/iu;
const BNF_PRESENTATION = /^[A-Z0-9]{15}$/u;
const SHA256 = /^[a-f0-9]{64}$/iu;
const hash = value => createHash("sha256").update(value, "utf8").digest("hex");

function denied(reason, statusCode = 403) {
  return Object.assign(new Error("NHSBSA private source API unavailable."), {
    code: reason, statusCode,
  });
}
function isoClock(clock) {
  const time = clock();
  if (!Number.isSafeInteger(time) || time <= 0) throw denied("invalid_server_clock", 503);
  return new Date(time).toISOString();
}
function cleanPeriod(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !PERIOD.test(value)) throw denied("invalid_reporting_period", 400);
  return value;
}
function cleanCode(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !BNF_PRESENTATION.test(value.trim().toUpperCase())) {
    throw denied("invalid_exact_presentation_code", 400);
  }
  return value.trim().toUpperCase();
}
function positiveNumber(value, max, integer = false) {
  if (value === null || value === "" || typeof value === "boolean") throw denied("publisher_schema_mismatch", 502);
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > max || (integer && !Number.isSafeInteger(n))) {
    throw denied("publisher_schema_mismatch", 502);
  }
  return n;
}
async function officialAction(name, parameters, fetchImpl, byteCap) {
  const url = new URL("/api/3/action/" + name, BASE);
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
  let response;
  try {
    response = await fetchImpl(url, {
      method: "GET", redirect: "error",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(7000),
    });
  } catch { throw denied("publisher_network_unavailable", 502); }
  if (!response || response.ok !== true) throw denied("publisher_http_unavailable", 502);
  const type = String(response.headers?.get?.("content-type") || "").toLowerCase();
  if (!type.includes("json")) throw denied("publisher_content_type_unexpected", 502);
  const advertised = Number(response.headers?.get?.("content-length") || 0);
  if (advertised > byteCap) throw denied("publisher_response_too_large", 502);
  let raw;
  try { raw = await response.text(); }
  catch { throw denied("publisher_body_unreadable", 502); }
  if (!raw || Buffer.byteLength(raw, "utf8") > byteCap) throw denied("publisher_response_too_large", 502);
  let json;
  try { json = JSON.parse(raw); } catch { throw denied("publisher_json_invalid", 502); }
  if (json?.success !== true || !json.result || typeof json.result !== "object" ||
      Array.isArray(json.result)) throw denied("publisher_action_failed", 502);
  return { data: json.result, bodySha256: hash(raw) };
}
function periodResource(resource) {
  if (!resource || typeof resource !== "object" || Array.isArray(resource) ||
      typeof resource.name !== "string" || !UUID.test(resource.id || "") ||
      ![true, "true"].includes(resource.datastore_active)) return null;
  const match = RESOURCE.exec(resource.name);
  if (!match) return null;
  return { period: match[1] + "-" + match[2], id: resource.id,
    declaredSha256: typeof resource.sha256 === "string" && SHA256.test(resource.sha256)
      ? resource.sha256.toLowerCase()
      : typeof resource.hash === "string" && SHA256.test(resource.hash) ? resource.hash.toLowerCase() : null };
}

/**
 * Explicitly private / board-only by the calling server. A caller-supplied
 * boolean is not a real authorization system: the HTTP route must first
 * independently authenticate the board principal and check its default-OFF
 * server-only feature gate. No direct public/client invocation is supported.
 */
export async function inspectNhsbsaEpdPrivateApi({
  period = null, presentationCode = null, limit = 2,
  privateReviewEnabled = false, serverVerifiedBoardSession = false,
  fetchImpl = globalThis.fetch, clock = Date.now,
} = {}) {
  if (privateReviewEnabled !== true || serverVerifiedBoardSession !== true) {
    throw denied("private_release_not_enabled");
  }
  if (typeof fetchImpl !== "function" || typeof clock !== "function") throw denied("transport_unavailable", 503);
  const requestedPeriod = cleanPeriod(period);
  const exactCode = cleanCode(presentationCode);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 5) throw denied("unbounded_sample", 400);
  const checkedAt = isoClock(clock);
  const metadata = await officialAction("package_show", { id: DATASET }, fetchImpl, 2_000_000);
  const pkg = metadata.data;
  if (pkg.name !== DATASET || pkg.license_id !== "OGL-UK-3.0" ||
      !Array.isArray(pkg.resources) || pkg.resources.length > 250) {
    throw denied("source_package_or_licence_changed", 502);
  }
  const resources = pkg.resources.map(periodResource).filter(Boolean)
    .sort((a, b) => a.period.localeCompare(b.period));
  if (resources.length === 0) throw denied("no_queryable_epd_resources", 503);
  const selected = requestedPeriod
    ? resources.find(r => r.period === requestedPeriod)
    : resources.at(-1);
  if (!selected) throw denied("requested_source_period_not_available", 404);

  const query = { resource_id: selected.id, offset: "0", limit: String(limit) };
  if (exactCode) query.filters = JSON.stringify({ BNF_PRESENTATION_CODE: exactCode });
  const sample = await officialAction("datastore_search", query, fetchImpl, 450_000);
  if (!Array.isArray(sample.data.records) || sample.data.records.length > limit) {
    throw denied("unbounded_or_invalid_datastore_response", 502);
  }
  const projected = sample.data.records.map(row => {
    if (!row || typeof row !== "object" || Array.isArray(row)) throw denied("publisher_schema_mismatch", 502);
    if (!["YEAR_MONTH", "PRACTICE_CODE", "BNF_PRESENTATION_CODE", "ITEMS", "NIC"]
      .every(field => Object.hasOwn(row, field))) throw denied("publisher_schema_mismatch", 502);
    const month = String(row.YEAR_MONTH);
    if (month !== selected.period && month !== selected.period.replace("-", "")) throw denied("publisher_period_mismatch", 502);
    const code = String(row.BNF_PRESENTATION_CODE || "").trim().toUpperCase();
    if (!BNF_PRESENTATION.test(code) || (exactCode && code !== exactCode)) throw denied("publisher_code_mismatch", 502);
    const items = positiveNumber(row.ITEMS, 10_000_000, true);
    const netIngredientCost = positiveNumber(row.NIC, 1_000_000_000);
    return Object.freeze({
      sourceRowSha256: hash(JSON.stringify(row)),
      observedItemsUnapproved: items,
      observedNicGbpUnapproved: netIngredientCost,
      acceptedObservation: false,
    });
  });
  return Object.freeze({
    contract: "novapharm.private-nhsbsa-epd-api-probe.v1",
    publisher: "NHS Business Services Authority",
    sourceId: "nhsbsa.epd", period: selected.period,
    resourceId: selected.id, publisherMetadataSha256: metadata.bodySha256,
    publisherDatastoreResponseSha256: sample.bodySha256,
    publisherDeclaredCsvSha256: selected.declaredSha256,
    sampleLimit: limit, sampleRows: Object.freeze(projected),
    matchedRowsInBoundedSample: projected.length, observedAt: checkedAt,
    attribution: "NHSBSA Copyright 2025",
    publisherLicence: "Open Government Licence 3.0 (NHSBSA-owned content only)",
    fullDatasetReconciled: false, sourceRightsVerified: false,
    thirdPartyTerminologyRightsVerified: false, medicineIdentityAccepted: false,
    commercialPublicationApproved: false, customerAccessEnabled: false,
    status: "private_unapproved_publisher_api_sample",
  });
}
