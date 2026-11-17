import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLocalIdentityCandidates,
  assertMarketFactCandidate,
  fingerprintMarketFactCandidate
} from "../src/core/intelligence-global-canonical-candidates.mjs";

const envelope = Object.freeze({
  sourceId: "ca-health-canada-dpd",
  jurisdiction: "CA",
  responseSha256: "a".repeat(64),
  retrievedAt: "2026-11-17T16:00:00.000Z",
  canPublish: false,
  publishDecision: "DENIED_UNTIL_INDEPENDENT_DATA_ADMISSION",
  dataState: "unreconciled_upstream_preview",
  records: [{ localId: "00001234", label: "A product" }]
});
const market = Object.freeze({
  country: "GB",
  sourceId: "nhsbsa-epd-snomed",
  sourceLocalProductId: "123456789",
  sourceSnapshotSha256: "b".repeat(64),
  periodStart: "2026-10-01",
  periodEnd: "2026-10-31",
  channel: "community-dispensing",
  sourceUnit: "items",
  sourceMeasure: "number-of-items",
  canPublish: false,
  productionAccepted: false,
  price: {
    priceType: "reimbursement",
    currency: "GBP",
    amount: "12.34",
    priceBasis: "per item",
    effectiveDate: "2026-10-01",
    packPresentationId: "uk-local-pack-123"
  }
});
test("source-local identifiers retain leading zeroes and are never promoted to canonical medicines", () => {
  const rows = buildLocalIdentityCandidates(envelope);
  assert.equal(rows[0].sourceLocalId, "00001234");
  assert.equal(rows[0].country, "CA");
  assert.equal(rows[0].canonicalProductId, null);
  assert.equal(rows[0].mappingDecision, "unresolved");
  assert.equal(rows[0].commercialReleaseApproved, false);
  assert.throws(() => buildLocalIdentityCandidates({ ...envelope, canPublish: true }));
});
test("market candidates retain price type, units, currency, country, observation period and rejection", () => {
  const checked = assertMarketFactCandidate(market);
  assert.equal(checked.price.priceType, "reimbursement");
  assert.equal(checked.canPublish, false);
  assert.equal(checked.comparableToOtherCountries, false);
  assert.match(fingerprintMarketFactCandidate(market), /^[a-f0-9]{64}$/);
});
test("reject missing period, float money, undefined channel and unlabeled transaction price", () => {
  for (const bad of [
    { ...market, periodStart: "2026-13-01" },
    { ...market, periodStart: "2026-12-01" },
    { ...market, sourceMeasure: "" },
    { ...market, country: "GLOBAL" },
    { ...market, canPublish: true },
    { ...market, productionAccepted: true },
    { ...market, channel: "all-world-market" },
    { ...market, sourceSnapshotSha256: "" },
    { ...market, price: { ...market.price, amount: 12.34 } },
    { ...market, price: { ...market.price, priceType: "market-selling-price" } },
    { ...market, price: { ...market.price, priceType: "reported-transaction" } },
    { ...market, price: { ...market.price, currency: "£" } }
  ]) assert.throws(() => assertMarketFactCandidate(bad), /not production-admitted/);
});
test("distinct country/period/price classification produces distinct evidence fingerprints", () => {
  const base = fingerprintMarketFactCandidate(market);
  assert.notEqual(base, fingerprintMarketFactCandidate({ ...market, country: "FR" }));
  assert.notEqual(base, fingerprintMarketFactCandidate({ ...market, periodEnd: "2026-10-30" }));
  assert.notEqual(base, fingerprintMarketFactCandidate({ ...market, price: { ...market.price, priceType: "ceiling" } }));
});
