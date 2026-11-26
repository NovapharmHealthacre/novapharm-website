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
    assert(html.includes('data-npr-retail-sku="NP-CP-'+p.ean+'"'));
    assert(html.includes('data-npr-order-notice'));
    assert(html.includes('/assets/js/nutraxin-retail-store.js'));
    assert(!html.includes('"offers"'));
    assert(!html.includes('availableQuantity'));
    assert(!html.includes('netMinor'));
    assert(html.includes(p.supplierProductUrl));
    assert(html.includes('Full ingredients, directions, warnings'));
   }
   assert.equal((f.read('products/index.html').match(/data-npr-source-collection/g)||[]).length,1);
  }
 }finally{f.dispose();}
});
test('approved catalogue is authoritative: reference generator never overwrites approved product pages',()=>{
 const f=fixture();
 try{
  const result=f.run();assert.equal(result.status,0,result.stderr);
  const before=f.read(`products/health-and-wellbeing/${p1.ean}/index.html`);
  f.put('src/content/approved-consumer-catalogue.json','[]');
  const stillSource=f.run();assert.equal(stillSource.status,0,stillSource.stderr);
  assert(f.exists('products/health-and-wellbeing/index.html'));
  assert.equal(f.read(`products/health-and-wellbeing/${p1.ean}/index.html`),before);
  // Only a populated approved catalogue may suppress source fallbacks.
  f.put('src/content/approved-consumer-catalogue.json',JSON.stringify([{ean:p1.ean}]));
  const skipped=f.run();assert.equal(skipped.status,0,skipped.stderr);
  assert.equal(f.read(`products/health-and-wellbeing/${p1.ean}/index.html`),before);
 }finally{f.dispose();}
});
test('source catalogue rejects unsafe external links and invalid GTIN rather than publishing them',()=>{
 for(const changed of [{ean:'4004148013011'},{supplierProductUrl:'https://evil.example/product'},{supplierImageUrl:'http://www.connectivepharma.com/pic.png'}]){
  const f=fixture([{...p1,...changed}]);
  try{const result=f.run();assert.notEqual(result.status,0,result.stdout);assert(!f.exists('products/health-and-wellbeing/index.html'));}finally{f.dispose();}
 }
});
