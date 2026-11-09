import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const read = (path) => readFileSync(resolve(root, path), "utf8");
const source = read("src/content/technology-intelligence.html");
const published = read("technology/index.html");
const styles = read("assets/css/technology-intelligence.css");
const materialiser = read("scripts/apply-corporate-product-discipline.mjs");
const metadata = read("src/content/site-content.mjs");

const required = [
  "NOVAPHARM INTELLIGENCE", "Medicine is complex.", "The industry doesn't lack data. It lacks connection.",
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

console.log("NovaPharm Intelligence Technology page: source, public output, disclosures, CSS and build integration verified.");
