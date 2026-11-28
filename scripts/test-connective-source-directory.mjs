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
test('Vicks has first editorial priority without adding unapproved retail offers',()=>{
 const vicks={ean:'4030300022736',brand:'VICKS',name:'Vicks V Throat Drops Menthol',pack:'72g',
  supplierProductUrl:'https://www.connectivepharma.com/en/product/7726/vicks_v_throat_drops_sore_solid_drop_menthol_72g',
  manufacturerProductUrl:null,supplierImageUrl:'https://www.connectivepharma.com/userfiles/images/example.jpeg',
  classificationReview:'routine_class_review'};
 for(const approved of [false,true]){
  const f=fixture([p1,p2,vicks]);
  try{
   if(approved){
    f.put('products/health-and-wellbeing/index.html','<main><h1>Approved collection</h1><article class="npr-card">Approved product</article></main>');
    f.put('products/health-and-wellbeing/'+p1.ean+'/index.html','<main><h1>Approved detail</h1></main>');
    f.put('src/content/approved-consumer-catalogue.json',JSON.stringify([{ean:p1.ean}]));
   }
   f.put('assets/data/connective-owner-price-guide.json',JSON.stringify({schema:'novapharm.connective.owner-price-guide.v1',currency:'GBP',status:'OWNER_AUTHORISED_GUIDE_NOT_LIVE_PAYMENT_OFFER',entries:[{gtin:vicks.ean,guideGrossMinor:137}]}));
   for(let i=0;i<2;i++){
    const result=f.run();assert.equal(result.status,0,result.stderr);
    const html=f.read('products/health-and-wellbeing/index.html');
    assert(html.includes('Guide price £1.37'));
    assert.equal((html.match(/data-npr-vicks-spotlight/g)||[]).length,1);
    assert(html.includes('19 Vicks products')===false);
    assert(html.includes('1 Vicks products'));
    assert(html.includes('href="#brand-0"'));
    assert(html.indexOf('>VICKS</h2>')<html.indexOf('>Vitabiotics</h2>'));
    assert(!html.includes('"offers"'));
    const detail=f.read('products/health-and-wellbeing/'+vicks.ean+'/index.html');
    assert(detail.includes('data-npr-retail-sku="NP-CP-'+vicks.ean+'"'));
    assert(detail.includes('Guide price £1.37'));
    assert(detail.includes('Final price and availability confirmed before payment'));
    assert(detail.includes('name="robots" content="noindex, follow"'));
    assert(!detail.includes('Add to Bag'));
   }
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

test('nine approved Vicks consumer units preserve exact 20 percent VAT and do not include regulated products',()=>{
 const root=fileURLToPath(new URL('../',import.meta.url));
 const load=(p)=>JSON.parse(readFileSync(join(root,p),'utf8'));
 const approved=load('src/content/approved-consumer-catalogue.json');
 const source=load('src/content/connective-source-references.json');
 const owner=load('config/retail/approved-connective-checkout-release-20261126.json');
 const guide=load('assets/data/connective-owner-price-guide.json');
 const review=load('docs/retail/vicks-nine-owner-uk-retail-review-20261128.json');
 assert.equal(source.products.length,395);
 assert.equal(approved.length,65);
 assert.equal(owner.approvedGtins.length,65);
 assert.equal(review.records.length,9);
 const byId=new Map(approved.map(p=>[p.ean,p]));
 assert.equal(byId.size,65);
 assert.deepEqual([...owner.approvedGtins].sort(),[...byId.keys()].sort());
 const approvedVicks=approved.filter(p=>p.brand==='VICKS');
 assert.equal(approvedVicks.length,9);
 for(const entry of review.records){
  const p=byId.get(entry.gtin),sourceP=source.products.find(x=>x.ean===entry.gtin);
  assert(p && sourceP && sourceP.classificationReview==='routine_class_review');
  assert.equal(entry.vatBasisPoints,2000);
  assert.equal(entry.vatMinor,Math.floor((entry.netMinor*2000+5000)/10000));
  assert.equal(entry.grossMinor,entry.netMinor+entry.vatMinor);
  assert(!guide.entries.some(row=>row.gtin===entry.gtin));
  assert.equal(p.publicListingApproved,true);
  assert.equal(p.imageRightsConfirmed,true);
  assert.equal(p.identityConfirmed,true);
  assert(!p.pack.includes('24x42g'));
  for(const k of ['description','ingredients','directions','warnings'])assert(p[k]?.length>15);
  assert(existsSync(join(root,p.image.slice(1))));
  assert.equal(entry.paymentOfferAdmitted,false);
  assert.equal(entry.supplierBackedSupplyCapacityAttested,false);
 }
 for(const p of source.products.filter(p=>p.brand==='VICKS'&&p.classificationReview==='medicine_class_review')) {
  assert(!byId.has(p.ean),'Medicine or device review item entered owner-approved consumer catalogue');
 }
 assert.equal(review.records.find(r=>r.gtin==='4030300023108').consumerPack.includes('42g'),true);
 assert.equal(review.records.find(r=>r.gtin==='4030300573016').consumerPack.includes('42g'),true);
});
