/**
 * Singapore HSA registered therapeutic products — offline CSV intake candidate.
 * Does not retrieve upstream data, admit it to Atlas or authorize publication.
 * A trusted server supplies the downloaded official file and a separate, real
 * rights-authorizer; this module cannot manufacture a licence or a data grant.
 */
import { createHash } from "node:crypto";
import { assertInternalEvaluationPermit } from "./intelligence-global-evidence-contract.mjs";

const SOURCE_ID = "sg-hsa-products";
const DATASET_ID = "d_767279312753558cbf19d48344577084";
const DATASET_PAGE = "https://data.gov.sg/datasets/" + DATASET_ID + "/view";
const MAX_CSV_BYTES = 16 * 1024 * 1024;
const MAX_ROWS = 30000;
const MAX_CELL_CHARS = 4096;
const HEADERS = Object.freeze([
  "LicenceNo", "Productname", "Licenseholder", "Approvaldate",
  "Forensicclassification", "ATCCode", "Dosageform", "RouteofAdministration",
  "Manufacturer", "Countryofmanufacturer", "Activeingredients", "Strength"
]);

function fail(message) { throw new Error("HSA bulk candidate rejected: " + message); }
function clock(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 8_640_000_000_000_000) fail("invalid trusted server time");
  return value;
}
function safeIdentifier(value, max = 240) {
  return typeof value === "string" && value.length > 0 && value.length <= max &&
    !/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u.test(value) ? value : null;
}

/** RFC-4180-style finite UTF-8 CSV, with doubled quotes and multiline values. */
export function parseHsaCsvBytes(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 1 || bytes.byteLength > MAX_CSV_BYTES) {
    fail("invalid source-file size");
  }
  let csv;
  try {
    csv = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail("invalid UTF-8");
  }
  if (csv.charCodeAt(0) === 0xfeff) csv = csv.slice(1);
  if (csv.includes("\0")) fail("NUL in source");
  const rows = [], row = [];
  let cell = "", quoted = false, closed = false, starting = true;
  const pushCell = () => {
    if (cell.length > MAX_CELL_CHARS) fail("oversize CSV field");
    row.push(cell);
    if (row.length > 32) fail("too many CSV columns");
    cell = ""; closed = false; starting = true;
  };
  const pushRow = () => {
    if (rows.length >= MAX_ROWS + 1) fail("CSV row limit exceeded");
    rows.push(row.splice(0));
  };
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (quoted) {
      if (ch === '"') {
        if (csv[i + 1] === '"') { cell += '"'; i++; }
        else { quoted = false; closed = true; }
      } else {
        cell += ch;
      }
    } else if (ch === ',') {
      pushCell();
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && csv[i + 1] === '\n') i++;
      pushCell();
      pushRow();
    } else if (ch === '"' && starting) {
      quoted = true;
      starting = false;
    } else {
      if (closed || ch === '"') fail("malformed CSV quoting");
      cell += ch;
      starting = false;
    }
    if (cell.length > MAX_CELL_CHARS) fail("oversize CSV field");
  }
  if (quoted) fail("unterminated quoted CSV cell");
  if (cell !== "" || row.length > 0 || closed) {
    pushCell();
    pushRow();
  }
  if (rows.length < 2) fail("header and data rows are required");
  const heading = rows.shift();
  if (heading.length !== HEADERS.length ||
      new Set(heading).size !== HEADERS.length ||
      HEADERS.some((h) => !heading.includes(h))) {
    fail("unexpected HSA CSV header version");
  }
  const columns = Object.fromEntries(heading.map((h, i) => [h, i]));
  const preview = [];
  const ids = new Set();
  let invalidSourceRows = 0, duplicateSourceIds = 0;
  for (const [i, record] of rows.entries()) {
    if (record.length !== heading.length) fail("CSV row width mismatch at " + String(i + 2));
    const id = safeIdentifier(record[columns.LicenceNo], 120);
    const name = safeIdentifier(record[columns.Productname], 240);
    if (!id || !name) {
      invalidSourceRows++;
      continue;
    }
    if (ids.has(id)) duplicateSourceIds++;
    ids.add(id);
    if (preview.length < 5) preview.push(Object.freeze({ localId: id, label: name }));
  }
  return Object.freeze({
    totalDataRows: rows.length,
    validIdentityRows: rows.length - invalidSourceRows,
    invalidSourceRows, duplicateSourceIds,
    completeNationalCoverageDemonstrated: false,
    records: Object.freeze(preview)
  });
}

/** One rights-gated offline evaluation, never a production ingestion. */
export function createHsaBulkCandidateEvaluator({ authorize, now = () => Date.now() } = {}) {
  if (typeof authorize !== "function" || typeof now !== "function") {
    fail("trusted authorizer and server clock required");
  }
  return Object.freeze({
    async evaluate({ tenantId, bytes } = {}) {
      if (typeof tenantId !== "string" || !/^[A-Za-z0-9_-]{2,64}$/.test(tenantId)) {
        fail("tenant context");
      }
      let rights;
      try {
        rights = await authorize({
          tenantId, sourceId: SOURCE_ID, country: "SG",
          domain: "regulatory", purpose: "internal-evaluation"
        });
      } catch { fail("source rights unavailable before validation"); }
      let evaluatedAt;
      try { evaluatedAt = clock(now()); }
      catch { fail("invalid trusted server time"); }
      let grant;
      try {
        grant = assertInternalEvaluationPermit({
          permit: rights, sourceId: SOURCE_ID, tenantId,
          country: "SG", domain: "regulatory", now: evaluatedAt
        });
      } catch { fail("source rights not approved before validation"); }
      const candidate = parseHsaCsvBytes(bytes);
      let capturedAt;
      try { capturedAt = clock(now()); }
      catch { fail("invalid trusted server time"); }
      if (capturedAt < evaluatedAt || capturedAt >= Date.parse(grant.validUntil)) {
        fail("rights expired during validation");
      }
      // Independently re-check authoritative rights before releasing even an
      // internal preview. Mid-parse revocation/rotation invalidates the receipt.
      let subsequent;
      try {
        subsequent = await authorize({
          tenantId, sourceId: SOURCE_ID, country: "SG",
          domain: "regulatory", purpose: "internal-evaluation"
        });
      } catch {
        fail("source rights unavailable after validation");
      }
      let reviewedAt;
      try { reviewedAt = clock(now()); }
      catch { fail("invalid trusted server time"); }
      if (reviewedAt < capturedAt || reviewedAt >= Date.parse(grant.validUntil)) {
        fail("rights expired after validation");
      }
      let rechecked;
      try {
        rechecked = assertInternalEvaluationPermit({
          permit: subsequent, sourceId: SOURCE_ID, tenantId,
          country: "SG", domain: "regulatory", now: reviewedAt
        });
      } catch {
        fail("source rights revoked after validation");
      }
      if (grant.receiptId !== rechecked.receiptId ||
          grant.licenseId !== rechecked.licenseId ||
          grant.rightsVersion !== rechecked.rightsVersion ||
          grant.validUntil !== rechecked.validUntil) {
        fail("source rights rotated after validation");
      }
      const digest = createHash("sha256").update(bytes).digest("hex");
      return Object.freeze({
        contract: "novapharm.intelligence.hsa-bulk-candidate.v1",
        sourceId: SOURCE_ID, country: "SG", tenantId,
        datasetId: DATASET_ID, sourceReference: DATASET_PAGE,
        rightsReceiptId: grant.receiptId, rightsVersion: grant.rightsVersion,
        fileSha256: digest, bytes: bytes.byteLength,
        evaluatedAt: new Date(reviewedAt).toISOString(),
        snapshotSourceDateVerified: false,
        datasetVersionVerified: false,
        upstreamFileAuthenticated: false,
        dataState: "quarantined_csv_snapshot_candidate",
        ...candidate,
        canPublish: false, productionAccepted: false,
        clinicalDecisionReady: false, commercialDecisionReady: false,
        nationalProductEquivalenceApproved: false,
        sourceRightsIndependentlyVerified: false,
        publicCustomerEndpointConnected: false,
        admissionDecision: "DENIED_UNTIL_INDEPENDENT_RIGHTS_AND_SOURCE_REVIEW"
      });
    }
  });
}
