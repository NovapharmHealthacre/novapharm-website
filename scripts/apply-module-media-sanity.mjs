import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const read = (path) => readFileSync(join(root, path), "utf8");
const write = (path, value) => writeFileSync(join(root, path), value);
const config = JSON.parse(read("config/module-art-direction.json"));
const licensedImageRegister = JSON.parse(read("creative-assets/image-asset-register.json"));
const assets = new Map(config.assets.map((asset) => [asset.id, asset]));

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getAsset(id) {
  const asset = assets.get(id);
  if (!asset) throw new Error(`Unknown art-direction asset: ${id}`);
  return asset;
}

function responsiveSet(asset, extension) {
  const full = `${asset.base}.${extension}`;
  const compact = `${asset.base}-960.${extension}`;
  return existsSync(join(root, compact.slice(1))) ? `${compact} 960w, ${full} 1600w` : full;
}

function replaceRange(html, start, end, replacement, label) {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error(`Module art direction could not locate ${label}.`);
  return `${html.slice(0, from)}${replacement}${html.slice(to)}`;
}

function moduleOverlay(kind, eyebrow, items) {
  return `<div class="module-signal module-signal-${esc(kind)}" aria-hidden="true"><span class="module-signal-eyebrow">${esc(eyebrow)}</span>${items.map((item, index) => `<i><b>${String(index + 1).padStart(2, "0")}</b>${esc(item)}</i>`).join("")}</div>`;
}

function picture(asset, { alt = asset.alt, className = "", loading = "lazy", priority = false, sizes = "100vw" } = {}) {
  const priorityAttrs = priority ? ' fetchpriority="high"' : ` loading="${loading}"`;
  return `<picture${className ? ` class="${className}"` : ""} data-media-asset="${esc(asset.id)}"><source srcset="${responsiveSet(asset, "avif")}" sizes="${sizes}" type="image/avif"><source srcset="${responsiveSet(asset, "webp")}" sizes="${sizes}" type="image/webp"><img src="${asset.base}.jpg" srcset="${responsiveSet(asset, "jpg")}" sizes="${sizes}" alt="${esc(alt)}" width="1600" height="900"${priorityAttrs} decoding="${priority ? "sync" : "async"}"></picture>`;
}

function moduleMedia(module, asset, className = "module-hero-media") {
  const isHero = className === "module-hero-media";
  const media = `<div class="${className} module-photo-${module.id}" data-media-role="${isHero ? "hero" : "secondary"}">${picture(asset, { priority: isHero })}${isHero ? "" : moduleOverlay(module.id, module.label, module.signals)}</div>`;
  return isHero ? `${media}${moduleOverlay(module.id, module.label, module.signals)}` : media;
}

function leadershipMedia(module) {
  const portraits = [
    ["/assets/vishalchakravarty.jpeg", "Vishal Chakravarty"],
    ["/assets/prabhakarvitthallahare.jpeg", "Prabhakar Vitthal Lahare"],
    ["/assets/girishshantilalachliya.jpeg", "Dr Girish Shantilal Achliya"]
  ];
  return `<div class="module-hero-media module-portrait-composition" data-media-role="hero" aria-label="Approved NovaPharm leadership portraits">${portraits.map(([src, name]) => `<img src="${src}" alt="${name}" width="900" height="900" loading="eager" decoding="async">`).join("")}</div>${moduleOverlay(module.id, module.label, module.signals)}`;
}

function writeFocalPointCss() {
  const desktop = config.assets.map((asset) => `[data-media-asset="${asset.id}"] img { object-position: ${asset.focalPoint.desktop}; }`).join("\n");
  const mobile = config.assets.map((asset) => `  [data-media-asset="${asset.id}"] img { object-position: ${asset.focalPoint.mobile}; }`).join("\n");
  write("assets/css/module-art-direction.generated.css", `/* Generated from config/module-art-direction.json. */\n${desktop}\n\n@media (max-width: 720px) {\n${mobile}\n}\n`);
}

function injectPageHero(module) {
  if (module.id === "home") return;
  let html = read(module.path);
  const marker = '<section class="page-hero">';
  if (!html.includes(marker)) throw new Error(`Missing page hero in ${module.path}`);
  const media = module.heroType === "approved-portraits"
    ? leadershipMedia(module)
    : moduleMedia(module, getAsset(module.heroAsset));
  html = html.replace(marker, `<section class="page-hero page-hero-cinematic" data-module-media="${module.id}">${media}`);

  if (module.secondaryAsset) {
    const secondary = getAsset(module.secondaryAsset);
    html = html.replace(
      /<figure class="media-story-figure"><img src="\/assets\/media\/editorial\/[^"]+\.svg"[^>]*><\/figure>/g,
      `<figure class="media-story-figure module-story-figure">${moduleMedia(module, secondary, "module-story-media")}<figcaption>${esc(secondary.caption)}</figcaption></figure>`
    );
  }
  write(module.path, html);
}

function routeCard(route) {
  const asset = getAsset(route.asset);
  return `<article class="sourcing-route-card" data-network-step="${Number(route.number) - 1}"><figure>${picture(asset, { alt: asset.alt, sizes: "(max-width: 820px) 100vw, 33vw" })}<figcaption>${esc(asset.caption)}</figcaption></figure><div class="sourcing-route-copy"><div class="sourcing-step-head"><span class="sourcing-step-number">${route.number}</span><span class="status-label">${esc(route.status)}</span></div><h3>${esc(route.title)}</h3><p>${esc(route.text)}</p></div></article>`;
}

function partnerCard(pathway) {
  const asset = getAsset(pathway.asset);
  return `<article class="partner-pathway-card"><figure>${picture(asset, { alt: asset.alt, sizes: "(max-width: 820px) 100vw, 50vw" })}</figure><div class="partner-pathway-copy"><span>${pathway.number}</span><h3>${esc(pathway.title)}</h3><p>${esc(pathway.text)}</p></div></article>`;
}

function enhanceHome() {
  let html = read("index.html");
  html = html.replace(
    '<section class="hero hero-flagship" data-motion-paused="false">',
    '<section class="hero hero-flagship" data-motion-paused="false" data-module-media="home">'
  );
  html = html.replace(
    '<div class="hero-cinematic-layer" aria-hidden="true">',
    '<div class="hero-uk-marker" role="img" aria-label="United Kingdom highlighted as NovaPharm Healthcare\'s home market"><i aria-hidden="true"></i><span aria-hidden="true">United Kingdom</span></div><div class="hero-cinematic-layer" aria-hidden="true">'
  );

  const sourcing = `<section class="section sourcing-portfolio" id="three-pillar-sourcing" data-reveal data-module-media="three-pillar-sourcing"><div class="container"><div class="sourcing-portfolio-head"><div class="section-head"><span class="section-kicker">Three-pillar sourcing</span><h2>Three routes. One governed supply strategy.</h2><p>The proposed model is designed to diversify regulatory, geographic and supplier dependencies without lowering the evidence required for each product.</p></div><p class="sourcing-portfolio-note">Each route remains subject to its own qualification, regulatory and commercial evidence. Photography is representative.</p></div><div class="sourcing-route-grid">${config.homepageStories.sourcing.map(routeCard).join("")}</div><div class="governed-convergence" aria-label="Three proposed sourcing routes converge only after qualification and evidence review"><span>Qualified route evidence</span><i aria-hidden="true"></i><strong>Governed portfolio decision</strong><b>Resilience</b><b>Quality</b><b>Availability</b><b>Cost discipline</b></div></div></section>\n  `;
  html = replaceRange(
    html,
    '<section class="section sourcing-story"',
    '<section class="section section-dark focus-section"',
    sourcing,
    "homepage sourcing story"
  );

  const batchAsset = getAsset("regulatory-batch-integrity");
  html = html.replace(
    /<(?:figure|div) class="batch-integrity-media">[\s\S]*?<\/(?:figure|div)>/,
    `<figure class="batch-integrity-media">${picture(batchAsset, { sizes: "(max-width: 820px) 100vw, 58vw" })}<figcaption>${esc(batchAsset.caption)}</figcaption></figure>`
  );

  const ecosystem = `<section class="section partner-ecosystem-section partner-ecosystem-directed" id="partner-ecosystem" data-reveal data-module-media="partner-ecosystem"><div class="container"><div class="partner-ecosystem-head"><div class="section-head"><span class="section-kicker">Partner ecosystem</span><h2>Designed for qualified pharmaceutical collaboration.</h2><p>Each pathway has a distinct evidence boundary, operating context and commercial purpose.</p></div><p class="partner-ecosystem-principle">Introduction does not equal approval. Every route moves through fit, due diligence, agreement and controlled implementation.</p></div><div class="partner-pathway-grid">${config.homepageStories.partnerPathways.map(partnerCard).join("")}</div><p class="partner-ecosystem-disclosure">${esc(config.policies.representativeImageryDisclosure)}</p><div class="hero-actions"><a class="btn btn-primary" href="/partner-with-us/">Explore partnerships</a><a class="btn btn-outline" href="/contact/">Submit an opportunity</a></div></div></section>\n  `;
  html = replaceRange(
    html,
    '<section class="section partner-ecosystem-section"',
    '<section class="section section-band" data-reveal><div class="container"><div class="section-head"><span class="section-kicker">Featured insights</span>',
    ecosystem,
    "homepage partner ecosystem"
  );
  write("index.html", html);
}

function replaceVisualFigure(path, className, module) {
  const asset = getAsset(module.secondaryAsset);
  let html = read(path);
  const expression = new RegExp(`<div class="${className}">[\\s\\S]*?<\\/div>`);
  const replacement = `<figure class="${className}">${picture(asset, { sizes: "(max-width: 900px) 100vw, 52vw" })}${moduleOverlay(module.id, module.label, module.signals)}<figcaption>${esc(asset.caption)}</figcaption></figure>`;
  if (!expression.test(html)) throw new Error(`Missing ${className} in ${path}`);
  html = html.replace(expression, replacement);
  write(path, html);
}

function enhanceCoreCapabilityPages() {
  const byId = new Map(config.modules.map((module) => [module.id, module]));
  replaceVisualFigure("services/index.html", "service-visual-media", byId.get("services"));
  replaceVisualFigure("regulatory-services/index.html", "service-visual-media", byId.get("regulatory"));
  replaceVisualFigure("partner-with-us/index.html", "service-visual-media", byId.get("partners"));

  let services = read("services/index.html");
  const serviceEvidence = `<section class="section section-band service-evidence-section" data-reveal><div class="container"><div class="section-head"><span class="section-kicker">Connected evidence</span><h2>Eight services. Four evidence boundaries.</h2><p>Every service must preserve the same line from opportunity assessment to accountable fulfilment.</p></div><div class="service-evidence-grid"><article><span>01</span><h3>Opportunity</h3><p>Technical fit, rights, demand and commercial viability.</p></article><article><span>02</span><h3>Permission</h3><p>Company, product and market-specific regulatory boundaries.</p></article><article><span>03</span><h3>Qualification</h3><p>Supplier, quality, document and outsourced-activity evidence.</p></article><article><span>04</span><h3>Execution</h3><p>Controlled account, fulfilment, traceability and review records.</p></article></div></div></section>\n  `;
  services = replaceRange(
    services,
    '<section class="section"><div class="container"><div class="section-head"><span class="section-kicker">Operational context</span>',
    '<section class="section"><div class="container service-stack">',
    serviceEvidence,
    "services product-photo gallery"
  );
  write("services/index.html", services);

  const partnerModulePathways = [
    { asset: "sourcing-direct-gmp", number: "01", title: "Manufacturing and development", text: "GMP manufacturers, CMO and CDMO organisations, product owners and dossier holders." },
    { asset: "sourcing-plpi-assessment", number: "02", title: "Rights and regulatory scope", text: "Marketing-authorisation holders and product owners assessing evidence, rights and product-specific pathways." },
    { asset: "sourcing-european-network", number: "03", title: "Authorised sourcing and buyers", text: "Licensed wholesalers, pharmacy groups and qualified procurement teams working within applicable permissions." },
    { asset: "technology-control-architecture", number: "04", title: "Enabling infrastructure", text: "Logistics, cold-chain, quality, regulatory, data and technology specialists supporting controlled execution." }
  ];
  let partners = read("partner-with-us/index.html");
  const partnerEcosystem = `<section class="section partner-module-ecosystem" data-reveal><div class="container"><div class="partner-ecosystem-head"><div class="section-head"><span class="section-kicker">Partner ecosystem</span><h2>Four collaboration routes with explicit evidence boundaries.</h2><p>Each route begins with strategic fit and due diligence, not an unsupported logo or association.</p></div><p class="partner-ecosystem-principle">Photography is representative. No pictured organisation, facility, product or route is presented as a current NovaPharm partner or operation.</p></div><div class="partner-pathway-grid partner-module-pathway-grid">${partnerModulePathways.map(partnerCard).join("")}</div></div></section>\n  `;
  partners = replaceRange(
    partners,
    '<section class="section partner-ecosystem-section">',
    '<section class="section section-band"><div class="container"><div class="section-head"><span class="section-kicker">Partner journey</span>',
    partnerEcosystem,
    "partner product-photo ecosystem"
  );
  write("partner-with-us/index.html", partners);

  let regulatory = read("regulatory-services/index.html");
  const regulatoryTrack = `<div class="regulatory-control-stage" aria-label="Regulatory control sequence"><span class="module-signal-eyebrow">Controlled sequence</span><ol class="regulatory-control-track"><li><b>01</b><span>Accountable roles</span></li><li><b>02</b><span>Product evidence</span></li><li><b>03</b><span>Vendor oversight</span></li><li><b>04</b><span>Safety readiness</span></li><li><b>05</b><span>Authorised release</span></li></ol><p>Commercial release remains locked until the applicable company and product permissions are in place.</p></div>`;
  regulatory = regulatory.replace(/<figure class="regulatory-stage-media">[\s\S]*?<\/figure>/, regulatoryTrack);
  write("regulatory-services/index.html", regulatory);

  const technologyModule = byId.get("technology");
  const architectureAsset = getAsset(technologyModule.secondaryAsset);
  let technology = read("technology/index.html");
  const technologyEvidence = `<section class="section section-dark technology-evidence-band" data-reveal><div class="container"><div class="section-head"><span class="section-kicker">Governed digital infrastructure</span><h2>Technology should make evidence clearer, not claims louder.</h2><p>Each layer has an explicit purpose, maturity state and accountable human boundary.</p></div><div class="technology-evidence-grid"><article><span>01</span><h3>Identity</h3><p>Server-validated roles and scopes.</p></article><article><span>02</span><h3>Record</h3><p>Canonical operational data and audit events.</p></article><article><span>03</span><h3>Documents</h3><p>Controlled relationships and access boundaries.</p></article><article><span>04</span><h3>Integration</h3><p>Planned interfaces with explicit maturity labels.</p></article></div></div></section>\n  `;
  technology = replaceRange(
    technology,
    '<section class="technology-visual-story"',
    '<section class="section" data-reveal><div class="container architecture-story',
    technologyEvidence,
    "technology duplicate visual story"
  );
  const architecture = `<figure class="architecture-map architecture-map-photographic" data-media-asset="${architectureAsset.id}">${picture(architectureAsset, { sizes: "(max-width: 900px) 100vw, 55vw" })}<div class="architecture-status-grid"><div><span>Experience</span><strong>Public website</strong><b data-stage="development">Portals in development</b></div><div><span>Control</span><strong>Role and session boundaries</strong><b data-stage="live">Live foundation</b></div><div><span>Record</span><strong>Canonical data and audit</strong><b data-stage="live">Live foundation</b></div><div><span>Documents</span><strong>SharePoint relationships</strong><b data-stage="development">In development</b></div><div><span>External feeds</span><strong>Operational integrations</strong><b data-stage="planned">Planned</b></div></div><figcaption>${esc(architectureAsset.caption)}</figcaption></figure>`;
  technology = technology.replace(/<figure class="architecture-map"[\s\S]*?<\/figure>/, architecture);
  write("technology/index.html", technology);
}

function writeRegister() {
  const modules = config.modules.map((module) => ({
    id: module.id,
    path: module.path,
    route: module.route,
    purpose: module.purpose,
    heroAsset: module.heroAsset || module.heroType,
    secondaryAsset: module.secondaryAsset || null,
    signals: module.signals
  }));
  write("docs/module-media-register.json", `${JSON.stringify({
    generatedAt: config.reviewed,
    version: config.version,
    policy: config.policies,
    modules,
    homepageStories: config.homepageStories,
    insights: config.insights,
    assetRegister: "creative-assets/module-media-asset-register.json"
  }, null, 2)}\n`);

  const licensedByReference = new Map(licensedImageRegister.assets.map((asset) => [asset.id, asset]));
  const provenance = config.assets.map((asset) => {
    if (asset.sourceType === "licensed-stock") {
      const referenceId = asset.sourceReference.split("#")[1];
      const source = licensedByReference.get(referenceId);
      if (!source) throw new Error(`Missing licensed source record for ${asset.id}`);
      return {
        id: asset.id,
        sourceType: asset.sourceType,
        source: source.sourcePage,
        creator: source.creator,
        originalUrl: source.downloadBaseUrl,
        licence: licensedImageRegister.licence,
        acquisitionDate: source.acquisitionDate,
        modificationPermitted: true,
        modifications: source.cropNotes,
        generatedPrompt: null,
        publicBase: asset.base,
        pagesUsingIt: asset.allowedRoutes,
        reviewStatus: source.reviewStatus,
        detailedRegister: asset.sourceReference
      };
    }
    if (asset.sourceType === "approved-existing") {
      return {
        id: asset.id,
        sourceType: asset.sourceType,
        source: "Owner-approved generated authoring master",
        creator: "OpenAI ImageGen",
        originalUrl: null,
        licence: "Owner-authorised NovaPharm project media under the applicable OpenAI generated-media terms",
        acquisitionDate: "2026-07-14",
        modificationPermitted: true,
        modifications: "Loss-controlled responsive crop and compression",
        generatedPrompt: "Protected authoring record; not published in the public repository",
        publicBase: asset.base,
        pagesUsingIt: asset.allowedRoutes,
        reviewStatus: "approved-existing-production-asset",
        detailedRegister: "creative-assets/asset-register.json#assets/media/home/supply-network-hero.jpg"
      };
    }
    return {
      id: asset.id,
      sourceType: asset.sourceType,
      source: asset.sourceReference,
      creator: "OpenAI ImageGen",
      originalUrl: null,
      licence: "Owner-authorised NovaPharm project media under the applicable OpenAI generated-media terms",
      acquisitionDate: config.reviewed,
      modificationPermitted: true,
      modifications: "Human-reviewed crop, focal point, colour grade and AVIF/WebP/JPEG compression",
      generatedPrompt: "Recorded in the protected generation session; not exposed in production markup",
      publicBase: asset.base,
      pagesUsingIt: asset.allowedRoutes,
      reviewStatus: "human-reviewed-for-brand-claims-and-accessibility",
      detailedRegister: `creative-assets/module-media-asset-register.json#${asset.id}`
    };
  });
  write("docs/media-provenance-register.json", `${JSON.stringify({
    version: config.version,
    reviewed: config.reviewed,
    policy: {
      noUnverifiedMedia: true,
      noGoogleImagesScraping: true,
      generatedMediaIsRepresentative: true,
      noFacilityOwnershipImplied: true,
      noCurrentPartnerOrAuthorisationImplied: true
    },
    sourceRegisters: [
      "creative-assets/module-media-asset-register.json",
      "creative-assets/image-asset-register.json",
      "creative-assets/asset-register.json"
    ],
    assets: provenance
  }, null, 2)}\n`);
}

enhanceHome();
for (const module of config.modules) injectPageHero(module);
enhanceCoreCapabilityPages();
writeRegister();
writeFocalPointCss();
