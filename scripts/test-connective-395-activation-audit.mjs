import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const m=JSON.parse(readFileSync('docs/retail/connective-395-activation-audit-20261126.json','utf8'));
const research=JSON.parse(readFileSync('src/content/connective-consumer-research.json','utf8'));
const approved=JSON.parse(readFileSync('src/content/approved-consumer-catalogue.json','utf8'));
test('complete source and unique barcode reconciliation',()=>{
 assert.equal(m.products.length,395);assert.equal(research.products.length,395);
 assert.equal(new Set(m.products.map(x=>x.gtin)).size,395);
 assert.deepEqual(new Set(m.products.map(x=>x.gtin)),new Set(research.products.map(x=>x.ean)));
 assert.equal(m.counts.publicCatalogue,16); assert.equal(approved.length,16);
});
test('unadmitted products remain on hold, including regulated products',()=>{
 const count=state=>m.products.filter(p=>p.readiness===state).length;
 assert.equal(count('APPROVED_LEDGER_OFFER'),7);
 assert.equal(count('STAGED_NOT_CHARGEABLE'),9);
 assert.equal(count('REGULATED_MEDICINE_OR_DEVICE_REVIEW'),10);
 assert.equal(count('VAT_OR_PRICE_REVIEW'),1);
 assert.equal(count('HERBAL_MANUFACTURER_RESEARCHED_NOT_ACTIVE'),11);
 assert.equal(count('RESEARCH_PENDING_NO_PAYMENT'),357);
 assert.equal(m.products.filter(x=>x.priceCandidateGrossPence>0).length,384);
 assert.equal(m.products.filter(x=>x.priceCandidateGrossPence===null).length,11);
 for(const p of m.products.filter(x=>x.productClassReview==='medicine_review'))
   assert.equal(p.readiness,'REGULATED_MEDICINE_OR_DEVICE_REVIEW');
 for(const p of m.products.filter(x=>x.readiness==='STAGED_NOT_CHARGEABLE'))
   assert(approved.some(a=>a.ean===p.gtin));
 for(const p of m.products)
   assert(!Object.hasOwn(p,'privateSupplierCost')&&!Object.hasOwn(p,'supplierCost'));
});

test('every regulated Vicks SKU has an independent non-payment review',()=>{
 const review=JSON.parse(readFileSync('docs/retail/connective-vicks-ten-regulatory-review-20261126.json','utf8'));
 assert.equal(review.products.length,10);
 const ids=new Set(review.products.map(x=>x.gtin));
 assert.equal(ids.size,10);
 const medicines=new Set(m.products.filter(x=>x.readiness==='REGULATED_MEDICINE_OR_DEVICE_REVIEW').map(x=>x.gtin));
 assert.deepEqual(ids,medicines);
 for(const item of review.products){
  assert.equal(item.saleAuthorised,false);
  assert.equal(item.checkoutAdmitted,false);
  assert.equal(item.exactCurrentPackVerified,false);
  assert(item.evidence.startsWith('https://www.vicks.co.uk/'));
 }
});

test('eleven Salus tea candidates have matching official manufacturer research but no payment approval',()=>{
 const e=JSON.parse(readFileSync('docs/retail/connective-eleven-salus-manufacturer-evidence-20261126.json','utf8'));
 assert.equal(e.products.length,11);
 for(const p of e.products){
   const r=m.products.find(x=>x.gtin===p.gtin);
   assert(r&&r.readiness==='HERBAL_MANUFACTURER_RESEARCHED_NOT_ACTIVE');
   assert.equal(p.provisionalPricePence,165);
   assert.equal(p.paymentEnabled,false);
   assert.equal(p.currentPackInspected,false);
   assert.equal(p.manufacturerGTINIndependentlyVerified,false);
   assert(p.manufacturerPage.startsWith('https://floradix.co.uk/product/'));
 }
});
