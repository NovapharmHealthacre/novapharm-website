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
