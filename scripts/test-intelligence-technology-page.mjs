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
  const pricing = markup.slice(markup.indexOf('<section id="intelligence-pricing"'), markup.indexOf('<section class="npi-section npi-audience"'));
  assert.ok(pricing.includes('id="intelligence-pricing"'), label + " must render the four-plan comparison");
  assert.equal((pricing.match(/data-npi-plan="(?:trial|starter|professional|enterprise)"/g) || []).length, 4, label + " must have four aligned plans");
  assert.ok(pricing.includes('data-npi-starter-trial="approved"'), label + " must include approved trial alongside the other plans");
  assert.ok(pricing.includes('aria-label="Approved 30-day Starter free trial"'));
  assert.ok(pricing.includes("£0") && pricing.includes("for 30 days") && pricing.includes("25 total"));
  assert.ok(pricing.includes("No credit card required") && pricing.includes("No automatic subscription or charges"));
  assert.ok(pricing.includes('data-monthly-gbp="199" data-annual-gbp="2030"'));
  assert.ok(pricing.includes('data-monthly-gbp="699" data-annual-gbp="7130"'));
  assert.ok(pricing.includes("£2,799") && pricing.includes("Custom"));
  assert.ok(pricing.includes("paid checkout currently remains separately gated") && pricing.includes("No payment is collected by this page"));
  assert.ok(pricing.includes("Approved monthly prices in GBP") && pricing.includes("actual tax depends"));
  assert.ok(!pricing.includes('npi-trial-offer') && !pricing.includes('npi-billing-switch'), label + " must not have a separate trial banner or unapproved billing toggle");
  assert.ok(!pricing.includes("Coming soon") && !pricing.includes("Enrolment not yet open"), label + " must not use disabled-plan marketing buttons");
  for (const plan of ["starter","professional"]) {
    assert.ok(pricing.includes('href="https://intelligence.novapharmhealthcare.com/auth/customer/register?plan=' + plan + '&amp;cycle=monthly"'), label + " paid plan must use secure Cognito registration with fixed plan and cycle");
    assert.ok(pricing.includes('href="https://intelligence.novapharmhealthcare.com/auth/customer/start?plan=' + plan + '&amp;cycle=monthly"'), label + " existing customers must have matching signed sign-in entry");
    assert.ok(!pricing.includes('/contact/?enquiry=General%20enquiry&amp;intelligencePlan=' + plan), label + " paid plans must not fall back to contact form");
  }
  assert.ok(pricing.includes('href="https://intelligence.novapharmhealthcare.com/auth/customer/register"'), label + " free trial must initiate no-card identity registration");
  assert.ok(pricing.includes('intelligencePlan=enterprise'), label + " bespoke Enterprise requires contractual enquiry");
  assert.ok(pricing.includes("Create free account") && pricing.includes("Choose Starter") && pricing.includes("Choose Professional") && pricing.includes("Contact sales"));
  assert.ok(pricing.includes("Stripe-hosted payment is requested only after verified identity"));
  assert.ok(!pricing.includes("checkout.stripe.com") && !pricing.includes('/auth/customer/register'), label + " must never promise unverified checkout");
}
assert.ok(styles.includes("Four-plan Intelligence pricing") && styles.includes("repeat(4, minmax(0,1fr))"), "Four-column responsive layout contract");
assert.ok(styles.includes("#0071e3") && styles.includes("#f5f5f7"), "Approved Apple-style palette is retained");
const pricingScript = read("assets/js/intelligence-pricing.js");
assert.ok(!/XMLHttpRequest|sendBeacon|localStorage|sessionStorage|document[.]cookie|innerHTML|fetch[(]/.test(pricingScript), "Legacy inert pricing script must never collect data");

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
const workspaceCss = read("assets/css/intelligence-workspace-product.css");
const workspaceJs = read("assets/js/intelligence-workspace-product.js");
const workspaceEmbeddedCss = read("assets/css/intelligence-workspace-embedded.css");
const workspaceEmbeddedJs = read("assets/js/intelligence-workspace-embedded.js");
for (const [label, html] of [["canonical source", source], ["published page", published]]) {
  assert.match(html, /id="npi-exp-shell"/, label + " must render the native interactive experience");
  assert.equal((html.match(/<h1\b/g) || []).length, 1, label + " must have one document h1 after native workspace integration");
  assert.match(html, /<section class="section" aria-labelledby="npi-directory-title">/, label + " native experience must use the existing visible section heading");
  assert.doesNotMatch(html, /npi-exp-main-heading/, label + " must not introduce a duplicate hidden title");
  assert.match(html, /href="\/assets\/css\/intelligence-workspace-embedded\.css"/, label + " must load the scoped app styles");
  assert.match(html, /src="\/assets\/js\/intelligence-workspace-embedded\.js"/, label + " must load the CSP-safe app runtime");
  assert.match(html, /npi-directory-groups" hidden aria-hidden="true"/, label + " must not display the obsolete accordion");
  assert.doesNotMatch(html, /id="npi-experience-iframe"/, label + " must not depend on CSP-blocked frames");
}
assert.match(styles, /npi-workspace-live-experience/, "The shared style must include the embedded experience");
assert.match(workspaceEmbeddedJs, /appRoot\.addEventListener\(\x27click\x27/, "Native app interactions must be scoped to the component");
assert.match(workspaceEmbeddedCss, /npi-workspace-live-experience/, "Native app styles must not leak into the website");
assert.doesNotMatch(workspaceEmbeddedJs, /style="/, "Native app previews must not depend on CSP-blocked inline styles");
assert.match(workspaceJs, /function renderSupplyOverview\(\)/, "Supply Intelligence must have its own interactive product preview");
assert.match(workspaceJs, /function renderSupplyMode\(mode\)/, "Supply Intelligence preview tabs must render distinct content");
assert.match(workspaceJs, /ILLUSTRATIVE PRODUCT EXPERIENCE/, "Simulated figures must be identified as previews");
assert.match(workspaceCss, /@media\(max-width:500px\)/, "The interactive experience must define small-screen layouts");
for (const label of ["Medicine research", "Market intelligence", "Supply & regulation", "Strategy", "Decision tools"]) {
  assert.ok(workspaceJs.includes(label), "Missing interactive workspace discipline: " + label);
}

// The mobile WCAG AA acceptance requires readable secondary labels, not decorative low-contrast grey.
for (const [label, css] of [["native section", workspaceEmbeddedCss], ["standalone experience", workspaceCss]]) {
  assert.match(css, /WCAG AA: muted workspace copy remains readable/, label + " must carry its scoped contrast policy");
  assert.match(css, /color:\s*#57575d\s*;/, label + " must use contrast-safe secondary text");
  for (const selector of [".tab small", ".workspace-caption", ".stage-kicker", ".stage-counter", ".preview-description", ".tiny-caps", ".detail-pane p", ".demo-footer", ".status-note"]) {
    assert.ok(css.includes(selector), label + " must explicitly cover " + selector);
  }
}

// All secondary text in desktop rail and additional demo lenses must remain AA readable.
for (const [label, css] of [["native", workspaceEmbeddedCss], ["standalone", workspaceCss]]) {
  assert.match(css, /WCAG AA: secondary labels in desktop rail/, label + " must include extended contrast rules");
  for (const selector of [".rail-label", ".rail-foot", ".metric-label", ".chart-legend", ".workflow-body span", ".timeline-item", ".source-intro", ".demo-label"]) {
    assert.ok(css.includes(selector), label + " must cover " + selector);
  }
  assert.match(css, /\.pill\.good\s*\{\s*color:\s*#145b48\s*;/, label + " must preserve accessible positive-status colour");
}

// The owner-approved editorial customer journey must be interactive, accessible and
// reproducible from the canonical source, not a non-responsive raster screenshot.
const journeyScript = read("assets/js/technology-journey.js");
for (const [label, html] of [["source", source], ["published", published]]) {
  const journeySection = html.slice(html.indexOf('class="npi-journey" data-npi-journey'), html.indexOf('class="npi-workspace-disclosure"'));
  assert.ok(journeySection.includes('id="npi-journey-detail"'), label + ": missing live explanation");
  assert.equal((journeySection.match(/data-npi-journey-step="\d+"/g) || []).length, 8, label + ": must show eight steps");
  assert.equal((journeySection.match(/data-npi-journey-marker="\d+"/g) || []).length, 8, label + ": must show eight path markers");
  assert.ok(journeySection.includes('aria-live="polite"'), label + ": selections must have an accessible announcement");
  assert.ok(journeySection.includes('data-npi-journey-prev') && journeySection.includes('data-npi-journey-next'), label + ": missing controls");
  assert.ok(journeySection.includes('href="#intelligence-workspace-directory"'), label + ": working concept link must remain local");
  assert.ok(html.includes('src="/assets/js/technology-journey.js" defer'), label + ": journey script must be loaded");
  assert.ok(!journeySection.includes('npi-workspace-grid'), label + ": legacy card grid must be removed");
}
assert.match(styles, /\.npi-journey-stages/);
assert.match(styles, /prefers-reduced-motion/);
assert.match(styles, /\.npi-journey-step:focus-visible/);
assert.match(journeyScript, /addEventListener\("click"/);
assert.match(journeyScript, /ArrowRight/);
assert.doesNotMatch(journeyScript, /fetch\(|sendBeacon\(|\.submit\(/, "Journey is a presentation layer without outbound data");

class JourneyNode {
  constructor() {
    this.dataset = {};
    this.attrs = {};
    this.handlers = {};
    this.textContent = "";
    this.disabled = false;
    this.classList = { values: new Set(), toggle: (key, value) => value ? this.classList.values.add(key) : this.classList.values.delete(key) };
  }
  setAttribute(key, value) { this.attrs[key] = value; }
  addEventListener(key, callback) { this.handlers[key] = callback; }
  focus() { this.focused = true; }
  scrollIntoView() { this.scrolled = true; }
  fire(type, event = {}) { this.handlers[type]?.(event); }
}
const fakeSteps = Array.from({ length: 8 }, () => new JourneyNode());
const fakeMarkers = Array.from({ length: 8 }, () => new JourneyNode());
const fakeEls = {
  "[data-npi-journey-prev]": new JourneyNode(),
  "[data-npi-journey-next]": new JourneyNode(),
  "[data-npi-journey-start]": new JourneyNode(),
  "[data-npi-journey-title]": new JourneyNode(),
  "[data-npi-journey-description]": new JourneyNode(),
  "[data-npi-journey-status]": new JourneyNode(),
  ".npi-journey-stages": new JourneyNode()
};
const fakeRoot = {
  dataset: {},
  querySelectorAll(selector) {
    if (selector === "[data-npi-journey-step]") return fakeSteps;
    if (selector === "[data-npi-journey-marker]") return fakeMarkers;
    return [];
  },
  querySelector(selector) { return fakeEls[selector] || null; }
};
runInNewContext(journeyScript, {
  document: { querySelector: key => key === "[data-npi-journey]" ? fakeRoot : null },
  window: { matchMedia: () => ({ matches: false }) }
});
assert.equal(fakeEls["[data-npi-journey-title]"].textContent, "Medicine identity");
assert.equal(fakeEls["[data-npi-journey-prev]"].disabled, true);
fakeSteps[4].fire("click");
assert.equal(fakeRoot.dataset.activeStage, "5");
assert.equal(fakeEls["[data-npi-journey-title]"].textContent, "Supply, pricing & tenders");
assert.equal(fakeSteps[4].attrs["aria-pressed"], "true");
assert.equal(fakeSteps[0].attrs["aria-pressed"], "false");
fakeSteps[4].fire("keydown", { key: "ArrowRight", preventDefault() {} });
assert.equal(fakeRoot.dataset.activeStage, "6");
fakeSteps[7].fire("click");
assert.equal(fakeEls["[data-npi-journey-next]"].disabled, true);
fakeEls["[data-npi-journey-start]"].fire("click");
assert.equal(fakeRoot.dataset.activeStage, "1");
assert.equal(fakeSteps[0].focused, true);
