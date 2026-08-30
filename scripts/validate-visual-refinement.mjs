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
  if (content.includes(text)) failures.push(`${label}: prohibited presentation remains ${JSON.stringify(text)}`);
}

const pages = Object.freeze({
  home: read("index.html"),
  capabilities: read("capabilities/index.html"),
  services: read("services/index.html"),
  regulatory: read("regulatory-services/index.html"),
  cro: read("cro/index.html"),
  oncology: read("oncology/index.html"),
  products: read("products/index.html"),
  nutraxin: read("products/nutraxin/index.html"),
  partners: read("partner-with-us/index.html"),
  technology: read("technology/index.html"),
  insights: read("news-insights/index.html"),
  contact: read("contact/index.html"),
});

const leadership = read("leadership/index.html");
const vishal = read("leadership/vishal-chakravarty/index.html");
const prabhakar = read("leadership/prabhakar-lahare/index.html");
const girish = read("leadership/girish-achliya/index.html");
const css = read("assets/css/corporate-product-discipline.css");
const bundleCss = read("assets/css/novapharm.bundle.css");
const javascript = read("assets/js/novapharm.js");
const build = read("scripts/build-site.mjs");

for (const [name, html] of Object.entries(pages)) {
  requireText(html, 'class="npd-main', `${name} authored layout`);
  requireText(html, 'class="npd-hero', `${name} deliberate hero`);
  requireText(html, "Regulated wholesale supply has not commenced", `${name} operating-status boundary`);
  requireText(html, 'class="npd-footer', `${name} institutional footer`);
  forbidText(html, "lucide", `${name} icon-free corporate presentation`);
  forbidText(html, "hero-cinematic-layer", `${name} retired cinematic template`);
  forbidText(html, "module-signal-disclosure", `${name} retired module template`);
  forbidText(html, "doodle", `${name} illustration vocabulary`);
}

[
  [pages.home, "Medicine. Where it needs to be.", "Homepage single proposition"],
  [pages.home, "Three routes. One evidence standard.", "Homepage sourcing hierarchy"],
  [pages.home, 'class="npd-roadmap"', "Homepage seven-stage regulatory path"],
  [pages.home, "Nineteen catalogue references. Presented as products, governed as evidence.", "Homepage real-product presentation"],
  [pages.home, 'class="npd-product-stage"', "Homepage large packshot stage"],
  [pages.services, 'class="npd-service-ledger"', "Services editorial ledger"],
  [pages.regulatory, 'class="npd-roadmap npd-roadmap-large"', "Regulatory full roadmap"],
  [pages.partners, 'class="npd-horizontal-steps"', "Partner qualification sequence"],
  [pages.technology, 'class="npd-maturity npd-maturity-full"', "Technology maturity architecture"],
  [pages.products, "Food Supplement Portfolio Review", "Products priority portfolio"],
  [pages.products, 'href="/products/nutraxin/"', "Products canonical Nutraxin route"],
  [pages.products, 'href="/products/strategic-portfolio/"', "Products strategic route"],
  [pages.nutraxin, 'class="npd-product-grid"', "Nutraxin product presentation"],
  [pages.contact, "A qualified B2B contact route.", "Contact information hierarchy"],
  [leadership, "/assets/media/leadership/vishal-chakravarty-1200.jpg", "Vishal approved portrait"],
  [leadership, "/assets/media/leadership/prabhakar-lahare-960.jpg", "Prabhakar approved portrait"],
  [leadership, "/assets/media/leadership/girish-achliya-960.jpg", "Girish approved portrait"],
  [vishal, "/assets/media/leadership/vishal-chakravarty-1200.jpg", "Vishal profile portrait"],
  [prabhakar, "/assets/media/leadership/prabhakar-lahare-960.jpg", "Prabhakar profile portrait"],
  [girish, "/assets/media/leadership/girish-achliya-960.jpg", "Girish profile portrait"],
  [css, "--corporate-product-discipline-contract: 1", "Corporate design contract"],
  [css, "--npd-container: 1200px", "Measured corporate grid"],
  [css, "--npd-header: 56px", "Measured navigation geometry"],
  [css, "-apple-system", "Lawful system-font stack"],
  [css, "@media (max-width: 360px)", "Compact mobile art direction"],
  [css, "@media (prefers-reduced-motion: reduce)", "Reduced-motion design"],
  [css, "@media (forced-colors: active)", "Forced-colours support"],
  [css, "@media print", "Print acceptance layer"],
  [bundleCss, "--corporate-product-discipline-contract: 1", "Bundled corporate design contract"],
  [javascript, 'visibleLabel.textContent = isOpen ? "Close" : "Menu"', "Textual mobile menu control"],
  [build, 'import("./apply-corporate-product-discipline.mjs")', "Deterministic corporate transformation"],
].forEach(([content, text, label]) => requireText(content, text, label));

if (pages.contact.includes('data-contact-form')) {
  requireText(pages.contact, 'class="form-grid contact-form"', "Managed contact form presentation");
  requireText(pages.contact, "Your information is transmitted to the secure NovaPharm API", "Managed contact authority boundary");
} else {
  requireText(pages.contact, "This public information release does not collect or transmit enquiry details.", "Public contact fail-closed state");
  requireText(pages.contact, "mailto:vishal@novapharmhealthcare.com", "Public contact verified fallback");
}

const roadmapStages = (pages.home.match(/<ol class="npd-roadmap">[\s\S]*?<\/ol>/)?.[0].match(/<li>/g) ?? []).length;
if (roadmapStages !== 7) failures.push(`Homepage regulatory path: expected 7 stages, found ${roadmapStages}.`);

const nutraxinProducts = (pages.nutraxin.match(/class="npd-product-card/g) ?? []).length;
if (nutraxinProducts !== 19) failures.push(`Nutraxin catalogue: expected 19 product cards, found ${nutraxinProducts}.`);

const productFeaturePosition = pages.products.indexOf("Food Supplement Portfolio Review");
const strategicPosition = pages.products.indexOf("Strategic pharmaceutical portfolio");
if (productFeaturePosition < 0 || strategicPosition < 0 || productFeaturePosition > strategicPosition) {
  failures.push("Products hierarchy: Food Supplement Portfolio Review must be the first substantive portfolio route.");
}

for (const prohibited of [
  "<svg",
  "lucide-react",
  "Founder & Chief Executive Officer",
  ">NovaPharm is an MHRA-authorised pharmaceutical wholesaler<",
  "currently supplying NHS",
]) {
  for (const [name, html] of Object.entries(pages)) forbidText(html, prohibited, `${name} production surface`);
}

if (pages.home.includes("<video")) failures.push("Homepage hero: video is not authorised until a measured, accessible production asset justifies its cost.");
if ((pages.home.match(/<section/g) ?? []).length < 9) failures.push("Homepage narrative is missing one or more required product-disciplined sections.");

if (failures.length) {
  console.error("Visual refinement validation failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Visual refinement validation passed: authored corporate hierarchy, real-product presentation, seven-stage regulatory pathway, icon-free navigation, responsive contracts and regulatory boundaries verified.");
