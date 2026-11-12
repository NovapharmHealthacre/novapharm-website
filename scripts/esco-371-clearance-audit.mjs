// ESCO source-backed clearance audit, not a payment approval or regulatory certification.
// Scope: 371 references excluded from the last verified private AWS SSM baseline.
// Source PDFs received from Eastern Surgical Company in September 2026:
// CE certificate RSBV-2406-7563 annexures 1-3; ISO 13485 IN260122006 annexure 1.
// Annex matches are *candidate evidence* only. No UK MHRA / UKRP / tax verification.
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {guideFor} from "./esco-merchandising.mjs";

const CERTIFICATE = "RSBV-2406-7563";
const ISO_CERTIFICATE = "IN260122006";
const SNAPSHOT_APPROVED = new Set(["ESCO-CAT-0003","ESCO-CAT-0048"]);
const annexes = {
  "CE_ANNEX_1": "EHF 115,EHF 128,EHF 139,EHF 140F,EHF 135,EHF 141K,EHF 142,EHF 136,EHF 137,EHF 138,EHF 140P,EHF 152,EHF 140S,ESS 019,ESS 015,ESS 025,ESS 009,ESS 003,ESS 004,ESS 005,ESS 020,ESS 021,EHD 6R,EHD 6D,EHD 085,EHD 086,EHD 082,EHD 087,EHD 092,EHD 088,EHD 084,EHD 095",
  "CE_ANNEX_2": "EHF 106,EHF 105,EHF 113P,EHF 101,EHF 102,EHF 110",
  "CE_ANNEX_3": "EHF 178S,EHF 179,EHF 150,EHF 170,EHF 171,EHF 162,EHF 146,EHF 163,ESS 049,EHF 157,EHF 143,EHF 124,EHF 158,EHF 160,EHF 104,EHF 133,EHF 153,EHF 154,EHF 156,EHF 149,EHF 119,ESL 029,ESL 024,ESL 152"
};
const normalize = value => String(value || "").trim().toUpperCase().replace(/\s+/g," ");
// Extracted exact model-code text from the original 42-page "Product Catalogue.pdf".
// Code absence from selectable PDF text is a review prompt, not proof that a product does not exist.
const productPdfTextModels = new Set("EHD 082,EHD 084,EHD 086,EHD 087,EHD 088,EHD 089,EHD 089R,EHD 091,EHD 092,EHD 096,EHD 097,EHF 101,EHF 102,EHF 104,EHF 105,EHF 106,EHF 110,EHF 113,EHF 113P,EHF 115,EHF 124,EHF 128,EHF 133,EHF 135,EHF 136,EHF 138,EHF 139,EHF 140F,EHF 141K,EHF 142,EHF 143,EHF 146,EHF 149,EHF 149D,EHF 150,EHF 152,EHF 153,EHF 156,EHF 157,EHF 160,EHF 171,EHF 178S,EHF 179,ELP 110,ELP 111,ELP 112,ESE 1113,ESE 1120,ESE 1121,ESE 156,ESL 011,ESL 013,ESL 014,ESL 024,ESL 029,ESL 100,ESL 152,ESL 154,ESS 003,ESS 005,ESS 008,ESS 015,ESS 019,ESS 020,ESS 025,ESS 049,ESS 109".split(",").map(normalize));
const certificateModels = new Map(Object.entries(annexes).flatMap(([annex,values]) =>
  values.split(",").map(model => [normalize(model),annex])));
const descriptionConflicts = new Map([
  ["ESCO-CAT-0054","ESS 004 is listed as Instrument Tray in the CE annex, not Sharps Containers"],
  ["ESCO-CAT-0034","EHF 158 is listed as Mayo Table in the CE annex, not Overbed Table"]
]);
const EMPTY_GATES = Object.freeze([
 "exact_saleable_variant_and_configuration",
 "manufacturer_supply_rights_for_uk",
 "verified_available_to_promise_inventory",
 "confirmed_gb_delivery_and_lead_time",
 "final_gb_delivered_gbp_price",
 "verified_gb_tax_treatment_and_stripe_tax_code",
 "product_specific_gb_regulatory_classification",
 "required_mhra_registration_and_uk_responsible_person_or_verified_nonapplicability",
 "required_conformity_and_safety_evidence",
 "item_level_merchant_signoff_and_cost_risk_record"
]);
export function buildEsco371Audit(catalogue=JSON.parse(readFileSync(resolve("assets/data/esco-catalogue.json"),"utf8"))) {
  if(catalogue.entriesTotal!==373 || catalogue.modelCodedEntries!==73 || catalogue.categories?.length!==12)
    throw Error("ESCO catalogue source changed; reconcile against private AWS policy before proceeding");
  const all=catalogue.categories.flatMap(category=>category.entries.map(item=>({...item,category:category.name})));
  if(all.length!==373 || new Set(all.map(p=>p.id)).size!==373)throw Error("ESCO catalogue identities not unique");
  const rows=all.filter(item=>!SNAPSHOT_APPROVED.has(item.id)).map(item=>{
    const annex=certificateModels.get(normalize(item.model))||null;
    const conflict=descriptionConflicts.get(item.id)||null;
    const base=guideFor(item).guidePriceExVatGbp;
    if(!Number.isFinite(base)||base<=0)throw Error("Approved base price missing for "+item.id);
    return {
      catalogue_id:item.id,
      internal_novapharm_sku:"NP-ESCO-"+item.id.slice(-4),
      product:item.name,
      category:item.category,
      subcategory:item.subcategory,
      catalogue_page:item.sourceIndexPage,
      manufacturer_model_as_supplied:item.model||null,
      manufacturer_model_missing:!item.model,
      supplier_pdf_model_text_match:item.model ? productPdfTextModels.has(normalize(item.model)) : null,
      supplier_pdf_model_text_basis:item.model ? (productPdfTextModels.has(normalize(item.model)) ?
        "FOUND_IN_SUPPLIED_CATALOGUE_PDF_TEXT" : "NOT_FOUND_IN_SUPPLIED_CATALOGUE_PDF_TEXT") : "NO_MODEL_TO_MATCH",
      owner_approved_base_price_ex_vat_gbp:base,
      owner_approved_base_price_source:"ESCO_WEBSITE_BASE_2026_11_09",
      supplied_ce_certificate_candidate:annex?CERTIFICATE:null,
      supplied_ce_annex_candidate:annex,
      certificate_description_conflict:conflict,
      ce_document_model_match_only:!!annex&&!conflict,
      iso_13485_manufacturing_document:ISO_CERTIFICATE,
      iso_certificate_does_not_clear_a_specific_sku:true,
      mhra_registration_verified:false,
      gb_regulatory_classification_verified:false,
      uk_responsible_person_verified:false,
      final_uk_delivered_price_ex_vat_gbp:null,
      gb_stripe_tax_code:null,
      warehouse_allocatable_units:null,
      manufacturer_supply_rights_verified:false,
      physical_specification_verified:false,
      product_specific_release_authorised:false,
      missing_release_gates:[...EMPTY_GATES],
      payment_status:"NOT_AUTHORISED_FOR_CARD_COLLECTION",
      review_queue:!item.model?"SUPPLIER_MODEL_AND_VARIANT":
        conflict?"DOCUMENT_DESCRIPTION_CONFLICT":
        annex?"ANNEX_CANDIDATE_FOR_REGULATORY_REVIEW":"MODEL_PRESENT_REGULATORY_EVIDENCE_NOT_MATCHED"
    };
  });
  if(rows.length!==371 || rows.filter(r=>r.manufacturer_model_missing).length!==300)
    throw Error("371 unapproved references or 300 missing models no longer match reviewed baseline");
  const matched=rows.filter(r=>r.supplied_ce_annex_candidate);
  const conflicts=rows.filter(r=>r.certificate_description_conflict);
  const summary={
    schema:"novapharm-esco-371-clearance-audit-v1",
    generated_from:"assets/data/esco-catalogue.json + scripts/esco-merchandising.mjs",
    as_of:"2026-11-12",
    last_checked_private_aws_policy_version:4,
    policy_must_be_rechecked_before_promotion:true,
    total_catalogue:373,
    current_known_approved:2,
    unapproved_audited:371,
    missing_manufacturer_model:300,
    supplier_pdf_distinct_model_codes:productPdfTextModels.size,
    coded_references_matching_supplied_pdf_text:rows.filter(r=>r.supplier_pdf_model_text_match===true).length,
    coded_references_not_matching_supplied_pdf_text:rows.filter(r=>r.supplier_pdf_model_text_match===false).length,
    ce_annex_model_candidates:matched.length,
    ce_annex_description_conflicts:conflicts.length,
    ce_model_candidate_only_not_uk_clearance:true,
    ready_for_new_live_payment_promotions:0,
    source_document_references:[CERTIFICATE,ISO_CERTIFICATE],
    merchant_base_approval_does_not_include_freight_or_tax:true,
    rows
  };
  if(matched.length!==33 || conflicts.length!==2 || productPdfTextModels.size!==67 ||
     summary.coded_references_matching_supplied_pdf_text!==31 ||
     summary.coded_references_not_matching_supplied_pdf_text!==40)
    throw Error("Source PDF text/model reconciliation requires review");
  return summary;
}
function csvCell(value) {
  let str=Array.isArray(value)?value.join("; "):String(value??"");
  if(/^\s*[=+@]/.test(str) || /^\s*-(?!\d)/.test(str))str="'"+str;
  return '"'+str.replaceAll('"','""').replace(/[\r\n]+/g," ")+'"';
}
export function toCsv(report) {
  const columns=[
    "catalogue_id","internal_novapharm_sku","product","category",
    "manufacturer_model_as_supplied","manufacturer_model_missing","supplier_pdf_model_text_match","supplier_pdf_model_text_basis","owner_approved_base_price_ex_vat_gbp",
    "supplied_ce_certificate_candidate","supplied_ce_annex_candidate","certificate_description_conflict",
    "review_queue","mhra_registration_verified","gb_regulatory_classification_verified",
    "final_uk_delivered_price_ex_vat_gbp","gb_stripe_tax_code","warehouse_allocatable_units",
    "manufacturer_supply_rights_verified","missing_release_gates","payment_status"
  ];
  return [columns.map(csvCell).join(","),...report.rows.map(r=>
    columns.map(col=>csvCell(r[col])).join(","))].join("\n")+"\n";
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const report=buildEsco371Audit();
  const root=resolve(process.env.ESCO_371_AUDIT_DIR||"docs/commerce");
  mkdirSync(root,{recursive:true});
  writeFileSync(resolve(root,"esco-371-clearance-audit.json"),JSON.stringify(report,null,2)+"\n","utf8");
  writeFileSync(resolve(root,"esco-371-clearance-audit.csv"),toCsv(report),"utf8");
  console.log("ESCO clearance audited "+report.unapproved_audited+" references, 0 payment approvals. "+
    report.missing_manufacturer_model+" missing supplier models, "+
    report.ce_annex_model_candidates+" CE annex model candidates including "+
    report.ce_annex_description_conflicts+" description conflicts.");
}