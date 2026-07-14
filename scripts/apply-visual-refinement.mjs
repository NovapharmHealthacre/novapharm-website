import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(process.cwd());
const visualScript = '<script src="/assets/js/visual-refinement.js" defer></script>';
const stockDisclosure = "Representative licensed stock image; not a NovaPharm-owned facility, vehicle, product or current inventory.";

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function write(relativePath, content) {
  writeFileSync(join(root, relativePath), content);
}

function replaceRequired(content, search, replacement, label) {
  const updated = typeof search === "string"
    ? content.replace(search, replacement)
    : content.replace(search, replacement);
  if (updated === content) throw new Error(`Visual refinement could not find ${label}.`);
  return updated;
}

function replaceRange(content, startMarker, endMarker, replacement, label) {
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`Visual refinement could not locate ${label}.`);
  }
  return `${content.slice(0, start)}${replacement}${content.slice(end)}`;
}

function picture(base, alt, { eager = false, caption = stockDisclosure } = {}) {
  return `<figure><picture><source srcset="${base}.avif" type="image/avif"><source srcset="${base}.webp" type="image/webp"><img src="${base}.jpg" alt="${alt}" width="1600" height="900" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></picture>${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`;
}

const partnerVisuals = [
  ["GMP manufacturers", "Qualified manufacturing relationships", "/assets/media/products/respiratory-manufacturing", "Protected specialists monitoring a controlled medicine-packaging line"],
  ["CMO and CDMO partners", "Development, transfer and scalable manufacture", "/assets/media/products/oral-liquid-formulation", "Gloved specialist assessing an amber bottle during liquid-formulation analysis"],
  ["Product and dossier owners", "Evidence-backed product opportunities", "/assets/media/products/oncology-vial-handling", "Gloved laboratory professional handling a vial in a controlled scientific setting"],
  ["Marketing-authorisation holders", "Rights, responsibilities and lifecycle alignment", "/assets/media/products/licensed-generics-packaging", "Unbranded medicine blister packs held for representative packaging review"],
  ["European licensed wholesalers", "Qualified cross-border sourcing routes", "/assets/media/products/specialty-pharmacy-handling", "Laboratory specialist conducting controlled multichannel sample analysis"],
  ["UK pharmaceutical wholesalers", "Compliant domestic B2B collaboration", "/assets/media/products/hospital-supply-logistics", "Sealed cartons arranged inside a delivery vehicle for controlled logistics handling"],
  ["Independent pharmacies and pharmacy groups", "Account readiness and responsible access", "/assets/media/products/cardiovascular-quality-control", "Laboratory scientist recording quality-control observations"],
  ["NHS and private hospital procurement", "Qualified procurement conversations only", "/assets/media/products/hospital-supply-logistics", "Sealed cartons prepared for representative controlled logistics handling"],
  ["Logistics and cold-chain providers", "Outsourced activity under defined oversight", "/assets/media/products/hospital-supply-logistics", "Representative sealed pharmaceutical logistics cartons"],
  ["Technology, data, regulatory and quality specialists", "Connected systems with human accountability", "/assets/media/products/metabolic-laboratory-analysis", "Scientist holding laboratory flasks during controlled analysis"]
];

function partnerCards(limit = partnerVisuals.length) {
  return partnerVisuals.slice(0, limit).map(([title, text, base, alt], index) => `
    <article class="partner-ecosystem-card">
      ${picture(base, alt, { caption: "" })}
      <div class="partner-ecosystem-copy"><span class="partner-ecosystem-index">${String(index + 1).padStart(2, "0")}</span><h3>${title}</h3><p>${text}</p></div>
    </article>`).join("");
}

function enhanceHome() {
  let html = read("index.html");

  const hero = `<section class="hero hero-flagship" data-motion-paused="false">
    <div class="hero-media" aria-hidden="true"><picture><source media="(max-width: 760px)" srcset="/assets/media/home/supply-network-hero-1200.jpg"><img src="/assets/media/home/supply-network-hero.jpg" srcset="/assets/media/home/supply-network-hero-1200.jpg 1200w, /assets/media/home/supply-network-hero.jpg 1672w" sizes="100vw" alt="" width="1672" height="941" fetchpriority="high" decoding="async"></picture></div>
    <div class="hero-cinematic-layer" aria-hidden="true"><div class="hero-cinematic-grid"></div><div class="hero-cinematic-orbit"></div><div class="hero-signal-stack"><div class="hero-signal-card"><span>01</span><strong>Regulatory sequence</strong><small>Permission before supply</small></div><div class="hero-signal-card"><span>02</span><strong>Qualified sourcing</strong><small>Evidence before onboarding</small></div><div class="hero-signal-card"><span>03</span><strong>Evidence continuity</strong><small>Batch to governed transaction</small></div></div></div>
    <button class="motion-toggle" type="button" data-motion-toggle aria-pressed="false">Pause motion</button>
    <div class="container hero-content"><div class="hero-copy"><span class="eyebrow">UK pharmaceutical company</span><h1>Building a more resilient pharmaceutical supply network.</h1><p class="hero-lead">NovaPharm Healthcare brings together regulatory intelligence, diversified sourcing, quality-led distribution and digital infrastructure to improve access to oncology, specialty and licensed medicines.</p><div class="hero-actions"><a class="btn btn-primary" href="/about/">Explore NovaPharm</a><a class="btn btn-ghost" href="/partner-with-us/">Partner with us</a></div><p class="hero-status">Pre-operational for regulated wholesale supply · B2B only · Subject to applicable MHRA authorisation</p></div></div>
  </section>
  `;
  html = replaceRange(html, '<section class="hero hero-flagship">', '<section class="trust-strip"', hero, "homepage flagship hero");

  const stages = [
    ["Authorisation", "WDA(H) application readiness"],
    ["Product pathway", "Product-specific PLPI assessment"],
    ["Quality system", "QMS and SOP governance"],
    ["Distribution control", "GDP and vendor oversight"],
    ["Safety system", "Pharmacovigilance and recall readiness"],
    ["Evidence trail", "Batch and document integrity"],
    ["Release gate", "Commercial release only after applicable authorisation"]
  ];
  const roadmap = `<section class="section regulatory-roadmap-section" data-reveal><div class="container regulatory-roadmap-shell"><div class="regulatory-roadmap-intro"><div class="section-head"><span class="section-kicker">Regulatory foundation</span><h2>No regulated supply before the required permissions.</h2><p>The roadmap connects authorisation, quality systems and product-specific responsibilities before commercial release.</p></div><aside class="regulatory-notice" aria-label="Regulatory status"><strong>Regulatory status</strong><p>NovaPharm is pre-operational for regulated wholesale supply. The company will not commence regulated wholesale activities until the required MHRA authorisations and other applicable permissions are in place. Product-specific parallel-import activity remains subject to the grant and maintenance of the relevant PLPI licence.</p></aside></div><ol class="regulatory-roadmap">${stages.map(([stage, title], index) => `<li><span class="roadmap-number">${String(index + 1).padStart(2, "0")}</span><span class="roadmap-stage">${stage}</span><h3>${title}</h3></li>`).join("")}</ol></div></section>
  `;
  html = replaceRange(html, '<section class="section regulatory-foundation"', '<section class="visual-band"', roadmap, "homepage regulatory roadmap");

  const batch = `<section class="batch-integrity-feature" data-reveal><div class="batch-integrity-media"><picture><source srcset="/assets/media/products/hospital-supply-logistics.avif" type="image/avif"><source srcset="/assets/media/products/hospital-supply-logistics.webp" type="image/webp"><img src="/assets/media/products/hospital-supply-logistics.jpg" alt="Sealed cartons arranged inside a delivery vehicle for controlled logistics handling" width="1600" height="900" loading="lazy" decoding="async"></picture><figcaption>${stockDisclosure}</figcaption></div><div class="batch-integrity-copy"><span class="section-kicker">Batch integrity</span><h2>Evidence should travel with every governed product and transaction.</h2><p>Product identity, batch, expiry, source documents, quality status, custody and customer records should remain connected through each controlled step.</p><div class="batch-evidence-list"><span>Product and source identity</span><span>Batch and expiry evidence</span><span>Quality and release status</span><span>Custody and transaction record</span></div></div></section>
  `;
  html = replaceRange(html, '<section class="visual-band"', '<section class="section logistics-story"', batch, "homepage batch-integrity feature");

  const partners = `<section class="section partner-ecosystem-section" data-reveal><div class="container"><div class="section-head"><span class="section-kicker">Partner ecosystem</span><h2>Designed for qualified pharmaceutical collaboration.</h2><p>NovaPharm is preparing a controlled pathway for product owners, manufacturers, authorised suppliers, buyers, logistics providers and technology partners.</p></div><div class="partner-ecosystem-grid">${partnerCards(8)}</div><p class="partner-ecosystem-disclosure">Photography is representative and does not identify a current NovaPharm partner, owned facility, authorised product or achieved procurement relationship.</p><div class="hero-actions"><a class="btn btn-primary" href="/partner-with-us/">Explore partnerships</a><a class="btn btn-outline" href="/contact/">Submit an opportunity</a></div></div></section>
  `;
  html = replaceRange(html, '<section class="section" data-reveal><div class="container"><div class="section-head"><span class="section-kicker">Partner ecosystem</span>', '<section class="section section-band" data-reveal><div class="container"><div class="section-head"><span class="section-kicker">Featured insights</span>', partners, "homepage partner ecosystem");

  write("index.html", html);
}

function enhanceServices() {
  let html = read("services/index.html");
  const visual = `<section class="service-visual-story" data-reveal><div class="service-visual-grid"><div class="service-visual-media"><picture><source srcset="/assets/media/products/respiratory-manufacturing.avif" type="image/avif"><source srcset="/assets/media/products/respiratory-manufacturing.webp" type="image/webp"><img src="/assets/media/products/respiratory-manufacturing.jpg" alt="Protected specialists monitoring medicine packaging on a controlled production line" width="1600" height="900" loading="lazy" decoding="async"></picture><figcaption>${stockDisclosure}</figcaption></div><div class="service-visual-copy"><span class="section-kicker">Connected services</span><h2>Commercial progress should follow an unbroken line of evidence.</h2><p>Each service pillar connects opportunity review, regulatory scope, partner qualification, quality controls, fulfilment and account-level evidence.</p><div class="service-control-path"><span>Opportunity and technical assessment</span><span>Regulatory and quality boundary</span><span>Qualified partner and fulfilment route</span><span>Controlled customer and document record</span></div></div></div></section>
  `;
  html = replaceRange(html, '<section class="section media-story"', '<section class="section"><div class="container service-stack">', visual, "Services visual introduction");

  const gallery = `<section class="section"><div class="container"><div class="section-head"><span class="section-kicker">Operational context</span><h2>Eight services connected around regulated execution.</h2><p>Representative imagery gives each capability a real operating context without implying NovaPharm ownership of the pictured premises, products or equipment.</p></div><div class="services-media-gallery">${picture("/assets/media/products/cardiovascular-quality-control", "Laboratory scientist recording controlled quality observations", { caption: "Quality governance and controlled evidence" })}${picture("/assets/media/products/hospital-supply-logistics", "Sealed cartons arranged for controlled logistics handling", { caption: "Outsourced logistics and supply continuity" })}${picture("/assets/media/products/oral-liquid-formulation", "Gloved specialist assessing an amber bottle during liquid-formulation analysis", { caption: "Development and manufacturing partnership" })}</div></div></section>
  `;
  html = replaceRequired(html, '<section class="section"><div class="container service-stack">', `${gallery}<section class="section"><div class="container service-stack">`, "Services media gallery insertion point");
  write("services/index.html", html);
}

function enhanceRegulatory() {
  let html = read("regulatory-services/index.html");
  const visual = `<section class="service-visual-story" data-reveal><div class="service-visual-grid"><div class="service-visual-media"><picture><source srcset="/assets/media/products/cardiovascular-quality-control.avif" type="image/avif"><source srcset="/assets/media/products/cardiovascular-quality-control.webp" type="image/webp"><img src="/assets/media/products/cardiovascular-quality-control.jpg" alt="Laboratory scientist examining samples and recording quality-control observations" width="1600" height="900" loading="lazy" decoding="async"></picture><figcaption>${stockDisclosure}</figcaption></div><div class="service-visual-copy"><span class="section-kicker">Regulatory architecture</span><h2>Permissions, procedures and evidence must agree.</h2><p>NovaPharm's preparation model treats authorisation, product status, quality responsibilities and outsourced activities as connected controls, not independent workstreams.</p><div class="service-control-path"><span>Authorisation and accountable roles</span><span>Product-specific pathway and evidence</span><span>QMS, GDP and vendor oversight</span><span>Safety, recall and release controls</span></div></div></div></section>
  `;
  html = replaceRange(html, '<section class="section media-story', '<section class="section"><div class="container regulatory-layout">', visual, "Regulatory visual introduction");

  const startMarker = '<section class="section"><div class="container regulatory-layout">';
  const endMarker = '<section class="section section-band">';
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error("Visual refinement could not locate the regulatory-stage section.");
  let original = html.slice(start, end);
  original = original.replace(startMarker, '<section class="section regulatory-stage"><div class="container regulatory-stage-grid"><figure class="regulatory-stage-media"><picture><source srcset="/assets/media/products/cardiovascular-quality-control.avif" type="image/avif"><source srcset="/assets/media/products/cardiovascular-quality-control.webp" type="image/webp"><img src="/assets/media/products/cardiovascular-quality-control.jpg" alt="Laboratory scientist documenting quality-control observations" width="1600" height="900" loading="lazy" decoding="async"></picture><figcaption>Representative licensed stock image; not a NovaPharm-owned laboratory, facility or product.</figcaption></figure><div class="regulatory-layout">');
  const finalClose = original.lastIndexOf('</div></div></section>');
  if (finalClose < 0) throw new Error("Visual refinement could not close the regulatory-stage layout.");
  original = `${original.slice(0, finalClose)}</div></div></div></section>${original.slice(finalClose + '</div></div></section>'.length)}`;
  html = `${html.slice(0, start)}${original}${html.slice(end)}`;
  write("regulatory-services/index.html", html);
}

function enhancePartners() {
  let html = read("partner-with-us/index.html");
  const visual = `<section class="service-visual-story" data-reveal><div class="service-visual-grid"><div class="service-visual-media"><picture><source srcset="/assets/media/products/specialty-pharmacy-handling.avif" type="image/avif"><source srcset="/assets/media/products/specialty-pharmacy-handling.webp" type="image/webp"><img src="/assets/media/products/specialty-pharmacy-handling.jpg" alt="Laboratory specialist conducting controlled multichannel sample analysis" width="1600" height="900" loading="lazy" decoding="async"></picture><figcaption>${stockDisclosure}</figcaption></div><div class="service-visual-copy"><span class="section-kicker">Qualified collaboration</span><h2>The route from introduction to launch should be visible.</h2><p>Strategic fit, evidence, due diligence, agreement, implementation and review are explicit stages. No organisation is presented as a partner until permission and scope are confirmed.</p><div class="service-control-path"><span>Fit and confidentiality</span><span>Technical and commercial assessment</span><span>Quality and regulatory due diligence</span><span>Controlled implementation and review</span></div></div></div></section>
  `;
  html = replaceRange(html, '<section class="section media-story', '<section class="section"><div class="container"><div class="section-head"><span class="section-kicker">Partner ecosystem</span>', visual, "Partners visual introduction");

  const ecosystem = `<section class="section partner-ecosystem-section"><div class="container"><div class="section-head"><span class="section-kicker">Partner ecosystem</span><h2>Who NovaPharm is designed to work with.</h2><p>Each route begins with qualification, evidence and an agreed scope rather than a logo or unsupported association.</p></div><div class="partner-type-grid partner-ecosystem-grid">${partnerCards()}</div><p class="partner-ecosystem-disclosure">Photography is representative and does not identify a current NovaPharm partner, owned facility, authorised product or achieved procurement relationship.</p></div></section>
  `;
  html = replaceRange(html, '<section class="section"><div class="container"><div class="section-head"><span class="section-kicker">Partner ecosystem</span>', '<section class="section section-band"><div class="container"><div class="section-head"><span class="section-kicker">Partner journey</span>', ecosystem, "Partners ecosystem cards");
  write("partner-with-us/index.html", html);
}

function enhanceTechnology() {
  let html = read("technology/index.html");
  const marker = '<section class="section" data-reveal><div class="container architecture-story">';
  const visual = `<section class="technology-visual-story" data-reveal><div class="technology-visual-grid"><div class="technology-visual-media"><picture><source srcset="/assets/media/products/metabolic-laboratory-analysis.avif" type="image/avif"><source srcset="/assets/media/products/metabolic-laboratory-analysis.webp" type="image/webp"><img src="/assets/media/products/metabolic-laboratory-analysis.jpg" alt="Scientist wearing gloves and safety glasses conducting laboratory analysis" width="1600" height="900" loading="lazy" decoding="async"></picture><figcaption>Representative licensed stock image; not a NovaPharm-owned laboratory, deployed system or current product.</figcaption></div><div class="technology-visual-copy"><span class="section-kicker">Governed digital infrastructure</span><h2>Technology should make evidence clearer, not claims louder.</h2><p>NovaPharm separates live foundations, active development and planned capabilities while retaining qualified human responsibility for every regulated decision.</p><div class="technology-proof-grid"><span>Role-based access and server-side scopes</span><span>Canonical operational records</span><span>Controlled document relationships</span><span>Explicit source and maturity indicators</span></div></div></div></section>
  `;
  html = replaceRequired(html, marker, `${visual}${marker.replace('architecture-story', 'architecture-story technology-architecture-story')}`, "Technology visual story insertion point");
  write("technology/index.html", html);
}

function publicHtmlFiles(directory = root) {
  const output = [];
  for (const entry of readdirSync(directory)) {
    if ([".git", "node_modules", "_secure", "portal", "employee", "admin"].includes(entry)) continue;
    const path = join(directory, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) output.push(...publicHtmlFiles(path));
    else if (entry.endsWith(".html")) output.push(path);
  }
  return output;
}

function injectPublicAssets() {
  for (const file of publicHtmlFiles()) {
    let html = readFileSync(file, "utf8");
    if (!html.includes('data-page="')) continue;
    if (!html.includes('data-visual-refinement="2026-07"')) {
      html = html.replace(/<body data-page="([^"]*)">/, '<body data-page="$1" data-visual-refinement="2026-07">');
    }
    if (!html.includes(visualScript)) {
      html = html.replace("</body>", `${visualScript}\n</body>`);
    }
    writeFileSync(file, html);
  }
}

function verifyImageAssets() {
  const bases = new Set(partnerVisuals.map(([, , base]) => base));
  [
    "/assets/media/products/hospital-supply-logistics",
    "/assets/media/products/respiratory-manufacturing",
    "/assets/media/products/cardiovascular-quality-control",
    "/assets/media/products/oral-liquid-formulation",
    "/assets/media/products/metabolic-laboratory-analysis"
  ].forEach((base) => bases.add(base));
  for (const base of bases) {
    for (const extension of ["avif", "webp", "jpg"]) {
      const path = join(root, `${base.slice(1)}.${extension}`);
      if (!existsSync(path)) throw new Error(`Missing licensed visual asset: ${relative(root, path)}`);
    }
  }
}

verifyImageAssets();
enhanceHome();
enhanceServices();
enhanceRegulatory();
enhancePartners();
enhanceTechnology();
injectPublicAssets();

console.log("Premium NovaPharm visual refinement materialised across public pages.");
