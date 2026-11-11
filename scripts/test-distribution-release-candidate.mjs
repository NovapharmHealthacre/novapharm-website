import test from "node:test";
import { strict as assert } from "node:assert";
import {
  DISTRIBUTION_GATES,
  assessDistributionReleaseCandidate
} from "../src/core/distribution-release-candidate.mjs";

const reviewed = "2026-11-10T12:00:00Z";
const asOf = "2026-11-11T12:00:00Z";
const scope = Object.freeze({
  legalEntity: "NOVAPHARM-UK", country: "GB",
  productId: "MEDICINE-001", siteId: "WAREHOUSE-001"
});
const order = Object.freeze({
  productClass: "regulated_human_medicine", channel: "qualified_b2b",
  buyerEligible: true, supplierEligible: true, productCountryEligible: true,
  lotStatus: "quality_released", expiryValidated: true,
  availableToPromiseValidated: true, temperatureDeviationsClosed: true,
  laneQualified: true, recallHold: false
});
const receipts = () => DISTRIBUTION_GATES.map(gate => ({
  gate, status: "approved", recordOrigin: "controlled_quality_system",
  independentlyReviewed: true, evidenceId: "DOC-2026-" + gate,
  reviewerId: "REVIEWER-QUALITY", reviewerRole: "Quality-RP",
  evidenceSha256: "a".repeat(64), reviewedAt: reviewed,
  validFrom: "2026-11-01T00:00:00Z",
  validUntil: "2027-02-01T00:00:00Z", scope: { ...scope }
}));
const candidate = () => ({ asOf, scope: { ...scope }, order: { ...order }, receipts: receipts() });
const hasBlock = (result, code) => result.failures.some(failure => failure.code === code);

test("empty/unknown evidence blocks and cannot transact", () => {
  for (const value of [undefined, null, {}, { receipts: [] }]) {
    const r = assessDistributionReleaseCandidate(value);
    assert.equal(r.status, "blocked");
    assert.equal(r.transactionAuthorized, false);
    assert.equal(r.medicineOrderAccepted, false);
    assert.equal(r.medicineDispatchAuthorized, false);
    assert.equal(r.customerFacingReleaseEnabled, false);
  }
});

test("even complete illustrative receipts only permit independent review, not dispatch", () => {
  const r = assessDistributionReleaseCandidate(candidate());
  assert.equal(r.status, "ready_for_independent_quality_review");
  assert.equal(r.reviewReady, true);
  assert.equal(r.transactionAuthorized, false);
  assert.equal(r.medicineOrderAccepted, false);
  assert.equal(r.medicineDispatchAuthorized, false);
  assert.equal(r.requiresServerAuthenticatedReceipts, true);
  assert.deepEqual(r.failures, []);
});

for (const gate of DISTRIBUTION_GATES) {
  test("fails closed when " + gate + " is absent, unapproved or wrong scope", () => {
    for (const modify of [
      v => v.receipts = v.receipts.filter(r => r.gate !== gate),
      v => v.receipts.find(r => r.gate === gate).status = "pending",
      v => v.receipts.find(r => r.gate === gate).scope.country = "US"
    ]) {
      const v = candidate();
      modify(v);
      const r = assessDistributionReleaseCandidate(v);
      assert.equal(r.reviewReady, false);
      assert.equal(r.transactionAuthorized, false);
      assert.ok(r.failures.some(f => f.gate === gate), gate + " denied");
    }
  });
}

test("duplicate and invented gate receipts fail", () => {
  for (const replacement of [
    receipts => receipts[1] = { ...receipts[0] },
    receipts => receipts[1] = { ...receipts[1], gate: "D99_UNRECOGNISED" }
  ]) {
    const v = candidate();
    replacement(v.receipts);
    const r = assessDistributionReleaseCandidate(v);
    assert.ok(hasBlock(r, "DUPLICATE_OR_UNRECOGNISED_GATE"));
    assert.equal(r.transactionAuthorized, false);
  }
});

test("expiry, future-dated review and missing provenance deny", () => {
  for (const edit of [
    r => r.validUntil = asOf,
    r => r.validFrom = "2026-11-12T00:00:00Z",
    r => r.reviewedAt = "2026-11-12T00:00:00Z",
    r => r.evidenceSha256 = "unknown",
    r => r.recordOrigin = "browser",
    r => r.independentlyReviewed = false,
    r => r.reviewerRole = ""
  ]) {
    const v = candidate();
    edit(v.receipts[0]);
    assert.equal(assessDistributionReleaseCandidate(v).reviewReady, false);
  }
});

test("no patient orders, unrelated product categories or wrong country", () => {
  for (const edit of [
    v => v.order.channel = "direct_patient",
    v => v.order.productClass = "food_supplement",
    v => v.scope.country = "US",
    v => v.order.buyerEligible = false,
    v => v.order.supplierEligible = false,
    v => v.order.productCountryEligible = false
  ]) {
    const v = candidate(); edit(v);
    assert.equal(assessDistributionReleaseCandidate(v).reviewReady, false);
  }
});

test("no quarantined/expired/unavailable stock, excursions, unqualified lanes or recalls", () => {
  for (const edit of [
    v => v.order.lotStatus = "quarantined",
    v => v.order.expiryValidated = false,
    v => v.order.availableToPromiseValidated = false,
    v => v.order.temperatureDeviationsClosed = false,
    v => v.order.laneQualified = false,
    v => v.order.recallHold = true
  ]) {
    const v = candidate(); edit(v);
    const r = assessDistributionReleaseCandidate(v);
    assert.equal(r.reviewReady, false);
    assert.equal(r.medicineOrderAccepted, false);
    assert.equal(r.medicineDispatchAuthorized, false);
  }
});

test("unknown current time and changed site always block", () => {
  const noTime = candidate();
  noTime.asOf = "2026-11-11";
  assert.ok(hasBlock(assessDistributionReleaseCandidate(noTime), "SERVER_REVIEW_TIME_MISSING"));
  const wrongSite = candidate();
  wrongSite.scope.siteId = "DIFFERENT-SITE";
  assert.equal(assessDistributionReleaseCandidate(wrongSite).reviewReady, false);
});

test("caller cannot mutate returned authorisation or failure array", () => {
  const r = assessDistributionReleaseCandidate({});
  assert.ok(Object.isFrozen(r));
  assert.ok(Object.isFrozen(r.failures));
  assert.throws(() => { r.transactionAuthorized = true; }, TypeError);
  assert.throws(() => { r.failures.push("allow"); }, TypeError);
});
