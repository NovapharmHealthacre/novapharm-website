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

function enhanceHome() {
  let html = read("index.html");
  const ecosystem = `<section class="section partner-ecosystem-section partner-ecosystem-cinematic" data-reveal><div class="container"><div class="section-head"><span class="section-kicker">Partner ecosystem</span><h2>Designed for qualified pharmaceutical collaboration.</h2><p>Each partner route has a different operating context, evidence boundary and commercial purpose. The visual system now treats them as distinct pathways rather than repeating product-category photography.</p></div><div class="partner-cinematic-grid"><figure class="partner-cinematic-primary"><picture><source srcset="/assets/media/products/specialty-pharmacy-handling.avif" type="image/avif"><source srcset="/assets/media/products/specialty-pharmacy-handling.webp" type="image/webp"><img src="/assets/media/products/specialty-pharmacy-handling.jpg" alt="Specialist handling and analysis in a controlled pharmaceutical environment" width="1600" height="900" loading="lazy" decoding="async"></picture>${moduleOverlay("partners", "Qualified network", ["Manufacturers", "Dossier owners", "Wholesalers", "Procurement"])}</figure><div class="partner-pathways"><article><span>01</span><h3>Manufacturing and development</h3><p>GMP manufacturers, CMO and CDMO organisations, product owners and dossier holders.</p></article><article><span>02</span><h3>Authorised sourcing</h3><p>European and UK licensed wholesalers assessed through defined qualification controls.</p></article><article><span>03</span><h3>Market access</h3><p>Pharmacy groups, hospital procurement and qualified account pathways.</p></article><article><span>04</span><h3>Enabling infrastructure</h3><p>Logistics, quality, regulatory, data and technology specialists.</p></article></div></div><p class="partner-ecosystem-disclosure">Photography is representative and does not identify a current NovaPharm partner, owned facility, authorised product or achieved procurement relationship.</p><div class="hero-actions"><a class="btn btn-primary" href="/partner-with-us/">Explore partnerships</a><a class="btn btn-outline" href="/contact/">Submit an opportunity</a></div></div></section>\n  `;
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
  html = `${html.slice(0, pictureEnd + 10)}${overlay}${html.slice(pictureEnd + 10)}`;
  write(path, html);
}

function enhanceRegulatory() {
  addOverlay("regulatory-services/index.html", "service-visual-media", moduleOverlay("regulatory", "Regulatory control", ["Authorisation", "QMS", "GDP", "Release gate"]));
  let html = read("regulatory-services/index.html");
  html = html.replace(/<figure class="regulatory-stage-media">[\s\S]*?<\/figure>/, `<div class="regulatory-control-stage" aria-label="Regulatory control sequence">${moduleOverlay("regulatory-stage", "Controlled sequence", ["Accountable roles", "Product evidence", "Vendor oversight", "Safety readiness", "Authorised release"])}</div>`);
  write("regulatory-services/index.html", html);
}

function enhanceServices() {
  addOverlay("services/index.html", "service-visual-media", moduleOverlay("services", "Connected execution", ["Assess", "Qualify", "Control", "Fulfil"]));
}

function enhancePartners() {
  addOverlay("partner-with-us/index.html", "service-visual-media", moduleOverlay("partners", "Partner qualification", ["Capability", "Licence", "Evidence", "Governance"]));
}

function enhanceTechnology() {
  addOverlay("technology/index.html", "technology-visual-media", moduleOverlay("technology", "Digital control plane", ["Identity", "Traceability", "Workflow", "Forecasting"]));
}

enhanceHome();
enhanceServices();
enhanceRegulatory();
enhancePartners();
enhanceTechnology();
