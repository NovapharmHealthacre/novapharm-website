/**
 * Board-only, read-only US FDA source evidence. Never grants marketing approval,
 * clinical causality, medicine identity, supply or commercial publication rights.
 * No persistence, no patient-level event records, no raw adverse-event text.
 */
const ROOT = "https://api.fda.gov/drug/";
const MAX_BYTES = 262144;
const MAX_RECORDS = 3;
const TIMEOUT_MS = 8000;
export const FDA_EVIDENCE_KINDS = Object.freeze(["approvals", "ndc", "adverse-events", "recalls"]);
const CONFIG = Object.freeze({
  approvals: { path: "drugsfda.json", field: "products.active_ingredients.name", documentation: "https://open.fda.gov/apis/drug/drugsfda/" },
  ndc: { path: "ndc.json", field: "generic_name", documentation: "https://open.fda.gov/apis/drug/ndc/" },
  "adverse-events": { path: "event.json", field: "patient.drug.medicinalproduct", documentation: "https://open.fda.gov/apis/drug/event/" },
  recalls: { path: "enforcement.json", field: "product_description", documentation: "https://open.fda.gov/apis/drug/enforcement/" }
});
function reject(statusCode, message) {
  throw Object.assign(new Error(message), { statusCode });
}
function sanitizeTerm(value) {
  const untrusted = String(value ?? "");
  // Reject raw control characters before any whitespace normalization.
  if (/[\p{Cc}\p{Cf}\p{Cs}]/u.test(untrusted)) reject(400, "Invalid control character in medicine name.");
  const normalized = untrusted.normalize("NFKC").trim().replace(/\s+/gu, " ");
  if (!/^[A-Za-z][A-Za-z0-9 -]{1,63}$/u.test(normalized)) reject(400, "Enter a generic medicine name using 2–64 permitted characters.");
  return normalized;
}
function safe(value, max = 128) {
  return typeof value === "string" && !/[\p{Cc}\p{Cf}\p{Cs}]/u.test(value) ? value.slice(0, max) : null;
}
function safeList(value, max = 3) {
  return Array.isArray(value) ? value.slice(0, max).map((v) => safe(v, 100)).filter(Boolean) : [];
}
function mapRecord(kind, data) {
  const r = data && typeof data === "object" && !Array.isArray(data) ? data : {};
  if (kind === "approvals") {
    return {
      applicationNumber: safe(r.application_number, 48),
      sponsorName: safe(r.sponsor_name),
      products: Array.isArray(r.products) ? r.products.slice(0, 2).map((p) => ({
        brandName: safe(p?.brand_name), dosageForm: safe(p?.dosage_form, 80),
        marketingStatus: safe(p?.marketing_status, 48),
        productNumber: safe(p?.product_number, 48)
      })) : [],
      // Submission is a source-reported status, NOT a current approval decision.
      submissions: Array.isArray(r.submissions) ? r.submissions.slice(0, 2).map((s) => ({
        status: safe(s?.submission_status, 64), statusDate: safe(s?.submission_status_date, 16),
        type: safe(s?.submission_type, 32)
      })) : []
    };
  }
  if (kind === "ndc") {
    return {
      productNdc: safe(r.product_ndc, 48), genericName: safe(r.generic_name),
      brandName: safe(r.brand_name), labelerName: safe(r.labeler_name),
      marketingCategory: safe(r.marketing_category, 80),
      marketingStartDate: safe(r.marketing_start_date, 16),
      packageNdcs: Array.isArray(r.packaging) ? r.packaging.slice(0, 3).map((p) => safe(p?.package_ndc, 48)).filter(Boolean) : []
    };
  }
  if (kind === "recalls") {
    return {
      recallNumber: safe(r.recall_number, 64), classification: safe(r.classification, 24),
      status: safe(r.status, 32), reportDate: safe(r.report_date, 16),
      productDescription: safe(r.product_description, 160),
      reasonForRecall: safe(r.reason_for_recall, 160),
      recallingFirm: safe(r.recalling_firm, 120)
    };
  }
  return null;
}
async function boundedJson(response) {
  if (response.status === 404) return null;
  if (!response.ok) reject(503, "The FDA source is temporarily unavailable.");
  if (!/\bapplication\/json\b/i.test(response.headers?.get("content-type") || "")) reject(503, "FDA source response type not accepted.");
  if (!response.body?.getReader) reject(503, "FDA source response stream unavailable.");
  const claimed = Number(response.headers?.get("content-length") || 0);
  if (claimed > MAX_BYTES) reject(503, "FDA source response exceeds the research limit.");
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array) || (size += value.byteLength) > MAX_BYTES) reject(503, "FDA source response exceeds the research limit.");
      chunks.push(value);
    }
  } catch (error) {
    if (error?.statusCode) throw error;
    reject(503, "FDA source response could not be read.");
  } finally {
    try { await reader.cancel(); } catch {}
    try { reader.releaseLock(); } catch {}
  }
  const raw = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { raw.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw)); }
  catch { reject(503, "FDA source response could not be validated."); }
}
export async function searchFdaEvidence(kind, genericName, context, options = {}) {
  // Caller must authenticate BEFORE invoking this adapter; repeat authorization in depth.
  if (!context?.accessScopes?.includes("board") && !context?.accessScopes?.includes("admin")) {
    reject(403, "Executive Medicines Intelligence access required.");
  }
  if (!Object.hasOwn(CONFIG, kind)) reject(400, "Unsupported FDA research dataset.");
  const term = sanitizeTerm(genericName);
  const plan = CONFIG[kind];
  const url = new URL(plan.path, ROOT);
  url.searchParams.set("search", plan.field + ':"' + term + '"');
  url.searchParams.set("limit", String(kind === "adverse-events" ? 1 : MAX_RECORDS));
  let response;
  try {
    response = await (options.fetchImpl ?? fetch)(url.toString(), {
      method: "GET", headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "error", cache: "no-store"
    });
  } catch {
    reject(503, "The FDA source is temporarily unavailable.");
  }
  if (response.redirected || (response.url && response.url !== url.toString())) {
    reject(503, "Unexpected FDA source location.");
  }
  const payload = await boundedJson(response);
  if (payload !== null && (!payload || !Array.isArray(payload.results))) {
    reject(503, "FDA source response schema is invalid.");
  }
  const matchedCount = Number.isSafeInteger(payload?.meta?.results?.total)
    ? payload.meta.results.total : null;
  const records = kind === "adverse-events" ? [] :
    (payload?.results || []).slice(0, MAX_RECORDS).map((r) => mapRecord(kind, r));
  return {
    sourceId: "us.fda.openfda." + kind,
    jurisdiction: "US",
    publisher: "US Food and Drug Administration",
    kind, query: term, retrievedAt: new Date().toISOString(),
    sourceDocumentation: plan.documentation,
    dataState: payload === null ? "no_source_matches" : "public_source_observations",
    matchedCountReported: matchedCount, records,
    limitations: [
      "Research-only public source observation. No commercial, clinical or production data admission.",
      kind === "adverse-events"
        ? "FAERS reporting counts do not measure incidence, establish causation or include patient records."
        : "Source listings, NDCs, application and recall records do not establish current approval, supply or suitability.",
      "US-only source identifiers must not be treated as globally canonical."
    ]
  };
}
