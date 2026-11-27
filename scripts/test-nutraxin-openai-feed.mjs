import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { exportCandidate, serializeTsv, parseMerchantTsv, assertUkUploadEnabled } from "./build-nutraxin-openai-feed.mjs";

const tsv = readFileSync(resolve("shopping/nutraxin-uk.tsv"), "utf8");
const retail = JSON.parse(readFileSync(resolve("assets/data/nutraxin-retail-catalogue.json"), "utf8"));
const candidate = exportCandidate(tsv, retail);

test("all nineteen real UK variants preserve price, identity, public image and seller", () => {
  assert.equal(candidate.length, 19);
  assert.equal(new Set(candidate.map(p => p.item_id)).size, 19);
  assert.equal(serializeTsv(candidate).trimEnd().split("\n").length, 20);
  assert.equal(candidate.reduce((sum, p) => sum + Number(p.price.split(" ")[0]), 0).toFixed(2), "230.31");
  assert(candidate.every(p => p.shipping === "GB::Standard:4.49 GBP" &&
    p.target_countries === "GB" && p.store_country === "GB" &&
    p.seller_name === "NovaPharm Healthcare Ltd" &&
    p.image_url.startsWith("https://novapharmhealthcare.com/assets/media/products/nutraxin/")));
});

test("two Google-policy-flagged magnesium products remain out of AI search pending review", () => {
  assert.deepEqual(candidate.filter(p => p.is_eligible_search === "false").map(p => p.item_id).sort(),
    ["NUT-UK-MGCX-T60", "NUT-UK-MGDL-T60"]);
  assert(candidate.every(p => p.is_ads_eligible === "false" && p.is_eligible_checkout === "false"));
});

test("divergent prices, shipping, availability and duplicated SKUs fail closed", () => {
  const lines = tsv.trimEnd().split("\n");
  const index = lines.findIndex(x => x.startsWith("NUT-UK-VD3-T120\t"));
  assert(index > 0);
  assert.throws(() => exportCandidate(lines.map((x,i) =>
    i===index ? x.replace("9.49 GBP", "15.47 GBP") : x).join("\n"), retail));
  assert.throws(() => exportCandidate(tsv.replace("GB:4.49 GBP", "GB:0.00 GBP"), retail));
  assert.throws(() => exportCandidate(tsv.replace("\tin_stock\t", "\tout_of_stock\t"), retail));
  assert.throws(() => exportCandidate(tsv + lines[index] + "\n", retail));
  assert.throws(() => exportCandidate(tsv, {...retail, provisional_uk_delivery_charge_pence:0}));
});

test("no unverified UK merchant upload", () => {
  assert.throws(() => assertUkUploadEnabled({businessVerified:"yes",ukMarketSupported:"no",uploadApproved:"yes"}));
  assert.throws(() => assertUkUploadEnabled({businessVerified:"no",ukMarketSupported:"yes",uploadApproved:"yes"}));
  assert.throws(() => assertUkUploadEnabled({businessVerified:"yes",ukMarketSupported:"yes",uploadApproved:"no"}));
  assert.doesNotThrow(() => assertUkUploadEnabled({businessVerified:"yes",ukMarketSupported:"yes",uploadApproved:"yes"}));
});

test("source input has canonical fields and product urls", () => {
  const records = parseMerchantTsv(tsv);
  assert(records.every(record => record.link.startsWith("https://novapharmhealthcare.com/products/nutraxin/")));
});
