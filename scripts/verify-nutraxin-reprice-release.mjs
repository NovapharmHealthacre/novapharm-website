import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gitBlobSha, REVIEWED_CONTACT_BLOBS } from "./verify-public-branding-only-release.mjs";

export const APPROVAL = "config/retail/approved-nutraxin-reprice-release-20261127.json";
export const RELEASE_PARENT = "e186e6dc1959597771a44a94f42176ab2fa21a73";
export const APPROVED_PATHS = [".github/workflows/publish-aws-contact-production.yml","config/retail/approved-nutraxin-reprice-release-20261127.json","scripts/test-unified-ci-policy.mjs","scripts/verify-nutraxin-reprice-release.mjs"];
const REQUIRED_DENIALS = ["provisionNewPaidInfrastructure","purchaseVendorLicenses","activateNativePalantir","activateNativePrisma","activateNativeBloomberg","admitUnapprovedMedicineData","enableCustomerSubscriptions","enableCustomerBilling","sendExternalEmail","activatePublicCustomerAccess","cutOverPortalDnsOrApiMapping"];
const PRICES = Object.freeze({"NUT-UK-VD3-T120":949,"NUT-UK-VD3-S30":949,"NUT-UK-VD3K2-T120":1099,"NUT-UK-VD3K2-S30":1099,"NUT-UK-VC1000-T30":949,"NUT-UK-VC500-C30":1099,"NUT-UK-VMAX-T60":1099,"NUT-UK-VMAX-E15":1199,"NUT-UK-MGCX-T60":1099,"NUT-UK-MGDL-T60":1099,"NUT-UK-MVE-T60":1249,"NUT-UK-MVW-T60":1349,"NUT-UK-MVM-T60":1349,"NUT-UK-CG-T30":1199,"NUT-UK-CG-S30":2149,"NUT-UK-CCX-T90":1749,"NUT-UK-ART-T90":1399,"NUT-UK-LCAR-T60":999,"NUT-UK-B12-SL60":949});
const PINNED = Object.freeze({"assets/data/nutraxin-retail-catalogue.json":"ed9c8f22cfe6aacb44a48e79aa04fbf3803a7292","assets/js/nutraxin-retail-store.js":"5498eb039769554a71f3c2d3c2ccb8e81102f2af","shopping/nutraxin-uk.tsv":"efe484af8d430f858628eb1af0a070011d766bc6","scripts/apply-corporate-product-discipline.mjs":"df35808afd1b43cb250cca63a93fb2f70790eadd","scripts/generate-nutraxin-shopping.mjs":"3f139aab325cd82f3f87d982568340d68209db8e","apps/nutraxin-products-checkout/index.py":"c80ecf7568770e8b64734c04eec70d2717f7278f","apps/nutraxin-payments/approved_checkout.py":"89b642dac271797e5cf3f1476a4d297a5c244965","apps/nutraxin-customer-api/index.py":"71a79e54be2f782b861faefce95b07e02673938e","legal/returns/index.html":"2a2dc422c45f2774a41fc0589584c3e760112c8a","products/nutraxin/bag/index.html":"4e366f1b6133cc78fff0c03d31bbe789cef38a81","src/content/nutraxin-showcase.html":"c533798ce55ecf73db0d6175b2bee83e2fd61644"});
export function verifyNutraxinReprice({approval, constraints, catalogue, feed, sourceBlobs, contactBlobs, parent, changedPaths, eventName}) {
  assert.equal(eventName, "push");
  assert.equal(parent, RELEASE_PARENT, "Release must be the reviewed pricing merge followed only by this scoped authorization");
  assert.deepEqual([...changedPaths].sort(), APPROVED_PATHS, "Unrelated changes may not inherit pricing release approval");
  assert.equal(approval.schema, "novapharm.nutraxin-reprice-release.v1");
  assert.equal(approval.approval, "granted");
  assert.equal(approval.approvedPr, 1283);
  assert.equal(approval.approvedSourceSha, RELEASE_PARENT);
  assert.equal(approval.scope, "existing-19-nutraxin-retail-offers-and-standard-uk-delivery");
  assert.equal(approval.allowExistingRetailPaymentCollection, true);
  for (const permission of ["allowPortalCustomerAccess","allowMedicinesCheckout","allowExternalEmail","allowNewInfrastructure"]) assert.equal(approval[permission], false);
  assert.equal(constraints.productionSignoff, "not_granted");
  for (const key of REQUIRED_DENIALS) assert.equal(constraints.productionPermissions?.[key], false);
  assert.ok(Object.values(constraints.productionPermissions).every(x=>x===false));
  assert.deepEqual(approval.sourceBlobs, PINNED);
  assert.deepEqual(sourceBlobs, PINNED);
  assert.deepEqual(contactBlobs, REVIEWED_CONTACT_BLOBS);
  assert.equal(approval.revision, "nutraxin-retail-2026-11-27");
  assert.equal(catalogue.retail_price_revision, approval.revision);
  assert.equal(catalogue.source_record, "owner_approved_nutraxin_19_sku_reprice_2026-11-27");
  assert.equal(approval.deliveryGrossPence, 449);
  assert.equal(catalogue.provisional_uk_delivery_charge_pence, 449);
  assert.equal(catalogue.provisional_uk_delivery_cost_seller_funded, false);
  assert.equal(catalogue.currency, "GBP");
  assert.deepEqual(approval.pricesGrossPence, PRICES);
  assert.equal(catalogue.products.length, 19);
  assert.deepEqual(Object.fromEntries(catalogue.products.map(p=>[p.sku,p.retail_price_pence])), PRICES);
  const rows=feed.trim().split(/\r?\n/).slice(1).map(line=>line.split("\t"));
  assert.equal(rows.length,19);
  assert.equal(new Set(rows.map(row=>row[0])).size,19);
  for (const row of rows) {
    assert.ok(Object.hasOwn(PRICES,row[0]));
    assert.equal(row[6],(PRICES[row[0]]/100).toFixed(2)+" GBP");
    assert.equal(row[12],"GB:4.49 GBP");
  }
  return true;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const git=(...args)=>execFileSync("git",args,{encoding:"utf8",timeout:15000}).trim();
  const blobs=paths=>Object.fromEntries(paths.map(path=>[path,gitBlobSha(readFileSync(path))]));
  try {
    verifyNutraxinReprice({approval:JSON.parse(readFileSync(APPROVAL,"utf8")),constraints:JSON.parse(readFileSync("config/intelligence/owner-production-constraints.json","utf8")),catalogue:JSON.parse(readFileSync("assets/data/nutraxin-retail-catalogue.json","utf8")),feed:readFileSync("shopping/nutraxin-uk.tsv","utf8"),sourceBlobs:blobs(Object.keys(PINNED)),contactBlobs:blobs(Object.keys(REVIEWED_CONTACT_BLOBS)),parent:git("rev-parse","HEAD^"),changedPaths:git("diff","--name-only","HEAD^","HEAD").split("\n").filter(Boolean),eventName:process.env.RELEASE_EVENT});
    console.log("Exact owner-approved Nutraxin pricing-only publication scope verified. Private production permissions remain denied.");
  } catch(error) { console.error("Nutraxin pricing release denied: "+error.message); process.exitCode=1; }
}
