import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {compileCatalogue} from "./compile-connective-approved-catalogue.mjs";
import {validGtin} from "../src/core/multibrand-retail.mjs";
const src=JSON.parse(readFileSync("src/content/connective-source-references.json","utf8"));
const online=JSON.parse(readFileSync("src/content/connective-first-seven-manufacturer-info.json","utf8"));
const research=JSON.parse(readFileSync("src/content/connective-consumer-research.json","utf8"));
test("395 source-linked researched products and seven manufacturer descriptions",()=>{
  assert.equal(src.products.length,395);
  assert.equal(research.total,395);
  assert.equal(research.products.length,395);
  assert.equal(research.products.filter(p=>p.manufacturerOnlineInformation).length,7);
  assert.equal(new Set(research.products.map(p=>p.ean)).size,395);
  const byId=new Map(src.products.map(p=>[p.ean,p]));
  const manufacturer=new Map(online.products.map(p=>[p.ean,p]));
  for(const p of research.products){
    const ref=byId.get(p.ean);
    assert(ref&&validGtin(p.ean)&&p.sku==="NP-CP-"+p.ean);
    assert.equal(p.supplierUrl,ref.supplierProductUrl);
    assert.equal(p.imageReferenceUrl,ref.supplierImageUrl||null);
    assert.equal(p.brand,ref.brand);assert.equal(p.name,ref.name);assert.equal(p.pack,ref.pack);
    for(const key of ["verifiedCurrentPack","imageReusePermissionVerified","fullOnlineLabelVerified","retailListingApproved","paymentOfferAdmitted"])assert.equal(p[key],false);
    assert(!Object.hasOwn(p,"netMinor")&&!Object.hasOwn(p,"grossMinor")&&!Object.hasOwn(p,"privateSupplierCost"));
    if(manufacturer.has(p.ean)) {
      assert.equal(p.manufacturerOnlineInformation.ingredients,manufacturer.get(p.ean).ingredients);
      assert.equal(p.manufacturerOnlineInformation.directions,manufacturer.get(p.ean).directions);
    } else assert.equal(p.manufacturerOnlineInformation,null);
  }
  assert.equal(research.products.filter(p=>p.productClassReview==="medicine_review").length,10);
  assert.equal(research.officialManufacturerProductPageCandidates,106);
  assert.equal(research.manufacturerFamilyPackUnresolved,18);
  assert.equal(research.relatedProductsNotSkuMatch,2);
  assert.equal(research.supplierOnlyReferences,269);
  assert.equal(research.products.filter(p=>p.manufacturerResearchUrl?.startsWith("https://")).length,126);
});
test("the approved list starts empty and cannot acquire falsely verified products",()=>{
  const approved=JSON.parse(readFileSync("src/content/approved-consumer-catalogue.json","utf8"));
  assert.deepEqual(approved,[]);
  const p=research.products.find(x=>x.manufacturerOnlineInformation);
  const candidate={...p,sku:p.sku,productClass:"food_supplement",category:"Vitamins",description:p.name,ingredients:p.manufacturerOnlineInformation.ingredients,directions:p.manufacturerOnlineInformation.directions,warnings:p.manufacturerOnlineInformation.warnings,image:"/assets/media/products/connective/"+p.ean+"/front-800.webp"};
  const check=compileCatalogue([candidate],".",()=>false);
  assert.equal(check.approved.length,0);
  assert(check.blocked[0].reasons.includes("imageRightsConfirmed"));
});
