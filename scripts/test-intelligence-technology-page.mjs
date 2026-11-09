import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";

const root = resolve(process.cwd());
const read = (path) => readFileSync(resolve(root, path), "utf8");
const source = read("src/content/technology-intelligence.html");
const published = read("technology/index.html");
const styles = read("assets/css/technology-intelligence.css");
const materialiser = read("scripts/apply-corporate-product-discipline.mjs");
const metadata = read("src/content/site-content.mjs");

const required = [
  "NOVAPHARM INTELLIGENCE", "Medicine is complex.",
  "The Medicines Terminal", "NOVA", "PANDORA",
  "Medicine identity", "Evidence &amp; regulation", "Market &amp; geography",
  "Forecasts &amp; signals", "Supply, pricing &amp; tenders",
  "Biotech &amp; capital", "Portfolio &amp; decisions", "Reports &amp; integrations",
  "Observed fact", "Derived metric", "Model forecast",
  "Commercial assumption", "Recommendation",
  "Models forecast.", "AI explains.", "Humans decide.",
  "Product in development", "Illustrative", "source", "Unresolved"
];
for (const phrase of required) {
  assert.ok(source.toLowerCase().includes(phrase.toLowerCase()), "Missing Intelligence copy: " + phrase);
  assert.ok(published.toLowerCase().includes(phrase.toLowerCase()), "Missing published Intelligence copy: " + phrase);
}
assert.equal((source.match(/<h1\b/g) || []).length, 1, "Exactly one primary page heading");
assert.equal((source.match(/<main\b/g) || []).length, 1, "Exactly one main landmark");
assert.equal((source.match(/<\/main>/g) || []).length, 1, "Main landmark is closed");
assert.equal((source.match(/<section\b/g) || []).length, (source.match(/<\/section>/g) || []).length, "Sections are balanced");
assert.ok(source.includes('id="intelligence-roadmap"'));
assert.ok(published.includes('href="/assets/css/technology-intelligence.css"'));
assert.ok(published.includes('<link rel="canonical" href="https://novapharmhealthcare.com/technology/">'));
assert.ok(published.includes("<title>NovaPharm Intelligence"));
assert.ok(metadata.includes('title: "NovaPharm Intelligence | Medicines, Evidence & Analytics"'));
assert.ok(materialiser.includes('return read("src/content/technology-intelligence.html")'), "Build must use single content source");
assert.ok(materialiser.includes('href="/assets/css/technology-intelligence.css"'), "Build must include scoped stylesheet");
assert.ok(styles.includes(".np-intelligence .npi-terminal"));
assert.ok(styles.includes("@media (max-width: 600px)"));
assert.ok(styles.includes("@media (prefers-reduced-motion: reduce)"));
assert.ok(!source.includes("Apple logo"), "Avoid use of third-party brand assets");
assert.ok(!source.includes("data-contact-form"), "Public product page must not impersonate a working submission form");
assert.ok(!/(\d+(?:\.\d+)?%)\s*(accuracy|forecast|uptime)/i.test(source), "Unverified metrics must not be displayed");

for (const document of [
  "index.html", "about/index.html", "capabilities/index.html",
  "products/index.html", "news-insights/index.html", "technology/index.html"
]) {
  const html = read(document);
  assert.ok(html.includes('data-mega-trigger="intelligence"'), document + " must link Intelligence in global navigation");
  assert.ok(html.includes('data-mega-panel="intelligence"'), document + " must contain Intelligence category navigation");
  assert.ok(html.includes('href="/technology/"'), document + " must link the actual Technology route");
}
assert.ok(source.includes('npi-terminal-geography'), "Geography preview is missing");
assert.ok(source.includes('npi-terminal-trends'), "Trend preview is missing");
assert.ok(published.includes('npi-terminal-geography'), "Published geography preview is missing");
assert.ok(published.includes('npi-terminal-trends'), "Published trends preview is missing");
assert.ok(styles.includes(".npi-dash-analytics-grid"), "Responsive analytical dashboard styling is missing");
assert.ok(styles.includes(".npi-dash-brand-symbol"), "Proprietary Intelligence branding is missing");
assert.ok(source.includes("data-medicines-terminal-preview"), "Owner-approved demo dashboard must be present");
assert.ok(source.includes("simulated figures") && published.includes("simulated figures"), "Both sources must disclose illustrative data");
assert.ok(published.includes('src="/assets/js/medicines-terminal-preview.js"'), "Local sample chart script must load");
assert.ok(materialiser.includes('src="/assets/js/medicines-terminal-preview.js"'), "Site generator must preserve chart interaction");
assert.ok(read("assets/js/medicines-terminal-preview.js").includes("const series"), "Sample chart implementation is missing");
assert.ok(source.includes("england-geography-concept.svg"), "Schematic regional illustration is missing");
const mapScript=read("assets/js/medicines-terminal-preview.js");
assert.ok(mapScript.includes("Integrated_Care_Boards_April_2026_Boundaries_EN_BSC"), "Map must source official ONS geographic boundaries");
assert.ok(!mapScript.match(/XMLHttpRequest|sendBeacon|localStorage|sessionStorage/), "Product preview must never transmit or persist customer records");
assert.ok(source.includes("data-npi-real-map") && published.includes("data-npi-real-map"), "Official geometry mount must be present in source and published HTML");
assert.ok(source.includes("novapharm-intelligence-approved.svg") && published.includes("novapharm-intelligence-approved.svg"), "Approved brand wordmark must appear in both pages");
assert.ok(read("assets/brand/novapharm-intelligence-approved.svg").includes("viewBox=\"0 0 1950 337\""), "Uploaded brand kit aspect ratio must be retained");
assert.ok(read("assets/css/novapharm.bundle.css").includes(".npd-mega.is-open"), "Global nav styling was not bundled");
assert.ok(materialiser.includes('data-mega-trigger'), "Generated chrome must retain category triggers");


assert.ok(source.includes('id="intelligence-research"') && published.includes('id="intelligence-research"'), "The public research entry must survive materialisation");
assert.ok(source.includes('data-npi-query') && published.includes('data-npi-query'), "Medicine research input must be present");
assert.ok(source.includes('data-npi-results-list') && published.includes('data-npi-results-list'), "Accessible official-source results must be present");
assert.ok(published.includes('src="/assets/js/intelligence-research-launcher.js"'), "Published research script must load");
assert.ok(materialiser.includes('src="/assets/js/intelligence-research-launcher.js"'), "Build must preserve the research script");
assert.ok(styles.includes(".npi-research-form") && styles.includes(".npi-research-results[hidden]"), "Responsive research styles and hidden-state rule are required");

const launcher = read("assets/js/intelligence-research-launcher.js");
assert.ok(!/XMLHttpRequest|sendBeacon|localStorage|sessionStorage|innerHTML|document\\.cookie/.test(launcher), "Research launcher must not store, transmit or inject input");
assert.ok(launcher.includes("noopener noreferrer") && launcher.includes("event.preventDefault()"), "External links must require deliberate interaction");
function element(tag = "div") {
  return {
    tagName: tag.toUpperCase(),
    value: "",
    hidden: true,
    children: [],
    attributes: {},
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = [...children]; },
    setAttribute(key, value) { this.attributes[key] = value; },
    addEventListener(name, callback) { this.listeners = this.listeners || {}; this.listeners[name] = callback; },
    focus() { this.didFocus = true; }
  };
}
const controls = {
  "[data-npi-research-form]": element("form"),
  "[data-npi-query]": element("input"),
  "[data-npi-market]": element("select"),
  "[data-npi-focus]": element("select"),
  "[data-npi-results]": element(),
  "[data-npi-results-list]": element("ul"),
  "[data-npi-research-status]": element("p")
};
const researchRoot = { querySelector(selector) { return controls[selector] || null; } };
runInNewContext(launcher, {
  document: {
    querySelector(selector) { return selector === "[data-npi-research]" ? researchRoot : null; },
    createElement: element
  },
  URL
});
function research(medicine, market, focus) {
  controls["[data-npi-query]"].value = medicine;
  controls["[data-npi-market]"].value = market;
  controls["[data-npi-focus]"].value = focus;
  let prevented = false;
  controls["[data-npi-research-form]"].listeners.submit({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true, "Research action must not navigate or submit user input automatically");
  return controls["[data-npi-results-list]"].children;
}
assert.ok(research("apixaban", "GB", "regulatory").some(item => item.children[0].children[0].textContent === "MHRA Products"), "UK regulatory source must be present");
assert.ok(research("apixaban", "US", "evidence")[0].children[2].href.includes("term=apixaban"), "PubMed query must be URL encoded");
assert.ok(research("apixaban", "ALL", "trials")[0].children[2].href.includes("clinicaltrials.gov"), "Global trials source must be available");
assert.equal(research("<script>alert(1)</script>", "US", "evidence")[0].children[2].rel, "noopener noreferrer", "External links must be hardened");
assert.equal(research("a", "GB", "regulatory").length, 0, "Too-short medicine search must fail closed");
assert.equal(controls["[data-npi-results]"].hidden, true, "Invalid search must clear results");
assert.equal(research("apixaban", "IN", "market").length, 0, "Unavailable market facts must not be fabricated");

console.log("NovaPharm Intelligence Technology page: source, public output, disclosures, CSS and build integration verified.");
