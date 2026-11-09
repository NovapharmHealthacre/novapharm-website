import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildMerchandising } from './esco-merchandising.mjs';
const root = resolve(process.cwd());
const data = JSON.parse(readFileSync('assets/data/esco-catalogue.json', 'utf8'));
const imageManifest = JSON.parse(readFileSync('assets/data/esco-model-photo-map.json', 'utf8'));
const read = (file) => readFileSync(file, 'utf8');
const write = (file, body) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
if (data.checkoutEnabled !== false || data.requestQuoteOnly !== true) throw Error('ESCO must not be connected to Nutraxin checkout');
if (data.categories?.length !== 12) throw Error('ESCO category mapping incomplete');
const entries = data.categories.flatMap((c) => c.entries.map((p) => ({ ...p, category: c.name })));
if (entries.length !== data.entriesTotal || entries.length !== 373) throw Error('ESCO catalogue index count mismatch');
if (new Set(entries.map((p) => p.id)).size !== entries.length) throw Error('Duplicate ESCO catalogue references');
const merchandising = buildMerchandising(entries);
for (const item of entries) {
  if (!item.name || !item.subcategory || !Number.isInteger(item.sourceIndexPage)) throw Error('Unresolved ESCO catalogue row');
  if (item.priceGbp !== null || item.sellable !== false) throw Error('Unverified ESCO item must not have public prices or sellable flag');
}
const productPicture = (p, category) => {
  const img = imageManifest.images[p.id];
  if (img && img.model === p.model && /^[/]assets[/]media[/]esco[/]esco-p[0-9]{2}-image[0-9]{2}[.]webp$/.test(img.path))
    return '<img class="esco-product-image" src="'+esc(img.path)+'" width="480" height="360" loading="lazy" decoding="async" alt="ESCO supplier catalogue photograph associated with '+esc(p.model)+'"><span class="esco-product-art-caption">Source catalogue photo · exact supply variant to confirm</span>';
  const path = merchandising.visualPreviews[p.id];
  if (!/^[/]assets[/]media[/]esco[/]previews[/]esco-cat-[0-9]{4}[.]svg$/.test(path)) throw Error('Missing ESCO preview for '+p.id);
  return '<img class="esco-product-image esco-product-concept" src="'+esc(path)+'" width="480" height="360" loading="lazy" decoding="async" alt="Concept illustration for '+esc(p.name)+'; not a manufacturer photograph"><span class="esco-product-art-caption">Original product concept · not an exact supplier photograph</span>';
};
if (imageManifest.mappedImagesCount !== 61 || Object.keys(imageManifest.images).length !== 61) throw Error('ESCO source photo manifest count mismatch');
for (const [id, image] of Object.entries(imageManifest.images)) {
  const item = entries.find((p) => p.id === id);
  if (!item || !item.model || item.model !== image.model) throw Error('ESCO image-to-model identity unresolved: ' + id);
}
const photoEvidence = Object.fromEntries(entries.map((p) => {
  const matched = imageManifest.images[p.id];
  const isSourcePhoto = matched?.model === p.model &&
    /^[/]assets[/]media[/]esco[/]esco-p[0-9]{2}-image[0-9]{2}[.]webp$/.test(matched?.path || '');
  return [p.id, {
    productName:p.name, category:p.category, model:p.model || null,
    imageType:isSourcePhoto ? 'supplier_catalogue_model_code_match' : 'original_product_type_illustration',
    visibleImage:isSourcePhoto ? matched.path : merchandising.visualPreviews[p.id],
    sourceCatalogueIndexPage:p.sourceIndexPage,
    exactVariantPhotoConfirmed:false,
    manufacturerImageRightsConfirmed:isSourcePhoto ? false : null,
    photoRequestedFromSupplier:!isSourcePhoto
  }];
}));
if (Object.keys(photoEvidence).length !== 373 ||
    Object.values(photoEvidence).filter(x => x.imageType === 'supplier_catalogue_model_code_match').length !== 61)
  throw Error('ESCO product-by-product photo evidence register incomplete');
write('assets/data/esco-image-evidence.json', JSON.stringify({
  source:'ESCO 2026 catalogue and original labelled NovaPharm illustrations',
  entriesTotal:373, modelCodeMatchedSupplierPhotos:61, originalIllustrativePreviews:312,
  exactVariantPhotosConfirmed:0, supplierPhotoWebRightsConfirmed:0, items:photoEvidence
},null,2) + '\n');

const contact = (item) => '/contact/?enquiry=Distribution%20partnership&quote=' + encodeURIComponent('ESCO Anand UK quotation request (catalogue 2026). Items: ' + item.id + ' qty 1. Please confirm variant, UK compliance, total delivered price and lead time.');
const sections = data.categories.map((category, i) => {
  const subs = [...new Set(category.entries.map((item) => item.subcategory))];
  const groups = subs.map((sub) => {
    const cards = category.entries.filter((p) => p.subcategory === sub).map((p) => `<article class="esco-product" data-esco-entry data-esco-category="${esc(category.name)}" data-esco-price="${merchandising.guidePrices[p.id].guidePriceExVatGbp.toFixed(2)}" data-esco-search="${esc([p.name, p.model, p.id, p.subcategory, category.name].filter(Boolean).join(' '))}"><a class="esco-image-link" href="/products/esco/product/?id=${encodeURIComponent(p.id)}" aria-label="View ESCO ${esc(p.name)} details">${productPicture(p, category)}</a><h4><a class="esco-title-link" href="/products/esco/product/?id=${encodeURIComponent(p.id)}">${esc(p.name)}</a></h4><span class="esco-model">${p.model ? 'ESCO ' + esc(p.model) : 'Model to be confirmed'}</span><div class="esco-product-price"><strong>UK guide £${merchandising.guidePrices[p.id].guidePriceExVatGbp.toFixed(2)}</strong><small>Ex VAT · estimate, not a confirmed sale price</small></div><span class="esco-ref">${esc(p.id)} · Source catalogue index p. ${p.sourceIndexPage}</span><button type="button" class="esco-quote-add" data-esco-add="${esc(p.id)}" aria-label="Add ${esc(p.name)} to a quotation request">Add to Bag</button><a href="${esc(contact(p))}" class="esco-direct-quote" aria-label="Individual enquiry for ${esc(p.name)}">Ask about this product</a></article>`).join('');
    return `<h4 class="esco-subcat" data-esco-subcategory>${esc(sub)}</h4><div class="esco-grid">${cards}</div>`;
  });
  return `<section class="esco-section" data-esco-section id="esco-range-${i + 1}" aria-labelledby="esco-range-heading-${i + 1}"><div class="esco-section-header"><h3 id="esco-range-heading-${i + 1}">${esc(category.name)}</h3><span class="esco-section-count">${category.entries.length} catalogue entries</span></div>${groups.join('')}</section>`;
}).join('');
const categoryCards = data.categories.map((category, i) => `<a class="esco-category" href="#esco-range-${i + 1}"><div class="esco-category-image" data-esco-photo="${esc(category.representativeImage)}" role="img" aria-label="Representative ESCO catalogue image for ${esc(category.name)}"></div><div class="esco-category-body"><h3>${esc(category.name)}</h3><small>${category.entries.length} catalogue entries</small><p class="esco-photo-caption">Representative supplier-catalogue imagery, not a photograph of every listed variant</p></div></a>`).join('');
const main = `<main id="main" class="npd-main esco-page">
<header class="esco-hero"><div class="esco-wrap"><p class="esco-eyebrow">NOVAPHARM / PRODUCTS / ESCO ANAND</p><h1>Considered for care.<br>Designed for clarity.</h1><p>Explore Eastern Surgical Company's 2026 product catalogue, organised for UK hospital, surgical and laboratory procurement. See the collection and build your Bag.</p><div class="esco-actions"><a class="esco-btn" href="#esco-catalogue">Explore products</a><a class="esco-btn esco-btn-secondary" href="/products/esco/bag/">View your Bag</a></div></div></header>
<section class="esco-summary"><div class="esco-wrap"><p class="esco-eyebrow">THE COLLECTION</p><h2>One catalogue. Twelve specialist ranges.</h2><p>${data.entriesTotal} indexed product references, including configurable product families. All 373 UK guide prices are research-based estimates, ex VAT. NovaPharm's owner reports 10,000 units per catalogue reference for commercial planning, not independently reconciled warehouse availability or approved saleable variants. VAT, delivery and compliance must be confirmed before a firm offer or payment.</p></div></section>
<section class="esco-categories"><div class="esco-wrap"><div class="esco-category-grid">${categoryCards}</div></div></section>
<section class="esco-catalogue" id="esco-catalogue" data-esco-catalogue><div class="esco-wrap"><p class="esco-eyebrow">EVERY CATALOGUE REFERENCE</p><h2>Find exactly what you need.</h2><p class="esco-catalogue-intro">Search all ${data.entriesTotal} catalogue entries or choose a specialist category. Add products to your Bag, compare guide estimates and request a confirmed delivered quotation. Owner-declared planning stock is 10,000 units per reference, subject to variant and warehouse verification. Card payment only follows full SKU and backend approval.</p><div class="esco-controls"><label class="esco-sr-only" for="esco-search">Search ESCO product catalogue</label><input id="esco-search" class="esco-search" type="search" autocomplete="off" placeholder="Search equipment or model number" data-esco-search><label class="esco-sr-only" for="esco-category-filter">Product category</label><select class="esco-filter" id="esco-category-filter" data-esco-category><option value="">All categories</option>${data.categories.map((c) => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('')}</select><span class="esco-count" role="status" aria-live="polite" data-esco-visible-count>${data.entriesTotal} catalogue entries</span></div><div class="esco-quote-tray" data-esco-quote-tray aria-label="Quotation request list"><div><strong>Your ESCO Bag</strong><span data-esco-quote-count>0 selected</span><p>Choose products, review your guide subtotal and request a final quote. No card charge is taken before confirmation.</p></div><div class="esco-quote-actions"><button type="button" data-esco-clear-quote class="esco-clear" disabled>Clear</button><a class="esco-btn esco-btn-secondary" href="/products/esco/bag/">Review Bag</a><a data-esco-send-quote class="esco-btn" href="/contact/?enquiry=ESCO%20Anand" aria-disabled="true">Request final quote</a></div><p class="esco-guide-subtotal">Bag guide subtotal: <strong data-esco-subtotal>£0.00</strong> <small>ex VAT · freight not included · not payable</small></p><ul data-esco-quote-items aria-live="polite" aria-label="Selected ESCO catalogue products"></ul></div><p class="esco-no-results" data-esco-no-results hidden>No products matched. Try a different name or category.</p>${sections}<div class="esco-notice"><strong>UK procurement information</strong><p>373 guide prices are indicative planning estimates only. Manufacturer costs, import costs, VAT, delivery, warehouse-verified available stock and product-specific UK permissions are required before a firm price, achieved 25% gross margin or card payment can be authorised. The owner's 10,000-unit planning figure for each catalogue reference is not an allocation that can yet be promised to a customer. This collection does not assert CE/UKCA status, MHRA registration, UK stock or immediate dispatch for any item.</p><p class="esco-source">Catalogue source: Eastern Surgical Company (ESCO), 2026. 61 photos are model-code-matched from the supplied ESCO catalogue; the remaining cards show clearly labelled original illustrations, not inaccurate photographs. Medical devices remain subject to UK market placement requirements.</p><a class="esco-btn" href="/contact/?enquiry=ESCO%20Anand%20equipment">Request an ESCO quotation</a></div></div></section>
</main>`;
const sourcePage = read('products/index.html');
const bagMain="<main id=\"main\" class=\"npd-main esco-page esco-bag-page\">\n<section class=\"esco-bag-hero\"><div class=\"esco-wrap\"><p class=\"esco-eyebrow\">NOVAPHARM / ESCO ANAND</p><h1>Your Bag.</h1><p>Simple to build. Clear before you commit.</p></div></section>\n<section class=\"esco-bag-section\"><div class=\"esco-wrap esco-bag-layout\">\n<div class=\"esco-bag-contents\"><h2>Review your selection</h2><p>Products, quantities and indicative UK guide prices. Owner-declared planning quantity is 10,000 units per reference; physical availability and variants are not independently verified. No payment is taken until the exact order is approved.</p><div data-esco-bag-items aria-live=\"polite\"></div><a href=\"/products/esco/\" class=\"esco-direct-quote\">Continue exploring ESCO</a></div>\n<aside class=\"esco-bag-checkout\" aria-label=\"ESCO Bag summary\"><h2>Summary</h2><div class=\"esco-summary-total\"><span>Guide subtotal</span><strong data-esco-bag-total>£0.00</strong></div><p>Ex VAT. Delivery and applicable VAT are calculated on your final quotation, not assumed here.</p><a href=\"/contact/?enquiry=ESCO%20Anand\" class=\"esco-btn\" data-esco-bag-quote aria-disabled=\"true\">Request final quote</a><button type=\"button\" class=\"esco-btn esco-btn-secondary\" data-esco-card-checkout disabled aria-describedby=\"esco-payment-note\">Pay securely by card</button><p id=\"esco-payment-note\" class=\"esco-payment-note\">Card payments become available only when the selected variant, UK permissions, stock, delivery, VAT and trusted server-side charge are approved.</p><p class=\"esco-bag-security\">No card information is collected on this page.</p></aside>\n</div></section></main>";
let bagPage=sourcePage.replace(/<main\b[^>]*\bid="main"[^>]*>[\s\S]*?<\/main>/,bagMain);
if(!bagPage.includes('data-esco-bag-items')) throw Error('Failed ESCO Bag generation');
bagPage=bagPage.replace(/<title>[^<]*<\/title>/,'<title>Your ESCO Bag | NovaPharm</title>');
bagPage=bagPage.replace(/<link rel="canonical" href="[^"]*">/,'<link rel="canonical" href="https://novapharmhealthcare.com/products/esco/bag/">');
bagPage=bagPage.replace('</head>','<meta name="robots" content="noindex,follow">\n<link rel="stylesheet" href="/assets/css/esco-catalogue.css">\n</head>');
bagPage=bagPage.replace('</body>','<script type="module" src="/assets/js/esco-bag.js"></script>\n</body>');
write('products/esco/bag/index.html',bagPage);
const detailMain = `<main id="main" class="npd-main esco-page esco-detail-page" data-esco-detail-page>
<section class="esco-detail-section"><div class="esco-wrap">
<nav class="esco-detail-breadcrumb" aria-label="Breadcrumb"><a href="/products/">Products</a><span aria-hidden="true">/</span><a href="/products/esco/">ESCO Anand</a><span aria-hidden="true">/</span><span>Product details</span></nav>
<div class="esco-detail-layout">
<div class="esco-detail-visual"><div class="esco-detail-picture"><img data-esco-detail-image src="/assets/media/esco/previews/esco-cat-0001.svg" hidden alt=""></div><p class="esco-detail-image-note" data-esco-detail-photo-note>Loading the available product image…</p></div>
<section class="esco-detail-info" aria-label="ESCO product information"><p class="esco-eyebrow">ESCO ANAND / PRODUCT GUIDE</p><p class="esco-detail-category" data-esco-detail-category>Official ESCO 2026 catalogue</p><h1 data-esco-detail-title>Loading product details…</h1><p class="esco-detail-model" data-esco-detail-model></p><p class="esco-detail-reference" data-esco-detail-reference></p>
<div class="esco-detail-price"><span>Indicative UK guide, per unit</span><strong data-esco-detail-price>—</strong><small>Excluding VAT and delivery · research estimate, not a confirmed offer</small></div>
<div class="esco-detail-purchase"><label for="esco-detail-quantity">Quantity</label><input id="esco-detail-quantity" data-esco-detail-quantity type="number" min="1" max="1000" step="1" inputmode="numeric" value="1"><button type="button" class="esco-btn" data-esco-detail-add disabled>Add to Bag</button><a href="/products/esco/bag/" class="esco-btn esco-btn-secondary">Review Bag</a></div>
<p class="esco-detail-status" data-esco-detail-status role="status" aria-live="polite">Loading catalogue evidence…</p>
<a class="esco-direct-quote" data-esco-detail-quote href="/contact/?enquiry=ESCO%20Anand">Ask for a confirmed quotation</a>
<div class="esco-detail-disclosure"><h2>Before you buy</h2><p>The guide price is not a final selling price. Exact model, manufacturer photo, supplier cost, UK product requirements, applicable VAT, delivery and availability must be confirmed before a firm offer or payment. This product page never collects card information.</p></div>
</section>
</div>
</div></section></main>`;
let detailPage = sourcePage.replace(/<main\b[^>]*\bid="main"[^>]*>[\s\S]*?<\/main>/,detailMain);
if (!detailPage.includes('data-esco-detail-page')) throw Error('Failed ESCO product detail generation');
detailPage=detailPage.replace(/<title>[^<]*<\/title>/,'<title>ESCO Anand Product | NovaPharm</title>');
detailPage=detailPage.replace(/<link rel="canonical" href="[^"]*">/,'<link rel="canonical" href="https://novapharmhealthcare.com/products/esco/product/">');
detailPage=detailPage.replace('</head>','<meta name="robots" content="noindex,follow">\n<link rel="stylesheet" href="/assets/css/esco-catalogue.css">\n</head>');
detailPage=detailPage.replace('</body>','<script type="module" src="/assets/js/esco-product-detail.js"></script>\n</body>');
write('products/esco/product/index.html',detailPage);

if (!sourcePage.includes('<main id="main"')) throw Error('No valid Products page available as ESCO template');
let esco = sourcePage.replace(/<main\b[^>]*\bid="main"[^>]*>[\s\S]*?<\/main>/, main);
if (!esco.includes('<main id="main" class="npd-main esco-page">')) throw Error('Could not materialise ESCO collection');
esco = esco.replace(/<title>[^<]*<\/title>/, '<title>ESCO Anand | Hospital, Surgical and Laboratory Products | NovaPharm</title>');
esco = esco.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="Browse the ESCO Anand 2026 range: 373 hospital, surgical and laboratory catalogue entries. Qualified UK procurement quotations from NovaPharm.">');
esco = esco.replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="https://novapharmhealthcare.com/products/esco/">');
esco = esco.replace(/<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="https://novapharmhealthcare.com/products/esco/">');
esco = esco.replace(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="ESCO Anand | Healthcare Product Catalogue | NovaPharm">');
esco = esco.replace('</head>', '<link rel="stylesheet" href="/assets/css/esco-catalogue.css">\n</head>');
esco = esco.replace('</body>', '<script type="module" src="/assets/js/esco-catalogue.js"></script>\n</body>');
const schema = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'ESCO Anand hospital, surgical and laboratory catalogue', url: 'https://novapharmhealthcare.com/products/esco/', isPartOf: { '@type': 'WebSite', name: 'NovaPharm Healthcare', url: 'https://novapharmhealthcare.com/' }, about: { '@type': 'Organization', name: 'Eastern Surgical Company (ESCO)' } };
esco = esco.replace('</head>', `<script type="application/ld+json">${JSON.stringify(schema)}</script>\n</head>`);
write('products/esco/index.html', esco);
const teaser = `<section class="npd-section" id="esco-collection" aria-labelledby="esco-overview-title"><div class="container"><p class="esco-eyebrow">HOSPITAL / SURGICAL / LABORATORY</p><h2 id="esco-overview-title">Introducing ESCO Anand.</h2><p>Explore ${data.entriesTotal} entries across 12 specialist medical and healthcare ranges, with model-matched photographs, product-specific concept visuals, UK price guides and a simple customer Bag.</p><a class="npd-apple-text-link" href="/products/esco/">Explore the ESCO collection</a></div></section>`;
const products = sourcePage.includes('id="esco-collection"') ? sourcePage : sourcePage.replace('</main>', teaser + '</main>');
write('products/index.html', products);
console.log(`Materialised ESCO collection: ${entries.length} entries, ${data.categories.length} categories, quotation only.`);
