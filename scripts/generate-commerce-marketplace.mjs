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
 const photoIsMatched=Boolean(mapping?.path&&mapping.model&&mapping.model===p.model&&mapping.rightsConfirmed===true&&mapping.variantConfirmed===true);
 catalog.push({id:p.id,brand:'ESCO',seller:'NovaPharm Healthcare Ltd',supplier:'Eastern Surgical Company (ESCO)',title:p.name,category:category.name,subcategory:p.subcategory,
    model:p.model??null,pack:null,sku:'NP-ESCO-'+p.id.slice(-4),currency:'GBP',
    priceMinor:Math.round(price.guidePriceExVatGbp*100),priceBasis:'UK catalogue base ex VAT and delivery',priceVerification:'guide_price_only',
    stockStatus:'warehouse_reconciliation_pending',availabilityQuantity:null,cardCheckoutAuthority:false,
    image:photoIsMatched?mapping.path:'/assets/media/esco/previews/'+p.id.toLowerCase()+'.svg',
    photoCaption:photoIsMatched?'Supplier model-associated photograph; exact variant to confirm':'Original concept illustration; not a verified product photograph',
    href:'/products/esco/?product='+encodeURIComponent(p.id)+'#esco-catalogue'});
}
assert.equal(catalog.length,392);assert.equal(new Set(catalog.map(p=>p.id)).size,392);
assert.equal(new Set(catalog.map(p=>p.sku)).size,392);
assert(catalog.every(p=>p.availabilityQuantity===null&&p.cardCheckoutAuthority===false));
const destination=join(root,'assets/data/commerce-marketplace.json');
writeFileSync(destination,JSON.stringify({schema:'novapharm-public-merchant-discovery-v1',sourceScope:'owner-supplied-nutraxin-and-esco-catalogues',updatedAt:'2026-11-11',inventoryAuthority:'aws_dynamodb_owner_confirmed_read_only',notPaymentAuthority:true,
  search:true,comparisons:true,sellers:1,sourceProductCount:392,products:catalog},null,2)+'\n','utf8');
// Search crawlers and no-JavaScript visitors need real links instead of an empty JS grid.
// ESCO records link to their specific catalogue reference, not a claim of paid checkout.
const htmlEscape=value=>String(value).replace(/[&<>"']/g,char=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[char]);
const browseGroups=[
 {title:'Nutraxin food supplements',items:catalog.filter(p=>p.brand==='Nutraxin')},
 ...esco.categories.map(group=>({title:'ESCO · '+group.name,items:catalog.filter(p=>p.brand==='ESCO'&&p.category===group.name)}))
];
assert.equal(browseGroups.reduce((total,group)=>total+group.items.length,0),392);
const browseIndex='<details class="mp-source-index"><summary>Browse all 392 product records by name</summary>'+
 '<p>Nutraxin links open individual product pages. ESCO links open a selected catalogue reference; payment and delivery require separate approval.</p>'+
 '<div class="mp-source-index-groups">'+browseGroups.map(group=>
   '<section class="mp-source-index-group"><h3>'+htmlEscape(group.title)+'</h3><ul>'+
   group.items.map(p=>'<li><a class="mp-source-index-link" href="'+htmlEscape(p.href)+'">'+
     htmlEscape(p.title)+' <small>'+htmlEscape(p.sku)+'</small></a></li>').join('')+
   '</ul></section>'
 ).join('')+'</div></details>';
assert.equal((browseIndex.match(/class="mp-source-index-link"/g)||[]).length,392);

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
<div class="mp-grid" id="mp-grid"></div><div class="mp-more"><button id="mp-more" type="button" hidden>Show more products</button></div>${browseIndex}
</section><section class="mp-wrap mp-compare" aria-labelledby="mp-compare-title" id="mp-compare" hidden><div class="mp-heading"><p class="mp-eyebrow">PRODUCT COMPARISON</p><h2 id="mp-compare-title">Compare what matters.</h2><p>Prices may have different VAT and delivery treatments. Confirm final price at checkout or with NovaPharm.</p></div><div id="mp-compare-content"></div></section>
<section class="mp-wrap mp-disclosure"><h2>Clearly governed.</h2><p>Each listing identifies its merchant, source and price basis. ESCO references are not necessarily saleable variants. NovaPharm confirms 10,000 warehouse units per catalogue record. This owner-attested quantity is shown from AWS inventory, not represented as an independent stock audit. Product-specific checkout, variant release, payment, dispatch and refund controls still apply.</p>
<a href="/products/nutraxin/">Explore Nutraxin</a><a href="/products/esco/">Shop ESCO</a></section></main>`;

// A derived route must not inherit product-portfolio photography or Products-only
// JSON-LD/social identity. The Products artwork is approved for that route alone.
function removeInheritedProductMedia(html) {
  const headEnd=html.indexOf('</head>');
  if(headEnd<0)throw new Error('Expected head closing tag');
  let head=html.slice(0,headEnd);
  head=head.replace(/<meta\s+(?:property|name)="(?:og:image(?::[^"]*)?|twitter:image(?::[^"]*)?)"[^>]*>\s*/g,'');
  head=head.replace(/<meta\s+[^>]*product-portfolio-evidence\.jpg[^>]*>\s*/g,'');
  head=head.replace(/<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g, block=>
    (block.includes('product-portfolio-evidence.jpg')||block.includes('"@type":"WebPage"')||block.includes('"@type":"CollectionPage"'))?'':block);
  if(head.includes('product-portfolio-evidence.jpg'))throw new Error('Products-only media remained in derived social metadata');
  return head+html.slice(headEnd);
}

let html=template.replace(main[0],body).replace(/<title>[\s\S]*?<\/title>/,'<title>Shop Nutraxin & ESCO | NovaPharm Commerce</title>');
html=html.replace(/<link rel="canonical" href="[^"]*"/,'<link rel="canonical" href="https://novapharmhealthcare.com/products/marketplace/"');
html=html.replace(/<meta name="description" content="[^"]*"/,'<meta name="description" content="Search and compare 392 Nutraxin and ESCO products in one NovaPharm catalogue. Find product specifications, owners and governed ordering routes."');
html=html.replace('</head>','<link rel="stylesheet" href="/assets/css/commerce-marketplace.css"><script src="/assets/js/commerce-marketplace.js" defer></script></head>');
assert(html.includes('data-commerce-marketplace')&&html.includes('commerce-marketplace.css'));
html=removeInheritedProductMedia(html);
// The derived marketplace must have its own canonical entity, social identity and
// hreflang. Do not inherit the Products overview's WebPage or photo claims.
const marketplaceUrl='https://novapharmhealthcare.com/products/marketplace/';
const marketplaceDescription='Explore 392 NovaPharm catalogue records: 19 Nutraxin supplements and 373 ESCO healthcare equipment references. Ordering eligibility is confirmed per product.';
const metaReplacements=[
 [/^<meta property="og:url" content="[^"]*">/m,'<meta property="og:url" content="'+marketplaceUrl+'">'],
 [/^<meta property="og:title" content="[^"]*">/m,'<meta property="og:title" content="Nutraxin & ESCO Marketplace | NovaPharm">'],
 [/^<meta property="og:description" content="[^"]*">/m,'<meta property="og:description" content="'+marketplaceDescription+'">'],
 [/^<meta name="twitter:title" content="[^"]*">/m,'<meta name="twitter:title" content="Nutraxin & ESCO Marketplace | NovaPharm">'],
 [/^<meta name="twitter:description" content="[^"]*">/m,'<meta name="twitter:description" content="'+marketplaceDescription+'">']
];
for(const [pattern,replacement] of metaReplacements){
 assert(pattern.test(html),'Missing inherited marketplace meta signal: '+String(pattern));
 html=html.replace(pattern,replacement);
}
for(const language of ['en-GB','x-default']){
 const from='<link rel="alternate" hreflang="'+language+'" href="https://novapharmhealthcare.com/products/">';
 assert(html.includes(from),'Missing inherited hreflang '+language);
 html=html.replace(from,'<link rel="alternate" hreflang="'+language+'" href="'+marketplaceUrl+'">');
}
const itemList={
 '@type':'ItemList',numberOfItems:catalog.length,
 itemListElement:catalog.map((p,i)=>({
  '@type':'ListItem',position:i+1,name:p.title,url:'https://novapharmhealthcare.com'+p.href
 }))
};
const collectionSchema={
 '@context':'https://schema.org','@type':'CollectionPage',
 '@id':marketplaceUrl+'#webpage',url:marketplaceUrl,
 name:'Nutraxin & ESCO Marketplace | NovaPharm',
 description:marketplaceDescription,inLanguage:'en-GB',
 isPartOf:{'@id':'https://novapharmhealthcare.com/#website'},
 about:{'@id':'https://novapharmhealthcare.com/#organization'},
 mainEntity:itemList
};
assert(!html.includes('"@type":"Product"'),'Marketplace cannot claim ESCO saleable Product Offers');
html=html.replace('</head>','<script type="application/ld+json">'+JSON.stringify(collectionSchema)+'</script></head>');

// SEO enhancement generates the sitemap before this derived route is created.
// Append only the public canonical discovery page, never per-SKU ESCO query URLs.
const sitemapFile=join(root,'sitemap.xml');
const currentSitemap=readFileSync(sitemapFile,'utf8');
assert(currentSitemap.includes('</urlset>'),'Missing canonical sitemap root');
const newEntry='<url><loc>'+marketplaceUrl+'</loc><lastmod>2026-11-12</lastmod></url>';
const finalSitemap=currentSitemap.includes('<loc>'+marketplaceUrl+'</loc>')?
 currentSitemap:currentSitemap.replace('</urlset>',newEntry+'</urlset>');
writeFileSync(sitemapFile,finalSitemap,'utf8');
const target=join(root,'products/marketplace/index.html');mkdirSync(dirname(target),{recursive:true});writeFileSync(target,html,'utf8');
const callToAction='<section class="npd-commerce-link" aria-label="Unified product search"><p>ONE SEARCH. BOTH PORTFOLIOS.</p><h2>Explore the complete catalogue.</h2><a href="/products/marketplace/">Search all 392 products</a></section>';
let productsIndex=template;
assert(!productsIndex.includes('class="npd-commerce-link"'));
productsIndex=productsIndex.replace('</main>',callToAction+'</main>');
writeFileSync(site,productsIndex,'utf8');
console.log('Generated governed 392-product marketplace with Nutraxin and ESCO portfolio entry.');
