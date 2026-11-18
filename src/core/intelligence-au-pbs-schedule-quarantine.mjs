/**
 * PBS Australia public schedule metadata — offline, source-only candidate.
 * No network, API credentials, distributed-rate budget, production admission
 * or claim that PBS authorisations are real-time stock/retail information.
 */
import { createHash } from "node:crypto";
import { assertInternalEvaluationPermit } from "./intelligence-global-evidence-contract.mjs";
import { evaluatePbsScheduleCsv } from "./intelligence-au-pbs-schedule-csv-quarantine.mjs";

export const AU_PBS_SOURCE_ID = "au-pbs-schedules";
export const AU_PBS_PUBLIC_GUIDANCE = "https://data.pbs.gov.au/api/api-public.html";
export const AU_PBS_PUBLIC_COLLECTION =
  "https://www.postman.com/hpps/workspace/pbs-public-data-api/collection/33098837-829fc4a1-741d-4807-b524-a492afe522bb";
export const AU_PBS_DISTRIBUTED_INTERVAL_MS = 20_000;
const LIMIT_BYTES = 512 * 1024;
const LIMIT_ROWS = 1000;
const PREVIEW_ROWS = 5;
const fail = (message) => { throw new Error("PBS schedule quarantine rejected: " + message); };
const safeClock = (value) => {
  if (!Number.isSafeInteger(value) || value < 0 || value > 8_640_000_000_000_000) fail("invalid trusted server time");
  return value;
};
const safeCode = (value) => {
  // A numeric decoder may already have discarded publisher-significant leading
  // zeroes. Never reconstruct a national identifier from a JSON number.
  if (typeof value !== "string" || value.length < 1 || value.length > 80 ||
      !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  return value;
};
const safeDate = (value) => {
  if (typeof value !== "string" || value.length > 16) return null;
  let y, m, d;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    [y,m,d] = value.split("-").map(Number);
  } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
    [d,m,y] = value.split("/").map(Number);
  } else return null;
  const dt = new Date(Date.UTC(y,m-1,d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m-1 ||
      dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0,10);
};

/** No publisher lookups: only a separately supplied tiny JSON sample. */
export function evaluatePbsScheduleJson(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 1 || bytes.byteLength > LIMIT_BYTES) {
    fail("bounded source bytes required");
  }
  let data;
  try {
    data = JSON.parse(new TextDecoder("utf-8", {fatal:true}).decode(bytes));
  } catch { fail("invalid UTF-8 JSON"); }
  // Shape remains a candidate until a real publisher version is verified.
  if (!data || typeof data !== "object" || Array.isArray(data) ||
      !Array.isArray(data.data) || data.data.length > LIMIT_ROWS || data.data.length < 1) {
    fail("unverified PBS schedule response shape");
  }
  const seen = new Set();
  const rows = [];
  for (const entry of data.data) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      fail("invalid schedule record");
    }
    const code = safeCode(entry.schedule_code);
    const effectiveDate = safeDate(entry.effective_date);
    if (!code || !effectiveDate ||
        entry.publication_status !== "Published") {
      fail("invalid or embargoed schedule");
    }
    const key = code + ":" + effectiveDate;
    if (seen.has(key)) fail("duplicate schedule revision");
    seen.add(key);
    rows.push(Object.freeze({
      scheduleCode: code,
      sourceEffectiveDate: entry.effective_date,
      effectiveDate,
      sourceStatus: entry.publication_status
    }));
  }
  rows.sort((a,b) => a.effectiveDate.localeCompare(b.effectiveDate) ||
    a.scheduleCode.localeCompare(b.scheduleCode));
  return Object.freeze({
    sourceId: AU_PBS_SOURCE_ID, jurisdiction: "AU",
    sourceCategory: "government-subsidised-reimbursement-schedule",
    distinctScheduleCount: rows.length,
    latestCandidateEffectiveDate: rows.at(-1).effectiveDate,
    previews: Object.freeze(rows.slice(0,PREVIEW_ROWS)),
    schedulesAreNotInventory: true,
    sourceSchemaConfirmedAgainstLivePublisher: false,
    completePbsDatasetObtained: false,
    liveRetailOrInventoryDataPresent: false,
    canPublish: false,
    productionAccepted: false
  });
}
/**
 * A bounded internal evaluator with two independent backend rights checks.
 * This has no fetch method and cannot schedule a public API call; network
 * implementation requires a distributed lease covering the shared 20s limit.
 */
export function createPbsScheduleCandidateEvaluator({ authorize, now = () => Date.now() } = {}) {
  if (typeof authorize !== "function" || typeof now !== "function") {
    fail("trusted server rights authorizer and clock required");
  }
  return Object.freeze({
    async evaluate({ tenantId, bytes, format = "application/json" } = {}) {
      if (typeof tenantId !== "string" ||
          !/^[A-Za-z0-9_-]{2,64}$/.test(tenantId)) fail("tenant identity");
      const binding = {
        sourceId: AU_PBS_SOURCE_ID, tenantId,
        purpose: "internal-evaluation", country: "AU", domain: "reimbursement"
      };
      let initial;
      try { initial = await authorize(binding); }
      catch { fail("source rights unavailable before parse"); }
      let startedAt;
      try { startedAt = safeClock(now()); }
      catch { fail("invalid trusted server time"); }
      let grant;
      try { grant = assertInternalEvaluationPermit({ permit: initial, ...binding, now: startedAt }); }
      catch { fail("source rights not approved before parse"); }
      if (format !== "application/json" && format !== "text/csv") fail("unknown source media type");
      const sample = format === "text/csv"
        ? evaluatePbsScheduleCsv(bytes) : evaluatePbsScheduleJson(bytes);
      let parsedAt;
      try { parsedAt = safeClock(now()); }
      catch { fail("invalid trusted server time"); }
      // Even a forged "Published" flag cannot introduce a future embargoed
      // schedule into a public-only evaluation. All rows were ordered earlier.
      if (sample.latestCandidateEffectiveDate > new Date(parsedAt).toISOString().slice(0,10)) {
        fail("future or embargoed public schedule");
      }
      if (parsedAt < startedAt || parsedAt >= Date.parse(grant.validUntil)) {
        fail("rights expired during parse");
      }
      let subsequent;
      try { subsequent = await authorize(binding); }
      catch { fail("source rights unavailable after parse"); }
      let end;
      try { end = safeClock(now()); }
      catch { fail("invalid trusted server time"); }
      if (end < parsedAt || end >= Date.parse(grant.validUntil)) fail("rights expired after parse");
      let reviewed;
      try {
        reviewed = assertInternalEvaluationPermit({ permit: subsequent, ...binding, now: end });
      } catch { fail("source rights revoked after parse"); }
      if (reviewed.receiptId !== grant.receiptId ||
          reviewed.licenseId !== grant.licenseId ||
          reviewed.rightsVersion !== grant.rightsVersion) {
        fail("source rights changed after parse");
      }
      return Object.freeze({
        contract: "novapharm.intelligence.au-pbs-public-schedule-quarantine.v1",
        ...sample,
        tenantId,
        publisherGuidance: AU_PBS_PUBLIC_GUIDANCE,
        datasetCountry: "AU",
        sourceFileSha256: createHash("sha256").update(bytes).digest("hex"),
        previewEvaluatedAt: new Date(end).toISOString(),
        rightsReceiptId: reviewed.receiptId,
        rightsVersion: reviewed.rightsVersion,
        sourceRightsIndependentlyApproved: false,
        sourcePublicationDateVerified: false,
        sharedPublicApiRateLimitMs: AU_PBS_DISTRIBUTED_INTERVAL_MS,
        distributedPublisherRateLeaseObtained: false,
        rightsToRedistributeVerified: false,
        realSourceSnapshotVerified: false,
        nativeAustralianMedicineIdentifiersReconciled: false,
        productionAccepted: false, canPublish: false,
        commercialDecisionReady: false, clinicalDecisionReady: false,
        publicCustomerEndpointConnected: false
      });
    }
  });
}
