import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { reviewQualified3plSnapshot } from "./wms-control-tower.mjs";

const SOURCES = new Set(["polar_speed", "ups_marken", "qualified_3pl"]);
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,99}$/u;
const DIGEST = /^[0-9a-f]{64}$/iu;
const isId = (v) => typeof v === "string" && ID.test(v);
const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const time = (v) => typeof v === "string" && ISO_UTC.test(v) && Number.isFinite(Date.parse(v))
  ? Date.parse(v) : NaN;

function response(status, reasons = [], details = {}) {
  return Object.freeze({
    status,
    reasons: Object.freeze([...new Set(reasons)]),
    ...details,
    // A valid signature is NOT warehouse, regulatory or commercial authority.
    providerTransportVerified: status === "staged_for_independent_reconciliation",
    warehouseStockReconciled: false,
    availableToPromise: null,
    stockReservationCreated: false,
    warehouseDispatchCreated: false,
    regulatedMedicineReleased: false,
  });
}

/**
 * Optional authenticated read-only ingestion boundary for a specifically
 * contracted HMAC-SHA256 3PL feed, NOT a claim Polar Speed supplies such a feed.
 *
 * Requires exact server-owned tenant/site/source/contract configuration, raw
 * signed bytes and a durable atomic duplicate-claim callback. No callback,
 * unapproved contract, missing secret or unverified signature: reject.
 *
 * The caller must persist the staged evidence in a restricted queue separately.
 * There is no public endpoint, write to stock, or 3PL command here.
 */
export async function reviewSigned3plInventoryFeed({
  rawBody,
  signatureHex,
  signingSecret,
  trustedSource,
  tenantId,
  siteId,
  contractId,
  contractAccepted = false,
  claimUniqueFeed,
  asOf = new Date().toISOString(),
} = {}) {
  if (contractAccepted !== true || !isId(contractId) ||
      !SOURCES.has(trustedSource) || !isId(tenantId) || !isId(siteId))
    return response("blocked", ["unaccepted_provider_contract_or_scope"]);
  if (typeof claimUniqueFeed !== "function")
    return response("blocked", ["durable_replay_guard_unavailable"]);
  if (typeof rawBody !== "string" || Buffer.byteLength(rawBody, "utf8") > 1_048_576 ||
      rawBody.length < 2)
    return response("blocked", ["invalid_or_oversized_raw_feed"]);
  const secret = typeof signingSecret === "string" ? Buffer.from(signingSecret, "utf8") : signingSecret;
  if (!Buffer.isBuffer(secret) || secret.byteLength < 32 || !DIGEST.test(signatureHex || ""))
    return response("blocked", ["missing_or_invalid_signature_configuration"]);
  const at = time(asOf);
  if (!Number.isFinite(at))
    return response("blocked", ["invalid_server_review_clock"]);

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  const supplied = Buffer.from(signatureHex, "hex");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected))
    return response("blocked", ["signature_mismatch"]);

  let packet;
  try { packet = JSON.parse(rawBody); } catch {
    return response("blocked", ["invalid_json_payload"]);
  }
  if (!isObject(packet) || !isObject(packet.manifest) ||
      packet.manifest.tenantId !== tenantId || packet.manifest.siteId !== siteId ||
      packet.manifest.sourceSystem !== trustedSource || packet.manifest.contractId !== contractId)
    return response("blocked", ["provider_manifest_mismatches_trusted_scope"]);

  const observed = time(packet.manifest.capturedAt);
  // A delayed legitimate receipt must be adjudicated manually, not silently
  // pushed into the current inventory view.
  if (!Number.isFinite(observed) || observed > at + 60_000 ||
      at - observed > 60 * 60_000)
    return response("blocked", ["inventory_feed_exceeds_one_hour_freshness"]);

  const screened = reviewQualified3plSnapshot(packet, { tenantId, siteId, asOf });
  if (screened.state !== "candidate_for_independent_review")
    return response("blocked", ["lot_and_quality_schema_rejected", ...screened.reasons]);

  const contentHash = createHash("sha256").update(rawBody, "utf8").digest("hex");
  let claimed;
  try {
    // The integration service must implement this as an atomic durable claim.
    claimed = await claimUniqueFeed({
      tenantId, siteId, contractId,
      sourceSystem: trustedSource,
      feedId: packet.manifest.feedId,
      contentHash,
    });
  } catch {
    return response("blocked", ["replay_store_unavailable"]);
  }
  if (claimed !== true)
    return response("blocked", ["duplicate_or_unconfirmed_feed_claim"]);

  return response("staged_for_independent_reconciliation",
    ["external_warehouse_stock_and_quality_acceptance_still_required"], {
      feedId: packet.manifest.feedId,
      evidenceId: packet.manifest.evidenceId,
      contentHash,
      sourceSystem: trustedSource,
      tenantId,
      siteId,
      lotsReviewed: screened.lotsReviewed,
      // These are provider-reported, NOT saleable stock.
      reportedOnHand: screened.reportedOnHand,
      reportedReleased: screened.reportedReleased,
      fefoReviewCandidates: screened.fefoReviewCandidates,
    });
}
