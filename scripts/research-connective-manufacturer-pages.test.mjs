import test from 'node:test';
import assert from 'node:assert/strict';
import {safeManufacturer,extractPublicCandidate,assessRecord,research} from './research-connective-manufacturer-pages.mjs';

test('only real official HTTPS manufacturer hosts are allowed',()=>{
  assert(safeManufacturer('https://www.vitabiotics.com/products/example'));
  assert(safeManufacturer('https://www.sebamed.co.uk/products/example'));
  for(const url of ['http://www.vitabiotics.com/product','https://vitabiotics.com.evil.example/a','https://localhost/a','file:///etc/passwd','https://user:pw@www.sebamed.co.uk/a'])
    assert.equal(safeManufacturer(url),null);
});
test('label extraction is source candidate, not payment approval',()=>{
  const x=extractPublicCandidate('<h1>Sample Cream 50ml</h1><h2>Ingredients</h2><p>Water, Glycerin, Niacinamide and Panthenol.</p><h2>Directions for Use</h2><p>Apply to cleansed face morning and evening.</p><p>Stop if irritation occurs.</p>');
  assert.equal(x.ingredients,'Water, Glycerin, Niacinamide and Panthenol.');
  assert.equal(x.directions,'Apply to cleansed face morning and evening. Stop if irritation occurs.');
  const y=assessRecord({ean:'4103040003188',name:'Cream',pack:'50ml',classificationReview:'routine_class_review'},x,'https://www.sebamed.co.uk/a',200);
  assert.equal(y.review,'HUMAN_LABEL_REVIEW_REQUIRED');
  assert.equal(y.customerPaymentOfferAdmitted,false);
});
test('pack mismatches and medicines remain held',()=>{
  const x=extractPublicCandidate('<h1>Baby Wash 200ml</h1><h2>Ingredients</h2><p>Aqua, Glycerin, Coco Glucoside.</p><h2>Directions</h2><p>Apply to wet skin.</p><h2>Warnings</h2><p>Avoid eye contact.</p>');
  assert.equal(assessRecord({ean:'123',pack:'1L',classificationReview:'routine_class_review'},x,'https://sebamed.co.uk/a',200).review,'PACK_MISMATCH_HOLD');
  assert.equal(assessRecord({ean:'456',classificationReview:'medicine_class_review'},x,'https://vicks.co.uk/a',200).review,'REGULATED_HOLD');
});
test('395 rows remain research-only and no network needed for empty manufacturer links',async()=>{
  const source={schema:'novapharm-connective-source-references-v1',products:Array.from({length:395},(_,i)=>({ean:String(i),manufacturerProductUrl:null,classificationReview:'routine_class_review'}))};
  const r=await research(source,()=>{throw Error('network should not be used')});
  assert.equal(r.total,395);assert.equal(r.products[0].review,'MANUFACTURER_LINK_MISSING_OR_NOT_ALLOWLISTED');
});
