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

// The build regenerates technology/index.html from src/content; assert exact hero parity.
const heroSource = (text) => text.slice(text.indexOf('<section class="npi-hero'), text.indexOf('<section id="intelligence-research"'));
assert.equal(heroSource(source), heroSource(published), "The published hero must match the canonical source template");
for (const [label, html] of [["source", source], ["published", published]]) {
  const hero = heroSource(html);
  assert.ok(hero.includes('npi-hero--editorial'), label + " must use the editorial hero");
  assert.ok(hero.includes('class="npi-hero-photo" aria-hidden="true"'), label + " must keep photography decorative");
  assert.ok(hero.includes('class="npi-hero-logo"'), label + " must use approved vector branding in the hero");
  assert.ok(hero.includes('alt="NovaPharm Intelligence"'), label + " must provide a meaningful logo alt");
  assert.ok(hero.includes("Medicine is complex."), label + " must preserve the owner-approved headline");
  assert.ok(hero.includes('href="#intelligence-research"'), label + " must preserve medicine search");
  assert.ok(!hero.includes('<p class="npi-kicker">NOVAPHARM INTELLIGENCE</p>'), label + " must not keep the old text label");
}
const heroAsset = readFileSync(resolve(root, "assets/media/technology/novapharm-intelligence-hero.avif"));
assert.ok(heroAsset.byteLength > 5000, "The optimized portrait background must be present in the build");
assert.ok(heroAsset.subarray(4, 12).toString("ascii").includes("ftypavif"), "Hero asset must be a valid AVIF container");
assert.ok(styles.includes('novapharm-intelligence-hero.avif'), "Hero stylesheet must reference its built asset");

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


assert.ok(source.includes('id="intelligence-research"') && published.includes('id="intelligence-research"'), "The public research entry must survive materialisation");
for (const [name, documentHtml] of [["source", source], ["published", published]]) {
  const researchStart = documentHtml.indexOf('id="intelligence-research"');
  const researchEnd = documentHtml.indexOf('id="intelligence-platform"', researchStart);
  assert.ok(researchStart > -1 && researchEnd > researchStart, name + " research section boundaries must remain intact");
  const researchSection = documentHtml.slice(researchStart, researchEnd);
  assert.ok(!researchSection.includes('href="https://portal.novapharmhealthcare.com/"'), name + " research must not redirect to the Nutraxin customer portal");
}
assert.ok(source.includes('npi-research-access-status') && published.includes('npi-research-access-status'), "Private terminal access must be represented honestly");
assert.ok(source.includes("English Prescribing Data") && published.includes("Secondary Care Medicines Data"), "EPD and SCMD must use the correct NHSBSA terminology");
assert.ok(!source.includes("Scottish Medicines Data") && !published.includes("Electronic Prescribing Data"), "Incorrect dataset terminology must not regress");
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
assert.equal(research("apixaban", "US", "evidence").length, 1, "Research result must be prepared");
controls["[data-npi-query]"].listeners.input();
assert.equal(controls["[data-npi-results]"].hidden, true, "A changed medicine input must hide stale results");
assert.equal(controls["[data-npi-results-list]"].children.length, 0, "A changed query must remove previously prepared links");
assert.equal(research("apixaban", "GB", "regulatory").length, 2, "UK regulatory sources must be available");
controls["[data-npi-market]"].listeners.change();
assert.equal(controls["[data-npi-results-list]"].children.length, 0, "Changing market must clear stale source links");


for (const [label, markup] of [["source", source], ["published", published]]) {
  assert.ok(markup.includes('id="intelligence-pricing"'), label + " must offer a three-plan comparison");
  assert.equal((markup.match(/data-npi-plan="(?:starter|professional|enterprise)"/g) || []).length, 3, label + " must have exactly three plans");
  assert.ok(markup.includes("₹24,999") && markup.includes("₹89,999"), label + " proposed India-market prices must match the published plan register");
  assert.ok(markup.includes("₹3,50,000"), label + " custom enterprise indication must not be hidden");
  assert.ok(markup.includes("not live subscriptions"), label + " must disclose product activation boundary");
  assert.ok(markup.includes("No payment will be collected here"), label + " must not imply production checkout");
  assert.ok(markup.includes('href="/contact/?enquiry=General%20enquiry&amp;intelligencePlan=starter"'), label + " Starter must carry a strictly enumerated plan to the approved business-enquiry form");
  assert.ok(markup.includes('href="mailto:vishal@novapharmhealthcare.com?subject=NovaPharm%20Intelligence%20Starter'), label + " Starter must offer a direct email fallback");
  assert.ok(markup.includes('href="/contact/?enquiry=General%20enquiry&amp;intelligencePlan=professional"'), label + " Professional must carry a strictly enumerated plan to the approved business-enquiry form");
  assert.ok(markup.includes('href="mailto:vishal@novapharmhealthcare.com?subject=NovaPharm%20Intelligence%20Professional'), label + " Professional must offer a direct email fallback");
  assert.ok(markup.includes('href="/contact/?enquiry=General%20enquiry&amp;intelligencePlan=enterprise"'), label + " Enterprise must carry a strictly enumerated plan to the approved business-enquiry form");
  assert.ok(markup.includes('href="mailto:vishal@novapharmhealthcare.com?subject=NovaPharm%20Intelligence%20Enterprise'), label + " Enterprise must offer a direct email fallback");
  assert.ok(!markup.includes('href="https://checkout.stripe.com'), label + " must not activate unverified checkout");
}
assert.ok(published.includes('src="/assets/js/intelligence-pricing.js"'), "Pricing module must be in the materialised site");
assert.ok(materialiser.includes('src="/assets/js/intelligence-pricing.js"'), "Build must preserve the pricing module");
assert.ok(styles.includes(".npi-pricing-grid") && styles.includes(".npi-billing-switch button:focus-visible"), "Responsive comparison and keyboard focus styles required");

const pricingScript = read("assets/js/intelligence-pricing.js");

const contactIntake = read("assets/js/contact-production.js");
assert.ok(contactIntake.includes('const requestedIntelligencePlan = intent.get("intelligencePlan")'), "Production B2B form must accept a plan identifier");
assert.ok(contactIntake.includes("Object.hasOwn(intelligencePlans, requestedIntelligencePlan)"), "Intelligence tier must be strictly allowlisted");
assert.ok(contactIntake.includes('!intent.has("basket") && !intent.has("quote") && !intent.has("product")'), "Subscription requests must not override Nutraxin/ESCO intent");
assert.ok(contactIntake.includes("non-binding business enquiry"), "Intelligence tier must remain an enquiry, not a chargeable order");
assert.ok(!contactIntake.includes("window.open"), "Plan intake must never silently open new windows");

assert.ok(!/XMLHttpRequest|sendBeacon|localStorage|sessionStorage|document[.]cookie|innerHTML|fetch[(]/.test(pricingScript), "Plan selector must not store or transmit prospect data");
const priceElement = () => ({ textContent: "" });
function pricedCard(monthly, annual) {
  const elements = {
    "[data-npi-plan-price]": priceElement(),
    "[data-npi-plan-period]": priceElement(),
    "[data-npi-plan-billing]": priceElement()
  };
  return {
    elements,
    getAttribute(name) { return name === "data-monthly-inr" ? String(monthly) : name === "data-annual-inr" ? String(annual) : null; },
    querySelector(selector) { return elements[selector] || null; }
  };
}
function billingButton(cycle) {
  return {
    attributes: { "data-npi-billing": cycle },
    listeners: {},
    classes: new Set(),
    getAttribute(name) { return this.attributes[name] || null; },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, callback) { this.listeners[name] = callback; },
    classList: { toggle() {} }
  };
}
const starter = pricedCard(24999, 254990);
const professional = pricedCard(89999, 917990);
const monthlyButton = billingButton("monthly");
const annualButton = billingButton("annual");
const pricingRoot = {
  querySelectorAll(selector) {
    if (selector === "[data-npi-billing]") return [monthlyButton, annualButton];
    if (selector === "[data-npi-plan][data-monthly-inr][data-annual-inr]") return [starter, professional];
    return [];
  }
};
runInNewContext(pricingScript, {
  document: { getElementById(id) { return id === "intelligence-pricing" ? pricingRoot : null; } },
  Intl,
  Number,
  Math
});
assert.equal(monthlyButton.attributes["aria-pressed"], "true");
assert.equal(starter.elements["[data-npi-plan-price]"].textContent, "₹24,999");
assert.equal(professional.elements["[data-npi-plan-price]"].textContent, "₹89,999");
annualButton.listeners.click();
assert.equal(annualButton.attributes["aria-pressed"], "true");
assert.equal(monthlyButton.attributes["aria-pressed"], "false");
assert.equal(starter.elements["[data-npi-plan-price]"].textContent, "₹21,249");
assert.equal(professional.elements["[data-npi-plan-price]"].textContent, "₹76,499");
assert.ok(starter.elements["[data-npi-plan-billing]"].textContent.includes("₹2,54,990"));
assert.ok(professional.elements["[data-npi-plan-billing]"].textContent.includes("₹9,17,990"));
monthlyButton.listeners.click();
assert.equal(starter.elements["[data-npi-plan-price]"].textContent, "₹24,999");


const terminalOrigin = "https://intelligence.novapharmhealthcare.com/";
for (const [label, markup] of [["source", source], ["published", published]]) {
  assert.ok(markup.includes('class="npi-local-login" href="' + terminalOrigin + '"'), label + " must have a visible local-nav sign-in button");
  assert.ok(markup.includes('class="npi-button npi-button-secondary">Sign in to the Medicines Terminal</a>'), label + " must have a prominent Medicines Terminal sign-in CTA");
  assert.ok(markup.includes('class="npi-research-access"'), label + " must expose professional sign-in next to public research");
  assert.ok((markup.match(/href="https:\/\/intelligence\.novapharmhealthcare\.com\/"/g) || []).length >= 3, label + " must link the three scoped sign-in affordances to the dedicated HTTPS host; the generated page also adds a sitewide mega-menu link");
  assert.ok(markup.includes("Invitation-only sign-in is available."), label + " must disclose invitation-only authentication");
  assert.ok(!markup.includes("Professional sign-in will be available after secure workspace activation."), label + " must not retain superseded sign-in copy");
}
assert.ok(materialiser.includes('["Sign in to Intelligence", "https://intelligence.novapharmhealthcare.com/"]'), "All global Intelligence mega-menus must include live terminal sign-in");
assert.ok(styles.includes(".np-intelligence-local-nav .npi-local-login"), "Sign-in nav must have scoped visual styling");
assert.ok(styles.includes(".npi-research-access .npi-button"), "Research-area sign-in must have scoped button styling");

console.log("NovaPharm Intelligence Technology page: source, public output, disclosures, CSS and build integration verified.");

// The interactive directory must be a customer-safe demonstration in both published routes.
const workspacesHtml = read("technology/workspaces/index.html");
const workspacesEmbed = read("assets/js/intelligence-workspace-embed.js");
for (const [label, html] of [["canonical source", source], ["published page", published]]) {
  assert.match(html, /id="npi-experience-iframe"/, label + " must embed the interactive experience");
  assert.match(html, /src="\/technology\/workspaces\/\?embed=1"/, label + " must use the local same-origin experience");
  assert.match(html, /npi-directory-groups" hidden aria-hidden="true"/, label + " must not display the obsolete accordion");
}
assert.match(styles, /npi-workspace-live-experience/, "The shared style must include the embedded experience");
assert.match(workspacesEmbed, /event\.origin !== window\.location\.origin/, "Only same-origin resize events may be trusted");
assert.match(workspacesHtml, /function renderSupplyOverview\(\)/, "Supply Intelligence must have its own interactive product preview");
assert.match(workspacesHtml, /function renderSupplyMode\(mode\)/, "Supply Intelligence preview tabs must render distinct content");
assert.match(workspacesHtml, /ILLUSTRATIVE PRODUCT EXPERIENCE/, "Simulated figures must be identified as previews");
assert.match(workspacesHtml, /@media\(max-width:500px\)/, "The interactive experience must define small-screen layouts");
for (const label of ["Medicine research", "Market intelligence", "Supply & regulation", "Strategy", "Decision tools"]) {
  assert.ok(workspacesHtml.includes(label), "Missing interactive workspace discipline: " + label);
}
