import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
const root=process.cwd();
const file=p=>resolve(root,p);
const read=p=>readFileSync(file(p),'utf8');
const write=(p,s)=>{mkdirSync(dirname(file(p)),{recursive:true});writeFileSync(file(p),s,'utf8');};
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const template=read('products/index.html');
const originalMain=template.match(/<main\b[^>]*>[\s\S]*?<\/main>/);
assert(originalMain,'Products shell missing');
const base='https://novapharmhealthcare.com';
function page(route,title,description,main){
 let html=template.replace(originalMain[0],()=>main);
 html=html.replace(/<title>[\s\S]*?<\/title>/,'<title>'+escape(title)+'</title>');
 html=html.replace(/<link rel="canonical" href="[^"]*"/,'<link rel="canonical" href="'+base+route+'"');
 html=html.replace(/<link rel="alternate" hreflang="([^"]*)" href="[^"]*"/g,(_,lang)=>'<link rel="alternate" hreflang="'+escape(lang)+'" href="'+base+route+'"');
 html=html.replace(/<meta name="description" content="[^"]*"/,'<meta name="description" content="'+escape(description)+'"');
 const headEnd=html.indexOf('</head>');assert(headEnd>0);
 let head=html.slice(0,headEnd).replace(/<meta\s+(?:property|name)="(?:og:[^"]*|twitter:[^"]*)"[^>]*>\s*/g,'').replace(/<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g,'');
 head+='<meta property="og:title" content="'+escape(title)+'"><meta property="og:description" content="'+escape(description)+'"><meta property="og:url" content="'+base+route+'"><meta property="og:type" content="website"><link rel="stylesheet" href="/assets/css/retail-expansion.css">';
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
const input='src/content/approved-consumer-catalogue.json';
if(existsSync(file(input))){
 const items=JSON.parse(read(input));
 assert(Array.isArray(items)&&items.length>0);
 const permitted=new Set(['ean','brand','name','category','image','imageRightsConfirmed','identityConfirmed','publicListingApproved']);
 const ids=new Set();
 for(const p of items){
  assert(Object.keys(p).every(k=>permitted.has(k)),'Private or unknown field in public catalogue');
  assert(typeof p.ean==='string'&&/^\d{8,14}$/.test(p.ean)&&!ids.has(p.ean),'Duplicate or invalid identifier');ids.add(p.ean);
  assert(p.identityConfirmed===true&&p.publicListingApproved===true&&p.imageRightsConfirmed===true,'Catalogue approval missing');
  assert([p.name,p.brand,p.category].every(x=>typeof x==='string'&&x.trim()));
  assert(/^\/assets\/media\/products\/[a-zA-Z0-9/_-]+\.(?:avif|webp|png|jpg)$/.test(p.image)&&existsSync(file(p.image.slice(1))),'Approved pack photograph missing');
 }
 const routeFor=p=>'/products/health-and-wellbeing/'+p.ean+'/';
 for(const p of items){
  const route=routeFor(p);
  const related=items.filter(q=>q.ean!==p.ean&&q.category===p.category).slice(0,3);
  const enquiry='/contact/?enquiry='+encodeURIComponent('Product enquiry '+p.ean);
  const detail='<main id="main" class="npr-main"><nav class="npr-wrap npr-categories" aria-label="Breadcrumb"><a href="/products/">Products</a><a href="/products/health-and-wellbeing/">Health and wellbeing</a><span aria-current="page">'+escape(p.name)+'</span></nav><section class="npr-hero npr-wrap"><div class="npr-hero-media"><img src="'+escape(p.image)+'" alt="'+escape(p.name)+'" width="480" height="480"></div><div><p class="npr-kicker">'+escape(p.brand)+' / '+escape(p.category)+'</p><h1>'+escape(p.name)+'</h1><p>Product reference '+escape(p.ean)+'</p><p>Online ordering will be available when the price, stock and delivery arrangements have been verified.</p><a class="npr-action" href="'+enquiry+'">Enquire about this product</a><p><a href="/products/nutraxin/bag/">View your shopping bag</a></p></div></section><section class="npr-wrap npr-section"><h2>Product information</h2><p>Refer to the current manufacturer packaging for ingredients, directions and warnings. Verified product-specific information is required before online ordering.</p></section>'+ (related.length?'<section class="npr-wrap npr-section"><h2>Explore the collection.</h2><div class="npr-grid">'+related.map(q=>'<article class="npr-card"><a href="'+routeFor(q)+'"><img src="'+escape(q.image)+'" alt="'+escape(q.name)+'" width="480" height="480" loading="lazy"><h3>'+escape(q.name)+'</h3></a></article>').join('')+'</div></section>':'')+'<aside class="npr-sticky"><div class="npr-wrap"><strong>'+escape(p.name)+'</strong><a class="npr-action" href="'+enquiry+'">Enquire</a></div></aside></main>';
  page(route,p.name+' | NovaPharm Healthcare','Explore this '+p.brand+' product reference and contact NovaPharm about availability.',detail);
 }
 const groups=[...new Set(items.map(p=>p.category))].sort();
 const groupCards=groups.map((g,i)=>'<section class="npr-wrap npr-section" id="category-'+i+'"><h2>'+escape(g)+'</h2><div class="npr-grid">'+items.filter(p=>p.category===g).map(p=>'<article class="npr-card"><a href="'+routeFor(p)+'"><img src="'+escape(p.image)+'" alt="'+escape(p.name)+'" width="480" height="480" loading="lazy"><p class="npr-kicker">'+escape(p.brand)+'</p><h3>'+escape(p.name)+'</h3></a><a href="'+routeFor(p)+'">View product</a></article>').join('')+'</div></section>').join('');
 page('/products/health-and-wellbeing/','Health and wellbeing catalogue | NovaPharm','Explore approved health and wellbeing product references by category.', '<main id="main" class="npr-main"><section class="npr-wrap npr-section"><p class="npr-kicker">NOVAPHARM / PRODUCTS</p><h1>Health and wellbeing.</h1><p>Explore '+items.length+' approved product references. Prices, stock and ordering eligibility are confirmed separately.</p><nav class="npr-categories" aria-label="Product categories">'+groups.map((g,i)=>'<a href="#category-'+i+'">'+escape(g)+'</a>').join('')+'</nav></section>'+groupCards+'</main>');
}
const giftLink='<a href="/corporate-gifts/">Corporate gifts</a>';
const catalogueLink=existsSync(file(input))?'<a href="/products/health-and-wellbeing/">Health and wellbeing</a>':'';
const landing='<section class="npr-wrap npr-section" aria-label="More from NovaPharm"><h2>Explore more.</h2><div class="npr-categories">'+giftLink+catalogueLink+'</div></section>';
write('products/index.html',template.replace(originalMain[0],()=>originalMain[0].replace('</main>',landing+'</main>')).replace('</head>','<link rel="stylesheet" href="/assets/css/retail-expansion.css"></head>'));
console.log('Retail expansion generated; new consumer catalogue requires separately approved identity and licensed imagery.');
