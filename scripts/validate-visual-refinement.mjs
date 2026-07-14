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
  if (content.includes(text)) failures.push(`${label}: obsolete visual remains ${JSON.stringify(text)}`);
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
const javascript = read("assets/js/visual-refinement.js");
const build = read("scripts/build-site.mjs");

[
  [index, "hero-cinematic-layer", "Homepage cinematic hero"],
  [index, "data-motion-toggle", "Homepage motion control"],
  [index, "regulatory-roadmap", "Homepage regulatory roadmap"],
  [index, "Commercial release only after applicable authorisation", "Roadmap seventh release gate"],
  [index, "batch-integrity-feature", "Homepage batch-integrity photo feature"],
  [index, "/assets/media/products/hospital-supply-logistics.jpg", "Homepage batch-integrity photograph"],
  [index, "partner-ecosystem-grid", "Homepage partner ecosystem"],
  [index, "Photography is representative", "Homepage partnership disclosure"],
  [services, "service-visual-story", "Services visual introduction"],
  [services, "services-media-gallery", "Services media gallery"],
  [services, "/assets/media/products/respiratory-manufacturing.jpg", "Services manufacturing photograph"],
  [regulatory, "regulatory-stage-grid", "Regulatory staged layout"],
  [regulatory, "/assets/media/products/cardiovascular-quality-control.jpg", "Regulatory quality photograph"],
  [partners, "partner-ecosystem-grid", "Partners image-led ecosystem"],
  [partners, "/assets/media/products/specialty-pharmacy-handling.jpg", "Partners qualification photograph"],
  [technology, "technology-visual-story", "Technology visual introduction"],
  [technology, "technology-architecture-story", "Technology architecture refinement"],
  [technology, "/assets/media/products/metabolic-laboratory-analysis.jpg", "Technology analysis photograph"],
  [leadership, "/assets/vishalchakravarty.jpeg", "Vishal approved portrait"],
  [leadership, "/assets/prabhakarvitthallahare.jpeg", "Prabhakar approved portrait"],
  [leadership, "/assets/girishshantilalachliya.jpeg", "Girish approved portrait"],
  [vishal, "/assets/vishalchakravarty.jpeg", "Vishal profile portrait"],
  [prabhakar, "/assets/prabhakarvitthallahare.jpeg", "Prabhakar profile portrait"],
  [girish, "/assets/girishshantilalachliya.jpeg", "Girish profile portrait"],
  [css, "@media (prefers-reduced-motion: reduce)", "Reduced-motion support"],
  [javascript, "data-motion-toggle", "Accessible motion controller"],
  [javascript, "IntersectionObserver", "Progressive visual reveal"],
  [build, 'import("./apply-visual-refinement.mjs")', "Deterministic visual build integration"]
].forEach(([content, text, label]) => requireText(content, text, label));

forbidText(index, "/assets/media/editorial/quality-batch-integrity.svg", "Homepage");
forbidText(services, "/assets/media/editorial/quality-batch-integrity.svg", "Services");
forbidText(regulatory, "/assets/media/insights/gdp-qms-foundations.svg", "Regulatory");
forbidText(partners, "/assets/media/editorial/partnership-pathway.svg", "Partners");

const roadmapItems = (index.match(/class="roadmap-number"/g) || []).length;
if (roadmapItems !== 7) failures.push(`Regulatory roadmap: expected 7 stages, found ${roadmapItems}.`);

const partnerCards = (index.match(/class="partner-ecosystem-card"/g) || []).length;
if (partnerCards !== 8) failures.push(`Homepage partner ecosystem: expected 8 image-led cards, found ${partnerCards}.`);

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
  requireText(html, "Pre-operational", `${path} regulatory truthfulness`);
}

if (index.includes("<video")) failures.push("Homepage hero: unexpected video added; the approved motion-enhanced still-image path should remain lightweight.");
if (!css.includes("@media (max-width: 760px)")) failures.push("Responsive visual refinement: mobile rules are missing.");

if (failures.length) {
  console.error("Visual refinement validation failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Visual refinement validation passed: premium hero, seven-stage roadmap, image-led sections, leadership portraits, responsive and reduced-motion controls verified.");
