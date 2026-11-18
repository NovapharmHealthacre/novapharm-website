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
  domain: "regulatory",
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
  assert.throws(
    () => buildLocalIdentityCandidates({ ...envelope, jurisdiction: "GLOBAL", domain: "clinical-trials" }),
    /Only national regulatory product sources/
  );
  assert.throws(
    () => buildLocalIdentityCandidates({ ...envelope, domain: "literature" }),
    /Only national regulatory product sources/
  );
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

test("never silently promote multimodal model attributes as official regulatory identity rows", () => {
  const clean = buildLocalIdentityCandidates({
    ...envelope, records:[{localId:"00001234",label:"A product",provenanceDomain:"Health Canada DPD"}]
  });
  assert.equal(clean[0].canonicalProductId,null);
  assert.equal(clean[0].mappingDecision,"unresolved");
  for (const extra of [
    {modelInferredMedicineName:"Different medicine"},
    {modelConfidence:0.999},
    {imageTextMedicineName:"Different medicine"},
    {verifiedByMultimodalModel:true},
    {canPublish:true},
    {tenantAuthorised:true}
  ]) {
    assert.throws(()=>buildLocalIdentityCandidates({
      ...envelope,
      records:[{localId:"00001234",label:"A product",...extra}]
    }),/Invalid source-local medicine identity/);
  }
});

test("reject inherited, prototype-polluted and accessor-based regulator labels",()=>{
  const inherited = Object.create({localId:"00001234",label:"Injected product"});
  const getter = Object.defineProperty({localId:"00001234"},"label",{
    enumerable:true,get:()=> "Injected product"
  });
  const nullPrototype = Object.assign(Object.create(null),{
    localId:"00001234",label:"Injected product"
  });
  for (const record of [inherited,getter,nullPrototype]) {
    assert.throws(() => buildLocalIdentityCandidates({
      ...envelope, records:[record]
    }),/Invalid source-local medicine identity/);
  }
});
