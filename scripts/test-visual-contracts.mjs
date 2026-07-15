import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const text = (path) => readFileSync(join(root, path), "utf8");

const cssEntrypoint = text("assets/css/novapharm.css");
assert.match(cssEntrypoint, /@layer reset, tokens, foundations, layout, components, pages, utilities;/);
for (const module of ["base", "tokens", "foundations", "premium-experience", "motion", "portal", "responsive", "visual-refinement", "module-media-sanity"]) {
  assert.match(cssEntrypoint, new RegExp(`@import url\\("\\./${module}\\.css"\\)`), `${module}.css must be part of the production CSS entrypoint`);
}

const home = text("index.html");
assert.match(home, /Building a more resilient pharmaceutical supply network\./);
assert.match(home, /<div class="hero-media"[^>]*><picture>/);
assert.match(home, /supply-network-hero-1200\.jpg 1200w/);
assert.match(home, /class="hero-cinematic-layer"/);
assert.match(home, /data-motion-toggle/);
assert.match(home, /class="[^\"]*\bsourcing-portfolio\b[^\"]*"/);
assert.equal((home.match(/class="sourcing-route-card"/g) || []).length, 3);
assert.match(home, /class="governed-convergence"/);
assert.equal((home.match(/class="roadmap-number"/g) || []).length, 7, "the regulatory roadmap must contain seven controlled stages");
assert.match(home, /Commercial release only after applicable authorisation/);
assert.match(home, /regulatory-batch-integrity\.jpg/);
assert.match(home, /<figure class="batch-integrity-media">/);
assert.doesNotMatch(home, /quality-batch-integrity\.svg/);
assert.match(home, /partner-ecosystem-directed/);
assert.match(home, /partner-pathway-grid/);
assert.equal((home.match(/<div class="partner-pathway-grid">[\s\S]*?<\/div><p class="partner-ecosystem-disclosure">/)?.[0].match(/class="partner-pathway-card"/g) || []).length, 4, "the homepage must present four distinct partnership pathways");
assert.equal((home.match(/class="partner-ecosystem-card"/g) || []).length, 0, "the homepage must not repeat the product-style partner grid");

const services = text("services/index.html");
assert.match(services, /class="service-visual-story"/);
assert.match(services, /class="service-evidence-grid"/);
assert.match(services, /services-launch-readiness\.jpg/);
assert.match(services, /module-signal-services/);
assert.doesNotMatch(services, /quality-batch-integrity\.svg/);
assert.doesNotMatch(services, /assets\/media\/products\//);

const regulatory = text("regulatory-services/index.html");
assert.match(regulatory, /class="container regulatory-stage-grid"/);
assert.match(regulatory, /regulatory-batch-integrity\.jpg/);
assert.match(regulatory, /regulatory-control-stage/);
assert.doesNotMatch(regulatory, /gdp-qms-foundations\.svg/);
assert.doesNotMatch(regulatory, /class="regulatory-stage-media"/);
assert.doesNotMatch(regulatory, /assets\/media\/products\//);

const partners = text("partner-with-us/index.html");
assert.equal((partners.match(/<div class="partner-pathway-grid partner-module-pathway-grid">[\s\S]*?<\/div><\/div><\/section>/)?.[0].match(/class="partner-pathway-card"/g) || []).length, 4, "the Partners page must present four qualified image-led pathways");
assert.match(partners, /sourcing-european-network\.jpg/);
assert.match(partners, /module-signal-partners/);
assert.doesNotMatch(partners, /partnership-pathway\.svg/);
assert.doesNotMatch(partners, /assets\/media\/products\//);

const technology = text("technology/index.html");
for (const marker of ["technology-evidence-grid", "architecture-map-photographic", "Live capabilities", "In development capabilities", "Planned capabilities"]) assert.match(technology, new RegExp(marker));
assert.match(technology, /technology-control-architecture\.jpg/);
assert.match(technology, /module-signal-technology/);
assert.doesNotMatch(technology, /assets\/media\/products\//);

const leadership = text("leadership/index.html");
assert.match(leadership, /module-portrait-composition/);
for (const portrait of ["vishalchakravarty.jpeg", "prabhakarvitthallahare.jpeg", "girishshantilalachliya.jpeg"]) assert.match(leadership, new RegExp(portrait));

const moduleRegister = JSON.parse(text("docs/module-media-register.json"));
assert.equal(moduleRegister.modules.length, 16, "the full public module register must contain sixteen entries");
for (const entry of moduleRegister.modules.filter((entry) => entry.id !== "home")) {
  assert.match(text(entry.path), new RegExp(`data-module-media="${entry.id}"`), `${entry.id} must use its tailored visual composition`);
}

const login = text("portal/index.html");
for (const accessType of ["customer", "employee", "board", "admin"]) assert.match(login, new RegExp(`value="${accessType}"`));

const products = text("product-portfolio/index.html");
assert.equal((products.match(/class="portfolio-media/g) || []).length, 8, "all product categories must have an explicit media element");
assert.match(products, /Category photography is representative/);
assert.doesNotMatch(text("assets/css/live-refinement.css"), /portfolio-table article[^\n{]*::before/);
assert.doesNotMatch(text("assets/js/novapharm.js"), /pointermove|hero-shift/);
const productMediaRoot = join(root, "assets", "media", "products");
const productAssetIds = [
  "oncology-vial-handling",
  "specialty-pharmacy-handling",
  "oral-liquid-formulation",
  "licensed-generics-packaging",
  "cardiovascular-quality-control",
  "respiratory-manufacturing",
  "metabolic-laboratory-analysis",
  "hospital-supply-logistics"
];
const productMediaMaterialised = productAssetIds.every((id) => ["avif", "webp", "jpg"].every((extension) => existsSync(join(productMediaRoot, `${id}.${extension}`))));
if (productMediaMaterialised) {
  assert.equal((products.match(/type="image\/avif"/g) || []).length >= 8, true);
  assert.equal((products.match(/type="image\/webp"/g) || []).length >= 8, true);
  assert.doesNotMatch(products, /licensed-image-pending\.svg/);
} else {
  assert.match(products, /licensed-image-pending\.svg/);
}

const insightFiles = [
  "compliance-first-pharmaceutical-distribution-uk",
  "gdp-qms-pharmaceutical-distribution-foundations",
  "oncology-supply-chain-demand-forecasting",
  "plpi-pharmaceutical-supply-resilience",
  "three-pillar-pharmaceutical-sourcing-model",
  "batch-to-buyer-pharmaceutical-traceability"
];
const articleImages = insightFiles.map((slug) => text(`news-insights/${slug}/index.html`).match(/<div class="article-hero-media">[\s\S]*?<img src="([^\"]+)"/)?.[1]);
assert.ok(articleImages.every(Boolean), "each insight article must have a cover image");
assert.equal(new Set(articleImages).size, insightFiles.length, "insight articles must use distinct cover images");

for (const path of [
  "assets/media/home/supply-network-hero.jpg",
  "assets/media/home/supply-network-hero-1200.jpg",
  "assets/media/stories/regulatory-batch-integrity.jpg",
  "assets/media/stories/services-launch-readiness.jpg",
  "assets/media/stories/technology-control-architecture.jpg"
]) assert.ok(existsSync(join(root, path)), `${path} must exist`);

assert.ok(statSync(join(root, "assets/media/home/supply-network-hero.jpg")).size < 350_000, "desktop hero must remain below 350 KB");
assert.ok(statSync(join(root, "assets/media/home/supply-network-hero-1200.jpg")).size < 220_000, "responsive hero must remain below 220 KB");

const responsive = text("assets/css/responsive.css");
assert.match(responsive, /@media \(max-width: 980px\)/);
assert.match(responsive, /@media \(max-width: 620px\)/);
assert.match(responsive, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(text("assets/css/visual-refinement.css"), /@media \(prefers-reduced-motion: reduce\)/);
assert.match(text("assets/css/module-media-sanity.css"), /@media \(prefers-reduced-motion: reduce\)/);
assert.match(text("assets/js/visual-refinement.js"), /data-motion-toggle/);
assert.match(text("assets/js/novapharm.js"), /saveData/);
for (const stylesheet of ["base", "tokens", "foundations", "premium-experience", "motion", "portal", "responsive", "visual-refinement", "module-media-sanity"]) {
  assert.doesNotMatch(text(`assets/css/${stylesheet}.css`), /prefers-color-scheme:\s*dark/, `${stylesheet}.css must not create an untested automatic dark theme`);
}

console.log("Visual contracts passed for the cinematic hero, sixteen tailored modules, seven-stage roadmap, leadership presentation, portal entry, motion preferences and asset budgets.");
