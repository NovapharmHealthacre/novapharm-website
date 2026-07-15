import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const read = (path) => readFileSync(join(root, path), "utf8");
const write = (path, value) => writeFileSync(join(root, path), value);

function replaceRange(html, start, end, replacement, label) {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error(`Module media sanity could not locate ${label}.`);
  return `${html.slice(0, from)}${replacement}${html.slice(to)}`;
}

function moduleOverlay(kind, eyebrow, items) {
  return `<div class="module-signal module-signal-${kind}" aria-hidden="true"><span class="module-signal-eyebrow">${eyebrow}</span>${items.map((item, index) => `<i style="--signal-index:${index}"><b>${String(index + 1).padStart(2, "0")}</b>${item}</i>`).join("")}</div>`;
}

const modules = [
  { id: "home", path: "index.html", label: "Corporate network", image: "/assets/media/home/supply-network-hero", signals: ["Regulatory sequence", "Qualified sourcing", "Evidence continuity", "Controlled access"] },
  { id: "about", path: "about/index.html", label: "Operating model", image: "/assets/media/home/supply-network-hero", signals: ["Evidence", "Optionality", "Accountability", "Resilience"] },
  { id: "company", path: "about/company/index.html", label: "Corporate structure", image: "/assets/media/products/licensed-generics-packaging", signals: ["Legal identity", "Business model", "Operating status", "Governance"] },
  { id: "governance", path: "about/governance/index.html", label: "Governance control", image: "/assets/media/products/cardiovascular-quality-control", signals: ["Board", "Quality", "Claims", "Audit trail"] },
  { id: "leadership", path: "leadership/index.html", label: "Leadership accountability", portraits: ["/assets/vishalchakravarty.jpeg", "/assets/prabhakarvitthallahare.jpeg", "/assets/girishshantilalachliya.jpeg"], signals: ["Strategy", "Operations", "Science", "Quality"] },
  { id: "services", path: "services/index.html", label: "Connected execution", image: "/assets/media/products/respiratory-manufacturing", signals: ["Assess", "Qualify", "Control", "Fulfil"] },
  { id: "regulatory", path: "regulatory-services/index.html", label: "Regulatory control", image: "/assets/media/products/cardiovascular-quality-control", signals: ["Authorisation", "QMS", "GDP", "Release gate"] },
  { id: "products", path: "product-portfolio/index.html", label: "Portfolio architecture", image: "/assets/media/products/oncology-vial-handling", signals: ["Oncology", "Specialty", "Licensed", "Opportunity review"] },
  { id: "partners", path: "partner-with-us/index.html", label: "Partner qualification", image: "/assets/media/products/specialty-pharmacy-handling", signals: ["Capability", "Licence", "Evidence", "Governance"] },
  { id: "technology", path: "technology/index.html", label: "Digital control plane", image: "/assets/media/products/metabolic-laboratory-analysis", signals: ["Identity", "Traceability", "Workflow", "Forecasting"] },
  { id: "insights", path: "news-insights/index.html", label: "Evidence-led insight", image: "/assets/media/products/oncology-vial-handling", signals: ["Primary sources", "Expert review", "Material updates", "Clear scope"] },
  { id: "contact", path: "contact/index.html", label: "Qualified enquiry", image: "/assets/media/products/hospital-supply-logistics", signals: ["Context", "Capability", "Evidence", "Next step"] },
  { id: "investors", path: "investor-information/index.html", label: "Investment readiness", image: "/assets/media/home/supply-network-hero", signals: ["Strategy", "Governance", "Capital discipline", "Milestones"] },
  { id: "careers", path: "careers/index.html", label: "Specialist capability", image: "/assets/media/products/oral-liquid-formulation", signals: ["Scientific", "Regulatory", "Operational", "Digital"] },
  { id: "account", path: "account-application/index.html", label: "Controlled onboarding", image: "/assets/media/products/hospital-supply-logistics", signals: ["Company", "Responsible person", "GDP evidence", "Approval"] },
  { id: "legal", path: "legal/index.html", label: "Policy architecture", image: "/assets/media/products/licensed-generics-packaging", signals: ["Privacy", "Terms", "Accessibility", "Corrections"] }
];

function picture(module, alt, className = "module-hero-media") {
  if (module.portraits) {
    return `<div class="${className} module-portrait-composition" aria-label="Approved NovaPharm leadership portraits">${module.portraits.map((src, index) => `<img src="${src}" alt="" width="900" height="900" loading="lazy" decoding="async" style="--portrait-index:${index}">`).join("")}${moduleOverlay(module.id, module.label, module.signals)}</div>`;
  }
  const productMedia = module.image.startsWith("/assets/media/products/");
  const sources = productMedia ? `<source srcset="${module.image}.avif" type="image/avif"><source srcset="${module.image}.webp" type="image/webp">` : "";
  return `<div class="${className} module-photo-${module.id}"><picture>${sources}<img src="${module.image}.jpg" alt="${alt}" width="1600" height="900" loading="lazy" decoding="async"></picture>${moduleOverlay(module.id, module.label, module.signals)}</div>`;
}

function injectPageHero(module) {
  if (module.id === "home") return;
  let html = read(module.path);
  const marker = '<section class="page-hero">';
  if (!html.includes(marker)) throw new Error(`Missing page hero in ${module.path}`);
  if (!html.includes(`data-module-media="${module.id}"`)) {
    html = html.replace(marker, `<section class="page-hero page-hero-cinematic" data-module-media="${module.id}">${picture(module, `${module.label} visual for NovaPharm Healthcare`)}`);
  }
  html = html.replace(/<figure class="media-story-figure"><img src="\/assets\/media\/editorial\/[^\"]+\.svg"[^>]*><\/figure>/g, `<figure class="media-story-figure module-story-figure">${picture(module, `${module.label} operating context`, "module-story-media")}</figure>`);
  write(module.path, html);
}

function enhanceHome() {
  let html = read("index.html");
  const ecosystem = `<section class="section partner-ecosystem-section partner-ecosystem-cinematic" data-reveal data-module-media="partner-ecosystem"><div class="container"><div class="section-head"><span class="section-kicker">Partner ecosystem</span><h2>Designed for qualified pharmaceutical collaboration.</h2><p>Each partner route has a different operating context, evidence boundary and commercial purpose. The visual system treats them as distinct pathways rather than repeating product-category photography.</p></div><div class="partner-cinematic-grid"><figure class="partner-cinematic-primary"><picture><source srcset="/assets/media/products/specialty-pharmacy-handling.avif" type="image/avif"><source srcset="/assets/media/products/specialty-pharmacy-handling.webp" type="image/webp"><img src="/assets/media/products/specialty-pharmacy-handling.jpg" alt="Specialist handling and analysis in a controlled pharmaceutical environment" width="1600" height="900" loading="lazy" decoding="async"></picture>${moduleOverlay("partners", "Qualified network", ["Manufacturers", "Dossier owners", "Wholesalers", "Procurement"])}</figure><div class="partner-pathways"><article><span>01</span><h3>Manufacturing and development</h3><p>GMP manufacturers, CMO and CDMO organisations, product owners and dossier holders.</p></article><article><span>02</span><h3>Authorised sourcing</h3><p>European and UK licensed wholesalers assessed through defined qualification controls.</p></article><article><span>03</span><h3>Market access</h3><p>Pharmacy groups, hospital procurement and qualified account pathways.</p></article><article><span>04</span><h3>Enabling infrastructure</h3><p>Logistics, quality, regulatory, data and technology specialists.</p></article></div></div><p class="partner-ecosystem-disclosure">Photography is representative and does not identify a current NovaPharm partner, owned facility, authorised product or achieved procurement relationship.</p><div class="hero-actions"><a class="btn btn-primary" href="/partner-with-us/">Explore partnerships</a><a class="btn btn-outline" href="/contact/">Submit an opportunity</a></div></div></section>\n  `;
  html = replaceRange(html, '<section class="section partner-ecosystem-section"', '<section class="section section-band" data-reveal><div class="container"><div class="section-head"><span class="section-kicker">Featured insights</span>', ecosystem, "homepage partner ecosystem");
  write("index.html", html);
}

function addOverlay(path, mediaClass, overlay) {
  let html = read(path);
  const marker = `<div class="${mediaClass}">`;
  const start = html.indexOf(marker);
  if (start < 0) throw new Error(`Missing ${mediaClass} in ${path}`);
  const pictureEnd = html.indexOf("</picture>", start);
  if (pictureEnd < 0) throw new Error(`Missing picture in ${path}`);
  if (!html.slice(start, pictureEnd + 500).includes("module-signal")) {
    html = `${html.slice(0, pictureEnd + 10)}${overlay}${html.slice(pictureEnd + 10)}`;
  }
  write(path, html);
}

function enhanceCoreCapabilityPages() {
  addOverlay("services/index.html", "service-visual-media", moduleOverlay("services", "Connected execution", ["Assess", "Qualify", "Control", "Fulfil"]));
  addOverlay("regulatory-services/index.html", "service-visual-media", moduleOverlay("regulatory", "Regulatory control", ["Authorisation", "QMS", "GDP", "Release gate"]));
  addOverlay("partner-with-us/index.html", "service-visual-media", moduleOverlay("partners", "Partner qualification", ["Capability", "Licence", "Evidence", "Governance"]));
  addOverlay("technology/index.html", "technology-visual-media", moduleOverlay("technology", "Digital control plane", ["Identity", "Traceability", "Workflow", "Forecasting"]));

  let regulatory = read("regulatory-services/index.html");
  regulatory = regulatory.replace(/<figure class="regulatory-stage-media">[\s\S]*?<\/figure>/, `<div class="regulatory-control-stage" aria-label="Regulatory control sequence">${moduleOverlay("regulatory-stage", "Controlled sequence", ["Accountable roles", "Product evidence", "Vendor oversight", "Safety readiness", "Authorised release"])}</div>`);
  write("regulatory-services/index.html", regulatory);
}

function writeRegister() {
  const register = modules.map(({ id, path, label, image, portraits, signals }) => ({ id, path, label, media: image || portraits, signals }));
  write("docs/module-media-register.json", `${JSON.stringify({ generatedAt: "2026-07-15", modules: register }, null, 2)}\n`);
}

enhanceHome();
for (const module of modules) injectPageHero(module);
enhanceCoreCapabilityPages();
writeRegister();
