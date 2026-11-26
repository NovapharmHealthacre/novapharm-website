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
test("the first manufacturer-backed consumer listing carries exact source, image and approval evidence",()=>{
  const approved=JSON.parse(readFileSync("src/content/approved-consumer-catalogue.json","utf8"));
  const proof=JSON.parse(readFileSync("docs/retail/connective-first-live-consumer-source-evidence.json","utf8"));
  const photos=JSON.parse(readFileSync("docs/retail/connective-395-owner-photo-candidates.json","utf8"));
  assert.equal(approved.length,1);
  assert.equal(proof.gtin,"5021265243372");
  const p=approved[0],photo=photos.products.find(x=>x.gtin===p.ean);
  const ref=src.products.find(x=>x.ean===p.ean);
  const manufacturer=online.products.find(x=>x.ean===p.ean);
  assert(p.ean===proof.gtin && validGtin(p.ean));
  assert(ref && manufacturer && photo);
  assert.equal(ref.manufacturerProductUrl,proof.evidenceReferences.manufacturerProduct);
  assert.equal(manufacturer.manufacturerUrl,proof.consumerInformation.source);
  assert.equal(photo.sha256,proof.photograph.localImageSha256);
  assert.equal(p.image,photo.localImage);
  assert.equal(proof.photograph.ownerUseAuthorised,true);
  assert.equal(proof.consumerInformation.currentPhysicalUKPackLabelIndividuallyInspected,false);
  assert.equal(proof.commercial.customerPaymentOfferAdmitted,false);
  const required=["ukPack","imageRights","label","publication"];
  const evidence=Object.fromEntries(required.map(key=>[key,{
    reference:key==="imageRights"?"NovaPharm owner photographic-use authorisation":proof.evidenceReferences.manufacturerProduct,
    reviewedBy:proof.review.reviewedBy,reviewedOn:proof.review.reviewedOn,confirmed:true
  }]));
  const intake={...p,sku:"NP-CP-"+p.ean,imageSha256:photo.sha256,evidence};
  const checked=compileCatalogue([intake],".");
  assert.equal(checked.approved.length,1);
  assert.equal(checked.blocked.length,0);
  assert.deepEqual(checked.approved[0],p);
  assert.equal(compileCatalogue([{...intake,imageRightsConfirmed:false}],".").approved.length,0);
  assert.equal(compileCatalogue([{...intake,imageSha256:"bad"}],".").approved.length,0);
  for(const key of ["netMinor","grossMinor","supplierCost","retailPrice","vatBasisPoints"])
    assert(!Object.hasOwn(p,key));
  const notReady=research.products.find(x=>x.ean!==p.ean && x.manufacturerOnlineInformation);
  const candidate={...notReady,sku:notReady.sku,productClass:"food_supplement",category:"Vitamins",
    description:notReady.name,ingredients:notReady.manufacturerOnlineInformation.ingredients,
    directions:notReady.manufacturerOnlineInformation.directions,warnings:notReady.manufacturerOnlineInformation.warnings,
    image:"/assets/media/products/connective/"+notReady.ean+"/front-800.webp"};
  assert.equal(compileCatalogue([candidate],".",()=>false).approved.length,0);
});
