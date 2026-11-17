/**
 * Versioned, non-publishable global medicine identity/market candidate contracts.
 * Purpose: prevent accidental loss of national IDs, price units and source/time
 * context before a separately governed reconciliation or data admission.
 */
import { createHash } from "node:crypto";

const ALLOWED_CHANNELS = new Set([
  "community-dispensing", "hospital", "public-procurement",
  "reimbursement-claims", "wholesale", "other-specified"
]);
const ALLOWED_PRICE_TYPES = new Set([
  "list", "ceiling", "reimbursement", "reported-transaction",
  "procurement-award", "other-specified"
]);
const isCountry = (c) => typeof c === "string" && /^[A-Z]{2}$/.test(c);
const isBounded = (s, max = 160) => typeof s === "string" &&
  s.length > 0 && s.length <= max && !/[\u0000-\u001f\u007f]/.test(s);
const isDate = (v) => typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  Number.isFinite(Date.parse(v)) &&
  new Date(v).toISOString().slice(0, 10) === v;
const marketDataDenied = () => new Error("Market observation is not production-admitted");

function assertUnpublishedEnvelope(envelope) {
  if (!envelope || envelope.canPublish !== false ||
      envelope.dataState !== "unreconciled_upstream_preview" ||
      envelope.publishDecision !== "DENIED_UNTIL_INDEPENDENT_DATA_ADMISSION" ||
      !/^[a-f0-9]{64}$/.test(envelope.responseSha256 || "") ||
      !isBounded(envelope.sourceId) || !isBounded(envelope.jurisdiction) ||
      !Array.isArray(envelope.records)) {
    throw new Error("Source candidate lacks evidence boundary");
  }
}

export function buildLocalIdentityCandidates(envelope) {
  assertUnpublishedEnvelope(envelope);
  if (!isCountry(envelope.jurisdiction) ||
      !["regulatory", "authorisation"].includes(envelope.domain)) {
    throw new Error("Only national regulatory product sources may suggest medicine identity");
  }
  return Object.freeze(envelope.records.map(({ localId, label }) => {
    if (!isBounded(localId, 120) || !isBounded(label, 240)) {
      throw new Error("Invalid source-local medicine identity");
    }
    return Object.freeze({
      sourceId: envelope.sourceId,
      country: envelope.jurisdiction,
      sourceLocalId: localId,
      sourceName: label,
      sourceSnapshotSha256: envelope.responseSha256,
      retrievedAt: envelope.retrievedAt,
      // Intentionally no canonical product ID, therapeutic interchangeability,
      // marketing approval, stock position, volume, price or clinical claim.
      canonicalProductId: null,
      mappingDecision: "unresolved",
      commercialReleaseApproved: false,
      medicalUseApproved: false
    });
  }));
}

export function assertMarketFactCandidate(fact) {
  // A strictly bounded, typed *candidate* for later supervised admission.
  // The caller cannot grant itself customer publication.
  if (!fact || typeof fact !== "object" ||
      !isCountry(fact.country) ||
      !isBounded(fact.sourceId) ||
      !isBounded(fact.sourceLocalProductId) ||
      !isDate(fact.periodStart) || !isDate(fact.periodEnd) ||
      fact.periodStart > fact.periodEnd ||
      !ALLOWED_CHANNELS.has(fact.channel) ||
      !isBounded(fact.sourceUnit, 40) ||
      !isBounded(fact.sourceMeasure, 80) ||
      !/^[a-f0-9]{64}$/.test(fact.sourceSnapshotSha256 || "") ||
      fact.productionAccepted !== false ||
      fact.canPublish !== false) {
    throw marketDataDenied();
  }
  if (fact.channel === "other-specified" && !isBounded(fact.channelDefinition, 120)) {
    throw marketDataDenied();
  }
  if (fact.price != null) {
    const p = fact.price;
    // Amounts as decimal text, not floating-point money.
    if (!p || !ALLOWED_PRICE_TYPES.has(p.priceType) ||
        typeof p.currency !== "string" ||
        !/^[A-Z]{3}$/.test(p.currency) ||
        typeof p.amount !== "string" ||
        !/^(0|[1-9]\d{0,11})(\.\d{1,6})?$/.test(p.amount) ||
        !isBounded(p.priceBasis, 80) ||
        !isDate(p.effectiveDate) ||
        !isBounded(p.packPresentationId)) {
      throw marketDataDenied();
    }
    if (p.priceType === "reported-transaction" && !isBounded(p.transactionUniverse, 120)) {
      throw marketDataDenied();
    }
  }
  return Object.freeze({
    ...fact,
    studyState: "unreconciled_internal_candidate",
    canPublish: false,
    productionAccepted: false,
    comparableToOtherCountries: false
  });
}

export function fingerprintMarketFactCandidate(fact) {
  const checked = assertMarketFactCandidate(fact);
  return createHash("sha256").update(JSON.stringify(checked), "utf8").digest("hex");
}
