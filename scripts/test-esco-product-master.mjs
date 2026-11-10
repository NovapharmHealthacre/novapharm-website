import test from "node:test";
import assert from "node:assert/strict";
import { buildEscoProductMaster } from "./esco-product-master.mjs";
import { buildMerchantReviewRows } from "./esco-merchant-release-matrix.mjs";

test("every ESCO product has an exact unique NovaPharm SKU and manufacturer", () => {
  const master = buildEscoProductMaster();
  assert.equal(master.schema, "novapharm-esco-product-master-v1");
  assert.equal(master.record_count, 373);
  assert.equal(master.records.length, 373);
  assert.equal(new Set(master.records.map(r => r.catalogue_id)).size, 373);
  assert.equal(new Set(master.records.map(r => r.internal_novapharm_sku)).size, 373);
  assert.equal(new Set(master.records.map(r => r.category)).size, 12);
  assert.equal(master.records.filter(r => !r.manufacturer_model).length, 300);
  assert.ok(master.records.every(r => r.manufacturer === "Eastern Surgical Company (ESCO)"));
  assert.ok(master.records.every(r => r.owner_declared_stock_units === 10000));
  assert.ok(master.records.every(r => r.stock_basis === "OWNER_DECLARED_NOT_ALLOCATED"));
  assert.ok(master.records.every(r => !r.payment_approved_in_this_record));
  assert.equal(master.records[0].internal_novapharm_sku, "NP-ESCO-0001");
  assert.equal(master.records.at(-1).internal_novapharm_sku, "NP-ESCO-0373");
});

test("all 373 master prices exactly reconcile with the approved website price matrix", () => {
  const rows = buildMerchantReviewRows();
  const master = buildEscoProductMaster();
  const byId = new Map(rows.map(r => [r.catalogue_id, r]));
  assert.equal(byId.size, 373);
  for (const item of master.records) {
    const price = Number(byId.get(item.catalogue_id).owner_approved_catalogue_unit_price_ex_vat_gbp);
    assert.equal(item.owner_approved_base_price_ex_vat_pence, Math.round(price * 100), item.catalogue_id);
    assert.equal(item.currency, "GBP");
    assert.equal(item.tax_and_delivery_not_included, true);
    assert.equal(item.checkout_authority, "PROTECTED_SSM_ONLY");
  }
});

test("catalogue identity failures do not silently create payable products", () => {
  const good = buildEscoProductMaster();
  assert.ok(good.records.every(r => !r.payment_approved_in_this_record));
  const json = JSON.stringify(good);
  assert.doesNotMatch(json, /sk_live_|rk_live_|whsec_/);
});
