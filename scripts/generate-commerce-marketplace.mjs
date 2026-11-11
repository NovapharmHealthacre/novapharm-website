// Public, evidence-safe unified commerce discovery. No stock, settlement or payment authority.
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {guideFor} from './esco-merchandising.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(readFileSync(join(root,p),'utf8'));
const nut=read('assets/data/nutraxin-retail-catalogue.json');
const esco=read('assets/data/esco-catalogue.json');
const nutRegister=read('docs/nutraxin-product-register.json');
const photos=read('assets/data/esco-model-photo-map.json');
assert.equal(nut.products.length,19);assert.equal(nutRegister.products.length,19);
assert.equal(esco.entriesTotal,373);assert.equal(esco.categories.length,12);
const catalog=[];
const identityBySKU=new Map(nutRegister.products.map(p=>[p.sku,p]));
for(const p of nut.products){
 const original=identityBySKU.get(p.sku);
 assert(original&&original.name===p.name&&original.slug===p.slug,'Nutraxin SKU mismatch');
 assert(Number.isSafeInteger(p.retail_price_pence)&&p.retail_price_pence>0);
 catalog.push({id:p.sku,brand:'Nutraxin',seller:'NovaPharm Healthcare Ltd',supplier:'Nutraxin',title:p.name,category:p.range,model:null,pack:p.pack,sku:p.sku,currency:'GBP',
    priceMinor:p.retail_price_pence,priceBasis:'UK consumer retail including estimated VAT',priceVerification:'owner_approved_retail',
    stockStatus:'warehouse_reconciliation_pending',availabilityQuantity:null,cardCheckoutAuthority:false,
    image:p.image,photoCaption:'Owner-supplied pack image',href:'/products/nutraxin/'+p.slug+'/'});
}
for(const category of esco.categories)for(const p of category.entries){
 const price=guideFor({...p,category:category.name});
 assert(Number.isFinite(price.guidePriceExVatGbp));
 const mapping=photos.images?.[p.id];
 const photoIsMatched=Boolean(mapping?.path&&mapping.model&&mapping.model===p.model);
 catalog.push({id:p.id,brand:'ESCO',seller:'NovaPharm Healthcare Ltd',supplier:'Eastern Surgical Company (ESCO)',title:p.name,category:category.name,subcategory:p.subcategory,
    model:p.model??null,pack:null,sku:'NP-ESCO-'+p.id.slice(-4),currency:'GBP',
    priceMinor:Math.round(price.guidePriceExVatGbp*100),priceBasis:'UK catalogue base ex VAT and delivery',priceVerification:'guide_price_only',
    stockStatus:'warehouse_reconciliation_pending',availabilityQuantity:null,cardCheckoutAuthority:false,
    image:photoIsMatched?mapping.path:'/assets/media/esco/previews/'+p.id.toLowerCase()+'.svg',
    photoCaption:photoIsMatched?'Supplier model-associated photograph; exact variant to confirm':'Original concept illustration; not a verified product photograph',
    href:'/products/esco/#esco-catalogue'});
}
assert.equal(catalog.length,392);assert.equal(new Set(catalog.map(p=>p.id)).size,392);
assert.equal(new Set(catalog.map(p=>p.sku)).size,392);
assert(catalog.every(p=>p.availabilityQuantity===null&&p.cardCheckoutAuthority===false));
const destination=join(root,'assets/data/commerce-marketplace.json');
writeFileSync(destination,JSON.stringify({schema:'novapharm-public-merchant-discovery-v1',sourceScope:'owner-supplied-nutraxin-and-esco-catalogues',updatedAt:'2026-11-11',inventoryAuthority:'none',notPaymentAuthority:true,
  search:true,comparisons:true,sellers:1,sourceProductCount:392,products:catalog},null,2)+'\n','utf8');
const site=join(root,'products/index.html');
const template=readFileSync(site,'utf8');
const main=template.match(/<main\b[^>]*>[\s\S]*?<\/main>/);
assert(main,'Products main shell required');
const body=`<main id="main" class="mp-main" data-commerce-marketplace>
<section class="mp-hero"><div class="mp-wrap"><p class="mp-eyebrow">NOVAPHARM / COMMERCE</p><h1>Everything, together.</h1>
<p>One collection. Two specialist portfolios. A simpler way to find the products that matter.</p>
<div class="mp-hero-meta"><span>392 catalogue entries</span><span>2 product ranges</span><span>One governed experience</span></div></div></section>
<section class="mp-wrap mp-discovery" aria-labelledby="mp-discover-title"><div class="mp-heading"><p class="mp-eyebrow">DISCOVER</p><h2 id="mp-discover-title">Find the right product.</h2><p>Search by name, model, category or NovaPharm SKU. Compare specifications before choosing a collection.</p></div>
<div class="mp-toolbar"><div><label for="mp-search">Search all products</label><input id="mp-search" type="search" placeholder="Search Nutraxin, ESCO, models or SKUs" autocomplete="off" maxlength="120"></div>
<div><label for="mp-brand">Portfolio</label><select id="mp-brand"><option value="all">All products</option><option value="Nutraxin">Nutraxin</option><option value="ESCO">ESCO Anand</option></select></div>
<div><label for="mp-category">Category</label><select id="mp-category"><option value="all">All categories</option></select></div>
<div><label for="mp-sort">Sort</label><select id="mp-sort"><option value="name">Product name</option><option value="brand">Portfolio</option></select></div></div>
<div class="mp-status" role="status" aria-live="polite" id="mp-count">Loading the collection…</div>
<div class="mp-grid" id="mp-grid"></div><div class="mp-more"><button id="mp-more" type="button" hidden>Show more products</button></div>
</section><section class="mp-wrap mp-compare" aria-labelledby="mp-compare-title" id="mp-compare" hidden><div class="mp-heading"><p class="mp-eyebrow">PRODUCT COMPARISON</p><h2 id="mp-compare-title">Compare what matters.</h2><p>Prices may have different VAT and delivery treatments. Confirm final price at checkout or with NovaPharm.</p></div><div id="mp-compare-content"></div></section>
<section class="mp-wrap mp-disclosure"><h2>Clearly governed.</h2><p>Each listing identifies its merchant, source and price basis. ESCO references are not necessarily saleable variants. Declared warehouse quantities are not verified available-to-promise stock. Checkout, delivery, regulatory requirements and refunds remain controlled by each product's approved order process.</p>
<a href="/products/nutraxin/">Explore Nutraxin</a><a href="/products/esco/">Explore ESCO</a></section></main>`;
let html=template.replace(main[0],body).replace(/<title>[\s\S]*?<\/title>/,'<title>Shop Nutraxin & ESCO | NovaPharm Commerce</title>');
html=html.replace(/<link rel="canonical" href="[^"]*"/,'<link rel="canonical" href="https://novapharmhealthcare.com/products/marketplace/"');
html=html.replace(/<meta name="description" content="[^"]*"/,'<meta name="description" content="Search and compare 392 Nutraxin and ESCO products in one NovaPharm catalogue. Find product specifications, owners and governed ordering routes."');
html=html.replace('</head>','<link rel="stylesheet" href="/assets/css/commerce-marketplace.css"><script src="/assets/js/commerce-marketplace.js" defer></script></head>');
assert(html.includes('data-commerce-marketplace')&&html.includes('commerce-marketplace.css'));
const target=join(root,'products/marketplace/index.html');mkdirSync(dirname(target),{recursive:true});writeFileSync(target,html,'utf8');
const callToAction='<section class="npd-commerce-link" aria-label="Unified product search"><p>ONE SEARCH. BOTH PORTFOLIOS.</p><h2>Explore the complete catalogue.</h2><a href="/products/marketplace/">Search all 392 products</a></section>';
let productsIndex=template;
assert(!productsIndex.includes('class="npd-commerce-link"'));
productsIndex=productsIndex.replace('</main>',callToAction+'</main>');
writeFileSync(site,productsIndex,'utf8');
console.log('Generated governed 392-product marketplace with Nutraxin and ESCO portfolio entry.');
