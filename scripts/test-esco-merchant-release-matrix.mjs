import test from "node:test";
import assert from "node:assert/strict";
import { buildMerchantReviewRows, merchantRowsToCsv } from "./esco-merchant-release-matrix.mjs";

test("all 373 ESCO references have a merchant review record with no invented clearance", () => {
  const rows = buildMerchantReviewRows();
  assert.equal(rows.length, 373);
  assert.equal(new Set(rows.map(x => x.catalogue_id)).size, 373);
  assert.equal(new Set(rows.map(x => x.category)).size, 12);
  assert.ok(rows.every(x => x.customer_order_request_available === "YES"));
  assert.ok(rows.every(x => x.current_live_checkout_status === "VERIFY_AGAINST_PROTECTED_SSM_POLICY"));
  assert.ok(rows.every(x => x.additional_live_card_checkout_approved_by_this_matrix === "NO"));
  assert.ok(rows.every(x => x.checkout_status === "AWAITING_INDIVIDUAL_APPROVAL"));
  assert.ok(rows.every(x => !x.approved_stripe_tax_code && !x.merchant_release_approval));
  assert.ok(rows.every(x => !x.warehouse_allocatable_units && !x.resolved_saleable_variant));
  assert.ok(rows.every(x => Number(x.uk_category_guide_ex_vat_gbp) > 0));
  assert.equal(new Set(rows.map(x=>x.novapharm_internal_order_code)).size,373);
  assert.ok(rows.every(x=>x.novapharm_internal_order_code === "NPH-ESCO-" + x.catalogue_id.slice(-4)));
  assert.ok(rows.every(x=>x.internal_code_issuer === "NOVAPHARM_NOT_ESCO_MANUFACTURER"));
  assert.ok(rows.every(x=>x.fulfilment_state === "OWNER_DECLARED_UNALLOCATED_ORDER_REQUEST"));
  assert.ok(rows.every(x=>x.tax_engine === "STRIPE_TAX_AFTER_PRODUCT_CLASSIFICATION"));
  assert.ok(rows.every(x=>x.delivery_charge_basis === "CALCULATE_FOR_CONFIRMED_UK_ADDRESS"));
  assert.ok(rows.every(x => x.owner_approved_catalogue_unit_price_ex_vat_gbp === x.uk_category_guide_ex_vat_gbp));
  assert.ok(rows.every(x => x.owner_price_approval_date === "2026-11-09"));
  assert.ok(rows.every(x => x.owner_price_approval_scope.includes("EXCLUDING_DELIVERY_VAT")));
  assert.ok(rows.every(x => Number(x.maximum_supplier_and_inbound_cost_for_modelled_25pct_margin_gbp) >= 0));
  assert.ok(rows.every(x => x.owner_declared_planning_units === 10000));
});

test("private merchant CSV is correctly quoted and never contains live Stripe secrets", () => {
  const csv = merchantRowsToCsv(buildMerchantReviewRows());
  assert.equal(csv.trimEnd().split("\n").length, 374);
  assert.match(csv, /"ESCO-CAT-0001"/);
  assert.match(csv, /"ESCO-CAT-0373"/);
  assert.doesNotMatch(csv, /sk_live_|rk_live_|whsec_/);
  assert.doesNotMatch(csv, /"true","true","true"/);
});
