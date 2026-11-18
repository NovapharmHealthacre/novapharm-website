import {
  assertInternalEvaluationPermit,
  buildEvaluationEnvelope
} from "./intelligence-global-evidence-contract.mjs";

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
  "ca-health-canada-dpd": Object.freeze({
    country: "CA", domain: "regulatory", origin: "https://health-products.canada.ca",
    path: "/api/drug/drugproduct/",
    documentation: "https://health-products.canada.ca/api/documentation/dpd-documentation-en.html"
  }),
  "global-europepmc": Object.freeze({
    country: "GLOBAL", domain: "literature", origin: "https://www.ebi.ac.uk",
    path: "/europepmc/webservices/rest/search",
    documentation: "https://dev.europepmc.org/RestfulWebService"
  }),
  "global-pubmed": Object.freeze({
    country: "GLOBAL", domain: "literature", origin: "https://eutils.ncbi.nlm.nih.gov",
    path: "/entrez/eutils/esearch.fcgi",
    documentation: "https://www.ncbi.nlm.nih.gov/books/NBK25499/"
  }),
  "global-chembl": Object.freeze({
    country: "GLOBAL", domain: "drug-discovery", origin: "https://www.ebi.ac.uk",
    path: "/chembl/api/data/molecule/search.json",
    documentation: "https://chembl.gitbook.io/chembl-interface-documentation/web-services/chembl-data-web-services"
  }),
  "global-pubchem": Object.freeze({
    country: "GLOBAL", domain: "chemical-identity", origin: "https://pubchem.ncbi.nlm.nih.gov",
    path: "/rest/pug/compound/name/",
    documentation: "https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest"
  }),
  "pl-nfz-drug-program": Object.freeze({
    country: "PL", domain: "drug-program-reimbursement", origin: "https://api.nfz.gov.pl",
    path: "/app-stat-api-pl/drug-costs-by-active-substance",
    documentation: "https://api.nfz.gov.pl/app-stat-api-pl/swagger-docs"
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
  if (typeof sourceId !== "string" || !Object.hasOwn(sourcePlans, sourceId)) {
    throw new Error("Unsupported source");
  }
  const source = sourcePlans[sourceId];
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
  } else if (sourceId === "ca-health-canada-dpd") {
    url.searchParams.set("brandname", query);
    url.searchParams.set("lang", "en");
    url.searchParams.set("type", "json");
  } else if (sourceId === "global-europepmc") {
    url.searchParams.set("query", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("pageSize", String(limit));
    url.searchParams.set("resultType", "lite");
  } else if (sourceId === "global-pubmed") {
    url.searchParams.set("db", "pubmed");
    url.searchParams.set("term", query);
    url.searchParams.set("retmax", String(limit));
    url.searchParams.set("retmode", "json");
  } else if (sourceId === "global-chembl") {
    url.searchParams.set("q", query);
    url.searchParams.set("limit", String(limit));
  } else if (sourceId === "global-pubchem") {
    url.pathname = "/rest/pug/compound/name/" + encodeURIComponent(query) + "/cids/JSON";
  } else if (sourceId === "pl-nfz-drug-program") {
    url.searchParams.set("active-substance", query);
    url.searchParams.set("page", "1");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("format", "json");
    url.searchParams.set("api-version", "1.0");
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

// Never truncate an authority-issued medicine identifier. Preserve the exact
// source bytes or exclude unsafe candidate fields for independent review.
// Unicode control, invisible and bidi override characters may spoof identities.
const UNSAFE_SOURCE_CHARS = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/u;
function safeString(value, maxLength = 240) {
  return typeof value === "string" && value.length > 0 &&
    value.length <= maxLength && !UNSAFE_SOURCE_CHARS.test(value) ? value : null;
}

export function normaliseGovSourceResult(plan, data) {
  let rows;
  if (plan.sourceId === "us-fda-drugsfda") {
    if (!Array.isArray(data?.results)) throw new Error("Unexpected source schema");
    rows = data.results.map((record) => ({
      localId: safeString(record.application_number, 120),
      label: safeString(record.products?.[0]?.brand_name),
      provenanceDomain: "US FDA Drugs@FDA"
    }));
  } else if (plan.sourceId === "global-clinicaltrials") {
    if (!Array.isArray(data?.studies)) throw new Error("Unexpected source schema");
    rows = data.studies.map((record) => ({
      localId: safeString(record.protocolSection?.identificationModule?.nctId, 120),
      label: safeString(record.protocolSection?.identificationModule?.briefTitle),
      provenanceDomain: "ClinicalTrials.gov"
    }));
  } else if (plan.sourceId === "ca-health-canada-dpd") {
    if (!Array.isArray(data)) throw new Error("Unexpected source schema");
    rows = data.map((record) => ({
      localId: safeString(record.drug_identification_number, 120),
      label: safeString(record.brand_name),
      provenanceDomain: "Health Canada DPD"
    }));
  } else if (plan.sourceId === "global-europepmc") {
    if (!Array.isArray(data?.resultList?.result)) throw new Error("Unexpected source schema");
    rows = data.resultList.result.map((record) => ({
      localId: safeString(record.id, 120),
      label: safeString(record.title),
      provenanceDomain: "Europe PMC"
    }));
  } else if (plan.sourceId === "global-pubmed") {
    if (!Array.isArray(data?.esearchresult?.idlist)) throw new Error("Unexpected source schema");
    rows = data.esearchresult.idlist.map((id) => ({
      localId: safeString(id, 120),
      label: safeString(id),
      provenanceDomain: "NCBI PubMed ESearch (PMID only)"
    }));
  } else if (plan.sourceId === "global-chembl") {
    if (!Array.isArray(data?.molecules)) throw new Error("Unexpected source schema");
    rows = data.molecules.map((record) => ({
      localId: safeString(record.molecule_chembl_id, 120),
      label: safeString(record.pref_name) || safeString(record.molecule_chembl_id),
      provenanceDomain: "ChEMBL molecule search"
    }));
  } else if (plan.sourceId === "global-pubchem") {
    if (!Array.isArray(data?.IdentifierList?.CID)) throw new Error("Unexpected source schema");
    rows = data.IdentifierList.CID.map((cid) => ({
      localId: Number.isSafeInteger(cid) && cid > 0 ? String(cid) : null,
      label: Number.isSafeInteger(cid) && cid > 0 ? "CID " + cid : null,
      provenanceDomain: "PubChem CID discovery"
    }));
  } else if (plan.sourceId === "pl-nfz-drug-program") {
    // Official NFZ response is { meta, links, data: { sums, data: [...] } }.
    // Flat arrays and guessed nested shapes are not the documented contract.
    if (!data || typeof data !== "object" ||
        Array.isArray(data) || Array.isArray(data.errors) ||
        !data.data || Array.isArray(data.data) ||
        !Array.isArray(data.data.data)) {
      throw new Error("Unexpected source schema");
    }
    const groups = data.data.data;
    rows = groups.map((entry) => {
      const value = entry?.attributes && typeof entry.attributes === "object" ? entry.attributes : entry;
      return {
        localId: safeString(value?.["active-substance-code"], 120),
        label: safeString(value?.["active-substance-name"]),
        provenanceDomain: "NFZ drug-program reimbursement (substance identity only)"
      };
    });
  } else if (plan.sourceId === "es-aemps-cima") {
    if (!Array.isArray(data?.resultados)) throw new Error("Unexpected source schema");
    rows = data.resultados.map((record) => ({
      localId: safeString(record.nregistro, 120),
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
  if (typeof authorize !== "function" || typeof transport !== "function" || typeof now !== "function") {
    throw new Error("Trusted authorizer and transport are required");
  }
  return Object.freeze({
    async read({ sourceId, term, limit = 5, tenantId } = {}) {
      const plan = buildGovSourcePlan({ sourceId, term, limit });
      if (typeof tenantId !== "string" || !/^[A-Za-z0-9_-]{2,64}$/.test(tenantId)) {
        throw new Error("Invalid tenant context");
      }
      let permission;
      try {
        permission = await authorize({
          sourceId, tenantId, purpose: "internal-evaluation", domain: plan.domain, country: plan.country
        });
      } catch { throw new Error("Source rights are not approved"); }
      let grantedAt;
      try { grantedAt = now(); }
      catch { throw new Error("Source rights are not approved"); }
      const grant = assertInternalEvaluationPermit({
        permit: permission, sourceId, tenantId,
        domain: plan.domain, country: plan.country, now: grantedAt
      });
      let response;
      try {
        response = await transport(plan.url, {
          method: "GET",
          redirect: "error",
          credentials: "omit",
          cache: "no-store",
          headers: { accept: "application/json" },
          signal: AbortSignal.timeout(TIMEOUT_MS)
        });
      } catch { throw new Error("Upstream unavailable"); }
      let raw;
      try { raw = await readJsonBounded(response); }
      catch { throw new Error("Upstream unavailable"); }
      let capturedAt;
      try { capturedAt = now(); }
      catch { throw new Error("Invalid evaluation envelope"); }
      // The source rights clock must remain valid and monotonic for the entire
      // request. The initial receipt alone is not proof against revocation.
      if (!Number.isSafeInteger(capturedAt) || capturedAt < grantedAt ||
          capturedAt >= Date.parse(grant.validUntil)) {
        throw new Error("Invalid evaluation envelope");
      }
      let postPermission;
      try {
        postPermission = await authorize({
          sourceId, tenantId, purpose: "internal-evaluation",
          domain: plan.domain, country: plan.country
        });
      } catch { throw new Error("Source rights are not approved"); }
      let refreshedGrant;
      try {
        refreshedGrant = assertInternalEvaluationPermit({
          permit: postPermission, sourceId, tenantId,
          domain: plan.domain, country: plan.country, now: capturedAt
        });
      } catch { throw new Error("Source rights are not approved"); }
      if (refreshedGrant.receiptId !== grant.receiptId ||
          refreshedGrant.licenseId !== grant.licenseId ||
          refreshedGrant.rightsVersion !== grant.rightsVersion ||
          refreshedGrant.validUntil !== grant.validUntil) {
        throw new Error("Source rights changed during evaluation");
      }
      // The reauthorisation service itself may take time. Never stamp an
      // evidence preview with a clock sampled before that service completed.
      let finalAt;
      try { finalAt = now(); }
      catch { throw new Error("Invalid evaluation envelope"); }
      if (!Number.isSafeInteger(finalAt) || finalAt < capturedAt ||
          finalAt >= Date.parse(refreshedGrant.validUntil)) {
        throw new Error("Invalid evaluation envelope");
      }
      const normalized = normaliseGovSourceResult(plan, raw);
      return buildEvaluationEnvelope({
        plan, normalized, raw, grant: refreshedGrant, capturedAt: finalAt
      });
    }
  });
}
