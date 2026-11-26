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
  assert(approved.length>=7, 'Original seven approved products must remain present');
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

test("next six official Vitabiotics listings have exact manufacturer source, owner-approved local photos and safety information",()=>{
 const approved=JSON.parse(readFileSync("src/content/approved-consumer-catalogue.json","utf8"));
 const evidence=JSON.parse(readFileSync("docs/retail/connective-next-six-consumer-source-evidence.json","utf8"));
 const photos=JSON.parse(readFileSync("docs/retail/connective-395-owner-photo-candidates.json","utf8"));
 assert.equal(evidence.products.length,6);
 assert(approved.length>=7, 'Original seven approved products must remain present');
 const photoBy=new Map(photos.products.map(p=>[p.gtin,p]));
 const sourceBy=new Map(src.products.map(p=>[p.ean,p]));
 const manufacturerBy=new Map(online.products.map(p=>[p.ean,p]));
 const admitted=new Set(approved.map(p=>p.ean));
 assert.equal(admitted.size,approved.length);
 for(const proof of evidence.products){
  const p=approved.find(item=>item.ean===proof.gtin);
  const photo=photoBy.get(proof.gtin),ref=sourceBy.get(proof.gtin),label=manufacturerBy.get(proof.gtin);
  assert(p&&photo&&ref&&label&&validGtin(proof.gtin));
  assert.equal(ref.manufacturerProductUrl,proof.manufacturer);
  assert.equal(proof.manufacturer,label.manufacturerUrl);
  assert.equal(proof.originalPhoto,photo.originalSource);
  assert.equal(proof.photoSha256,photo.sha256);
  assert.equal(proof.photoLocalPath,photo.localImage);
  assert.equal(p.image,photo.localImage);
  assert.equal(p.ingredients,label.ingredients);
  assert.equal(p.directions,label.directions);
  assert(p.warnings.includes(label.precautions));
  assert(p.warnings.includes(label.allergens));
  assert.equal(proof.currentPhysicalPackInspected,false);
  assert.equal(proof.checkoutReleaseSeparate,true);
  assert.equal(p.publicListingApproved,true);
  assert.equal(p.imageRightsConfirmed,true);
  assert.equal(p.identityConfirmed,true);
  for(const key of ["netMinor","grossMinor","retailPrice","vatBasisPoints","privateSupplierCost"])assert(!Object.hasOwn(p,key));
  const required=["ukPack","imageRights","label","publication"];
  const reviewed=Object.fromEntries(required.map(key=>[key,{reference:key==="imageRights"?"NovaPharm owner photographic-use authorisation":proof.manufacturer,reviewedBy:"Owner-authorised manufacturer-source review",reviewedOn:"2026-11-26",confirmed:true}]));
  const entry={...p,sku:"NP-CP-"+p.ean,imageSha256:photo.sha256,evidence:reviewed};
  const validated=compileCatalogue([entry],".");
  assert.equal(validated.approved.length,1);
  assert.equal(validated.blocked.length,0);
  assert.deepEqual(validated.approved[0],p);
 }
});

test("two source-verified Lansinoh feeding-bottle listings retain exact image and barcode evidence",()=>{
 const approved=JSON.parse(readFileSync("src/content/approved-consumer-catalogue.json","utf8"));
 const evidence=JSON.parse(readFileSync("docs/retail/connective-lansinoh-consumer-source-evidence-20261126.json","utf8"));
 const photos=JSON.parse(readFileSync("docs/retail/connective-395-owner-photo-candidates.json","utf8"));
 assert.equal(evidence.schema,"novapharm-connective-source-review-v1");
 assert.equal(evidence.products.length,2);
 assert.equal(evidence.physicalPackInspected,false);
 for(const [gtin,pack,code] of [["5060062999488","160ml",75820],["5060062999518","240ml",75840]]){
   const p=approved.find(x=>x.ean===gtin),proof=evidence.products.find(x=>x.gtin===gtin);
   const source=src.products.find(x=>x.ean===gtin),photo=photos.products.find(x=>x.gtin===gtin);
   assert(p&&proof&&source&&photo&&validGtin(gtin));
   assert.equal(proof.productCode,code);
   assert.equal(p.pack,pack);
   assert.equal(p.name,source.name);
   assert.equal(p.productClass,"consumer_non_medicinal");
   assert.equal(p.image,photo.localImage);
   assert.equal(proof.imageSha256,photo.sha256);
   assert.equal(proof.image,p.image);
   assert.equal(proof.physicalPackInspected,false);
   assert.equal(proof.ownerPhotoUseAuthorised,true);
   assert.equal(p.imageRightsConfirmed,true);
   assert.equal(p.publicListingApproved,true);
   assert.equal(p.identityConfirmed,true);
   for(const key of ["description","ingredients","directions","warnings"])assert(p[key].length>30);
   for(const key of ["netMinor","grossMinor","retailPrice","vatBasisPoints","privateSupplierCost"])assert(!Object.hasOwn(p,key));
 }
});

test("next seven Salus herbal teas and Vitabiotics food supplements have source-verified information and original approved photography",()=>{
 const approved=JSON.parse(readFileSync("src/content/approved-consumer-catalogue.json","utf8"));
 const batch=JSON.parse(readFileSync("docs/retail/connective-next-seven-consumer-source-evidence-20261126.json","utf8"));
 const photos=JSON.parse(readFileSync("docs/retail/connective-395-owner-photo-candidates.json","utf8"));
 assert.equal(batch.schema,"novapharm-connective-source-reviewed-batch-v1");
 assert.equal(batch.products.length,7);
 const expected=new Set(["5021265220076","5021265221004","5021265221509","4004148013010","4004148013041","4004148013072","4004148013119"]);
 for(const e of batch.products){
  assert(expected.delete(e.gtin));
  const p=approved.find(x=>x.ean===e.gtin),ref=src.products.find(x=>x.ean===e.gtin),photo=photos.products.find(x=>x.gtin===e.gtin);
  assert(p&&ref&&photo);
  assert.equal(p.name,ref.name);
  assert.equal(p.pack,ref.pack);
  assert.equal(p.image,photo.localImage);
  assert.equal(e.imageSha256,photo.sha256);
  assert.equal(e.image,p.image);
  assert.equal(e.photoUseAuthorised,true);
  assert.equal(e.physicalPackInspected,false);
  assert.equal(p.identityConfirmed,true);
  assert.equal(p.imageRightsConfirmed,true);
  assert.equal(p.publicListingApproved,true);
  assert(["food_supplement","consumer_non_medicinal"].includes(p.productClass));
  for(const key of ["description","ingredients","directions","warnings"])assert(p[key].length>15);
  for(const key of ["netMinor","grossMinor","retailPrice","vatBasisPoints","privateSupplierCost"])assert(!Object.hasOwn(p,key));
 }
 assert.equal(expected.size,0);
});
