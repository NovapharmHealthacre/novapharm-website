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
assert.match(css, /--npd-header:\s*68px/);
assert.match(css, /@media \(max-width: 760px\)\s*\{\s*:root\s*\{\s*--npd-header:\s*60px/);
assert.match(css, /--npd-system:\s*-apple-system, BlinkMacSystemFont/);
assert.match(css, /letter-spacing:\s*0/);
assert.match(css, /@media \(max-width:\s*360px\)/);
assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
assert.match(css, /@media \(forced-colors:\s*active\)/);
assert.match(css, /@media print/);
assert.ok(css.includes("@media (prefers-reduced-transparency: reduce)"), "navigation respects reduced transparency");
assert.ok(css.includes("@media (prefers-contrast: more)"), "copy respects increased contrast");
assert.ok(css.includes("-webkit-backdrop-filter: none;"), "reduced transparency disables WebKit blur");
const publicAppleCss = text("assets/css/apple-pharma-public.css");
assert.ok(publicAppleCss.includes("outline: 3px solid #0a66c2;"), "keyboard focus uses a solid high-contrast outline");
assert.ok(!publicAppleCss.includes("rgba(180, 35, 46, 0.36)"), "translucent focus ring must not return");
assert.doesNotMatch(publicAppleCss, /body\[data-page="home"\]\s+h[1-4]\b/,
  "homepage heading scale must stay inside main, not bleed into the footer");
assert.match(publicAppleCss, /body\[data-page="home"\] main h2/,
  "homepage editorial section headings must still receive their approved scale");
assert.match(css, /\.npd-footer\.site-footer \.npd-footer-top h2\s*\{[^}]*font-size:\s*13px/s,
  "shared footer typography requires an explicitly scoped heading override");

function contrastOnWhite(hex) {
  assert.match(hex, /^#[0-9a-f]{6}$/i);
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  return 1.05 / (luminance + 0.05);
}
const focusColor = publicAppleCss.split("outline: 3px solid ")[1]?.slice(0, 7);
const highContrastDivider = css.split("--npd-line: ").at(-1)?.slice(0, 7);
assert.ok(contrastOnWhite(focusColor) >= 3, "keyboard-focus outline must have at least 3:1 contrast on white");
assert.ok(contrastOnWhite(highContrastDivider) >= 3, "high-contrast nontext divider must have at least 3:1 contrast on white");

assert.match(bundleCss, /--corporate-product-discipline-contract:\s*1/);
assert.match(tokenCss, /--brand:\s*#E3120B;/, "the canonical identity red must remain Economist Red");
assert.match(tokenCss, /--brand-text:\s*#B30E09;/, "small red foreground text needs the contrast-safe derivative");

const homepageCss = text("assets/css/homepage-editorial.css");
assert.match(homepageCss, /\.npd-apple-hero/);
assert.match(homepageCss, /@media \(max-width: 600px\)/, "new homepage must have responsive mobile art direction");
assert.match(homepageCss, /prefers-reduced-motion: reduce/, "editorial motion must respect accessibility preferences");
assert.match(bundleCss, /Source: homepage-editorial.css/, "homepage styles must ship inside the production CSS bundle");

const home = text("index.html");
assert.match(home, /<main id="main" class="npd-main npd-home npd-apple-home">/);
assert.match(home, /<h1(?:\s+[^>]*)?>Medicine\. Where it needs to be\.<\/h1>/, "homepage preserves the approved semantic hero headline");
assert.match(home, /class="npd-apple-hero nph-earth-hero"/, "approved Earth-horizon hero layout");
assert.match(home, /class="nph-earth-hero-landscape"/, "approved morning-Earth image placement");
assert.match(home, /earth-reference-1400\.jpg/, "approved high-resolution morning Earth image remains present");
assert.match(home, /Three routes\.<br>One evidence standard\./);
assert.equal((home.match(/<div class="npd-apple-sourcing-grid">[\s\S]*?<\/div>/)?.[0].match(/<article>/g) ?? []).length, 3, "homepage must present three evidence-gated sourcing routes");
assert.equal((home.match(/<div class="npd-apple-product-grid">[\s\S]*?<\/div>/)?.[0].match(/class="npd-apple-product"/g) ?? []).length, 3, "homepage must stage three authentic catalogue product references");
assert.match(home, /Specialist medicines\.<br>Uncompromising standards\./, "oncology must have its own editorial chapter");
assert.match(home, /NOVA<span>\.<\/span>/, "NOVA concept should have an authored product-identity treatment");
assert.match(home, /In development\. The adjacent graphic is an artistic concept/, "NOVA must not be presented as live");
assert.match(home, /class="npd-apple-regulatory-notice"/, "regulated-state boundary must remain visible");
assert.match(home, /Regulated wholesale supply has not commenced/);
assert.match(home, /PLPI activity requires the relevant licence/);
assert.match(home, /Let's build something meaningful\./);
assert.doesNotMatch(home, /<svg|lucide|<video|hero-cinematic-layer|data-motion-toggle|data-ai-search-open|nav-search|ai-search-dialog/);

const approvedHeaderCss = text("assets/css/homepage-editorial.css");
assert.doesNotMatch(approvedHeaderCss, /content:\s*"NOVAPHARM"/, "never replace the supplied logo with generated black typography");
assert.match(approvedHeaderCss, /\.site-header \.brand > img\s*\{[\s\S]*?display:\s*block/, "the official image must render in the header");

const expectedHomeNavigation = [
  ["Company", "/about/"],
  ["Capabilities", "/capabilities/"],
  ["Distribution", "/distribution/"],
  ["Oncology", "/oncology/"],
  ["Products", "/products/"],
  ["Intelligence", "/technology/"],
  ["Contact", "/contact/"],
  ["Secure Portal", "https://portal.novapharmhealthcare.com/"],
];
const primaryNavStart = home.indexOf('<nav class="site-nav npd-global-nav"');
const primaryNavEnd = home.indexOf("</nav>", primaryNavStart);
const homepagePrimaryNav = primaryNavStart >= 0 && primaryNavEnd > primaryNavStart ? home.slice(primaryNavStart, primaryNavEnd) : "";
assert.ok(homepagePrimaryNav, "homepage must expose an accessible primary navigation");
assert.equal((homepagePrimaryNav.match(/<a /g) ?? []).length, expectedHomeNavigation.length, "approved homepage must expose Distribution and all corporate destinations plus Secure Portal");
for (const [label, href] of expectedHomeNavigation) {
  assert.ok(homepagePrimaryNav.includes(`href="${href}"`), `homepage navigation must link to ${href}`);
  assert.ok(homepagePrimaryNav.includes(`>${label}</a>`), `homepage navigation must label ${href} accurately`);
}
const secondaryPage = text("about/index.html");
assert.match(secondaryPage, /NovaPharm Intelligence/, "other corporate pages retain full Intelligence brand name");
assert.match(secondaryPage, /Insights/, "other corporate pages retain Insights navigation");
assert.match(secondaryPage, /Secure Portal/, "other corporate pages retain secure Portal navigation");
assert.match(home, /<span data-menu-label>Menu<\/span>/, "mobile navigation must use the visible word Menu");
assert.match(home, /data-mega-trigger="intelligence"/, "global header must expose Intelligence navigation");
assert.match(home, /data-mega-panel="intelligence"/, "Intelligence navigation must offer contextual destinations");

const routeContracts = [
  ["capabilities/index.html", "class=\"ncap-title-line\">From evidence</span>"],
  ["services/index.html", "npd-service-ledger"],
  ["regulatory-services/index.html", "npd-roadmap npd-roadmap-large"],
  ["cro/index.html", "Define the programme before assembling the delivery model."],
  ["oncology/index.html", "A Hope for<br>Tomorrow."],
  ["partner-with-us/index.html", "npd-horizontal-steps"],
  ["technology/index.html", "npi-dash-analytics-grid"],
  ["news-insights/index.html", "Regulated-market thinking, written to be challenged."],
];
for (const [path, marker] of routeContracts) {
  const html = text(path);
  assert.match(html, /class="npd-main/);
  assert.ok(html.includes(marker), `${path} must retain ${marker}`);
  assert.match(html, /Regulated wholesale supply has not commenced/);
  assert.doesNotMatch(html, /<svg|lucide|doodle|hero-cinematic-layer|module-signal-disclosure/);
}

const contact = text("contact/index.html");
assert.match(contact, /class="npd-main np-contact np-contact-reference"/, "Contact retains the approved standalone presentation");
assert.match(contact, /Let&#39;s talk\./, "Contact has the reference's direct headline");
assert.match(contact, /How can we help\?/, "Contact has the reference form heading");
assert.match(contact, /class="np-contact-reference-footer"/, "Contact has a restrained legal footer");
assert.match(contact, /Business enquiries only\./, "Contact retains regulated-business scope");
assert.match(contact, /yellowcard\.mhra\.gov\.uk/, "Contact preserves MHRA safety routing");
assert.match(contact, /legal\/privacy\//);
// The AWS-backed managed form retains the standard form-grid class and the
// approved editorial class. The email-draft-only variant uses its separate
// reference grid; never require both incompatible variants in one document.
if (contact.includes("data-contact-form") || contact.includes("data-live-b2b-enquiry-form")) {
  assert.match(contact, /<form class="form-grid contact-form np-contact-reference-form"/,
    "Managed Contact must retain its approved editorial form and structured fields");
  assert.match(contact, /name="privacyAcknowledgement"/);
  assert.match(contact, /name="safetyConfirmation"/);
  assert.doesNotMatch(contact, /data-email-enquiry-form/);
} else {
  assert.match(contact, /<form class="np-contact-reference-form"/,
    "Public Contact must retain its approved email-draft form");
  assert.match(contact, /class="np-contact-reference-grid"/,
    "Public Contact fields must retain the two-column editorial grid");
  assert.match(contact, /data-email-enquiry-form/, "Public contact should open only an email draft");
  assert.match(contact, /action="mailto:vishal@novapharmhealthcare\.com"/);
  assert.match(contact, /This public information release does not collect or transmit enquiry details/);
  assert.doesNotMatch(contact, /data-contact-form|data-file-upload|action="\/api\//);
}
const contactCss = text("assets/css/contact-premium.css");
assert.match(contactCss, /np-contact-reference-hero/);
assert.match(contactCss, /np-contact-reference-submit/);
assert.match(contactCss, /@media \(max-width: 700px\)/);

const products = text("products/index.html");
const approvedCollections = ["np-products-panel-nutraxin", "np-products-panel-esco", "np-products-panel-pharma"];
const collectionPositions = approvedCollections.map((marker) => products.indexOf(marker));
assert.ok(collectionPositions.every((pos) => pos >= 0) &&
  collectionPositions.every((pos, i) => i === 0 || pos > collectionPositions[i - 1]),
  "approved Products experience must present Nutraxin, ESCO and pharmaceutical portfolio as one ordered story");
assert.match(products, /<h1 id="np-products-title">Different products\.<br>One purpose\.<\/h1>/);
assert.match(products, /Food Supplement Portfolio Review/, "genuine Nutraxin catalogue provenance remains present");
assert.match(products, /href="\/products\/nutraxin\/"/);
assert.match(products, /href="\/products\/strategic-portfolio\/"/);
assert.doesNotMatch(products, /£|\bGBP\b|Add to basket|Buy now|In stock/);

const register = JSON.parse(text("apps/corporate/data/nutraxin-product-register.json"));
const retail = JSON.parse(text("assets/data/nutraxin-retail-catalogue.json"));
const retailBySku = new Map(retail.products.map((item) => [item.sku, item]));
assert.equal(retail.price_authority, "approved_consumer_retail");
assert.equal(retail.currency, "GBP");
assert.equal(register.products.length, 19);
assert.equal(retailBySku.size, 19);
const nutraxin = text("products/nutraxin/index.html");
assert.equal((nutraxin.match(/class="nx-product-card"/g) ?? []).length, 19);
for (const product of register.products) {
  const route = `products/nutraxin/${product.slug}/index.html`;
  assert.ok(existsSync(join(root, route)), `${route} must exist`);
  const detail = text(route);
  assert.match(detail, new RegExp(`<h1>${product.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/h1>`));
  assert.match(detail, /"@type":"Product"/);
  const sku = retailBySku.get(product.sku);
  assert.ok(sku && sku.slug === product.slug, `Approved retail reference missing for ${product.slug}`);
  const amount = (sku.retail_price_pence / 100).toFixed(2);
  const availability = retail.delivery_verified === true &&
    retail.checkout_enabled === true && retail.payment_collection_enabled === true &&
    sku.ordering_enabled === true && sku.available_to_sell === true ? "InStock" : "OutOfStock";
  assert.ok(detail.includes("£" + amount), `Visible GBP price mismatch for ${product.slug}`);
  assert.ok(detail.includes(`data-merchant-sku="${product.sku}"`));
  const offer = [...detail.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)]
    .map((m) => JSON.parse(m[1])).find((item) => item["@type"] === "Product" && item.sku === product.sku)?.offers;
  assert.ok(offer, `Product Offer markup missing for ${product.slug}`);
  assert.equal(offer.price, amount);
  assert.equal(offer.priceCurrency, "GBP");
  assert.equal(offer.availability, "https://schema.org/" + availability);
  if (availability === "OutOfStock") assert.match(detail, /Currently unavailable to order online/);
  assert.doesNotMatch(detail, /Add to basket|Buy now/i);
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
