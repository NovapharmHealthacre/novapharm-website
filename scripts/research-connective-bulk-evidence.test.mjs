import test from 'node:test';
import assert from 'node:assert/strict';
import {safeSupplier,discoverLinks,hasExactGtin,pool,buildReview} from './research-connective-bulk-evidence.mjs';
test('supplier URLs are restricted to exact HTTPS product routes',()=>{
  assert(safeSupplier('https://www.connectivepharma.com/en/product/123/name'));
  for(const u of ['http://connectivepharma.com/en/product/1/x','https://connectivepharma.com.evil.test/en/product/1/x','https://connectivepharma.com/admin','https://user@connectivepharma.com/en/product/1/x'])assert.equal(safeSupplier(u),null);
});
test('manufacturer links are allowlisted, deduplicated and not approved',()=>{
  const html='<a href="https://www.vitabiotics.com/products/a?x=1">A</a><a href="https://www.vitabiotics.com/products/a">A</a><a href="https://evil.test/product">B</a>';
  assert.deepEqual(discoverLinks(html,'https://www.connectivepharma.com/en/product/1/a'),['https://www.vitabiotics.com/products/a']);
  assert(hasExactGtin('EAN: 5021265243372','5021265243372'));
  assert(!hasExactGtin('15021265243372','5021265243372'));
});
test('bounded pool preserves input order',async()=>{
  let active=0,peak=0;
  const r=await pool([0,1,2,3,4,5],async x=>{peak=Math.max(peak,++active);await new Promise(r=>setTimeout(r,1));active--;return x*2;},3);
  assert.deepEqual(r,[0,2,4,6,8,10]);assert(peak<=3);
});
test('395-row reconciliation never admits new payments and holds medicines',async()=>{
  const products=Array.from({length:395},(_,i)=>({ean:String(1000000000000+i),name:'Product',brand:'Brand',pack:'30 Tablets',classificationReview:i===1?'medicine_class_review':'routine_class_review',supplierProductUrl:'https://www.connectivepharma.com/en/product/1/a'}));
  products[2].supplierProductUrl='https://www.vitabiotics.com/products/a';
  products[2].manufacturerProductUrl='https://www.vitabiotics.com/products/a';
  const source={schema:'novapharm-connective-source-references-v1',products};
  const manifest={approvedGtins:[products[0].ean]};
  const catalogue=[{ean:products[0].ean}];
  let calls=0;
  const request=async u=>{calls++;return {url:u,html:'<h1>Product</h1><a href="https://www.vitabiotics.com/products/a">Source</a><h2>Ingredients</h2><p>Example ingredients</p><h2>Directions</h2><p>Example directions</p><h2>Warnings</h2><p>Example warnings</p>'};};
  const result=await buildReview(source,manifest,catalogue,request);
  assert.equal(result.total,395);assert.equal(result.manifestApproved,1);
  assert.equal(result.records[0].review,'EXISTING_MANIFEST_APPROVAL');
  assert.equal(result.records[1].review,'REGULATED_HOLD');
  assert.equal(result.records[2].review,'MANUFACTURER_LABEL_CANDIDATE_REVIEW');
  assert.equal(result.records[2].supplierError,null);
  assert.equal(result.records[2].manufacturerCandidates.length,1);
  assert(result.records.every(r=>!r.paymentAdmissionAuthorized));
  assert(result.records.slice(1).every(r=>!r.publicationApproved));
  assert.equal(calls,785);
  await assert.rejects(buildReview(source,manifest,[],request));
});
