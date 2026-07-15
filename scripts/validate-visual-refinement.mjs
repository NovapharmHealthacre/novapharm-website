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
const moduleCss = read("assets/css/module-media-sanity.css");
const javascript = read("assets/js/visual-refinement.js");
const build = read("scripts/build-site.mjs");

[
  [index, "hero-cinematic-layer", "Homepage cinematic hero"],
  [index, "data-motion-toggle", "Homepage motion control"],
  [index, "regulatory-roadmap", "Homepage regulatory roadmap"],
  [index, "Commercial release only after applicable authorisation", "Roadmap seventh release gate"],
  [index, "batch-integrity-feature", "Homepage batch-integrity photo feature"],
  [index, '<figure class="batch-integrity-media">', "Semantic batch-integrity figure"],
  [index, "/assets/media/products/hospital-supply-logistics.jpg", "Homepage batch-integrity photograph"],
  [index, "partner-ecosystem-cinematic", "Homepage tailored partner ecosystem"],
  [index, "partner-cinematic-grid", "Homepage partner pathway composition"],
  [index, "Photography is representative", "Homepage partnership disclosure"],
  [services, "service-visual-story", "Services visual introduction"],
  [services, '<figure class="service-visual-media">', "Semantic Services visual figure"],
  [services, "services-media-gallery", "Services media gallery"],
  [services, "/assets/media/products/respiratory-manufacturing.jpg", "Services manufacturing photograph"],
  [regulatory, "regulatory-stage-grid", "Regulatory staged layout"],
  [regulatory, "regulatory-control-stage", "Regulatory tailored control sequence"],
  [regulatory, '<figure class="service-visual-media">', "Semantic Regulatory visual figure"],
  [partners, "partner-ecosystem-grid", "Partners image-led ecosystem"],
  [partners, '<figure class="service-visual-media">', "Semantic Partners visual figure"],
  [technology, "technology-visual-story", "Technology visual introduction"],
  [technology, '<figure class="technology-visual-media">', "Semantic Technology visual figure"],
  [technology, "technology-architecture-story", "Technology architecture refinement"],
  [leadership, "/assets/vishalchakravarty.jpeg", "Vishal approved portrait"],
  [leadership, "/assets/prabhakarvitthallahare.jpeg", "Prabhakar approved portrait"],
  [leadership, "/assets/girishshantilalachliya.jpeg", "Girish approved portrait"],
  [leadership, "module-portrait-composition", "Leadership tailored portrait composition"],
  [vishal, "/assets/vishalchakravarty.jpeg", "Vishal profile portrait"],
  [prabhakar, "/assets/prabhakarvitthallahare.jpeg", "Prabhakar profile portrait"],
  [girish, "/assets/girishshantilalachliya.jpeg", "Girish profile portrait"],
  [css, "@media (prefers-reduced-motion: reduce)", "Reduced-motion support"],
  [moduleCss, "page-hero-cinematic", "Module-specific cinematic page heroes"],
  [moduleCss, "modulePhotoDrift", "Module-specific photo motion"],
  [javascript, "data-motion-toggle", "Accessible motion controller"],
  [javascript, "IntersectionObserver", "Progressive visual reveal"],
  [build, 'import("./apply-visual-refinement.mjs")', "Deterministic visual build integration"],
  [build, 'import("./apply-module-media-sanity.mjs")', "Module media build integration"],
  [build, 'import("./normalise-visual-semantics.mjs")', "Semantic visual build integration"]
].forEach(([content, text, label]) => requireText(content, text, label));

forbidText(index, "/assets/media/editorial/quality-batch-integrity.svg", "Homepage");
forbidText(services, "/assets/media/editorial/quality-batch-integrity.svg", "Services");
forbidText(regulatory, "/assets/media/insights/gdp-qms-foundations.svg", "Regulatory");
forbidText(partners, "/assets/media/editorial/partnership-pathway.svg", "Partners");
forbidText(index, "partner-ecosystem-grid", "Homepage repeated product-style ecosystem");
forbidText(regulatory, 'class="regulatory-stage-media"', "Regulatory repeated laboratory visual");

const roadmapItems = (index.match(/class="roadmap-number"/g) || []).length;
if (roadmapItems !== 7) failures.push(`Regulatory roadmap: expected 7 stages, found ${roadmapItems}.`);

const pathwayCards = (index.match(/<div class="partner-pathways">[\s\S]*?<\/div>/)?.[0].match(/<article>/g) || []).length;
if (pathwayCards !== 4) failures.push(`Homepage partner pathways: expected 4 tailored pathways, found ${pathwayCards}.`);

const fullPartnerCards = (partners.match(/class="partner-ecosystem-card"/g) || []).length;
if (fullPartnerCards !== 10) failures.push(`Partner page ecosystem: expected 10 image-led cards, found ${fullPartnerCards}.`);

for (const [path, html] of [
  ["index.html", index],
  ["services/index.html", services],
  ["regulatory-services/index.html", regulatory],
  ["partner-with-us/index.html", partners],
  ["technology/index.html", technology]
]) {
  requireText(html, 'data-visual-refinement="2026-07"', `${path} build marker`);
  requireText(html, '/assets/js/visual-refinement.js', `${path} visual script`);
  if (!html.toLowerCase().includes("pre-operational")) failures.push(`${path} regulatory truthfulness: pre-operational status is missing.`);
}

if (index.includes("<video")) failures.push("Homepage hero: unexpected video added; the approved motion-enhanced still-image path should remain lightweight.");
if (!css.includes("@media (max-width: 760px)")) failures.push("Responsive visual refinement: mobile rules are missing.");

if (failures.length) {
  console.error("Visual refinement validation failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Visual refinement validation passed: cinematic homepage, tailored module photography, seven-stage roadmap, leadership portraits, responsive and reduced-motion controls verified.");
