/**
 * Research-only NHSBSA CKAN metadata observation (one May 2026 SNOMED resource).
 * This endpoint returns RESOURCE METADATA rather than prescribing records.
 * A successful source-probe receipt does not grant rights, authenticate a customer,
 * install the app, or establish a production data feed.
 */
import { createHash } from "node:crypto";

const RESOURCE_ID = "004d6f4e-9881-4312-82dc-094f9a543885";
const MAX_BYTES = 262_144;
const TIMEOUT_MS = 15_000;
const fail = message => { throw new Error("NHSBSA resource probe denied: " + message); };

export const NHSBSA_EPD_SNOMED_SOURCE = Object.freeze({
  sourceId: "uk-nhsbsa-epd-snomed-metadata",
  registryCandidateKey: "europe-united-kingdom-nhsbsa-english-prescribing-dataset",
  country: "GB",
  coverage: "England prescribing issued, geographically distinct from all-UK sales",
  resourceId: RESOURCE_ID,
  resourceName: "EPD_SNOMED_202605",
  publisher: "NHS Business Services Authority",
  url: "https://opendata.nhsbsa.net/api/3/action/resource_show?id=" + RESOURCE_ID,
  datasetPage: "https://opendata.nhsbsa.net/dataset/english-prescribing-dataset-epd-with-snomed-code",
  licenceReference: "https://www.nhsbsa.nhs.uk/data-hub-end-user-agreement"
});

function verifyIdentity(payload) {
  const r = payload?.result;
  if (payload?.success !== true || !r || typeof r !== "object" || Array.isArray(r)) {
    fail("official CKAN response shape mismatch");
  }
  if (r.id !== RESOURCE_ID || r.name !== NHSBSA_EPD_SNOMED_SOURCE.resourceName ||
      !/^CSV$/iu.test(r.format || "") ||
      !/^[0-9a-f-]{36}$/iu.test(r.package_id || "")) {
    fail("current SNOMED resource identity mismatch");
  }
  // CKAN resource metadata can refer to a public data file, but this probe
  // never downloads that URL. Keep its origin restricted for review.
  if (typeof r.url !== "string") fail("publisher resource link unavailable");
  let link;
  try { link = new URL(r.url); } catch { fail("invalid publisher resource URL"); }
  if (link.protocol !== "https:" || link.hostname !== "opendata.nhsbsa.net" ||
      link.username || link.password || link.hash || !link.pathname.startsWith("/dataset/")) {
    fail("publisher resource URL outside official origin");
  }
  return Object.freeze({ resourceVerified: true, resourceFormat: "CSV" });
}

function safeStatus(response) {
  const code = response?.status;
  return Number.isInteger(code) && code >= 400 && code <= 599 ? " (HTTP " + code + ")" : "";
}

async function boundedJson(response) {
  if (!response || response.ok !== true) fail("publisher metadata unavailable" + safeStatus(response));
  if (response.redirected === true ||
      (typeof response.url === "string" && response.url !== "" && response.url !== NHSBSA_EPD_SNOMED_SOURCE.url)) {
    fail("redirect or substituted publisher endpoint");
  }
  const mime = response.headers?.get?.("content-type") || "";
  if (!/\bapplication\/(?:json|[a-z0-9.+-]+\+json)\b/iu.test(mime)) {
    fail("publisher metadata MIME mismatch");
  }
  const stated = response.headers?.get?.("content-length");
  if (stated != null && stated !== "") {
    const size = Number(stated);
    if (!Number.isSafeInteger(size) || size < 1 || size > MAX_BYTES) fail("publisher metadata size invalid");
  }
  if (!response.body || typeof response.body.getReader !== "function") fail("streaming metadata body required");
  const reader = response.body.getReader();
  const chunks = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) fail("invalid metadata chunk");
      byteLength += value.byteLength;
      if (byteLength > MAX_BYTES) fail("publisher metadata size exceeded");
      chunks.push(value);
    }
  } catch (error) {
    if (error?.message?.startsWith("NHSBSA resource probe denied:")) throw error;
    fail("publisher metadata stream unavailable");
  } finally {
    try { await reader.cancel(); } catch {}
    try { reader.releaseLock(); } catch {}
  }
  if (byteLength === 0) fail("empty metadata response");
  const raw = new Uint8Array(byteLength);
  let off = 0;
  for (const x of chunks) { raw.set(x, off); off += x.length; }
  let parsed;
  try { parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw)); }
  catch { fail("publisher metadata JSON invalid"); }
  return Object.freeze({ parsed, byteLength, digest: createHash("sha256").update(raw).digest("hex") });
}

export async function probeNhsbsaEpdSnomedResource({ transport = globalThis.fetch, now = () => Date.now() } = {}) {
  if (typeof transport !== "function" || typeof now !== "function") fail("trusted transport or clock unavailable");
  let start;
  try { start = now(); } catch { fail("invalid observation clock"); }
  if (!Number.isSafeInteger(start) || start < 0) fail("invalid observation clock");
  let response;
  try {
    response = await transport(NHSBSA_EPD_SNOMED_SOURCE.url, {
      method: "GET", redirect: "error", credentials: "omit", cache: "no-store",
      headers: { accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS)
    });
  } catch { fail("official publisher connection unavailable"); }
  const sample = await boundedJson(response);
  verifyIdentity(sample.parsed);
  let finished;
  try { finished = now(); } catch { fail("invalid observation clock"); }
  if (!Number.isSafeInteger(finished) || finished < start || finished - start > TIMEOUT_MS + 5000) {
    fail("untrusted metadata observation clock");
  }
  return Object.freeze({
    contract: "novapharm.intelligence.uk-nhsbsa-epd-snomed-resource-probe.v1",
    sourceId: NHSBSA_EPD_SNOMED_SOURCE.sourceId,
    registryCandidateKey: NHSBSA_EPD_SNOMED_SOURCE.registryCandidateKey,
    country: NHSBSA_EPD_SNOMED_SOURCE.country,
    publisher: NHSBSA_EPD_SNOMED_SOURCE.publisher,
    resourceId: RESOURCE_ID,
    resourceName: NHSBSA_EPD_SNOMED_SOURCE.resourceName,
    observedAt: new Date(finished).toISOString(),
    metadataSha256: sample.digest,
    metadataBytes: sample.byteLength,
    officialPublisherMetadataVerified: true,
    publisherRowsRead: 0,
    retiredEpdSourceUsed: false,
    sourceRightsIndependentlyApproved: false,
    sourceLicenceAttributionReviewed: false,
    snomedTerminologyRightsReviewed: false,
    publisherDataAdmitted: false,
    customerCountryLive: false,
    clinicalDecisionReady: false,
    commercialDecisionReady: false,
    canPublish: false,
    rawMetadataRetained: false,
    rawPrescribingRecordsRetained: false
  });
}