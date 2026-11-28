import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildChatGptRows, serializeChatGptRows, StaleRetailFeedEvidence
} from "./build-chatgpt-uk-feed.mjs";
const catalogue = JSON.parse(readFileSync(new URL("../src/content/approved-consumer-catalogue.json", import.meta.url)));
const manifest = JSON.parse(readFileSync(new URL("../src/content/chatgpt-uk-verified-offers.json", import.meta.url)));
const now = new Date();
const fresh = () => now.toISOString().replace(/\.\d{3}Z$/, "Z");
const cosmetic = catalogue.find(x => x.productClass === "cosmetic");
const supplement = catalogue.find(x => x.productClass === "food_supplement");
assert(cosmetic && supplement);
const feed = offers => ({ ...manifest, offers });
const offer = () => ({
  ean: cosmetic.ean,
  productUrl: "https://novapharmhealthcare.com/products/health-and-wellbeing/" + cosmetic.ean + "/",
  pricePence: 1299, availability: "unknown",
  priceCheckedAt: fresh(),
  priceEvidenceSource: "aws-retail-approved-ledger-eu-north-1",
  priceEvidenceExpiresAt: Math.floor(now.getTime() / 1000) + 86400,
  stockVerified: false, supplierBackedOrdering: true, sellerDeliveryCommitment: true,
  sellerApproved: true, checkoutVerified: true, priceIncludesVat: true,
  source: "verified-live-retail", policyApproved: true, policyReviewReference: "verified-test-fixture"
});
test("empty manifest produces no misleading public products", () => {
  assert.equal(buildChatGptRows(catalogue, feed([]), now).length, 0);
});
test("five AWS-ledger approved prices are preserved with explicit unknown physical stock", () => {
  const rows = buildChatGptRows(catalogue, manifest, new Date("2026-11-28T09:36:00Z"));
  assert.equal(rows.length, 5);
  assert.deepEqual(rows.map(x => x.price), ["7.30 GBP","6.86 GBP","6.64 GBP","4.87 GBP","5.24 GBP"]);
  assert(rows.every(x => x.availability === "unknown" && x.target_countries === '["GB"]'));
  assert(rows.every(x => x.is_eligible_checkout === "false" && x.is_ads_eligible === "false"));
  assert(serializeChatGptRows(rows).includes('"[""GB""]"'));
});
test("a fresh evidence-backed cosmetic can be listed without a fictional in-stock claim", () => {
  assert.equal(buildChatGptRows(catalogue, feed([offer()]), now)[0].availability, "unknown");
});
test("supplements cannot be submitted even with other approval flags", () => {
  assert.throws(() => buildChatGptRows(catalogue, feed([{
    ...offer(), ean: supplement.ean,
    productUrl: "https://novapharmhealthcare.com/products/health-and-wellbeing/" + supplement.ean + "/"
  }]), now), /prohibited or not reviewed/);
});
test("unsupported class, missing SKU, bad price, policy or sourcing fail closed", () => {
  for (const invalid of [
    { pricePence: null }, { pricePence: 0 }, { availability: "in_stock" },
    { stockVerified: true }, { supplierBackedOrdering: false },
    { sellerDeliveryCommitment: false },
    { priceCheckedAt: "2026-01-01T00:00:00Z" },
    { priceEvidenceSource: "guide-price" },
    { priceEvidenceExpiresAt: 0 },
    { sellerApproved: false }, { checkoutVerified: false },
    { policyApproved: false }, { priceIncludesVat: false }, { source: "guide-price" },
    { productUrl: "https://example.com/" }
  ]) assert.throws(() => buildChatGptRows(catalogue, feed([{ ...offer(), ...invalid }]), now),
    "must reject " + JSON.stringify(invalid));
  assert.throws(() => buildChatGptRows(catalogue, feed([{ ...offer(), ean: "0000000000000" }]), now));
  assert.throws(() => buildChatGptRows(catalogue, feed([offer(), offer()]), now));
});
test("stale price data uses a typed error so public builds can withhold stale offers", () => {
  assert.throws(() => buildChatGptRows(catalogue, feed([{
    ...offer(), priceCheckedAt: "2026-11-01T00:00:00Z"
  }]), now), StaleRetailFeedEvidence);
});
