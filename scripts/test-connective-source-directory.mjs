import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const generator = fileURLToPath(new URL('./generate-connective-source-directory.mjs', import.meta.url));
const p1 = {ean:'4004148013010',brand:'SALUS',name:'Floradix Herb Tea Fennel',pack:'15 bags',supplierProductUrl:'https://www.connectivepharma.com/en/product/4966/floradix_herb_tea_fennel',manufacturerProductUrl:null,supplierImageUrl:'https://www.connectivepharma.com/userfiles/images/example.jpeg',classificationReview:'herbal_tea_vat_and_ingredients_review'};
const p2 = {ean:'5010058089785',brand:'Vitabiotics',name:'Pregnacare Original',pack:'30 tablets',supplierProductUrl:'https://www.vitabiotics.com/products/pregnacare-original-tablets',manufacturerProductUrl:'https://www.vitabiotics.com/products/pregnacare-original-tablets',supplierImageUrl:'https://cdn.shopify.com/s/files/1/synthetic.png',classificationReview:'routine_class_review'};
function fixture(rows=[p1,p2]) {
 const root=mkdtempSync(join(tmpdir(),'npr-connective-public-'));
 const put=(path,value)=>{const dest=join(root,path);mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,value);};
 const shell='<!doctype html><html lang="en-GB"><head><title>Products</title><meta name="description" content="Old"><meta name="robots" content="index, follow"><link rel="canonical" href="https://novapharmhealthcare.com/products/"><meta property="og:title" content="Old"><script type="application/ld+json">{"@type":"WebPage","name":"Products"}</script></head><body data-route="/products/"><header></header><main id="main"><h1>Products</h1></main><footer></footer></body></html>';
 put('products/index.html',shell);
 put('src/content/connective-source-references.json',JSON.stringify({schema:'novapharm-connective-source-references-v1',products:rows}));
 const run=()=>spawnSync(process.execPath,[generator],{cwd:root,env:{...process.env,NPR_SOURCE_TEST:'1'},encoding:'utf8'});
 return {root,put,run,read:path=>readFileSync(join(root,path),'utf8'),exists:path=>existsSync(join(root,path)),dispose:()=>rmSync(root,{recursive:true,force:true})};
}
test('395-source directory generator creates one searchable source page per GTIN, without checkout claims',()=>{
 const f=fixture();
 try{
  for(let n=0;n<2;n++){
   const out=f.run();assert.equal(out.status,0,out.stderr);
   const collection=f.read('products/health-and-wellbeing/index.html');
   assert.equal((collection.match(/class="npr-card"/g)||[]).length,2);
   assert(collection.includes('connective-collection-search.js'));
   assert(collection.includes('data-npr-collection-section'));
   for(const p of [p1,p2]){
    const html=f.read(`products/health-and-wellbeing/${p.ean}/index.html`);
    assert(html.includes(p.ean));
    assert(html.includes('name="robots" content="noindex, follow"'));
    assert.equal((html.match(/data-npr-retail-sku=/g)||[]).length,1);
    assert(html.includes('data-npr-retail-sku="NP-CP-'+p.ean+'"'));
    assert(html.includes('data-npr-order-notice'));
    assert(html.includes('/assets/js/nutraxin-retail-store.js'));
    assert(!html.includes('"offers"'));
    assert(!html.includes('availableQuantity'));
    assert(!html.includes('netMinor'));
    assert(!html.includes('href="'+p.supplierProductUrl+'"'));
    assert(!html.includes('Supplier product information'));
    assert(!html.includes('href="'+p.manufacturerProductUrl+'"'));
    assert(html.includes('href="/products/nutraxin/bag/"'));
    assert(html.includes('href="/products/health-and-wellbeing/"'));
    assert(html.includes('Full ingredients, directions, warnings'));
   }
   assert.equal((f.read('products/index.html').match(/data-npr-source-collection/g)||[]).length,1);
  }
 }finally{f.dispose();}
});
test('owner-authorised guide prices do not activate checkout or offer schema',()=>{
 const f=fixture();
 try{
  f.put('assets/data/connective-owner-price-guide.json',JSON.stringify({
   schema:'novapharm.connective.owner-price-guide.v1',currency:'GBP',
   status:'OWNER_AUTHORISED_GUIDE_NOT_LIVE_PAYMENT_OFFER',
   entries:[{gtin:p2.ean,guideGrossMinor:1199}]}));
  const out=f.run();assert.equal(out.status,0,out.stderr);
  const html=f.read('products/health-and-wellbeing/'+p2.ean+'/index.html');
  const collection=f.read('products/health-and-wellbeing/index.html');
  assert(html.includes('Guide price £11.99'));
  assert(collection.includes('Guide price £11.99'));
  assert(!f.read('products/health-and-wellbeing/'+p1.ean+'/index.html').includes('Guide price'));
  assert(!html.includes('"offers"'));
  assert(!html.includes('Add to Bag'));
  assert(html.includes('data-npr-order-notice'));
  assert(html.includes('data-npr-retail-sku="NP-CP-'+p2.ean+'"'));
 }finally{f.dispose();}
});
test('guide register rejects unknown GTINs, duplicate entries and medicine offers',()=>{
 for(const entries of [
  [{gtin:'4004148013011',guideGrossMinor:100}],
  [{gtin:p2.ean,guideGrossMinor:120},{gtin:p2.ean,guideGrossMinor:121}],
  [{gtin:p1.ean,guideGrossMinor:-1}]
 ]){
  const f=fixture();
  try{
   f.put('assets/data/connective-owner-price-guide.json',JSON.stringify({
    schema:'novapharm.connective.owner-price-guide.v1',currency:'GBP',
    status:'OWNER_AUTHORISED_GUIDE_NOT_LIVE_PAYMENT_OFFER',entries}));
   const out=f.run();assert.notEqual(out.status,0);
  }finally{f.dispose();}
 }
});
test('new manufacturer-online references enrich only matching browse-only pages without enabling payment',()=>{
 const f=fixture();
 try{
  f.put('src/content/connective-two-manufacturer-online-details-20261127.json',JSON.stringify({
    schema:'novapharm-connective-manufacturer-online-reference-v1',
    notLicenceEvidence:true,requiresPackReview:true,
    products:[{ean:p2.ean,name:p2.name,manufacturerUrl:p2.manufacturerProductUrl,
      ingredients:'Manufacturer listed ingredients, not certified pack label.',
      allergens:'Manufacturer identifies a food allergen. Check product packaging.',
      directions:'Take only the recommended intake with the main meal.',
      precautions:'Food supplements are not a substitute for varied diets.',
      sourceCheckedOn:'2026-11-27',
      status:'manufacturer_online_reference_pack_label_match_pending',
      verifiedCurrentPackLabel:false,retailOfferApproved:false}]
  }));
  const out=f.run();assert.equal(out.status,0,out.stderr);
  const html=f.read('products/health-and-wellbeing/'+p2.ean+'/index.html');
  assert(html.includes('Manufacturer information'));
  assert(html.includes('Manufacturer identifies a food allergen'));
  assert(html.includes('current UK pack label is not yet certified'));
  assert(html.includes('name="robots" content="noindex, follow"'));
  assert(!html.includes('"offers"'));assert(!html.includes('Add to Bag'));
  assert(html.includes('data-npr-retail-sku="NP-CP-'+p2.ean+'"'));
 }finally{f.dispose();}
});
test('unapproved manufacturer-online references are rejected if identity is wrong or payment-approval is falsely asserted',()=>{
 const records=[
  {ean:'4004148013011',name:p2.name,manufacturerUrl:p2.manufacturerProductUrl},
  {ean:p2.ean,name:'Other product',manufacturerUrl:p2.manufacturerProductUrl},
  {ean:p2.ean,name:p2.name,manufacturerUrl:'https://example.com/other-product'},
  {ean:p2.ean,name:p2.name,manufacturerUrl:p2.manufacturerProductUrl,retailOfferApproved:true}
 ];
 for(const changed of records){
  const f=fixture();
  try{
   f.put('src/content/connective-two-manufacturer-online-details-20261127.json',JSON.stringify({
     schema:'novapharm-connective-manufacturer-online-reference-v1',
     notLicenceEvidence:true,requiresPackReview:true,
     products:[{ean:p2.ean,name:p2.name,manufacturerUrl:p2.manufacturerProductUrl,
       ingredients:'Manufacturer listed ingredients, not certified pack label.',
       allergens:'Manufacturer identifies a food allergen. Check product packaging.',
       directions:'Take only the recommended intake with the main meal.',
       precautions:'Food supplements are not a substitute for varied diets.',
       status:'manufacturer_online_reference_pack_label_match_pending',
       verifiedCurrentPackLabel:false,retailOfferApproved:false,...changed}]
   }));
   const out=f.run();assert.notEqual(out.status,0);
  }finally{f.dispose();}
 }
});
test('approved catalogue pages and checkout remain authoritative during partial activation',()=>{
 const f=fixture();
 try{
  const detail='products/health-and-wellbeing/'+p1.ean+'/index.html';
  const approvedHtml='<main><h1>Approved detail</h1><div data-npr-retail-sku="NP-CP-'+p1.ean+'">Approved checkout</div></main>';
  f.put(detail,approvedHtml);
  f.put('products/health-and-wellbeing/index.html','<main><h1>Approved collection</h1><article class="npr-card">Approved product</article><script type="module" src="/assets/js/nutraxin-retail-store.js"></script></main>');
  f.put('src/content/approved-consumer-catalogue.json',JSON.stringify([{ean:p1.ean}]));
  for(let i=0;i<2;i++){
   const result=f.run();assert.equal(result.status,0,result.stderr);
   assert.equal(f.read(detail),approvedHtml);
   const collection=f.read('products/health-and-wellbeing/index.html');
   assert.equal((collection.match(/class="npr-card"/g)||[]).length,2);
   assert.equal((collection.match(/data-npr-additional-reference/g)||[]).length,1);
   assert(collection.includes('nutraxin-retail-store.js'));
   const remaining=f.read('products/health-and-wellbeing/'+p2.ean+'/index.html');
   assert.equal((remaining.match(/data-npr-retail-sku=/g)||[]).length,1);
   assert(remaining.includes('data-npr-retail-sku="NP-CP-'+p2.ean+'"'));
   assert(remaining.includes('data-npr-order-notice'));
   assert(remaining.includes('/assets/js/nutraxin-retail-store.js'));
   assert(!remaining.includes('"offers"'));
   assert(!remaining.includes('href="'+p2.supplierProductUrl+'"'));
  }
 }finally{f.dispose();}
});
test('source catalogue rejects unsafe external links and invalid GTIN rather than publishing them',()=>{
 for(const changed of [{ean:'4004148013011'},{supplierProductUrl:'https://evil.example/product'},{supplierImageUrl:'http://www.connectivepharma.com/pic.png'}]){
  const f=fixture([{...p1,...changed}]);
  try{const result=f.run();assert.notEqual(result.status,0,result.stdout);assert(!f.exists('products/health-and-wellbeing/index.html'));}finally{f.dispose();}
 }
});
