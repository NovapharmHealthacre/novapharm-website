import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
const read=path=>JSON.parse(readFileSync(path,"utf8"));
test("395 owner-photography candidates match source GTINs and exactly retained SHA256 bytes",()=>{
 const audit=read("docs/retail/connective-395-owner-photo-candidates.json");
 const source=read("src/content/connective-source-references.json");
 assert.equal(audit.schema,"novapharm-connective-owner-photos-v1");
 assert.equal(audit.originalImagesVerified,802);
 assert.equal(audit.localImagesPrepared,395);
 assert.equal(audit.paymentOffersAdmitted,0);
 assert.equal(audit.products.length,395);
 const expected=new Set(source.products.map(x=>x.ean)),seen=new Set();
 for(const p of audit.products){
   assert(expected.has(p.gtin)&&!seen.has(p.gtin),"Bad or duplicate GTIN");
   seen.add(p.gtin);
   assert.equal(p.localImage,"/assets/media/products/connective/"+p.gtin+"/front-800.webp");
   const raw=readFileSync("."+p.localImage);
   assert(raw.length>12);
   assert.equal(raw.toString("ascii",0,4),"RIFF");
   assert.equal(raw.toString("ascii",8,12),"WEBP");
   assert.equal(createHash("sha256").update(raw).digest("hex"),p.sha256);
   assert.equal(p.ownerPhotoUsageAuthorised,true);
   assert.equal(p.visuallyCurrentPackVerified,false);
   assert.equal(p.mandatoryLabelConfirmed,false);
   assert.equal(p.paidCheckoutApproved,false);
   assert(!("netMinor" in p)&&!("supplierPrice" in p));
 }
 assert.equal(seen.size,395);
});