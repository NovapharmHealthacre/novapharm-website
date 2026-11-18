/**
 * Two official, publicly queryable pharmaceutical live-read probes.
 *
 * These are SOURCE-LIVE (network connectivity and one schema-bound record),
 * NOT NovaPharm customer-live or production data admission. No record is
 * returned, persisted, logged, mapped to a clinical assertion or distributed.
 *
 * All upstream URLs are fixed at build time and never user supplied.
 */
import { createHash } from "node:crypto";
import { assertInternalEvaluationPermit } from "./intelligence-global-evidence-contract.mjs";
import { buildSourceSnapshotQuarantine } from "./intelligence-source-snapshot-quarantine.mjs";

const HSA_RESOURCE = "d_767279312753558cbf19d48344577084";
const MAX_SOURCE_BYTES = 131072;
const TIMEOUT_MS = 8000;
const fail = (why) => { throw new Error("Official live source probe rejected: " + why); };

export const OFFICIAL_LIVE_PROBE_PLANS = Object.freeze({
  "us-fda-drugsfda": Object.freeze({
    jurisdiction: "US",
    domain: "regulatory-applications",
    registryCandidateKey: "north-america-united-states-fda-openfda",
    datasetKey: "drugsfda",
    releaseResourceId: "openfda-drugsfda",
    url: "https://api.fda.gov/drug/drugsfda.json?limit=1",
    publisher: "US Food and Drug Administration",
    documentation: "https://open.fda.gov/apis/drug/drugsfda/",
    rightsDocumentation: "https://open.fda.gov/license/"
  }),
  "sg-hsa-registered-products": Object.freeze({
    jurisdiction: "SG",
    domain: "registered-therapeutic-products",
    registryCandidateKey: "asia-pacific-singapore-hsa-data-gov-sg",
    datasetKey: "hsa-registered-products",
    releaseResourceId: HSA_RESOURCE,
    url: "https://data.gov.sg/api/action/datastore_search?resource_id=" +
      HSA_RESOURCE + "&limit=1",
    publisher: "Singapore Health Sciences Authority via data.gov.sg",
    documentation: "https://data.gov.sg/datasets/" + HSA_RESOURCE + "/view",
    rightsDocumentation: "https://guide.data.gov.sg/developer-guide/api-overview"
  })
});

function validateResponseUrl(response, expectedUrl) {
  if (response?.redirected === true) fail("unexpected redirect");
  // Tests can use Node's synthetic Response (url=''), but a real HTTP
  // response must be same endpoint, not another host/path/source dataset.
  if (typeof response?.url === "string" && response.url !== "") {
    let actual, expected;
    try {
      actual = new URL(response.url);
      expected = new URL(expectedUrl);
    } catch { fail("untrusted upstream response location"); }
    if (actual.origin !== expected.origin ||
        actual.pathname !== expected.pathname ||
        actual.search !== expected.search) {
      fail("upstream source location mismatch");
    }
  }
}

async function readBoundedOfficialJson(response) {
  if (!response || response.ok !== true) fail("official publisher unavailable");
  const type = response.headers?.get?.("content-type") || "";
  if (!/\bapplication\/json\b/i.test(type) &&
      !/\bapplication\/[^;\s]+\+json\b/i.test(type)) {
    fail("unexpected official content type");
  }
  const reported = response.headers?.get?.("content-length");
  if (reported != null && reported !== "") {
    const size = Number(reported);
    if (!Number.isSafeInteger(size) || size < 0 || size > MAX_SOURCE_BYTES) {
      fail("oversized or invalid official response");
    }
  }
  if (!response.body || typeof response.body.getReader !== "function") {
    fail("unbounded official response stream");
  }
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) fail("invalid stream chunk");
      bytes += value.byteLength;
      if (bytes > MAX_SOURCE_BYTES) fail("oversized or invalid official response");
      chunks.push(value);
    }
  } catch(error) {
    if (error?.message?.startsWith("Official live source probe rejected:")) throw error;
    fail("unavailable official response stream");
  } finally {
    try { await reader.cancel(); } catch {}
    try { reader.releaseLock(); } catch {}
  }
  if (!bytes) fail("empty publisher response");
  const raw = new Uint8Array(bytes);
  let offset=0;
  for (const chunk of chunks) {
    raw.set(chunk,offset);
    offset += chunk.byteLength;
  }
  let parsed;
  try { parsed = JSON.parse(new TextDecoder("utf-8", {fatal:true}).decode(raw)); }
  catch { fail("invalid UTF-8 JSON from publisher"); }
  return Object.freeze({
    // Exact bytes received from the upstream, not the canonicalized JSON.
    bytes, sha256:createHash("sha256").update(raw).digest("hex"), parsed,
    // Private in-process ingest only; never place this on a public receipt.
    rawBytes:raw
  });
}

const safeLabel = value => typeof value === "string" &&
  value.length > 0 && value.length <= 240 &&
  !/[\p{Cc}\p{Cf}\p{Cs}]/u.test(value);
const safeNativeId = value => typeof value === "string" &&
  value.length > 0 && value.length <= 80 &&
  /^[A-Za-z0-9][A-Za-z0-9_-]*$/u.test(value);

export function validateOfficialLiveSample(sourceId, payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    fail("unexpected publisher result object");
  }
  if (sourceId === "us-fda-drugsfda") {
    if (!Array.isArray(payload.results) || payload.results.length !== 1 ||
        !payload.meta || !safeLabel(payload.meta.last_updated) ||
        !Number.isSafeInteger(payload.meta?.results?.total) ||
        payload.meta.results.total < 1) {
      fail("US FDA application response schema mismatch");
    }
    const record = payload.results[0];
    if (!record || !safeNativeId(record.application_number) ||
        !Array.isArray(record.products) || record.products.length === 0 ||
        !safeLabel(record.products[0]?.brand_name)) {
      fail("US FDA source-native application identity missing");
    }
    return Object.freeze({
      sourceRecordsValidated: 1,
      publisherLastUpdated: payload.meta.last_updated,
      nativeIdentifierPresent: true
    });
  }
  if (sourceId === "sg-hsa-registered-products") {
    const source = payload.result;
    if (payload.success !== true || source?.resource_id !== HSA_RESOURCE ||
        !Array.isArray(source.fields) ||
        !source.fields.some(x=>x?.id==="LicenceNo") ||
        !source.fields.some(x=>x?.id==="Productname") ||
        !Array.isArray(source.records) || source.records.length !== 1 ||
        !safeNativeId(source.records[0]?.LicenceNo) ||
        !safeLabel(source.records[0]?.Productname)) {
      fail("Singapore HSA resource identity or product schema mismatch");
    }
    return Object.freeze({
      sourceRecordsValidated: 1,
      publisherLastUpdated: null,
      nativeIdentifierPresent: true
    });
  }
  fail("unknown official source");
}

export async function probeOfficialPublicPharmaSource(sourceId, {
  transport = globalThis.fetch, now = () => Date.now()
} = {}) {
  if (typeof sourceId !== "string" ||
      !Object.hasOwn(OFFICIAL_LIVE_PROBE_PLANS,sourceId)) {
    fail("source not on fixed publisher allowlist");
  }
  if (typeof transport !== "function" || typeof now !== "function") {
    fail("invalid trusted transport or clock");
  }
  const plan = OFFICIAL_LIVE_PROBE_PLANS[sourceId];
  let started;
  try { started = now(); } catch { fail("trusted probe clock unavailable"); }
  if (!Number.isSafeInteger(started) || started < 0) {
    fail("invalid trusted probe clock");
  }
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
  } catch { fail("official publisher connection failed"); }
  validateResponseUrl(response,plan.url);
  const data = await readBoundedOfficialJson(response);
  const validated = validateOfficialLiveSample(sourceId,data.parsed);
  let ended;
  try { ended=now(); } catch { fail("trusted probe clock unavailable"); }
  if (!Number.isSafeInteger(ended) || ended < started ||
      ended-started > TIMEOUT_MS+5000) {
    fail("invalid or stale official observation clock");
  }
  return Object.freeze({
    contract:"novapharm.intelligence.official-live-source-probe.v1",
    sourceId, registryCandidateKey:plan.registryCandidateKey,
    jurisdiction:plan.jurisdiction, domain:plan.domain,
    publisher:plan.publisher, publisherApiUrl:plan.url,
    observedAt:new Date(ended).toISOString(),
    upstreamContentSha256:data.sha256,
    upstreamPayloadBytes:data.bytes,
    publisherLastUpdated:validated.publisherLastUpdated,
    schemaBoundRecordCount:validated.sourceRecordsValidated,
    nativeIdentifierPresent:validated.nativeIdentifierPresent,
    publicPublisherEndpointResponded:true,
    // This observation does not independently establish source licensing,
    // sustained performance, customer APIs, data reconciliation or production.
    sourceRightsForCommercialAiReuseReviewed:false,
    publisherDatasetSnapshotAdmitted:false,
    actualProductionApiConnected:false,
    customerCountryLive:false,
    canPublish:false,
    clinicalDecisionReady:false,
    commercialDecisionReady:false,
    rawRecordsRetained:false
  });
}


/**
 * Connects the *actual* official publisher read to the existing internal
 * source-quarantine contract, using TWO separate trusted rights decisions.
 *
 * The releaseInventory callback must be provided by a protected, independently
 * audited backend release registry. Passing a fake callback does NOT constitute
 * source permissions or legally verified snapshot provenance. No persistence,
 * data admission, customer endpoint or external record exposure is performed.
 */
export function createOfficialLivePharmaQuarantineReader({
  authorize, releaseInventory, transport=globalThis.fetch,
  now=()=>Date.now()
}={}) {
  if(typeof authorize!=="function" || typeof releaseInventory!=="function" ||
     typeof transport!=="function" || typeof now!=="function") {
    fail("trusted backend authorizer, release inventory, transport and clock required");
  }
  function readClock() {
    let value;
    try { value=now(); } catch { fail("trusted clock unavailable"); }
    if(!Number.isSafeInteger(value) || value < 0) fail("invalid trusted clock");
    return value;
  }
  return Object.freeze({
    async evaluate({sourceId,tenantId}={}) {
      if(!Object.hasOwn(OFFICIAL_LIVE_PROBE_PLANS,sourceId)) {
        fail("source not on fixed publisher allowlist");
      }
      if(typeof tenantId!=="string" ||
         !/^[A-Za-z0-9_-]{2,64}$/.test(tenantId)) {
        fail("invalid protected tenant");
      }
      const source=OFFICIAL_LIVE_PROBE_PLANS[sourceId];
      const context={
        sourceId,tenantId,country:source.jurisdiction,
        domain:source.domain,purpose:"internal-evaluation"
      };
      const initialTime=readClock();
      let firstDecision;
      try { firstDecision=await authorize(context); }
      catch { fail("independent source rights unavailable"); }
      const beforeTransport=readClock();
      if(beforeTransport<initialTime) fail("source clock rollback before transport");
      let grant;
      try {
        grant=assertInternalEvaluationPermit({
          permit:firstDecision,...context,now:beforeTransport
        });
      } catch { fail("source rights not approved for internal evaluation"); }
      let response;
      try {
        response=await transport(source.url,{
          method:"GET",redirect:"error",credentials:"omit",cache:"no-store",
          headers:{accept:"application/json"},signal:AbortSignal.timeout(TIMEOUT_MS)
        });
      } catch { fail("official publisher connection failed"); }
      validateResponseUrl(response,source.url);
      const body=await readBoundedOfficialJson(response);
      const sample=validateOfficialLiveSample(sourceId,body.parsed);
      const afterFetch=readClock();
      if(afterFetch<beforeTransport || afterFetch>=Date.parse(grant.validUntil)) {
        fail("source rights expired or clock rolled back during live read");
      }
      let metadata;
      try { metadata=await releaseInventory({sourceId}); }
      catch { fail("trusted publisher release inventory unavailable"); }
      if(!metadata || typeof metadata!=="object" ||
         Array.isArray(metadata) ||
         metadata.resourceId!==source.releaseResourceId ||
         metadata.datasetKey!==source.datasetKey) {
        fail("publisher release metadata not independently bound");
      }
      let manifest;
      try {
        manifest=buildSourceSnapshotQuarantine({
          sourceKey:sourceId,
          jurisdiction:source.jurisdiction,
          publisher:source.publisher,
          datasetKey:source.datasetKey,
          resourceId:source.releaseResourceId,
          resourceUrl:source.url,
          expectedOrigin:new URL(source.url).origin,
          mediaType:"application/json",
          schemaVersion:metadata.schemaVersion,
          observationStart:metadata.observationStart,
          observationEnd:metadata.observationEnd,
          publishedOn:metadata.publishedOn,
          fetchedAt:new Date(afterFetch).toISOString(),
          bytes:body.rawBytes
        });
      } catch { fail("publisher release metadata or snapshot failed quarantine"); }
      const afterManifest=readClock();
      if(afterManifest<afterFetch || afterManifest>=Date.parse(grant.validUntil)) {
        fail("source rights expired during quarantine");
      }
      let finalDecision;
      try { finalDecision=await authorize(context); }
      catch { fail("source rights unavailable after quarantine"); }
      const finished=readClock();
      if(finished<afterManifest || finished>=Date.parse(grant.validUntil)) {
        fail("source rights expired after quarantine");
      }
      let checked;
      try {
        checked=assertInternalEvaluationPermit({
          permit:finalDecision,...context,now:finished
        });
      } catch { fail("source rights revoked after quarantine"); }
      if(checked.receiptId!==grant.receiptId ||
         checked.licenseId!==grant.licenseId ||
         checked.rightsVersion!==grant.rightsVersion ||
         checked.validUntil!==grant.validUntil) {
        fail("source rights changed after quarantine");
      }
      return Object.freeze({
        contract:"novapharm.intelligence.official-live-intake-quarantine.v1",
        sourceId,tenantId,jurisdiction:source.jurisdiction,
        registryCandidateKey:source.registryCandidateKey,
        sourceRecordsSchemaValidated:sample.sourceRecordsValidated,
        sourceResponseSha256:body.sha256,
        publisherApiResponded:true,
        rightsReceiptId:checked.receiptId,
        manifest,
        sourceSnapshotQuarantined:true,
        independentSourceUseRightsLegallyVerified:false,
        clinicalIdentityReconciled:false,
        customerReadEnabled:false,
        productionAccepted:false,
        canPublish:false,
        rawRecordsRetained:false
      });
    }
  });
}
