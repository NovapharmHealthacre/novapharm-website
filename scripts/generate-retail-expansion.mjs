import assert from 'node:assert/strict';
import { parse } from 'parse5';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { validGtin } from '../src/core/multibrand-retail.mjs';
const root=process.cwd();
const file=p=>resolve(root,p);
const read=p=>readFileSync(file(p),'utf8');
const write=(p,s)=>{mkdirSync(dirname(file(p)),{recursive:true});writeFileSync(file(p),s,'utf8');};
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const template=read('products/index.html');
const originalMain=template.match(/<main\b[^>]*>[\s\S]*?<\/main>/);
assert(originalMain,'Products shell missing');
const base='https://novapharmhealthcare.com';
const catalogueSeo=[];
const jsonLd=value=>'<script type="application/ld+json">'+JSON.stringify(value).replace(/</g,'\\u003c')+'</script>';
function page(route,title,description,main,seo=null){
 let html=template.replace(originalMain[0],()=>main).replace(/data-route="[^"]*"/, 'data-route="'+route+'"');
 html=html.replace(/<title>[\s\S]*?<\/title>/,'<title>'+escape(title)+'</title>');
 html=html.replace(/<link rel="canonical" href="[^"]*"/,'<link rel="canonical" href="'+base+route+'"');
 html=html.replace(/<link rel="alternate" hreflang="([^"]*)" href="[^"]*"/g,(_,lang)=>'<link rel="alternate" hreflang="'+escape(lang)+'" href="'+base+route+'"');
 html=html.replace(/<meta name="description" content="[^"]*"/,'<meta name="description" content="'+escape(description)+'"');
 const headEnd=html.indexOf('</head>');assert(headEnd>0);
 // Remove inherited metadata using parsed HTML node boundaries, not regex-based
 // script stripping. Preserve the reviewed shell byte-for-byte otherwise.
 const document=parse(html,{sourceCodeLocationInfo:true});
 const headNode=document.childNodes.find(n=>n.nodeName==='html')?.childNodes.find(n=>n.nodeName==='head');
 assert(headNode?.sourceCodeLocation?.endTag?.startOffset===headEnd,'Unexpected head boundary');
 const ranges=[];
 for(const node of headNode.childNodes){
  const attrs=Object.fromEntries((node.attrs||[]).map(a=>[a.name,a.value]));
  const social=node.nodeName==='meta'&&[attrs.property,attrs.name].some(v=>typeof v==='string'&&/^(?:og:|twitter:)/i.test(v));
  const structured=node.nodeName==='script'&&attrs.type?.toLowerCase()==='application/ld+json';
  if(social||structured){
   const loc=node.sourceCodeLocation;assert(loc&&loc.startOffset>=0&&loc.endOffset<=headEnd,'Missing metadata source location');
   ranges.push([loc.startOffset,loc.endOffset]);
  }
 }
 let head=html.slice(0,headEnd);
 for(const [start,end] of ranges.sort((a,b)=>b[0]-a[0]))head=head.slice(0,start)+head.slice(end);
 head+='<meta property="og:title" content="'+escape(title)+'"><meta property="og:description" content="'+escape(description)+'"><meta property="og:url" content="'+base+route+'"><meta property="og:type" content="website"><link rel="stylesheet" href="/assets/css/retail-expansion.css">';
 if(seo){
  head+=jsonLd(seo.schema);
  if(seo.image) head+='<meta property="og:image" content="'+escape(base+seo.image)+'"><meta property="og:image:alt" content="'+escape(seo.h1)+'"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="'+escape(base+seo.image)+'">';
  catalogueSeo.push({route,canonical:base+route,file:route.slice(1)+'index.html',title,description,h1:seo.h1,indexable:true,schemaTypes:[seo.schema['@type']],intendedCta:[]});
 }
 if(route.startsWith('/products/health-and-wellbeing/')) head+='<script type="module" src="/assets/js/nutraxin-retail-store.js"></script>';
 html=head+html.slice(headEnd);
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
 assert.equal((html.match(/<main\b/g)||[]).length,1);
 write(route.slice(1)+'index.html',html);
}
const products=JSON.parse(read('assets/data/nutraxin-retail-catalogue.json')).products;
const selection=['vitamin-d3-120-tablets','magnesium-daily-60-tablets','collagen-gold-30-sachets'];
const picks=selection.map(slug=>{const p=products.find(p=>p.slug===slug);assert(p&&existsSync(file(p.image.slice(1))),'Gift reference image missing');return p;});
const cards=picks.map(p=>'<article class="npr-card"><a href="/products/nutraxin/'+escape(p.slug)+'/"><img src="'+escape(p.image)+'" alt="'+escape(p.name)+'" width="480" height="480" loading="lazy"><h3>'+escape(p.name)+'</h3></a><p>'+escape(p.pack||'')+'</p><a href="/products/nutraxin/'+escape(p.slug)+'/">View product</a></article>').join('');
page('/corporate-gifts/','Corporate gifting enquiries | NovaPharm Healthcare','Discuss considered corporate gifts and wellness selections with NovaPharm.',`<main id="main" class="npr-main"><section class="npr-hero npr-wrap"><div><p class="npr-kicker">NOVAPHARM / CORPORATE GIFTS</p><h1>Thoughtfully considered.</h1><p>Explore wellbeing-oriented gifts for colleagues, clients and special occasions. Discuss your requirements with our team.</p><a class="npr-action" href="/contact/?enquiry=Corporate%20gifting">Discuss corporate gifting</a></div><div class="npr-hero-media"><img src="${escape(picks[2].image)}" alt="${escape(picks[2].name)} original product packaging" width="480" height="480"></div></section><section class="npr-wrap npr-section"><h2>Consider the occasion.</h2><div class="npr-three"><article><h3>Colleagues and teams</h3><p>Discuss thoughtful selections for staff recognition and special occasions.</p></article><article><h3>Clients and partners</h3><p>Explore gift requirements for business relationships.</p></article><article><h3>Events and milestones</h3><p>Tell us your quantities, budget and preferred delivery dates.</p></article></div></section><section class="npr-wrap npr-section"><h2>Explore selected products.</h2><p>Individual product references, not preassembled gift kits. Suitability and availability must be confirmed.</p><div class="npr-grid">${cards}</div></section><section class="npr-wrap npr-section"><h2>How can we help?</h2><p>Packaging, pricing, delivery and any personalisation are agreed individually before an order is accepted. Food supplements are not suitable for everyone; review product information before selecting.</p><a class="npr-action" href="/contact/?enquiry=Corporate%20gifting">Make an enquiry</a></section></main>`);
// Product media never reconstructs the packaging. Each view must be a verified
// local manufacturer asset of the same product and pack variant.
function isLocalPackImage(path) {
 return typeof path==='string'&&/^\/assets\/media\/products\/[a-zA-Z0-9/_-]+\.(?:avif|webp|png|jpg)$/.test(path)&&existsSync(file(path.slice(1)));
}
function packImage(p,{eager=false}={}){
 return '<div class="npr-pack-frame"><img src="'+escape(p.image)+'" alt="'+escape(p.name)+'" width="480" height="480" '+(eager?'fetchpriority="high"':'loading="lazy"')+' decoding="async"></div>';
}
function mediaGallery(p){
 const primary={image:p.image,alt:p.name};
 const views=[primary,...(p.gallery||[])];
 return '<div class="npr-media-gallery" aria-label="Product photography">'+
 views.map((view,index)=>'<figure class="npr-gallery-view"><a class="npr-image-link" href="'+escape(view.image)+'" aria-label="View larger image: '+escape(view.alt)+'"><img src="'+escape(view.image)+'" alt="'+escape(view.alt)+'" width="800" height="800" '+(index===0?'fetchpriority="high"':'loading="lazy"')+' decoding="async"></a><figcaption>'+escape(index===0?'View original pack photograph':view.alt)+'</figcaption></figure>').join('')+
 '</div>';
}
function collectionCard(p,route){
 return '<article class="npr-card"><a class="npr-card-link" href="'+route+'">'+packImage(p)+'<div class="npr-card-copy"><p class="npr-kicker">'+escape(p.brand)+'</p><h3>'+escape(p.name)+'</h3>'+(p.pack?'<p class="npr-pack-size">'+escape(p.pack)+'</p>':'')+'</div></a><a class="npr-card-action" href="'+route+'">View product <span aria-hidden="true">→</span></a></article>';
}
const input='src/content/approved-consumer-catalogue.json';
if(existsSync(file(input))){
 const items=JSON.parse(read(input));
 assert(Array.isArray(items)&&items.length>0);
 const permitted=new Set(['ean','brand','name','category','image','imageRightsConfirmed','identityConfirmed','publicListingApproved','pack','gallery','productClass','description','ingredients','directions','warnings']);
 const ids=new Set();
 for(const p of items){
  assert(Object.keys(p).every(k=>permitted.has(k)),'Private or unknown field in public catalogue');
  assert(validGtin(p.ean)&&!ids.has(p.ean),'Duplicate or invalid GTIN checksum');ids.add(p.ean);
  assert(p.identityConfirmed===true&&p.publicListingApproved===true&&p.imageRightsConfirmed===true,'Catalogue approval missing');
  assert([p.name,p.brand,p.category].every(x=>typeof x==='string'&&x.trim()));
  assert(isLocalPackImage(p.image),'Approved pack photograph missing');
  assert(['food_supplement','cosmetic','consumer_non_medicinal'].includes(p.productClass),'Non-eligible product class');
  for(const key of ['description','ingredients','directions','warnings']){
   assert(typeof p[key]==='string'&&p[key].trim().length>0&&p[key].length<=5000,'Missing reviewed product information: '+key);
  }
  assert(typeof p.pack==='string'&&p.pack.trim().length>0,'Verified pack size required');
  if(p.pack!==undefined) assert(typeof p.pack==='string'&&p.pack.trim()&&p.pack.length<=120,'Invalid pack description');
  if(p.gallery!==undefined){
   assert(Array.isArray(p.gallery)&&p.gallery.length<=6,'Invalid product gallery');
   const paths=new Set([p.image]);
   for(const view of p.gallery){
    assert(view&&Object.keys(view).every(k=>['image','alt','imageRightsConfirmed','variantConfirmed'].includes(k)),'Unexpected gallery field');
    assert(view.imageRightsConfirmed===true&&view.variantConfirmed===true&&isLocalPackImage(view.image)&&!paths.has(view.image),'Gallery image is not approved or variant matched');
    assert(typeof view.alt==='string'&&view.alt.trim()&&view.alt.length<=160,'Missing gallery alt text');
    paths.add(view.image);
   }
  }
 }
 const routeFor=p=>'/products/health-and-wellbeing/'+p.ean+'/';
 for(const p of items){
  const route=routeFor(p);
  const related=items.filter(q=>q.ean!==p.ean&&q.category===p.category).slice(0,3);
  const enquiry='/contact/?enquiry='+encodeURIComponent('Product enquiry '+p.ean);
  const detail='<main id="main" class="npr-main"><nav class="npr-wrap npr-categories" aria-label="Breadcrumb"><a href="/products/">Products</a><a href="/products/health-and-wellbeing/">Health and wellbeing</a><span aria-current="page">'+escape(p.name)+'</span></nav><section class="npr-hero npr-wrap npr-detail-hero">'+mediaGallery(p)+'<div class="npr-detail-copy"><p class="npr-kicker">'+escape(p.brand)+' / '+escape(p.category)+'</p><h1>'+escape(p.name)+'</h1>'+(p.pack?'<p class="npr-detail-pack">'+escape(p.pack)+'</p>':'')+'<p class="npr-reference">Product reference '+escape(p.ean)+'</p><div data-npr-retail-sku="NP-CP-'+escape(p.ean)+'"><p>Online ordering will be available when the price, stock and delivery arrangements have been verified.</p><a class="npr-action" href="'+enquiry+'">Enquire about this product</a></div><p><a href="/products/nutraxin/bag/">View your shopping bag</a></p></div></section><section class="npr-wrap npr-section"><h2>Product information</h2><p>'+escape(p.description)+'</p><h3>Ingredients</h3><p>'+escape(p.ingredients)+'</p><h3>Directions</h3><p>'+escape(p.directions)+'</p><h3>Warnings</h3><p>'+escape(p.warnings)+'</p></section>'+ (related.length?'<section class="npr-wrap npr-section"><h2>Explore the collection.</h2><div class="npr-grid">'+related.map(q=>collectionCard(q,routeFor(q))).join('')+'</div></section>':'')+'<aside class="npr-sticky"><div class="npr-wrap"><strong>'+escape(p.name)+'</strong><div data-npr-retail-sku="NP-CP-'+escape(p.ean)+'"><a class="npr-action" href="'+enquiry+'">Enquire</a></div></div></aside></main>';
  const description=p.description.replace(/\s+/g,' ').trim().slice(0,160);
  page(route,p.name+' | NovaPharm Healthcare',description,detail,{h1:p.name,image:p.image,schema:{'@context':'https://schema.org','@type':'Product','@id':base+route+'#product',url:base+route,name:p.name,description:p.description,brand:{'@type':'Brand',name:p.brand},['gtin'+p.ean.length]:p.ean,image:[base+p.image,...(p.gallery||[]).map(v=>base+v.image)],category:p.category,sku:'NP-CP-'+p.ean}});
  // No static Offer, price or availability: the authoritative checkout controls sales.
 }
 const groups=[...new Set(items.map(p=>p.category))].sort();
 const groupCards=groups.map((g,i)=>'<section class="npr-wrap npr-section" id="category-'+i+'"><header class="npr-collection-heading"><h2>'+escape(g)+'</h2><span>'+items.filter(p=>p.category===g).length+' products</span></header><div class="npr-grid">'+items.filter(p=>p.category===g).map(p=>collectionCard(p,routeFor(p))).join('')+'</div></section>').join('');
 page('/products/health-and-wellbeing/','Health and wellbeing catalogue | NovaPharm','Explore approved health and wellbeing product references by category.', '<main id="main" class="npr-main"><section class="npr-wrap npr-section"><p class="npr-kicker">NOVAPHARM / PRODUCTS</p><h1>Health and wellbeing.</h1><p>Discover our collection by category. Explore '+items.length+' approved product references. Prices, stock and ordering eligibility are confirmed separately.</p><nav class="npr-categories" aria-label="Product categories">'+groups.map((g,i)=>'<a href="#category-'+i+'">'+escape(g)+'</a>').join('')+'</nav></section>'+groupCards+'</main>',{h1:'Health and wellbeing.',schema:{'@context':'https://schema.org','@type':'CollectionPage','@id':base+'/products/health-and-wellbeing/#webpage',url:base+'/products/health-and-wellbeing/',name:'Health and wellbeing',mainEntity:{'@type':'ItemList',itemListElement:items.map((p,i)=>({'@type':'ListItem',position:i+1,url:base+routeFor(p)}))}}});
}
// Reconcile generated routes into canonical registers before CSS versioning and SHA stamping.
if(catalogueSeo.length){
 const registerPath='seo/generated/page-metadata-register.json';
 const existing=JSON.parse(read(registerPath));
 const prefix='/products/health-and-wellbeing/';
 const retained=existing.filter(p=>!p.route.startsWith(prefix));
 write(registerPath,JSON.stringify([...retained,...catalogueSeo],null,2)+'\n');
 const structuredPath='seo/generated/structured-data-register.json';
 const structured=JSON.parse(read(structuredPath)).filter(p=>!p.route.startsWith(prefix));
 for(const p of catalogueSeo){
  const type=p.schemaTypes[0];
  structured.push({route:p.route,canonical:p.canonical,file:p.file,entities:[{id:p.canonical+(type==='Product'?'#product':'#webpage'),types:[type],name:p.h1==='Health and wellbeing.'?'Health and wellbeing':p.h1,mainEntity:null,publisher:null,author:null}]});
 }
 write(structuredPath,JSON.stringify(structured,null,2)+'\n');
 let sitemap=read('sitemap.xml');
 assert(sitemap.includes('</urlset>'),'Missing sitemap root');
 sitemap=sitemap.replace(/<url>\s*<loc>https:\/\/novapharmhealthcare\.com\/products\/health-and-wellbeing\/[^<]*<\/loc>[\s\S]*?<\/url>/g,'');
 sitemap=sitemap.replace('</urlset>',catalogueSeo.map(p=>'<url><loc>'+escape(p.canonical)+'</loc></url>').join('')+'</urlset>');
 write('sitemap.xml',sitemap);
}
const giftLink='<a href="/corporate-gifts/">Corporate gifts</a>';
const catalogueLink=existsSync(file(input))?'<a href="/products/health-and-wellbeing/">Health and wellbeing</a>':'';
const landing='<section class="npr-wrap npr-section" aria-label="More from NovaPharm"><h2>Explore more.</h2><div class="npr-categories">'+giftLink+catalogueLink+'</div></section>';
write('products/index.html',template.replace(originalMain[0],()=>originalMain[0].replace('</main>',landing+'</main>')).replace('</head>','<link rel="stylesheet" href="/assets/css/retail-expansion.css"></head>'));
console.log('Retail expansion generated; new consumer catalogue requires separately approved identity and licensed imagery.');
