import test from "node:test";
import assert from "node:assert/strict";
import {buildEsco371Audit,toCsv} from "./esco-371-clearance-audit.mjs";

const report=buildEsco371Audit();
test("every unapproved ESCO catalogue identity is included exactly once",()=>{
  assert.equal(report.total_catalogue,373);
  assert.equal(report.current_known_approved,2);
  assert.equal(report.unapproved_audited,371);
  assert.equal(report.rows.length,371);
  assert.equal(new Set(report.rows.map(x=>x.catalogue_id)).size,371);
  assert.equal(new Set(report.rows.map(x=>x.internal_novapharm_sku)).size,371);
  assert.ok(report.rows.every(x=>!["ESCO-CAT-0003","ESCO-CAT-0048"].includes(x.catalogue_id)));
  assert.equal(report.rows.filter(x=>x.manufacturer_model_missing).length,300);
  assert.equal(report.supplier_pdf_distinct_model_codes,67);
  assert.equal(report.coded_references_matching_supplied_pdf_text,31);
  assert.equal(report.coded_references_not_matching_supplied_pdf_text,40);
  assert.ok(report.rows.every(x=>x.manufacturer_model_missing ? x.supplier_pdf_model_text_match===null :
    typeof x.supplier_pdf_model_text_match==="boolean"));
});
test("supplier certificates may identify candidate models but never authorise a GB sale",()=>{
  assert.equal(report.ce_annex_model_candidates,33);
  assert.equal(report.ce_annex_description_conflicts,2);
  assert.equal(report.ready_for_new_live_payment_promotions,0);
  assert.equal(report.ce_model_candidate_only_not_uk_clearance,true);
  assert.ok(report.rows.every(x=>x.iso_certificate_does_not_clear_a_specific_sku===true));
  assert.ok(report.rows.every(x=>x.mhra_registration_verified===false));
  assert.ok(report.rows.every(x=>x.product_specific_release_authorised===false));
  assert.ok(report.rows.every(x=>x.gb_regulatory_classification_verified===false));
  assert.ok(report.rows.every(x=>x.payment_status==="NOT_AUTHORISED_FOR_CARD_COLLECTION"));
  assert.ok(report.rows.every(x=>x.missing_release_gates.includes(
    "required_mhra_registration_and_uk_responsible_person_or_verified_nonapplicability")));
});
test("reconciliation flags conflicting descriptions for manual review",()=>{
  const byId=new Map(report.rows.map(x=>[x.catalogue_id,x]));
  assert.match(byId.get("ESCO-CAT-0054").certificate_description_conflict,/Instrument Tray/);
  assert.match(byId.get("ESCO-CAT-0034").certificate_description_conflict,/Mayo Table/);
  assert.ok(byId.get("ESCO-CAT-0001").supplied_ce_annex_candidate);
  assert.equal(byId.get("ESCO-CAT-0001").manufacturer_model_as_supplied,"EHF 106");
});
test("published base prices are preserved as distinct from delivered Stripe authority",()=>{
  for(const row of report.rows){
    assert.ok(row.owner_approved_base_price_ex_vat_gbp>0);
    assert.equal(row.final_uk_delivered_price_ex_vat_gbp,null);
    assert.equal(row.gb_stripe_tax_code,null);
    assert.equal(row.warehouse_allocatable_units,null);
  }
  const csv=toCsv(report);
  assert.equal(csv.trimEnd().split("\n").length,372);
  assert.match(csv,/ESCO-CAT-0373/);
  assert.doesNotMatch(csv,/sk_live_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+/);
});
