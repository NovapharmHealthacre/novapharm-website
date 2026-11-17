/**
 * Governed upstream read adapter candidates. Server-side only.
 * Every request requires a trusted, independent rights-authorisation callback.
 * This module DOES NOT establish source rights or expose a public endpoint.
 */
const MAX_BYTES = 262144;
const MAX_RESULTS = 10;
const TIMEOUT_MS = 6000;

export const sourcePlans = Object.freeze({
  "us-fda-drugsfda": Object.freeze({
    country: "US", domain: "regulatory", origin: "https://api.fda.gov",
    path: "/drug/drugsfda.json",
    documentation: "https://open.fda.gov/apis/drug/drugsfda/how-to-use-the-endpoint/"
  }),
  "global-clinicaltrials": Object.freeze({
    country: "GLOBAL", domain: "clinical-trials", origin: "https://clinicaltrials.gov",
    path: "/api/v2/studies",
    documentation: "https://clinicaltrials.gov/data-api/api"
  }),
  "es-aemps-cima": Object.freeze({
    country: "ES", domain: "authorisation", origin: "https://cima.aemps.es",
    path: "/cima/rest/medicamentos",
    documentation: "https://www.aemps.gob.es/apps/cima/docs/CIMA_REST_API.pdf"
  })
});

function normaliseTerm(value) {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/.test(value)) throw new Error("Invalid search term");
  const term = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (term.length < 2 || term.length > 72 || !/^[\p{L}\p{N} .,-]+$/u.test(term)) {
    throw new Error("Invalid search term");
  }
  return term;
}

export function buildGovSourcePlan({ sourceId, term, limit = 5 }) {
  const source = sourcePlans[sourceId];
  if (!source) throw new Error("Unsupported source");
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_RESULTS) throw new Error("Invalid page size");
  const query = normaliseTerm(term);
  const url = new URL(source.path, source.origin);
  if (sourceId === "us-fda-drugsfda") {
    url.searchParams.set("search", 'products.brand_name:"' + query + '"');
    url.searchParams.set("limit", String(limit));
  } else if (sourceId === "global-clinicaltrials") {
    url.searchParams.set("query.term", query);
    url.searchParams.set("pageSize", String(limit));
    url.searchParams.set("format", "json");
  } else if (sourceId === "es-aemps-cima") {
    url.searchParams.set("nombre", query);
    url.searchParams.set("pagina", "1");
  }
  return Object.freeze({ sourceId, country: source.country, domain: source.domain, url: url.toString(), limit });
}

async function readJsonBounded(response) {
  if (!response || !response.ok) throw new Error("Upstream unavailable");
  const mime = response.headers?.get("content-type") || "";
  if (!mime.toLowerCase().includes("json")) throw new Error("Unexpected upstream media type");
  const length = Number(response.headers?.get("content-length") || 0);
  if (length > MAX_BYTES) throw new Error("Upstream response too large");
  if (!response.body?.getReader) throw new Error("Missing bounded upstream stream");
  const reader = response.body.getReader();
  const parts = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw new Error("Upstream response too large");
      parts.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  const raw = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { raw.set(part, offset); offset += part.byteLength; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw)); }
  catch { throw new Error("Invalid upstream JSON"); }
}

function safeString(value) {
  return typeof value === "string" ? value.slice(0, 240) : null;
}

export function normaliseGovSourceResult(plan, data) {
  let rows;
  if (plan.sourceId === "us-fda-drugsfda") {
    if (!Array.isArray(data?.results)) throw new Error("Unexpected source schema");
    rows = data.results.map((record) => ({
      localId: safeString(record.application_number),
      label: safeString(record.products?.[0]?.brand_name),
      provenanceDomain: "US FDA Drugs@FDA"
    }));
  } else if (plan.sourceId === "global-clinicaltrials") {
    if (!Array.isArray(data?.studies)) throw new Error("Unexpected source schema");
    rows = data.studies.map((record) => ({
      localId: safeString(record.protocolSection?.identificationModule?.nctId),
      label: safeString(record.protocolSection?.identificationModule?.briefTitle),
      provenanceDomain: "ClinicalTrials.gov"
    }));
  } else if (plan.sourceId === "es-aemps-cima") {
    if (!Array.isArray(data?.resultados)) throw new Error("Unexpected source schema");
    rows = data.resultados.map((record) => ({
      localId: safeString(record.nregistro),
      label: safeString(record.nombre),
      provenanceDomain: "AEMPS CIMA"
    }));
  } else {
    throw new Error("Unsupported source");
  }
  return Object.freeze({
    sourceId: plan.sourceId,
    jurisdiction: plan.country,
    dataState: "unreconciled_upstream_preview",
    canPublish: false,
    records: rows.slice(0, plan.limit).filter((record) => record.localId && record.label)
  });
}

/**
 * authorize is a trusted BACKEND service, not a client boolean.
 * It must verify source rights, purpose, tenant, licence expiry and revocation.
 * The returned approval is only suitable for internal evaluation, never display.
 */
export function createGovSourceReader({ authorize, transport = globalThis.fetch, now = () => Date.now() } = {}) {
  if (typeof authorize !== "function" || typeof transport !== "function") {
    throw new Error("Trusted authorizer and transport are required");
  }
  return Object.freeze({
    async read({ sourceId, term, limit = 5, tenantId } = {}) {
      const plan = buildGovSourcePlan({ sourceId, term, limit });
      if (typeof tenantId !== "string" || !/^[A-Za-z0-9_-]{2,64}$/.test(tenantId)) {
        throw new Error("Invalid tenant context");
      }
      const permission = await authorize({
        sourceId, tenantId, purpose: "internal-evaluation", domain: plan.domain, country: plan.country
      });
      if (permission?.decision !== "approved" ||
          typeof permission.receiptId !== "string" || !permission.receiptId.trim() ||
          typeof permission.validUntil !== "string" ||
          !Number.isFinite(Date.parse(permission.validUntil)) ||
          Date.parse(permission.validUntil) <= now()) {
        throw new Error("Source rights are not approved");
      }
      const response = await transport(plan.url, {
        method: "GET",
        redirect: "error",
        credentials: "omit",
        cache: "no-store",
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });
      return normaliseGovSourceResult(plan, await readJsonBounded(response));
    }
  });
}
