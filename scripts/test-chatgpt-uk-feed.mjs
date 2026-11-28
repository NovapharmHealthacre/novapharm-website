import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildChatGptRows, serializeChatGptRows } from "./build-chatgpt-uk-feed.mjs";
const actualCatalogue = JSON.parse(readFileSync(new URL("../src/content/approved-consumer-catalogue.json", import.meta.url)));
const actualManifest = JSON.parse(readFileSync(new URL("../src/content/chatgpt-uk-verified-offers.json", import.meta.url)));
const now = new Date();
const fresh = () => now.toISOString().replace(/\.\d{3}Z$/, "Z");
const item = actualCatalogue.find(product => product.productClass === "cosmetic");
assert(item, "Expected existing approved cosmetic listing");
const offer = () => ({
  ean: item.ean,
  productUrl: "https://novapharmhealthcare.com/products/health-and-wellbeing/" + item.ean + "/",
  pricePence: 1299, availability: "in_stock",
  priceCheckedAt: fresh(), stockCheckedAt: fresh(),
  sellerApproved: true, checkoutVerified: true, priceIncludesVat: true,
  source: "verified-live-retail", policyApproved: true,
  policyReviewReference: "test-fixture-only"
});
const feed = offers => ({ ...actualManifest, offers });
test("no approved live offers means no misleading public feed", () => {
  assert.equal(buildChatGptRows(actualCatalogue, actualManifest, now).length, 0);
});
test("verified cosmetics use GBP, UK market, and website checkout only", () => {
  const rows = buildChatGptRows(actualCatalogue, feed([offer()]), now);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].price, "12.99 GBP");
  assert.equal(rows[0].target_countries, '["GB"]');
  assert.equal(rows[0].is_eligible_checkout, "false");
  assert.equal(rows[0].is_ads_eligible, "false");
  assert(serializeChatGptRows(rows).includes('"[""GB""]"'));
});
test("food supplements cannot be sent even when seller-approved", () => {
  const supplement = actualCatalogue.find(p => p.productClass === "food_supplement");
  assert(supplement);
  assert.throws(() => buildChatGptRows(actualCatalogue, feed([{
    ...offer(), ean: supplement.ean,
    productUrl: "https://novapharmhealthcare.com/products/health-and-wellbeing/" + supplement.ean + "/"
  }]), now), /prohibited or not reviewed/);
});
test("unverified stock, price, seller approval and policy fail closed", () => {
  const invalids = [
    { pricePence: null }, { pricePence: 0 }, { availability: "unknown" },
    { stockCheckedAt: "2026-01-01T00:00:00Z" }, { priceCheckedAt: "2026-01-01T00:00:00Z" },
    { sellerApproved: false }, { checkoutVerified: false },
    { policyApproved: false }, { priceIncludesVat: false },
    { source: "guide-price" }, { productUrl: "https://example.com/" },
    { productUrl: "https://novapharmhealthcare.com/products/nutraxin/" }
  ];
  for (const bad of invalids) assert.throws(
    () => buildChatGptRows(actualCatalogue, feed([{ ...offer(), ...bad }]), now),
    "Fail-closed for " + JSON.stringify(bad)
  );
});
test("duplicate items and unreviewed products cannot enter feed", () => {
  assert.throws(() => buildChatGptRows(actualCatalogue, feed([offer(), offer()]), now));
  assert.throws(() => buildChatGptRows(actualCatalogue, feed([{ ...offer(), ean: "0000000000000" }]), now));
});
