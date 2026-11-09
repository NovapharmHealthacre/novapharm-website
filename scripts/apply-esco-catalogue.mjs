import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
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
for (const item of entries) {
  if (!item.name || !item.subcategory || !Number.isInteger(item.sourceIndexPage)) throw Error('Unresolved ESCO catalogue row');
  if (item.priceGbp !== null || item.sellable !== false) throw Error('Unverified ESCO item must not have public prices or sellable flag');
}
const productPicture = (p, category) => {
  const img = imageManifest.images[p.id];
  if (img && img.model === p.model && /^[/]assets[/]media[/]esco[/]esco-p[0-9]{2}-image[0-9]{2}[.]webp$/.test(img.path)) {
    return `<img class="esco-product-image" src="${esc(img.path)}" width="480" height="480" loading="lazy" decoding="async" alt="ESCO catalogue photograph labelled ${esc(p.model)} for ${esc(p.name)}"><span class="esco-product-art-caption">Model-matched ESCO catalogue photo · supplied variant may differ</span>`;
  }
  return `<div class="esco-product-art" data-esco-photo="${esc(category.representativeImage)}" role="img" aria-label="Illustrative supplier-catalogue image for ${esc(category.name)}, not a verified individual product photograph"></div><span class="esco-product-art-caption">Supplier category image · exact variant to be confirmed</span>`;
};
if (imageManifest.mappedImagesCount !== 61 || Object.keys(imageManifest.images).length !== 61) throw Error('ESCO source photo manifest count mismatch');
for (const [id, image] of Object.entries(imageManifest.images)) {
  const item = entries.find((p) => p.id === id);
  if (!item || !item.model || item.model !== image.model) throw Error('ESCO image-to-model identity unresolved: ' + id);
}
const contact = (item) => '/contact/?enquiry=Distribution%20partnership&quote=' + encodeURIComponent('ESCO Anand UK quotation request (catalogue 2026). Items: ' + item.id + ' qty 1. Please confirm variant, UK compliance, total delivered price and lead time.');
const sections = data.categories.map((category, i) => {
  const subs = [...new Set(category.entries.map((item) => item.subcategory))];
  const groups = subs.map((sub) => {
    const cards = category.entries.filter((p) => p.subcategory === sub).map((p) => `<article class="esco-product" data-esco-entry data-esco-category="${esc(category.name)}" data-esco-search="${esc([p.name, p.model, p.id, p.subcategory, category.name].filter(Boolean).join(' '))}">${productPicture(p, category)}<h4>${esc(p.name)}</h4><span class="esco-model">${p.model ? 'ESCO ' + esc(p.model) : 'Model to be confirmed'}</span><span class="esco-ref">${esc(p.id)} · Source catalogue index p. ${p.sourceIndexPage}</span><button type="button" class="esco-quote-add" data-esco-add="${esc(p.id)}" aria-label="Add ${esc(p.name)} to a quotation request">Add to quote list</button><a href="${esc(contact(p))}" class="esco-direct-quote" aria-label="Individual enquiry for ${esc(p.name)}">Individual enquiry</a></article>`).join('');
    return `<h4 class="esco-subcat" data-esco-subcategory>${esc(sub)}</h4><div class="esco-grid">${cards}</div>`;
  });
  return `<section class="esco-section" data-esco-section id="esco-range-${i + 1}" aria-labelledby="esco-range-heading-${i + 1}"><div class="esco-section-header"><h3 id="esco-range-heading-${i + 1}">${esc(category.name)}</h3><span class="esco-section-count">${category.entries.length} catalogue entries</span></div>${groups.join('')}</section>`;
}).join('');
const categoryCards = data.categories.map((category, i) => `<a class="esco-category" href="#esco-range-${i + 1}"><div class="esco-category-image" data-esco-photo="${esc(category.representativeImage)}" role="img" aria-label="Representative ESCO catalogue image for ${esc(category.name)}"></div><div class="esco-category-body"><h3>${esc(category.name)}</h3><small>${category.entries.length} catalogue entries</small><p class="esco-photo-caption">Representative supplier-catalogue imagery, not a photograph of every listed variant</p></div></a>`).join('');
const main = `<main id="main" class="npd-main esco-page">
<header class="esco-hero"><div class="esco-wrap"><p class="esco-eyebrow">NOVAPHARM / PRODUCTS / ESCO ANAND</p><h1>Healthcare solutions.<br>Considered in detail.</h1><p>Explore Eastern Surgical Company's 2026 product catalogue, organised for UK hospital, surgical and laboratory procurement.</p><div class="esco-actions"><a class="esco-btn" href="#esco-catalogue">Explore the catalogue</a><a class="esco-btn esco-btn-secondary" href="/contact/?enquiry=ESCO%20Anand%20equipment">Discuss a procurement requirement</a></div></div></header>
<section class="esco-summary"><div class="esco-wrap"><p class="esco-eyebrow">THE COLLECTION</p><h2>One catalogue. Twelve specialist ranges.</h2><p>${data.entriesTotal} indexed product references, including configurable product families. Pricing, specifications and UK availability are subject to manufacturer quotation and item-level confirmation. This is not an online payment or inventory offer.</p></div></section>
<section class="esco-categories"><div class="esco-wrap"><div class="esco-category-grid">${categoryCards}</div></div></section>
<section class="esco-catalogue" id="esco-catalogue" data-esco-catalogue><div class="esco-wrap"><p class="esco-eyebrow">EVERY CATALOGUE REFERENCE</p><h2>Find exactly what you need.</h2><p class="esco-catalogue-intro">Search all ${data.entriesTotal} catalogue entries or choose a specialist category. Use the request-quotation link to discuss a model and specification with NovaPharm.</p><div class="esco-controls"><label class="esco-sr-only" for="esco-search">Search ESCO product catalogue</label><input id="esco-search" class="esco-search" type="search" autocomplete="off" placeholder="Search equipment or model number" data-esco-search><label class="esco-sr-only" for="esco-category-filter">Product category</label><select class="esco-filter" id="esco-category-filter" data-esco-category><option value="">All categories</option>${data.categories.map((c) => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('')}</select><span class="esco-count" role="status" aria-live="polite" data-esco-visible-count>${data.entriesTotal} catalogue entries</span></div><div class="esco-quote-tray" data-esco-quote-tray aria-label="Quotation request list"><div><strong>Your quote list</strong><span data-esco-quote-count>0 selected</span><p>Add the equipment you are interested in, then submit one enquiry. Prices and supply are confirmed individually.</p></div><div class="esco-quote-actions"><button type="button" data-esco-clear-quote class="esco-clear" disabled>Clear</button><a data-esco-send-quote class="esco-btn" href="/contact/?enquiry=ESCO%20Anand" aria-disabled="true">Request a quotation</a></div><ul data-esco-quote-items aria-live="polite" aria-label="Selected ESCO catalogue products"></ul></div><p class="esco-no-results" data-esco-no-results hidden>No products matched. Try a different name or category.</p>${sections}<div class="esco-notice"><strong>UK procurement information</strong><p>Prices are available by quotation. Manufacturer costs, imports, duty, storage, delivery, VAT treatment, regulatory evidence and other applicable selling costs must be assessed before a firm price or 25% target gross margin can be confirmed. This collection does not assert CE/UKCA status, MHRA registration, UK stock or immediate dispatch for any item.</p><p class="esco-source">Catalogue source: Eastern Surgical Company (ESCO), 2026. Category photographs are extracted from the supplied catalogue and are illustrative. Medical devices are subject to applicable UK market placement requirements.</p><a class="esco-btn" href="/contact/?enquiry=ESCO%20Anand%20equipment">Request an ESCO quotation</a></div></div></section>
</main>`;
const sourcePage = read('products/index.html');
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
const teaser = `<section class="npd-section" id="esco-collection" aria-labelledby="esco-overview-title"><div class="container"><p class="esco-eyebrow">HOSPITAL / SURGICAL / LABORATORY</p><h2 id="esco-overview-title">Introducing ESCO Anand.</h2><p>Explore ${data.entriesTotal} entries across 12 specialist medical and healthcare ranges, with authentic supplier-catalogue category imagery and a qualified UK quotation pathway.</p><a class="npd-apple-text-link" href="/products/esco/">Explore the ESCO collection</a></div></section>`;
const products = sourcePage.includes('id="esco-collection"') ? sourcePage : sourcePage.replace('</main>', teaser + '</main>');
write('products/index.html', products);
console.log(`Materialised ESCO collection: ${entries.length} entries, ${data.categories.length} categories, quotation only.`);
