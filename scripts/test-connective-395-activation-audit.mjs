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
 assert.equal(count('VAT_OR_PRICE_REVIEW'),12);
 assert.equal(count('RESEARCH_PENDING_NO_PAYMENT'),357);
 assert.equal(m.products.filter(x=>x.priceCandidateGrossPence>0).length,373);
 assert.equal(m.products.filter(x=>x.priceCandidateGrossPence===null).length,22);
 for(const p of m.products.filter(x=>x.productClassReview==='medicine_review'))
   assert.equal(p.readiness,'REGULATED_MEDICINE_OR_DEVICE_REVIEW');
 for(const p of m.products.filter(x=>x.readiness==='STAGED_NOT_CHARGEABLE'))
   assert(approved.some(a=>a.ean===p.gtin));
 for(const p of m.products)
   assert(!Object.hasOwn(p,'privateSupplierCost')&&!Object.hasOwn(p,'supplierCost'));
});
