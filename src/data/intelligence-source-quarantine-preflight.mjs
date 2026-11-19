/**
 * Local-only, offline source quarantine preflight.
 *
 * Validates copied bytes against untrusted accompanying provenance, checks
 * basic publisher envelope/ID integrity, and records data-quality exceptions.
 * This DOES NOT authenticate the publisher, confer licences, admit source rows,
 * resolve medicine identity, or make any records customer accessible.
 */
import { createHash } from "node:crypto";

const MAX_BYTES = 5_000_000;
const SHA256 = /^[0-9a-f]{64}$/u;
const source = Object.freeze({
  FDA_NDC: { array: "results", kind: "fda_apixaban_ndc_sample", maxItems: 100 },
  EMA_SHORTAGES: { array: "data", kind: "ema_public_shortage_events", maxItems: 5000 },
});

function reject(reason) {
  const err = new Error("Quarantine preflight rejected: " + reason);
  err.code = "QUARANTINE_PREFLIGHT_REJECTED";
  throw err;
}

function validPublisherUrl(kind, raw) {
  if (typeof raw !== "string") return false;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.hash) return false;
    if (kind === "FDA_NDC") {
      if (url.hostname !== "api.fda.gov" || url.pathname !== "/drug/ndc.json") return false;
      const limit = Number(url.searchParams.get("limit"));
      return url.searchParams.get("search") === "generic_name:apixaban" &&
        Number.isInteger(limit) && limit >= 1 && limit <= 100;
    }
    return kind === "EMA_SHORTAGES" &&
      url.hostname === "www.ema.europa.eu" &&
      url.pathname === "/en/documents/report/shortages-output-json-report_en.json" &&
      url.search === "";
  } catch {
    return false;
  }
}
function officialCount(kind, parsed) {
  const total = kind === "FDA_NDC"
    ? parsed?.meta?.results?.total : parsed?.meta?.total_records;
  return Number.isSafeInteger(total) && total >= 0 ? total : null;
}
function recordsAnalysis(kind, records) {
  const idField = kind === "FDA_NDC" ? "product_ndc" : "shortage_url";
  const missingRequired = [];
  const qualityExceptions = {};
  const seen = new Set();
  for (let i = 0; i < records.length; i++) {
    const item = records[i];
    if (!item || typeof item !== "object" || Array.isArray(item)) reject("non-object record");
    const id = item[idField];
    if (typeof id !== "string" || id.trim() === "" || seen.has(id)) {
      missingRequired.push({ row: i, field: idField, reason: "missing_or_duplicate" });
    } else seen.add(id);
    if (kind === "FDA_NDC") {
      if (typeof item.generic_name !== "string" || !item.generic_name.toLowerCase().includes("apixaban"))
        missingRequired.push({ row: i, field: "generic_name", reason: "not_verified_apixaban" });
      if (typeof item.product_id !== "string" || item.product_id.trim() === "")
        missingRequired.push({ row: i, field: "product_id", reason: "missing" });
      if (!Array.isArray(item.packaging) || item.packaging.length === 0)
        qualityExceptions.packaging_missing = (qualityExceptions.packaging_missing || 0) + 1;
    } else {
      if (typeof item.medicine_affected !== "string" || item.medicine_affected.trim() === "")
        missingRequired.push({ row: i, field: "medicine_affected", reason: "missing" });
      if (typeof item.supply_shortage_status !== "string" || item.supply_shortage_status.trim() === "")
        missingRequired.push({ row: i, field: "supply_shortage_status", reason: "missing" });
      for (const name of ["start_of_shortage_date", "last_updated_date"]) {
        if (typeof item[name] !== "string" || item[name].trim() === "")
          qualityExceptions[name + "_missing"] = (qualityExceptions[name + "_missing"] || 0) + 1;
      }
    }
  }
  return {
    identifier: idField, distinctIdentifiers: seen.size,
    requiredFieldExceptions: missingRequired.length,
    qualityExceptions,
  };
}

export function inspectQuarantinedSourceSnapshot({dataset, rawBytes, provenance} = {}) {
  if (!Object.hasOwn(source, dataset) ||
      !(rawBytes instanceof Uint8Array) ||
      rawBytes.byteLength === 0 || rawBytes.byteLength > MAX_BYTES ||
      !provenance || typeof provenance !== "object" || Array.isArray(provenance) ||
      provenance.dataset !== dataset ||
      provenance.status !== "DOWNLOADED" ||
      provenance.acceptance !== "RAW_UNVALIDATED" ||
      provenance.rights_status !== "REVIEW_BEFORE_COMMERCIAL_REPUBLISHING" ||
      !validPublisherUrl(dataset, provenance.source_url) ||
      !Number.isSafeInteger(provenance.bytes) ||
      provenance.bytes !== rawBytes.byteLength ||
      typeof provenance.sha256 !== "string" || !SHA256.test(provenance.sha256)) {
    reject("dataset, rights, provenance, size or publisher envelope");
  }
  const actualSha = createHash("sha256").update(rawBytes).digest("hex");
  if (actualSha !== provenance.sha256) reject("copied bytes do not match provenance digest");
  let parsed;
  try { parsed = JSON.parse(Buffer.from(rawBytes).toString("utf8")); }
  catch { reject("invalid JSON"); }
  const spec = source[dataset];
  const records = parsed?.[spec.array];
  const reported = officialCount(dataset, parsed);
  if (!Array.isArray(records) || records.length > spec.maxItems ||
      reported === null || reported !== records.length) {
    reject("publisher envelope or reported total mismatch");
  }
  const quality = recordsAnalysis(dataset, records);
  const requiredFieldsPass = quality.requiredFieldExceptions === 0;

  return Object.freeze({
    contract: "novapharm.intelligence.source-quarantine-preflight.v1",
    dataset, kind: spec.kind, contentSha256: actualSha,
    copiedByteIntegrity: "matches_accompanying_untrusted_manifest",
    publisherAuthenticityVerified: false,
    licenseApproved: false,
    modelProcessingApproved: false,
    recordsAdmitted: 0,
    customerPublishApproved: false,
    status: "quarantined_not_accepted",
    coverage: dataset === "FDA_NDC" ? "bounded_apixaban_sample" : "dated_ema_events_not_inventory",
    inspectedRecords: records.length,
    declaredRecords: reported,
    requiredFieldsPass,
    ...quality,
    limitations: [
      "A matching hash attests only to the integrity of this local copy against its untrusted accompanying manifest.",
      "No publisher signature, licensing, record freshness or third-party rights are independently certified.",
      "No clinical equivalence, medicine approval, market availability or tender eligibility follows from these rows.",
      "Separate authoritative review and controlled admission are mandatory before any production use."
    ]
  });
}
