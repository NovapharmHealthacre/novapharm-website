import {
  assertInternalEvaluationPermit,
  buildEvaluationEnvelope
} from "./intelligence-global-evidence-contract.mjs";

/**
 * Additional official upstream API contracts. Server-side internal research only.
 * No automatic rights, production ingestion, self-admission or customer endpoint.
 * This is intentionally separate from the five initial country API candidates.
 */
const MAX_BYTES = 262144;
const MAX_RESULTS = 10;
const TIMEOUT_MS = 6000;
const HSA_DATASET = "d_767279312753558cbf19d48344577084";

export const secondarySourcePlans = Object.freeze({
  "sg-hsa-products": Object.freeze({
    country: "SG", domain: "regulatory",
    origin: "https://data.gov.sg",
    path: "/api/action/datastore_search",
    candidateKey: "asia-pacific-singapore-hsa-data-gov-sg",
    documentation: "https://data.gov.sg/datasets/d_767279312753558cbf19d48344577084/view"
  }),
  "gb-nhsbsa-dataset-catalogue": Object.freeze({
    country: "GB", domain: "dataset-catalogue",
    origin: "https://opendata.nhsbsa.net",
    path: "/api/3/action/package_search",
    candidateKey: "europe-united-kingdom-nhsbsa-english-prescribing-dataset",
    documentation: "https://opendata.nhsbsa.net/pages/terms-and-conditions"
  })
});

function validTerm(value) {
  if (typeof value !== "string" || /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u.test(value)) {
    throw new Error("Invalid search term");
  }
  const term = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (term.length < 2 || term.length > 72 || !/^[\p{L}\p{N} .,-]+$/u.test(term)) {
    throw new Error("Invalid search term");
  }
  return term;
}

function sourceField(value, max) {
  return typeof value === "string" && value.trim().length > 0 &&
    value.length <= max && !/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u.test(value)
    ? value : null;
}

function trustedMillis(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Invalid trusted server time");
  return value;
}

export function buildSecondarySourcePlan({ sourceId, term, limit = 5 } = {}) {
  if (typeof sourceId !== "string" || !Object.hasOwn(secondarySourcePlans, sourceId)) {
    throw new Error("Unsupported source");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_RESULTS) {
    throw new Error("Invalid page size");
  }
  const source = secondarySourcePlans[sourceId];
  const query = validTerm(term);
  const url = new URL(source.path, source.origin);
  switch (sourceId) {
    case "sg-hsa-products":
      url.searchParams.set("resource_id", HSA_DATASET);
      // data.gov.sg documents datastore q as a JSON object keyed by column;
      // a bare string is not a schema-bound product-name query.
      url.searchParams.set("q", JSON.stringify({ Productname: query }));
      url.searchParams.set("limit", String(limit));
      break;
    case "gb-nhsbsa-dataset-catalogue":
      url.searchParams.set("q", query);
      url.searchParams.set("rows", String(limit));
      break;
    default:
      throw new Error("Unsupported source");
  }
  if (url.origin !== source.origin || !url.pathname.startsWith(source.path)) {
    throw new Error("Source endpoint guard failed");
  }
  return Object.freeze({
    sourceId, country: source.country, domain: source.domain,
    candidateKey: source.candidateKey, term: query,
    url: url.toString(), limit
  });
}

export function normaliseSecondarySourceResult(plan, data) {
  if (!plan || !Object.hasOwn(secondarySourcePlans, plan.sourceId)) {
    throw new Error("Unsupported source");
  }
  let rows;
  switch (plan.sourceId) {
    case "sg-hsa-products": {
      // The official CKAN response binds both resource_id and fields to a
      // published source. Records without these cannot prove dataset identity.
      const resource = data?.result;
      const fields = resource?.fields;
      if (data?.success !== true ||
          resource?.resource_id !== HSA_DATASET ||
          !Array.isArray(fields) ||
          !fields.some((f) => f?.id === "LicenceNo") ||
          !fields.some((f) => f?.id === "Productname") ||
          !Array.isArray(resource?.records) ||
          resource.records.length > plan.limit) {
        throw new Error("Unexpected HSA resource identity or schema");
      }
      rows = resource.records.map((r) => ({
        localId: r?.LicenceNo,
        label: r?.Productname
      }));
      break;
    }
    case "gb-nhsbsa-dataset-catalogue":
      if (data?.success !== true || !Array.isArray(data?.result?.results)) {
        throw new Error("Unexpected source schema");
      }
      rows = data.result.results.map((r) => ({
        localId: r?.id,
        label: r?.title || r?.name
      }));
      break;
    default:
      throw new Error("Unsupported source");
  }
  return Object.freeze({
    sourceId: plan.sourceId,
    jurisdiction: plan.country,
    dataState: "unreconciled_upstream_preview",
    canPublish: false,
    records: rows.slice(0, plan.limit).map((row) => ({
      localId: sourceField(row.localId, 120),
      label: sourceField(row.label, 240)
    })).filter((row) => row.localId && row.label)
  });
}

async function boundedJson(response) {
  if (!response?.ok) throw new Error("Upstream unavailable");
  if (!(response.headers?.get("content-type") || "").toLowerCase().includes("json")) {
    throw new Error("Unexpected upstream media type");
  }
  const length = Number(response.headers?.get("content-length") || 0);
  if (!Number.isFinite(length) || length > MAX_BYTES) throw new Error("Upstream response too large");
  if (!response.body?.getReader) throw new Error("Missing bounded stream");
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw new Error("Upstream response too large");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let index = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, index);
    index += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error("Invalid upstream JSON");
  }
}

/**
 * The injected authorize function MUST be an independent trusted backend
 * rights service. No client/grant parameter can bypass it.
 */
export function createSecondarySourceReader({
  authorize, transport = globalThis.fetch, now = () => Date.now()
} = {}) {
  if (typeof authorize !== "function" || typeof transport !== "function" || typeof now !== "function") {
    throw new Error("Trusted authorizer, transport and clock are required");
  }
  return Object.freeze({
    async read({ sourceId, term, limit = 5, tenantId } = {}) {
      const plan = buildSecondarySourcePlan({ sourceId, term, limit });
      if (typeof tenantId !== "string" || !/^[A-Za-z0-9_-]{2,64}$/.test(tenantId)) {
        throw new Error("Invalid tenant context");
      }
      const permit = await authorize({
        sourceId, tenantId, purpose: "internal-evaluation",
        domain: plan.domain, country: plan.country
      });
      const issuedAt = trustedMillis(now());
      const grant = assertInternalEvaluationPermit({
        permit, sourceId, tenantId, domain: plan.domain, country: plan.country, now: issuedAt
      });
      const response = await transport(plan.url, {
        method: "GET", redirect: "error", credentials: "omit", cache: "no-store",
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });
      const raw = await boundedJson(response);
      const completedAt = trustedMillis(now());
      if (completedAt < issuedAt || completedAt >= Date.parse(grant.validUntil)) {
        throw new Error("Evaluation rights expired during upstream request");
      }
      // Re-evaluate the authoritative backend grant *after* transport, not just
      // expiry. A revocation or rights-version rotation mid-request must block
      // return even for a syntactically valid data page.
      let postPermit;
      try {
        postPermit = await authorize({
          sourceId, tenantId, purpose: "internal-evaluation",
          domain: plan.domain, country: plan.country
        });
      } catch {
        throw new Error("Source rights revoked during upstream request");
      }
      let reviewedAt;
      try { reviewedAt = trustedMillis(now()); }
      catch { throw new Error("Source rights revoked during upstream request"); }
      if (reviewedAt < completedAt || reviewedAt >= Date.parse(grant.validUntil)) {
        throw new Error("Source rights revoked during upstream request");
      }
      let stillApproved;
      try {
        stillApproved = assertInternalEvaluationPermit({
          permit: postPermit, sourceId, tenantId,
          domain: plan.domain, country: plan.country, now: reviewedAt
        });
      } catch {
        throw new Error("Source rights revoked during upstream request");
      }
      if (stillApproved.receiptId !== grant.receiptId ||
          stillApproved.licenseId !== grant.licenseId ||
          stillApproved.rightsVersion !== grant.rightsVersion) {
        throw new Error("Source rights changed during upstream request");
      }
      return buildEvaluationEnvelope({
        plan, normalized: normaliseSecondarySourceResult(plan, raw),
        raw, grant: stillApproved, capturedAt: reviewedAt
      });
    }
  });
}
