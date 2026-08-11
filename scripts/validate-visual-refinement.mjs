import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const failures = [];

function read(path) {
  const absolute = join(root, path);
  if (!existsSync(absolute)) {
    failures.push(`Missing required file: ${path}`);
    return "";
  }
  return readFileSync(absolute, "utf8");
}

function requireText(content, text, label) {
  if (!content.includes(text)) failures.push(`${label}: missing ${JSON.stringify(text)}`);
}

function forbidText(content, text, label) {
  if (content.includes(text)) failures.push(`${label}: obsolete or invalid visual remains ${JSON.stringify(text)}`);
}

const index = read("index.html");
const services = read("services/index.html");
const regulatory = read("regulatory-services/index.html");
const partners = read("partner-with-us/index.html");
const technology = read("technology/index.html");
const leadership = read("leadership/index.html");
const vishal = read("leadership/vishal-chakravarty/index.html");
const prabhakar = read("leadership/prabhakar-lahare/index.html");
const girish = read("leadership/girish-achliya/index.html");
const css = read("assets/css/visual-refinement.css");
const publicCss = read("assets/css/apple-pharma-public.css");
const bundleCss = read("assets/css/novapharm.bundle.css");
const moduleCss = read("assets/css/module-media-sanity.css");
const javascript = read("assets/js/visual-refinement.js");
const build = read("scripts/build-site.mjs");

[
  [index, "pharma-home-hero", "Homepage concise Apple-pharma hero"],
  [index, "Pharmaceutical supply, built around evidence.", "Homepage concise primary message"],
  [index, "pharma-principles-grid", "Homepage operating-principles strip"],
  [index, "pharma-pillar-grid", "Homepage three-route sourcing architecture"],
  [index, "Three routes. One standard.", "Homepage sourcing hierarchy"],
  [index, "/assets/media/stories/regulatory-batch-integrity.jpg", "Homepage evidence-boundary photograph"],
  [index, "Clarity before complexity.", "Homepage controlled-growth message"],
  [index, "pharma-focus-grid", "Homepage focused specialist pathways"],
  [index, "Specialist work. Less noise.", "Homepage decluttering contract"],
  [index, "Regulated wholesale supply has not commenced.", "Homepage regulated-wholesale boundary"],
  [index, "Owner-attested logistics and warehousing arrangements with Polar Speed are being incorporated into NovaPharm's operating model", "Homepage owner-attested logistics boundary"],
  [index, "The relationship does not transfer Polar Speed's authorisations or certificates to NovaPharm", "Homepage authorisation-transfer boundary"],
  [services, "service-visual-story", "Services visual introduction"],
  [services, '<figure class="service-visual-media">', "Semantic Services visual figure"],
  [services, "service-evidence-grid", "Services evidence architecture"],
  [services, "/assets/media/stories/services-launch-readiness.jpg", "Services launch-readiness photograph"],
  [regulatory, "regulatory-stage-grid", "Regulatory staged layout"],
  [regulatory, "regulatory-control-stage", "Regulatory tailored control sequence"],
  [regulatory, '<figure class="service-visual-media">', "Semantic Regulatory visual figure"],
  [regulatory, "/assets/media/modules/regulatory-dossier-control.jpg", "Regulatory dossier hero photography"],
  [partners, "partner-module-pathway-grid", "Partners image-led ecosystem"],
  [partners, '<figure class="service-visual-media">', "Semantic Partners visual figure"],
  [technology, "technology-evidence-grid", "Technology evidence introduction"],
  [technology, "architecture-map-photographic", "Semantic Technology architecture figure"],
  [technology, "technology-architecture-story", "Technology architecture refinement"],
  [leadership, "/assets/vishalchakravarty.jpeg", "Vishal approved portrait"],
  [leadership, "/assets/prabhakarvitthallahare.jpeg", "Prabhakar approved portrait"],
  [leadership, "/assets/girishshantilalachliya.jpeg", "Girish approved portrait"],
  [leadership, "module-portrait-composition", "Leadership tailored portrait composition"],
  [vishal, "/assets/vishalchakravarty.jpeg", "Vishal profile portrait"],
  [prabhakar, "/assets/prabhakarvitthallahare.jpeg", "Prabhakar profile portrait"],
  [girish, "/assets/girishshantilalachliya.jpeg", "Girish profile portrait"],
  [css, "@media (prefers-reduced-motion: reduce)", "Reduced-motion support"],
  [publicCss, "--apple-pharma-public-contract: 2", "Scoped public Apple-pharma source contract"],
  [publicCss, 'body[data-page="home"]', "Homepage scoping contract"],
  [publicCss, "-apple-system", "Native system-font strategy"],
  [publicCss, "@media (prefers-reduced-motion: reduce)", "Public reduced-motion support"],
  [bundleCss, "--apple-pharma-public-contract: 2", "Bundled scoped Apple-pharma contract"],
  [moduleCss, "page-hero-cinematic", "Module-specific cinematic page heroes"],
  [moduleCss, "modulePhotoDrift", "Module-specific photo motion"],
  [javascript, "data-motion-toggle", "Accessible motion controller"],
  [javascript, "IntersectionObserver", "Progressive visual reveal"],
  [build, 'import("./apply-visual-refinement.mjs")', "Deterministic visual build integration"],
  [build, 'import("./apply-module-media-sanity.mjs")', "Module media build integration"],
  [build, 'import("./normalise-visual-semantics.mjs")', "Semantic visual build integration"],
  [build, 'import("./apply-pages-presentation-parity.mjs")', "Concise public presentation integration"]
].forEach(([content, text, label]) => requireText(content, text, label));

forbidText(index, "hero-cinematic-layer", "Homepage legacy cinematic layer");
forbidText(index, "data-motion-toggle", "Homepage unnecessary hero motion control");
forbidText(index, "regulatory-roadmap", "Homepage legacy seven-stage roadmap");
forbidText(index, "batch-integrity-feature", "Homepage duplicate batch-integrity feature");
forbidText(index, "partner-ecosystem-directed", "Homepage duplicate partner-ecosystem block");
forbidText(index, "partner-pathway-grid", "Homepage duplicate partner-pathway block");
forbidText(index, "/assets/media/editorial/quality-batch-integrity.svg", "Homepage");
forbidText(services, "/assets/media/editorial/quality-batch-integrity.svg", "Services");
forbidText(regulatory, "/assets/media/insights/gdp-qms-foundations.svg", "Regulatory");
forbidText(partners, "/assets/media/editorial/partnership-pathway.svg", "Partners");
forbidText(index, "partner-ecosystem-grid", "Homepage repeated product-style ecosystem");
forbidText(regulatory, 'class="regulatory-stage-media"', "Regulatory repeated laboratory visual");
forbidText(services, "/assets/media/products/", "Services product-category photography leak");
forbidText(regulatory, "/assets/media/products/", "Regulatory product-category photography leak");
forbidText(partners, "/assets/media/products/", "Partners product-category photography leak");
forbidText(technology, "/assets/media/products/", "Technology product-category photography leak");

// A homepage parity layer must never take ownership of the independently art-directed
// dossier/module geometry. These were the root cause of the 11 Aug live regression.
for (const forbiddenGlobal of [
  "\n.section,\n",
  "\n.page-hero,\n",
  "\n.section-dark,\n",
  "\n.card,\n",
  "\nfigure img,\n",
  ".page-hero-cinematic::before",
  ".hero-cinematic-layer,"
]) {
  forbidText(publicCss, forbiddenGlobal, "Scoped Apple-pharma parity");
}

const pillarCards = (index.match(/<div class="pharma-pillar-grid">[\s\S]*?<\/div>/)?.[0].match(/<article>/g) || []).length;
if (pillarCards !== 3) failures.push(`Homepage sourcing routes: expected 3 purposeful routes, found ${pillarCards}.`);

const focusCards = (index.match(/<div class="pharma-focus-grid">[\s\S]*?<\/div>/)?.[0].match(/<article>/g) || []).length;
if (focusCards !== 3) failures.push(`Homepage core focus: expected 3 specialist pathways, found ${focusCards}.`);

const fullPartnerCards = (partners.match(/<div class="partner-pathway-grid partner-module-pathway-grid">[\s\S]*?<\/div><\/div><\/section>/)?.[0].match(/class="partner-pathway-card"/g) || []).length;
if (fullPartnerCards !== 4) failures.push(`Partner page ecosystem: expected 4 distinct image-led pathways, found ${fullPartnerCards}.`);

for (const [path, html] of [
  ["index.html", index],
  ["services/index.html", services],
  ["regulatory-services/index.html", regulatory],
  ["partner-with-us/index.html", partners],
  ["technology/index.html", technology]
]) {
  requireText(html, 'data-visual-refinement="2026-07"', `${path} build marker`);
  requireText(html, '/assets/js/visual-refinement.js', `${path} visual script`);
  const pageText = html.toLowerCase();
  if (!pageText.includes("active") || !pageText.includes("regulated wholesale supply has not commenced")) {
    failures.push(`${path} regulatory truthfulness: active-company and regulated-wholesale boundaries are incomplete.`);
  }
}

if (index.includes("<video")) failures.push("Homepage hero: unexpected video added; the approved high-quality still-image path should remain lightweight.");
if (!css.includes("@media (max-width: 760px)")) failures.push("Responsive visual refinement: mobile rules are missing.");

if (failures.length) {
  console.error("Visual refinement validation failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Visual refinement validation passed: scoped Apple-pharma homepage, preserved dossier/module art direction, regulated boundaries, system typography, responsive and reduced-motion controls verified.");
