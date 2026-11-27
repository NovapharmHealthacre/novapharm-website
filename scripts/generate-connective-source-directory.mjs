/**
 * Generate a discoverable Connective collection from public supplier references.
 * Source references are NOT retail approvals. Approved product pages built by
 * generate-retail-expansion.mjs always take precedence over this fallback.
 * No prices, warehouse availability, Add-to-Bag controls or medicine claims are
 * generated until the authoritative catalogue/checkout has approved an offer.
 */
import assert from 'node:assert/strict';
import { parse } from 'parse5';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = process.cwd();
const path = p => resolve(root, p);
const read = p => readFileSync(path(p), 'utf8');
const write = (p, value) => { mkdirSync(dirname(path(p)), {recursive: true}); writeFileSync(path(p), value, 'utf8'); };
const sourceFile = 'src/content/connective-source-references.json';
const approvedFile = 'src/content/approved-consumer-catalogue.json';
const collectionRoute = '/products/health-and-wellbeing/';
const baseUrl = 'https://novapharmhealthcare.com';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const escapeJson = value => JSON.stringify(value).replace(/</g, '\\u003c');
const validText = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 180 && !/[\u0000-\u001f]/.test(value);
function validGtin(value) {
  if (typeof value !== 'string' || !/^\d{13}$/.test(value)) return false;
  const digits = [...value].map(Number);
  const check = (10 - [...digits.slice(0, -1)].reverse().reduce((sum, digit, i) => sum + digit * (i % 2 ? 1 : 3), 0) % 10) % 10;
  return check === digits.at(-1);
}
function safeUrl(raw, purpose) {
  if (raw === null || raw === undefined) return '';
  assert(typeof raw === 'string' && raw.length < 2000, 'Unusable supplier URL');
  const url = new URL(raw);
  assert(url.protocol === 'https:' && !url.username && !url.password && !url.port, 'Untrusted source URL');
  if (purpose === 'supplier') assert(['www.connectivepharma.com', 'www.vitabiotics.com'].includes(url.hostname), 'Untrusted supplier host');
  if (purpose === 'image') assert(['www.connectivepharma.com', 'cdn.shopify.com'].includes(url.hostname), 'Untrusted supplier pack-image host');
  return raw;
}
function image(p, eager=false) {
  if (!p.supplierImageUrl) return `<div class="npr-pack-frame npr-source-image-fallback" aria-label="${escapeHtml(p.brand)} product identity"><span>${escapeHtml(p.brand)}</span></div>`;
  return `<span class="npr-pack-frame"><img src="${escapeHtml(p.supplierImageUrl)}" alt="${escapeHtml(p.name)} product photograph" loading="${eager ? 'eager' : 'lazy'}" decoding="async" referrerpolicy="no-referrer" width="480" height="480"></span>`;
}
function metadataPage(shell, route, title, description, main, {indexable=false, script='', schema=null}={}) {
  const oldMain = shell.match(/<main\b[^>]*>[\s\S]*?<\/main>/i);
  assert(oldMain, 'Original approved Products shell has no main landmark');
  let html = shell.replace(oldMain[0], () => main);
  // The shell supplies the authentic global header/footer, accessibility and
  // navigation. Prevent inherited Products social and structured data claims.
  // Remove inherited social metadata and schema via parsed HTML source
  // boundaries. Never use a regex to remove a script element: incomplete
  // multi-character sanitisation can leave executable HTML behind.
  const document = parse(html, {sourceCodeLocationInfo:true});
  const ranges = [];
  function visit(node) {
    const attrs=Object.fromEntries((node.attrs||[]).map(a=>[a.name,a.value]));
    const social=node.nodeName==='meta' &&
      [attrs.name,attrs.property].some(v=>typeof v==='string' && /^(?:og:|twitter:)/i.test(v));
    const structured=node.nodeName==='script' &&
      attrs.type?.toLowerCase()==='application/ld+json';
    const marker=node.nodeName==='#comment' &&
      /^\s*page-specific-social-(?:start|end)\s*$/.test(node.data||'');
    if(social||structured||marker) {
      const loc=node.sourceCodeLocation;
      assert(loc&&Number.isSafeInteger(loc.startOffset)&&Number.isSafeInteger(loc.endOffset)&&
        loc.startOffset>=0&&loc.endOffset<=html.length&&loc.startOffset<loc.endOffset,
        'Unlocatable inherited metadata');
      ranges.push([loc.startOffset,loc.endOffset]);
    }
    for(const child of node.childNodes||[])visit(child);
    if(node.content)visit(node.content);
  }
  visit(document);
  for(const [start,end] of ranges.sort((x,y)=>y[0]-x[0])){
    html=html.slice(0,start)+html.slice(end);
  }
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = html.replace(/<link rel="canonical" href="[^"]*">/i, `<link rel="canonical" href="${baseUrl+route}">`);
  html = html.replace(/<meta name="description" content="[^"]*">/i, `<meta name="description" content="${escapeHtml(description)}">`);
  html = html.replace(/<meta name="robots" content="[^"]*">/i, `<meta name="robots" content="${indexable ? 'index, follow' : 'noindex, follow'}">`);
  html = html.replace(/<link rel="alternate" hreflang="([^"]*)" href="[^"]*">/gi, (_m,lang)=>`<link rel="alternate" hreflang="${escapeHtml(lang)}" href="${baseUrl+route}">`);
  html = html.replace(/\bdata-route="[^"]*"/, `data-route="${route}"`);
  const extra = `<meta property="og:type" content="${schema?.['@type']==='Product' ? 'product' : 'website'}">`+
    `<meta property="og:title" content="${escapeHtml(title)}">`+
    `<meta property="og:description" content="${escapeHtml(description)}">`+
    `<meta property="og:url" content="${baseUrl+route}">`+
    `<meta name="twitter:card" content="summary">`+
    (schema ? `<script type="application/ld+json">${escapeJson(schema)}</script>` : '')+
    `<link rel="stylesheet" href="/assets/css/retail-expansion.css">`+
    (script ? `<script type="module" src="${escapeHtml(script)}"></script>` : '');
  html = html.replace('</head>', extra+'</head>');
  assert.equal((html.match(/<main\b/gi)||[]).length, 1, 'Duplicate main landmark');
  assert.equal((html.match(/<h1\b/gi)||[]).length, 1, 'Expected one H1');
  write(route.slice(1)+'index.html', html);
}

if (!existsSync(path(sourceFile))) {
  console.log('Reference-directory fallback not needed: source absent');
} else {
  const data = JSON.parse(read(sourceFile));
  assert(data.schema === 'novapharm-connective-source-references-v1' && Array.isArray(data.products), 'Unknown source catalogue schema');
  if (process.env.NPR_SOURCE_TEST !== '1') assert.equal(data.products.length, 395, 'Incomplete source directory');
  const seen = new Set();
  const products = data.products.map(p => {
    assert(p && validGtin(p.ean) && !seen.has(p.ean), 'Invalid or duplicate GTIN');
    seen.add(p.ean);
    for (const k of ['brand','name','pack']) assert(validText(p[k]), 'Missing supplier '+k);
    assert(['routine_class_review','herbal_tea_vat_and_ingredients_review','medicine_class_review'].includes(p.classificationReview), 'Unknown product status');
    assert(safeUrl(p.supplierProductUrl, 'supplier'), 'Missing source page');
    safeUrl(p.supplierImageUrl, 'image');
    safeUrl(p.manufacturerProductUrl, 'manufacturer');
    return p;
  });
  // Approved details are generated by generate-retail-expansion before this pass.
  // Keep those exact retail pages and add only the remaining source references.
  const approved = existsSync(path(approvedFile)) ? JSON.parse(read(approvedFile)) : [];
  assert(Array.isArray(approved), 'Invalid approved catalogue');
  const approvedIds = new Set(approved.map(p=>p.ean));
  if (approvedIds.size) {
    for (const p of approved) assert(existsSync(path(collectionRoute.slice(1)+p.ean+'/index.html')), 'Approved product detail not generated');
    assert(existsSync(path(collectionRoute.slice(1)+'index.html')), 'Approved collection not generated');
  }
  // Display owner-authorised guide prices on browse-only non-medicine references.
  // The server-side retail offer ledger alone decides whether checkout is enabled.
  const guidePrices = new Map();
  const priceGuideFile = 'assets/data/connective-owner-price-guide.json';
  if (existsSync(path(priceGuideFile))) {
    const guide = JSON.parse(read(priceGuideFile));
    assert(guide?.schema === 'novapharm.connective.owner-price-guide.v1' &&
      guide.currency === 'GBP' && guide.status === 'OWNER_AUTHORISED_GUIDE_NOT_LIVE_PAYMENT_OFFER' &&
      Array.isArray(guide.entries) && guide.entries.length <= 395, 'Invalid owner guide price register');
    const byGtin = new Map(products.map(p=>[p.ean,p]));
    for (const record of guide.entries) {
      const product = byGtin.get(record?.gtin);
      assert(product && !approvedIds.has(record.gtin) &&
        product.classificationReview !== 'medicine_class_review' &&
        !guidePrices.has(record.gtin) &&
        Number.isSafeInteger(record.guideGrossMinor) &&
        record.guideGrossMinor > 0 && record.guideGrossMinor <= 99999999 &&
        Object.keys(record).every(k=>['gtin','guideGrossMinor'].includes(k)),
        'Unsafe, duplicate or unsupported guide price identity');
      guidePrices.set(record.gtin,record.guideGrossMinor);
    }
  }
  const guidePrice = p => guidePrices.has(p.ean)
    ? '<p class="npr-reference npr-guide-price" data-npr-price-guide="'+escapeHtml(p.ean)+'">' +
      'Guide price £'+(guidePrices.get(p.ean)/100).toFixed(2)+
      ' <span>· Final price and availability confirmed before payment</span></p>'
    : '';
  const remaining = products.filter(p=>!approvedIds.has(p.ean));
  const brands = new Map();
  for (const p of remaining) {
    const normalizedBrand = p.brand.toLocaleLowerCase('en-GB');
    if (!brands.has(normalizedBrand)) brands.set(normalizedBrand, {name:p.brand, items:[]});
    brands.get(normalizedBrand).items.push(p);
  }
  // Only source-linked, manufacturer-online information is shown here.
  // It is not evidence of checked physical pack labels, image rights, prices or stock.
  const manufacturerInfo = new Map();
  const labelFile = 'src/content/connective-first-seven-manufacturer-info.json';
  if (existsSync(path(labelFile))) {
    const labels = JSON.parse(read(labelFile));
    assert(labels.schema === 'novapharm-connective-manufacturer-online-reference-v1' &&
      labels.notLicenceEvidence === true && labels.requiresPackReview === true &&
      Array.isArray(labels.products), 'Invalid manufacturer information status');
    for (const entry of labels.products) {
      const parent=products.find(p=>p.ean===entry.ean);
      assert(parent && !manufacturerInfo.has(entry.ean) && entry.name === parent.name,
        'Unmatched or duplicated manufacturer product reference');
      assert(safeUrl(entry.manufacturerUrl, 'manufacturer') === parent.manufacturerProductUrl &&
        new URL(entry.manufacturerUrl).hostname === 'www.vitabiotics.com', 'Manufacturer source mismatch');
      assert(entry.verifiedCurrentPackLabel === false && entry.retailOfferApproved === false &&
        entry.status === 'manufacturer_online_reference_pack_label_match_pending', 'Unverified release assertion');
      for(const key of ['ingredients','allergens','directions','precautions'])
        assert(typeof entry[key] === 'string' && entry[key].length > 15 && entry[key].length < 2000,
          'Incomplete manufacturer field: '+key);
      manufacturerInfo.set(entry.ean,entry);
    }
  }
  const groups = [...brands.values()].sort((a,b)=>a.name.localeCompare(b.name,'en-GB'));
  const shell = read('products/index.html');
  const card = p => {
    const route=collectionRoute+p.ean+'/';
    return `<article class="npr-card"><a href="${route}" class="npr-card-link">${image(p)}`+
      `<div class="npr-card-copy"><p class="npr-kicker">${escapeHtml(p.brand)}</p><h3>${escapeHtml(p.name)}</h3>`+
      `<p class="npr-pack-size">${escapeHtml(p.pack)}</p>${guidePrice(p)}</div></a>`+
      `<a class="npr-card-action" href="${route}">View product <span aria-hidden="true">→</span></a></article>`;
  };
  const groupHtml = groups.map((group,i)=>`<section class="npr-wrap npr-section" id="brand-${i}" data-npr-collection-section>`+
    `<div class="npr-collection-heading"><h2>${escapeHtml(group.name)}</h2><span>${group.items.length} products</span></div>`+
    `<div class="npr-grid">${group.items.map(card).join('')}</div></section>`).join('');
  const intro = `<main id="main" class="npr-main"><section class="npr-wrap npr-section">`+
    `<p class="npr-kicker">NOVAPHARM / HEALTH &amp; WELLBEING</p><h1>Explore the collection.</h1>`+
    `<p>Discover ${products.length} health and wellbeing products from leading brands. `+
    `Details and ordering options are updated as individual products are verified for sale.</p>`+
    `<div class="npr-collection-search"><label for="npr-collection-search">Search products</label>`+
    `<input id="npr-collection-search" type="search" autocomplete="off" data-npr-collection-query placeholder="Search brand or product">`+
    `<p role="status" aria-live="polite" data-npr-collection-status>Showing ${products.length} products</p></div>`+
    `<nav class="npr-categories" aria-label="Product brands">${groups.map((g,i)=>`<a href="#brand-${i}">${escapeHtml(g.name)}</a>`).join('')}</nav>`+
    `</section>${groupHtml}<p class="npr-wrap npr-no-results" data-npr-collection-empty hidden>No matching products found.</p></main>`;
  if (approvedIds.size) {
    // Retain the approved collection's purchasing widgets, scripts and metadata.
    // Replace only our own supplemental section on repeat generation.
    const target=collectionRoute.slice(1)+'index.html';
    let html=read(target).replace(/<!-- npr-additional-reference-start -->[\s\S]*?<!-- npr-additional-reference-end -->/g,'');
    if (remaining.length) {
      assert(html.includes('</main>'), 'Approved collection main missing');
      html=html.replace('</main>', '<!-- npr-additional-reference-start --><div data-npr-additional-reference>'+groupHtml+'</div><!-- npr-additional-reference-end --></main>');
    }
    write(target,html);
  } else {
    metadataPage(shell, collectionRoute, 'Health and wellbeing products | NovaPharm Healthcare',
      `Browse ${products.length} health and wellbeing products by brand and product name.`, intro, {indexable:true,
        script:'/assets/js/connective-collection-search.js',schema:{'@context':'https://schema.org','@type':'CollectionPage',name:'Health and wellbeing',url:baseUrl+collectionRoute}});
  }
  for (const p of remaining) {
    const route=collectionRoute+p.ean+'/';
    const label=manufacturerInfo.get(p.ean);
    const labelNotice=label
      ? `<p class="npr-reference" data-npr-order-notice>Manufacturer's online product information, reviewed 26 November 2026. The current UK pack label is not yet certified. Online ordering is not available for this item yet.</p>`
      : `<p class="npr-reference" data-npr-order-notice>Full ingredients, directions, warnings and final ordering terms must be confirmed on this page before checkout is available.</p>`;
    const labelDetails=label
      ? `<section class="npr-wrap npr-section npr-source-manufacturer-details" aria-labelledby="manufacturer-info-heading"><h2 id="manufacturer-info-heading">Manufacturer information</h2>`+
        `<h3>Ingredient reference</h3><p>${escapeHtml(label.ingredients)}</p>`+
        `<h3>Allergens</h3><p>${escapeHtml(label.allergens)}</p>`+
        `<h3>Directions</h3><p>${escapeHtml(label.directions)}</p>`+
        `<h3>Precautions</h3><p>${escapeHtml(label.precautions)}</p>`+
        `<p class="npr-reference">Check the actual packaging before use.</p></section>`
      : '';
    // Sourcing URLs are validation inputs, not customer destinations. All
    // purchases use the existing NovaPharm retail bag and approved offer path.
    const shoppingLinks = `<a class="npr-card-action" href="/products/nutraxin/bag/">View your shopping bag</a>`+
      ` <a class="npr-card-action" href="${collectionRoute}">Continue shopping</a>`;
    const main = `<main id="main" class="npr-main"><nav class="npr-wrap npr-categories npr-source-breadcrumb" aria-label="Breadcrumb">`+
      `<a href="/products/">Products</a><a href="${collectionRoute}">Health and wellbeing</a><span aria-current="page">${escapeHtml(p.name)}</span></nav>`+
      `<section class="npr-wrap npr-hero npr-detail-hero npr-source-detail"><div class="npr-hero-media">${image(p,true)}</div>`+
      `<div class="npr-detail-copy"><p class="npr-kicker">${escapeHtml(p.brand)}</p><h1>${escapeHtml(p.name)}</h1>`+
      `<p class="npr-detail-pack">${escapeHtml(p.pack)}</p><p class="npr-reference">GTIN ${escapeHtml(p.ean)}</p>`+
      `<p>Part of NovaPharm's health and wellbeing collection.</p>`+
      labelNotice+guidePrice(p)+`<div data-npr-retail-sku="NP-CP-${escapeHtml(p.ean)}"></div>`+
      `<div class="npr-source-links">${shoppingLinks}</div></div></section>`+
      `<section class="npr-wrap npr-section"><h2>Product information</h2>`+
      `<p>Pack: ${escapeHtml(p.pack)} · Brand: ${escapeHtml(p.brand)} · GTIN: ${escapeHtml(p.ean)}</p>`+
      `<p>All available products are ordered directly from NovaPharm Healthcare through our secure checkout.</p>`+
      `<a href="${collectionRoute}" class="npr-card-action">Explore more products <span aria-hidden="true">→</span></a></section>`+
      labelDetails+`</main>`;
    const schema={'@context':'https://schema.org','@type':'Product','@id':baseUrl+route+'#product',name:p.name,gtin13:p.ean,brand:{'@type':'Brand',name:p.brand},url:baseUrl+route};
    metadataPage(shell, route, `${p.name} | NovaPharm Healthcare`, `${p.brand} ${p.name}. ${p.pack}. Source-backed UK product reference.`,main,{script:'/assets/js/nutraxin-retail-store.js',schema});
  }
  let overview = read('products/index.html');
  overview = overview.replace(/<section\b[^>]*data-npr-source-collection[^>]*>[\s\S]*?<\/section>/gi, '');
  // The approved generator already inserted its own collection entry.
  if (!approvedIds.size && !overview.includes('data-nps-quick')) {
  const firstWithManufacturer=products.find(p=>p.manufacturerProductUrl&&p.supplierImageUrl)||products.find(p=>p.supplierImageUrl);
  const heroMedia=firstWithManufacturer?`<div class="np-products-panel-art np-products-panel-art-nutraxin"><img src="${escapeHtml(firstWithManufacturer.supplierImageUrl)}" alt="${escapeHtml(firstWithManufacturer.name)} product photograph" loading="lazy" decoding="async" referrerpolicy="no-referrer" width="700" height="700"></div>`:'';
  const panel=`<section class="np-products-panel np-products-panel-nutraxin" data-npr-source-collection aria-labelledby="np-connective-heading"><div class="np-products-wrap np-products-panel-inner"><div class="np-products-panel-copy">`+
    `<p class="np-products-kicker">HEALTH AND WELLBEING</p><h2 id="np-connective-heading">Products, thoughtfully selected.</h2>`+
    `<p class="np-products-panel-lead">Explore ${products.length} health and wellbeing references from leading brands.</p>`+
    `<a class="np-products-link" href="${collectionRoute}">Explore the collection <span aria-hidden="true">›</span></a></div>${heroMedia}</div></section>`;
  assert(overview.includes('</main>'), 'Products overview main landmark missing');
  overview=overview.replace('</main>', panel+'</main>');
  write('products/index.html',overview);
  }
  console.log(`Generated ${remaining.length} Connective reference pages; preserved ${approvedIds.size} approved product pages and their on-site checkout.`);
}
