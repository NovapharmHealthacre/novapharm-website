import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=JSON.parse(readFileSync('src/content/connective-source-references.json','utf8'));
const manufacturer=JSON.parse(readFileSync('src/content/connective-first-seven-manufacturer-info.json','utf8'));
const byGtin=new Map(source.products.map(p=>[p.ean,p]));
test('seven manufacturer information records reference exact public GTINs and URLs',()=>{
 assert.equal(manufacturer.products.length,7);
 assert.equal(new Set(manufacturer.products.map(p=>p.ean)).size,7);
 for(const p of manufacturer.products){
  const identity=byGtin.get(p.ean);
  assert(identity && identity.name===p.name);
  assert.equal(p.manufacturerUrl,identity.manufacturerProductUrl);
  assert.equal(p.verifiedCurrentPackLabel,false);
  assert.equal(p.retailOfferApproved,false);
  assert.equal(p.status,'manufacturer_online_reference_pack_label_match_pending');
  assert(p.manufacturerUrl.startsWith('https://www.vitabiotics.com/products/'));
  for(const k of ['ingredients','allergens','directions','precautions'])
    assert.equal(typeof p[k],'string');
 }
});
test('manufacturer information carries no invented retail offer, stock or usage rights',()=>{
 const raw=JSON.stringify(manufacturer);
 for(const token of ['retailPrice','grossMinor','netMinor','stockVerified','imageRightsConfirmed','orderingEnabled','availableQuantity'])
  assert(!raw.includes('"'+token+'"'));
 assert.equal(manufacturer.notLicenceEvidence,true);
 assert.equal(manufacturer.requiresPackReview,true);
});
test('generator retains noindex and offers no purchase buttons for source-only records',()=>{
 const s=readFileSync('scripts/generate-connective-source-directory.mjs','utf8');
 assert(s.includes('manufacturerInfo.get(p.ean)'));
 assert(s.includes('escapeHtml(label.ingredients)'));
 assert(s.includes("noindex, follow"));
 assert(!s.includes('priceApproved:true'));
});
