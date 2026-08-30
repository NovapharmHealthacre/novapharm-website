import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const text = (path) => readFileSync(join(root, path), "utf8");

const cssEntrypoint = text("assets/css/novapharm.css");
assert.match(cssEntrypoint, /@layer reset, tokens, foundations, layout, components, pages, utilities;/);
for (const module of ["base", "tokens", "foundations", "portal", "responsive", "cro", "oncology", "corporate-product-discipline"]) {
  assert.match(cssEntrypoint, new RegExp(`@import url\\("\\./${module}\\.css"\\)`), `${module}.css must be part of the production CSS entrypoint`);
}
assert.doesNotMatch(cssEntrypoint, /ai-search\.css/, "the retired public AI stylesheet must not be imported");

const css = text("assets/css/corporate-product-discipline.css");
const bundleCss = text("assets/css/novapharm.bundle.css");
const tokenCss = text("assets/css/tokens.css");
assert.match(css, /--corporate-product-discipline-contract:\s*1/);
assert.match(css, /--npd-container:\s*1200px/);
assert.match(css, /--npd-header:\s*56px/);
assert.match(css, /--npd-system:\s*-apple-system, BlinkMacSystemFont/);
assert.match(css, /letter-spacing:\s*0/);
assert.match(css, /@media \(max-width:\s*360px\)/);
assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
assert.match(css, /@media \(forced-colors:\s*active\)/);
assert.match(css, /@media print/);
assert.match(bundleCss, /--corporate-product-discipline-contract:\s*1/);
assert.match(tokenCss, /--brand:\s*#E3120B;/, "the canonical identity red must remain Economist Red");
assert.match(tokenCss, /--brand-text:\s*#B30E09;/, "small red foreground text needs the contrast-safe derivative");

const home = text("index.html");
assert.match(home, /<main id="main" class="npd-main npd-home">/);
assert.match(home, /Medicine\. Where it needs to be\./);
assert.match(home, /supply-network-hero\.avif/);
assert.match(home, /supply-network-hero\.jpg/);
assert.match(home, /Three routes\. One evidence standard\./);
assert.equal((home.match(/<ol class="npd-numbered-grid">[\s\S]*?<\/ol>/)?.[0].match(/<li>/g) ?? []).length, 3, "homepage must present three sourcing routes");
assert.equal((home.match(/<ol class="npd-roadmap">[\s\S]*?<\/ol>/)?.[0].match(/<li>/g) ?? []).length, 7, "homepage must present seven regulatory stages");
assert.match(home, /Continuity begins before a product moves\./);
assert.match(home, /Nineteen catalogue references\. Presented as products, governed as evidence\./);
assert.equal((home.match(/<div class="npd-product-stage">[\s\S]*?<\/div><\/div><\/section>/)?.[0].match(/href="\/products\/nutraxin\//g) ?? []).length, 3, "homepage must stage three real product references");
assert.match(home, /Use the smallest system that preserves control\./);
assert.match(home, /Different organisations\. One disciplined route into partnership\./);
assert.match(home, /Bring the opportunity\. We will start with the evidence\./);
assert.match(home, /Regulated wholesale supply has not commenced/);
assert.doesNotMatch(home, /<video|hero-cinematic-layer|data-motion-toggle|data-ai-search-open|nav-search|ai-search-dialog/);

const expectedNavigation = [
  ["Company", "/about/"],
  ["Capabilities", "/capabilities/"],
  ["Oncology", "/oncology/"],
  ["Products", "/products/"],
  ["Insights", "/news-insights/"],
  ["Contact", "/contact/"],
  ["Secure Portal", "/portal/"],
];
for (const [label, href] of expectedNavigation) assert.match(home, new RegExp(`<a href="${href.replaceAll("/", "\\/")}"[^>]*>${label}<\\/a>`));
assert.match(home, /<span data-menu-label>Menu<\/span>/, "mobile navigation must use the visible word Menu");

const routeContracts = [
  ["capabilities/index.html", "The right route depends on the evidence already in place."],
  ["services/index.html", "npd-service-ledger"],
  ["regulatory-services/index.html", "npd-roadmap npd-roadmap-large"],
  ["cro/index.html", "Define the programme before assembling the delivery model."],
  ["oncology/index.html", "Continuity is designed before supply begins."],
  ["partner-with-us/index.html", "npd-horizontal-steps"],
  ["technology/index.html", "npd-maturity npd-maturity-full"],
  ["news-insights/index.html", "Regulated-market thinking, written to be challenged."],
  ["contact/index.html", "A qualified B2B contact route."],
];
for (const [path, marker] of routeContracts) {
  const html = text(path);
  assert.match(html, /class="npd-main/);
  assert.ok(html.includes(marker), `${path} must retain ${marker}`);
  assert.match(html, /Regulated wholesale supply has not commenced/);
  assert.doesNotMatch(html, /<svg|lucide|doodle|hero-cinematic-layer|module-signal-disclosure/);
}

const contact = text("contact/index.html");
if (contact.includes('data-contact-form')) {
  if (!contact.includes('class="form-grid contact-form"') || !contact.includes("Your information is transmitted to the secure NovaPharm API")) {
    assert.fail("Managed contact presentation is missing its form or API-authority boundary");
  }
} else if (!contact.includes("This public information release does not collect or transmit enquiry details.") || !contact.includes("mailto:vishal@novapharmhealthcare.com")) {
  assert.fail("PUBLIC_ONLY contact presentation is missing its non-collection notice or verified fallback");
}

const products = text("products/index.html");
const priorityPosition = products.indexOf("Food Supplement Portfolio Review");
const strategicPosition = products.indexOf("Strategic pharmaceutical portfolio");
assert.ok(priorityPosition >= 0 && strategicPosition > priorityPosition, "Food Supplement Portfolio Review must be the first substantive product section");
assert.equal((products.match(/Food Supplement Portfolio Review/g) ?? []).length, 1);
assert.match(products, /href="\/products\/nutraxin\/"/);
assert.match(products, /href="\/products\/strategic-portfolio\/"/);
assert.doesNotMatch(products, /£|\bGBP\b|Add to basket|Buy now|In stock/);

const register = JSON.parse(text("apps/corporate/data/nutraxin-product-register.json"));
assert.equal(register.products.length, 19);
const nutraxin = text("products/nutraxin/index.html");
assert.equal((nutraxin.match(/class="npd-product-card/g) ?? []).length, 19);
for (const product of register.products) {
  const route = `products/nutraxin/${product.slug}/index.html`;
  assert.ok(existsSync(join(root, route)), `${route} must exist`);
  const detail = text(route);
  assert.match(detail, new RegExp(`<h1>${product.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/h1>`));
  assert.match(detail, /"@type":"Product"/);
  assert.doesNotMatch(detail, /"offers"|Add to basket|Buy now|In stock|£|\bGBP\b/);
}

const legacyProducts = text("product-portfolio/index.html");
const legacyNutraxin = text("product-portfolio/nutraxin/index.html");
assert.match(legacyProducts, /noindex, follow/);
assert.match(legacyProducts, /url=\/products\//);
assert.match(legacyNutraxin, /noindex, follow/);
assert.match(legacyNutraxin, /url=\/products\/nutraxin\//);

const corporateSource = [
  text("apps/corporate/components/site-header.tsx"),
  text("apps/corporate/components/mobile-navigation.tsx"),
  text("apps/corporate/components/page-renderer.tsx"),
  text("apps/corporate/package.json"),
].join("\n");
assert.doesNotMatch(corporateSource, /lucide-react/);
assert.match(corporateSource, /products\/nutraxin\/\$\{product\.slug\}/);

const leadership = text("leadership/index.html");
for (const portrait of ["vishal-chakravarty-1200.jpg", "prabhakar-lahare-960.jpg", "girish-achliya-960.jpg"]) assert.match(leadership, new RegExp(portrait));
for (const format of ["avif", "webp"]) assert.match(leadership, new RegExp(`assets/media/leadership/vishal-chakravarty-480\\.${format}`));

const insightFiles = [
  "compliance-first-pharmaceutical-distribution-uk",
  "gdp-qms-pharmaceutical-distribution-foundations",
  "oncology-supply-chain-demand-forecasting",
  "plpi-pharmaceutical-supply-resilience",
  "three-pillar-pharmaceutical-sourcing-model",
  "batch-to-buyer-pharmaceutical-traceability",
];
const articleImages = insightFiles.map((slug) => text(`news-insights/${slug}/index.html`).match(/<div class="article-hero-media">[\s\S]*?<img src="([^"]+)"/)?.[1]);
assert.ok(articleImages.every(Boolean), "each insight article must have a cover image");
assert.equal(new Set(articleImages).size, insightFiles.length, "insight articles must use distinct cover images");

for (const retired of ["technology/ai-governance/index.html", "search/index.html", "assets/js/ai-search.js", "assets/css/ai-search.css", "assets/ai"]) {
  assert.equal(existsSync(join(root, retired)), false, `${retired} must not ship in the corrected public release`);
}

for (const path of [
  "assets/media/home/supply-network-hero.jpg",
  "assets/media/home/supply-network-hero-1200.jpg",
  "assets/media/modules/regulatory-dossier-control.jpg",
  "assets/media/stories/regulatory-batch-integrity.jpg",
  "assets/media/stories/services-launch-readiness.jpg",
  "assets/media/stories/technology-control-architecture.jpg",
]) assert.ok(existsSync(join(root, path)), `${path} must exist`);

assert.ok(statSync(join(root, "assets/media/home/supply-network-hero.jpg")).size < 350_000, "desktop hero must remain below 350 KB");
assert.ok(statSync(join(root, "assets/media/home/supply-network-hero-1200.jpg")).size < 220_000, "responsive hero must remain below 220 KB");

const login = text("portal/index.html");
if (login.includes("data-login-form")) {
  assert.match(login, /Credentials and portal permissions are verified server-side\./);
  assert.match(login, /autocomplete="current-password"/);
} else {
  assert.match(login, /Use only the managed NovaPharm portal\./);
  assert.match(login, /No login, account, document or board information is processed on this static public host\./);
  assert.doesNotMatch(login, /<input|<form/);
}

assert.match(text("scripts/build-site.mjs"), /apply-corporate-product-discipline\.mjs/);
assert.match(text("assets/js/novapharm.js"), /visibleLabel\.textContent = isOpen \? "Close" : "Menu"/);
assert.doesNotMatch(text("assets/js/novapharm.js"), /pointermove|hero-shift/);

console.log("Visual contracts passed for the corporate product-discipline system, seven-destination navigation, 19 canonical Nutraxin product routes, truthful fail-closed workflows, responsive media and asset budgets.");
