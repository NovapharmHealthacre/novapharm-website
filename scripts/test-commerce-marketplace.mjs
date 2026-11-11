import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=(path)=>readFileSync(path,'utf8');
test('governed unified public catalogue contains exactly 392 unique products',()=>{
 const data=JSON.parse(read('assets/data/commerce-marketplace.json'));
 assert.equal(data.schema,'novapharm-public-merchant-discovery-v1');
 assert.equal(data.sourceProductCount,392);assert.equal(data.products.length,392);
 assert.equal(data.products.filter(p=>p.brand==='Nutraxin').length,19);
 assert.equal(data.products.filter(p=>p.brand==='ESCO').length,373);
 assert.equal(new Set(data.products.map(p=>p.id)).size,392);
 assert.equal(new Set(data.products.map(p=>p.sku)).size,392);
 assert.equal(data.notPaymentAuthority,true);
});
test('public search does not expose merchant internal stock declarations or payment authority',()=>{
 const data=JSON.parse(read('assets/data/commerce-marketplace.json'));
 assert(data.products.every(p=>p.availabilityQuantity===null&&p.cardCheckoutAuthority===false));
 assert(data.products.every(p=>!('ownerDeclaredQuantity' in p)&&!('supplierCost' in p)&&!('paymentSecret' in p)));
 assert(data.products.every(p=>p.stockStatus==='warehouse_reconciliation_pending'));
});
test('separate, accurate retail and ESCO guide price representations',()=>{
 const data=JSON.parse(read('assets/data/commerce-marketplace.json'));
 const retail=JSON.parse(read('assets/data/nutraxin-retail-catalogue.json'));
 const indexed=new Map(retail.products.map(p=>[p.sku,p.retail_price_pence]));
 for(const row of data.products){
   assert(row.priceMinor>0&&Number.isSafeInteger(row.priceMinor));
   if(row.brand==='Nutraxin'){assert.equal(row.priceMinor,indexed.get(row.sku));assert.match(row.priceBasis,/including estimated VAT/);}
   else {assert.match(row.priceBasis,/ex VAT and delivery/);assert.equal(row.priceVerification,'guide_price_only');}
 }
});
test('Apple-style public marketplace route is built and linked from products page',()=>{
 const html=read('products/marketplace/index.html'),products=read('products/index.html');
 assert.match(html,/<h1>Everything, together\.<\/h1>/);
 assert.match(html,/data-commerce-marketplace/);
 assert.match(html,/commerce-marketplace\.css/);
 assert.match(html,/commerce-marketplace\.js/);
 assert.match(products,/href="\/products\/marketplace\/"/);
 assert(existsSync('assets/css/commerce-marketplace.css'));
 assert(existsSync('assets/js/commerce-marketplace.js'));
});
test('public marketplace JS never collects payments or presents owner declared stock as verified',()=>{
 const app=read('assets/js/commerce-marketplace.js');
 assert.doesNotMatch(app,/checkout\.sessions\.create|sk_live_|whsec_|cardNumber|ownerDeclaredUnits/);
 assert.match(app,/stock to be confirmed|Stock to be confirmed/i);
});

test('derived catalogue and tracking pages do not reuse Products-only image rights',()=>{
  for(const route of ['products/marketplace/index.html','products/track/index.html']){
    const html=read(route);
    assert.doesNotMatch(html,/product-portfolio-evidence\.jpg/);
    assert.match(html,/<link rel="canonical"/);
  }
});

test('supplier ESCO photographs are shown only after rights and exact-variant approval',()=>{
  const map=JSON.parse(read('assets/data/esco-model-photo-map.json')).images;
  const catalogue=JSON.parse(read('assets/data/commerce-marketplace.json')).products;
  for(const row of catalogue.filter(p=>p.brand==='ESCO')){
    const m=map?.[row.id];
    if(!m || m.rightsConfirmed!==true || m.variantConfirmed!==true || m.model!==row.model)
      assert.doesNotMatch(row.image,/^\/assets\/media\/esco\/esco-p[0-9]/);
  }
});
