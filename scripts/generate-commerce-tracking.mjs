import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
const root=resolve(process.cwd());
const productsPath=join(root,'products/index.html');
const marketPath=join(root,'products/marketplace/index.html');
const template=readFileSync(productsPath,'utf8');
const market=readFileSync(marketPath,'utf8');
assert(template.includes('<main id="main"'));
assert(market.includes('data-commerce-marketplace'));
const main=template.match(/<main\b[^>]*>[\s\S]*?<\/main>/);
assert(main);
const content=`<main id="main" class="np-order-track" data-np-order-lookup>
<section class="np-order-track-hero"><div class="np-order-track-wrap"><p class="np-order-track-kicker">NOVAPHARM / ORDER STATUS</p><h1>Follow your order.</h1>
<p>One private reference. A clear status from the secure Nutraxin or ESCO order service.</p></div></section>
<section class="np-order-track-wrap np-order-track-panel" aria-labelledby="np-track-title"><p class="np-order-track-kicker">FIND YOUR RECORD</p><h2 id="np-track-title">Where things stand.</h2>
<p>Enter your complete reference from checkout or the ESCO order-request confirmation. Only the order state is retrieved; no customer address, payment card or private seller information is displayed.</p>
<form class="np-order-track-form"><label for="np-order-reference">Order reference</label>
<div class="np-order-track-controls"><input id="np-order-reference" name="order_ref" placeholder="NUT-… or ESCO-…" type="text" autocomplete="off" spellcheck="false" maxlength="52" required>
<button type="submit">Check status</button></div></form>
<p class="np-order-track-result" data-np-order-status role="status" aria-live="polite" hidden></p></section>
<section class="np-order-track-wrap np-order-track-note"><h2>Payment is not delivery.</h2><p>A paid order means payment has been confirmed by the checkout service. Picking, dispatch, carrier tracking and delivery require separate verified events. An ESCO order request does not mean payment has been taken.</p>
<a href="/products/nutraxin/">Nutraxin collection</a><a href="/products/esco/">ESCO collection</a></section></main>`;

// A derived route must not inherit product-portfolio photography or Products-only
// JSON-LD/social identity. The Products artwork is approved for that route alone.
function removeInheritedProductMedia(html) {
  const headEnd=html.indexOf('</head>');
  if(headEnd<0)throw new Error('Expected head closing tag');
  let head=html.slice(0,headEnd);
  head=head.replace(/<meta\s+(?:property|name)="(?:og:image(?::[^"]*)?|twitter:image(?::[^"]*)?)"[^>]*>\s*/g,'');
  head=head.replace(/<meta\s+[^>]*product-portfolio-evidence\.jpg[^>]*>\s*/g,'');
  head=head.replace(/<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g, block=>
    block.includes('product-portfolio-evidence.jpg')?'':block);
  if(head.includes('product-portfolio-evidence.jpg'))throw new Error('Products-only media remained in derived social metadata');
  return head+html.slice(headEnd);
}

let html=template.replace(main[0],content).replace(/<title>[\s\S]*?<\/title>/,'<title>Order Status | Nutraxin &amp; ESCO | NovaPharm</title>');
html=html.replace(/<link rel="canonical" href="[^"]*"/,'<link rel="canonical" href="https://novapharmhealthcare.com/products/track/"');
html=html.replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="Check the latest order or order request status for NovaPharm Nutraxin and ESCO.">');
html=html.replace('</head>','<link rel="stylesheet" href="/assets/css/commerce-order-track.css"><script src="/assets/js/commerce-order-track.js" defer></script></head>');
html=removeInheritedProductMedia(html);
const target=join(root,'products/track/index.html');mkdirSync(dirname(target),{recursive:true});writeFileSync(target,html,'utf8');
assert(market.includes('<a href="/products/esco/">Shop ESCO</a>'));
writeFileSync(marketPath,market.replace('<a href="/products/esco/">Shop ESCO</a>','<a href="/products/esco/">Shop ESCO</a><a href="/products/track/">Track an order</a>'),'utf8');
assert(template.includes('class="npd-commerce-link"'));
writeFileSync(productsPath,template.replace('href="/products/marketplace/">Search all 392 products</a>','href="/products/marketplace/">Search all 392 products</a><a href="/products/track/">Track an order</a>'),'utf8');
console.log('Generated privacy-safe, unified Nutraxin and ESCO order-status lookup.');
