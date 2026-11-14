import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { company, leadership } from "../src/content/site-content.mjs";
import { validateNutraxinRegister } from "../src/core/nutraxin-catalogue.mjs";

const root = resolve(process.cwd());
const siteUrl = "https://novapharmhealthcare.com";
const register = validateNutraxinRegister({ repositoryRoot: root }).register;
const products = [...register.products].sort((a, b) => a.catalogueOrder - b.catalogueOrder);
const officialNutraxinReferences = JSON.parse(readFileSync(join(root, "apps/corporate/data/nutraxin-uk-links.json"), "utf8")).products;
const expectedNutraxinSlugs = new Set(products.map((product) => product.slug));
if (Object.keys(officialNutraxinReferences).length !== expectedNutraxinSlugs.size ||
    Object.keys(officialNutraxinReferences).some((slug) => !expectedNutraxinSlugs.has(slug))) {
  throw new Error("Nutraxin external publisher references must map exactly to the 19 catalogue slugs.");
}
function nutraxinOfficialReference(slug) {
  if (!Object.hasOwn(officialNutraxinReferences, slug)) throw new Error(`Missing publisher mapping for ${slug}`);
  const href = officialNutraxinReferences[slug];
  if (href === null) return '<span class="npd-publisher-unavailable">Official Nutraxin UK product detail temporarily unavailable.</span>';
  const url = new URL(href);
  if (url.protocol !== "https:" || url.hostname !== "nutraxin.uk.com" ||
      !url.pathname.startsWith("/product/") || url.username || url.password || url.search || url.hash) {
    throw new Error(`Unsafe Nutraxin publisher destination for ${slug}`);
  }
  return `<a class="npd-publisher-link" href="${href}" target="_blank" rel="noopener noreferrer external" aria-label="Open product information on Nutraxin UK (external website)">Know more on Nutraxin UK</a>`;
}

const articles = readdirSync(join(root, "src/content/insights"))
  .filter((file) => file.endsWith(".json"))
  .map((file) => JSON.parse(readFileSync(join(root, "src/content/insights", file), "utf8")))
  .sort((a, b) => String(b.published).localeCompare(String(a.published)));

const read = (relative) => readFileSync(join(root, relative), "utf8");
const write = (relative, content) => {
  const target = join(root, relative);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
};
const esc = (value) => String(value ?? "").replace(/[&<>\"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"
})[character]);

function globalSection(route) {
  if (route === "/" || route.startsWith("/about/") || route.startsWith("/leadership/") || route === "/about/" || route === "/partner-with-us/" || route === "/investor-information/" || route === "/careers/") return "company";
  if (route === "/technology/") return "intelligence";
  if (["/distribution/", "/market-access/", "/markets/"].some((path) => route === path || route.startsWith(path))) return "distribution";
  if (["/capabilities/", "/services/", "/regulatory-services/", "/cro/"].some((prefix) => route === prefix || route.startsWith(prefix))) return "capabilities";
  if (route.startsWith("/oncology/")) return "oncology";
  if (route.startsWith("/products/") || route.startsWith("/product-portfolio/")) return "products";
  if (route.startsWith("/news-insights/")) return "insights";
  if (route.startsWith("/contact/") || route.startsWith("/account-application/")) return "contact";
  if (route.startsWith("/portal/")) return "portal";
  return "";
}

const globalNavigation = [
  ["Company", "/about/", "company"],
  ["Capabilities", "/capabilities/", "capabilities"],
  ["Distribution", "/distribution/", "distribution"],
  ["Oncology", "/oncology/", "oncology"],
  ["Products", "/products/", "products"],
  ["NovaPharm Intelligence", "/technology/", "intelligence"],
  ["Insights", "/news-insights/", "insights"],
  ["Contact", "/contact/", "contact"],
  ["Secure Portal", "https://portal.novapharmhealthcare.com/", "portal"]
];

// A single category-navigation contract across corporate pages. Navigation
// remains usable as ordinary links without JavaScript.
const megaNavigation = {
  company: [
    ["Explore", [["Company overview", "/about/"], ["Leadership", "/leadership/"], ["Governance", "/about/governance/"]]],
    ["Work with NovaPharm", [["Partnerships", "/partner-with-us/"], ["Investor information", "/investor-information/"], ["Careers", "/careers/"]]],
    ["More", [["Trust Centre", "/trust-centre/"], ["Contact", "/contact/"]]]
  ],
  capabilities: [
    ["Explore", [["All capabilities", "/capabilities/"], ["Sourcing & market access", "/services/"], ["Regulatory & Quality", "/regulatory-services/"]]],
    ["Specialist work", [["Clinical Research & CRO", "/cro/"], ["Oncology", "/oncology/"]]],
    ["Technology", [["NovaPharm Intelligence", "/technology/"], ["Governance", "/about/governance/"]]]
  ],
  distribution: [
    ["Explore", [["Distribution overview", "/distribution/"], ["Market access", "/market-access/"], ["International markets", "/markets/"]]],
    ["Products & pathways", [["Generics, OTC & licensed medicines", "/distribution/#distribution-categories"], ["Oncology & specialist medicines", "/oncology/"], ["Nutraceuticals & medical equipment", "/products/"]]],
    ["Work with NovaPharm", [["Discuss distribution", "/contact/?enquiry=Distribution"], ["Manufacturer partnerships", "/partner-with-us/"]]]
  ],
  oncology: [
    ["Explore oncology", [["Oncology overview", "/oncology/"], ["Strategic portfolio", "/products/strategic-portfolio/"]]],
    ["Our approach", [["Regulatory & Quality", "/regulatory-services/"], ["Sourcing services", "/services/"]]],
    ["Connect", [["Discuss an opportunity", "/contact/?enquiry=Oncology"]]]
  ],
  products: [
    ["Explore products", [["Products overview", "/products/"], ["Nutraxin", "/products/nutraxin/"], ["ESCO Anand", "/products/esco/"], ["Strategic portfolio", "/products/strategic-portfolio/"]]],
    ["Discover", [["Oncology", "/oncology/"], ["Market access", "/services/"]]],
    ["Partner", [["Distribution enquiries", "/contact/?enquiry=Distribution"], ["Business account", "/account-application/"]]]
  ],
  intelligence: [
    ["Explore", [["NovaPharm Intelligence", "/technology/"], ["The Medicines Terminal", "/technology/#intelligence-platform"], ["NOVA & PANDORA", "/technology/#intelligence-ecosystem"]]],
    ["Intelligence workspaces", [["Medicine identity", "/technology/#intelligence-workspaces"], ["Markets & geography", "/technology/#intelligence-platform"], ["Trends & forecasting", "/technology/#intelligence-platform"]]],
    ["Discover", [["Evidence & trust", "/technology/#intelligence-trust"], ["Platform roadmap", "/technology/#intelligence-roadmap"], ["Sign in to Intelligence", "https://intelligence.novapharmhealthcare.com/"]]]
  ],
  insights: [
    ["Explore", [["Insights overview", "/news-insights/"], ["Supply-chain traceability", "/news-insights/batch-to-buyer-pharmaceutical-traceability/"]]],
    ["Perspectives", [["Oncology forecasting", "/news-insights/oncology-supply-chain-demand-forecasting/"], ["GDP & quality systems", "/news-insights/gdp-qms-pharmaceutical-distribution-foundations/"]]],
    ["More", [["PLPI strategy", "/news-insights/plpi-pharmaceutical-supply-resilience/"], ["Contact the team", "/contact/"]]]
  ]
};

function header(route) {
  const current = globalSection(route);
  // The public homepage retains concise navigation but must never hide the
  // explicit secure portal entry. Insights remains available through site links.
  const headerLinks = route === "/"
    ? globalNavigation.filter(([, href]) => href !== "/news-insights/")
    : globalNavigation;
  return `<header class="site-header npd-header" data-site-header data-mega-open="">
    <div class="container header-inner npd-header-inner">
      <a class="brand" href="/" aria-label="NovaPharm Healthcare home">
        <picture class="brand-logo"><img src="/assets/brand/novapharm-healthcare-logo.png" alt="NovaPharm Healthcare" width="2048" height="258" fetchpriority="high" decoding="async"></picture>
      </a>
      <button class="nav-toggle npd-menu" type="button" aria-expanded="false" aria-controls="primary-navigation" data-nav-toggle><span data-menu-label>Menu</span><span class="sr-only">Open navigation</span></button>
      <nav class="site-nav npd-global-nav" id="primary-navigation" aria-label="Primary navigation" data-site-nav>
        ${headerLinks.map(([label, href, section]) => `<a href="${href}"${current === section ? ' aria-current="page"' : ""}${megaNavigation[section] ? ` data-mega-trigger="${section}" aria-expanded="false" aria-controls="npd-mega-${section}"` : ""}>${route === "/" && href === "/technology/" ? "Intelligence" : label}</a>`).join("")}
      </nav>
    </div>
    ${Object.entries(megaNavigation).map(([section, columns]) => `<div class="npd-mega" id="npd-mega-${section}" data-mega-panel="${section}" aria-hidden="true"><nav class="container npd-mega-inner" aria-label="${section === "intelligence" ? "NovaPharm Intelligence" : section} category navigation">${columns.map(([heading, links]) => `<div class="npd-mega-column"><p>${esc(heading)}</p>${links.map(([name, href], i) => `<a href="${href}"${i === 0 ? ' class="npd-mega-feature"' : ""}>${esc(name)}</a>`).join("")}</div>`).join("")}</nav></div>`).join("")}
  </header>`;
}

function footer() {
  return `<footer class="site-footer npd-footer">
    <div class="container">
      <div class="npd-footer-top">
        <div class="npd-footer-identity">
          <a class="footer-brand" href="/" aria-label="NovaPharm Healthcare home"><picture class="brand-logo"><source srcset="/assets/brand/novapharm-healthcare-logo.svg" type="image/svg+xml"><img src="/assets/brand/novapharm-healthcare-logo.png" alt="NovaPharm Healthcare" width="2048" height="258" loading="lazy" decoding="async"></picture></a>
          <p>Evidence-led pharmaceutical market entry, sourcing and supply-chain development.</p>
        </div>
        <div><h2>Company</h2><a href="/about/">Overview</a><a href="/leadership/">Leadership</a><a href="/about/governance/">Governance</a><a href="/partner-with-us/">Partners</a><a href="/investor-information/">Investors</a><a href="/careers/">Careers</a></div>
        <div><h2>Capabilities</h2><a href="/distribution/">Distribution</a><a href="/services/">Services</a><a href="/regulatory-services/">Regulatory &amp; Quality</a><a href="/cro/">Clinical Research &amp; CRO</a><a href="/technology/">Technology</a></div>
        <div><h2>Products</h2><a href="/products/nutraxin/">Nutraxin</a><a href="/products/esco/">ESCO Anand</a><a href="/products/strategic-portfolio/">Strategic portfolio</a><a href="/contact/?enquiry=Product%20opportunity">Discuss an opportunity</a></div>
        <div><h2>Connect</h2><a href="/news-insights/">Insights</a><a href="/contact/">Contact</a><a href="/account-application/">Open a business account</a><a href="https://portal.novapharmhealthcare.com/">Secure Portal</a><a href="/trust-centre/">Trust centre</a></div>
      </div>
      <div class="npd-footer-legal"><a href="/legal/privacy/">Privacy</a><a href="/legal/cookies/">Cookies</a><a href="/legal/terms/">Terms</a><a href="/legal/accessibility/">Accessibility</a><button class="footer-link-button" type="button" data-cookie-settings>Cookie settings</button></div>
      <div class="npd-footer-notices">
        <p>${esc(company.regulatoryNotice)}</p>
        <p>${esc(company.medicalDisclaimer)}</p>
      </div>
      <div class="npd-footer-bottom"><span>© <span data-year></span> NovaPharm Healthcare Ltd.</span><a href="${company.companiesHouseUrl}">Registered in England and Wales · ${company.companyNumber}</a></div>
    </div>
  </footer>`;
}

const localFamilies = {
  company: [
    ["Overview", "/about/"], ["Leadership", "/leadership/"], ["Governance", "/about/governance/"],
    ["Partners", "/partner-with-us/"], ["Investors", "/investor-information/"], ["Careers", "/careers/"]
  ],
  capabilities: [
    ["Overview", "/capabilities/"], ["Services", "/services/"], ["Regulatory & Quality", "/regulatory-services/"],
    ["Clinical Research & CRO", "/cro/"], ["Technology", "/technology/"]
  ],
  products: [
    ["Overview", "/products/"], ["Nutraxin", "/products/nutraxin/"], ["ESCO Anand", "/products/esco/"],
    ["Strategic Pharmaceutical Portfolio", "/products/strategic-portfolio/"]
  ]
};

function localNavigation(family, route) {
  const links = localFamilies[family];
  if (!links) return "";
  const label = family === "company" ? "Company" : family === "products" ? "Products" : "Capabilities";
  return `<nav class="npd-local-nav" aria-label="${label} navigation"><div class="container"><strong>${label}</strong><div>${links.map(([name, href]) => `<a href="${href}"${route === href || (href === "/products/nutraxin/" && route.startsWith(href)) ? ' aria-current="page"' : ""}>${name}</a>`).join("")}</div></div></nav>`;
}

function actions(primaryLabel, primaryHref, secondaryLabel = "", secondaryHref = "") {
  return `<div class="npd-actions"><a class="npd-button npd-button-primary" href="${primaryHref}">${primaryLabel}</a>${secondaryLabel ? `<a class="npd-button npd-button-secondary" href="${secondaryHref}">${secondaryLabel}</a>` : ""}</div>`;
}

function verifiedEmailFallback({ subject, label, context }) {
  const email = "vishal@novapharmhealthcare.com";
  const href = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
  return `<div class="npd-public-fallback">${notice("information", "Verified corporate email route", `${context} Your email application handles delivery; this website does not receive or store the message.`)}${actions(label, href)}</div>`;
}

function notice(type, title, text) {
  return `<aside class="npd-notice npd-notice-${type}" aria-label="${esc(title)}"><strong>${esc(title)}</strong><p>${text}</p></aside>`;
}

function hero({ eyebrow, title, lead, actionsHtml = "", media = "", boundary = "", route = "", family = "", compact = false }) {
  return `${localNavigation(family, route)}<section class="npd-hero${media ? " npd-hero-media" : ""}${compact ? " npd-hero-compact" : ""}">${media}<div class="container npd-hero-inner"><div class="npd-hero-copy"><p class="npd-eyebrow">${esc(eyebrow)}</p><h1>${title}</h1><p class="npd-lead">${lead}</p>${actionsHtml}${boundary ? `<p class="npd-hero-boundary">${esc(boundary)}</p>` : ""}</div></div></section>`;
}

function sectionIntro(eyebrow, title, text = "") {
  return `<div class="npd-section-intro"><p class="npd-eyebrow">${esc(eyebrow)}</p><h2>${title}</h2>${text ? `<p>${text}</p>` : ""}</div>`;
}

function responsiveImage(base, alt, options = {}) {
  const { className = "", eager = false, width = 1600, height = 900, caption = "" } = options;
  const masterBase = existsSync(join(root, `${base.replace(/^\//, "")}.jpg`)) ? base : `${base}-1600`;
  const figure = `<picture${className ? ` class="${className}"` : ""}><source srcset="${base}-960.avif 960w, ${masterBase}.avif 1600w" sizes="(max-width: 760px) 100vw, 50vw" type="image/avif"><source srcset="${base}-960.webp 960w, ${masterBase}.webp 1600w" sizes="(max-width: 760px) 100vw, 50vw" type="image/webp"><img src="${masterBase}.jpg" srcset="${base}-960.jpg 960w, ${masterBase}.jpg 1600w" sizes="(max-width: 760px) 100vw, 50vw" alt="${esc(alt)}" width="${width}" height="${height}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></picture>`;
  return caption ? `<figure>${figure}<figcaption>${caption}</figcaption></figure>` : figure;
}

function productPicture(product, eager = false, sizes = "(max-width: 720px) 84vw, 28vw") {
  const base = `/assets/media/products/nutraxin/${product.imageBase}`;
  return `<picture class="npd-product-picture"><source srcset="${base}-480.avif 480w, ${base}-800.avif 800w" sizes="${sizes}" type="image/avif"><source srcset="${base}-480.webp 480w, ${base}-800.webp 800w" sizes="${sizes}" type="image/webp"><img src="${base}.png" alt="${esc(product.altText)}" width="700" height="700" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></picture>`;
}

function homeMain() {
  const featured = [products[0], products[4], products[13]];
  return `<main id="main" class="npd-main npd-home npd-apple-home">

    <section class="npd-apple-hero nph-earth-hero" aria-labelledby="home-title">
      <div class="container nph-earth-hero-content">
        <p class="npd-apple-eyebrow">NOVAPHARM HEALTHCARE</p>
        <h1 id="home-title">Medicine. Where it needs to be.</h1>
        <p class="npd-apple-lead">A better way to understand, access and move medicine.</p>
        <div class="npd-apple-actions">
          <a class="nph-earth-primary" href="/about/">Explore NovaPharm <span aria-hidden="true">›</span></a>
          <a class="nph-earth-secondary" href="/partner-with-us/">Partner with us <span aria-hidden="true">›</span></a>
        </div>
      </div>
      <img class="nph-earth-hero-landscape" src="/assets/media/home/earth-reference-1400.jpg" alt="" width="1400" height="305" fetchpriority="high" decoding="async">
    </section>
    <section class="npd-apple-manifesto" aria-labelledby="purpose-title">
      <div class="container npd-apple-center">
        <p class="npd-apple-eyebrow">WHY NOVAPHARM</p>
        <h2 id="purpose-title">Better access begins with better decisions.</h2>
        <p>Medicine is already moving. The questions that matter are where it needs to go, what evidence supports it, and what permissions make responsible access possible.</p>
      </div>
    </section>
    <section class="npd-apple-oncology" aria-labelledby="oncology-title">
      <div class="container npd-apple-feature-grid">
        <div class="npd-apple-feature-copy">
          <p class="npd-apple-eyebrow">ONCOLOGY &amp; SPECIALIST MEDICINES</p>
          <h2 id="oncology-title">Specialist medicines.<br>Uncompromising standards.</h2>
          <p>Every opportunity is evaluated against formulation, supply continuity, source quality and product-specific regulatory evidence.</p>
          <a class="npd-apple-text-link" href="/oncology/">Explore oncology</a>
        </div>
        <figure class="npd-apple-oncology-art">
          ${responsiveImage("/assets/media/products/oncology-vial-handling", "Representative controlled pharmaceutical laboratory handling")}

        </figure>
      </div>
    </section>
    <section class="npd-apple-products" aria-labelledby="products-title">
      <div class="container">
        <div class="npd-apple-center">
          <p class="npd-apple-eyebrow">NUTRAXIN &amp; PORTFOLIO</p>
          <h2 id="products-title">Thoughtfully selected.<br>Carefully presented.</h2>
          <p>Explore approved catalogue imagery for Nutraxin and the strategic categories NovaPharm is evaluating.</p>
        </div>
        <div class="npd-apple-product-grid">
          ${featured.map((product) => `<a class="npd-apple-product" href="/products/nutraxin/${product.slug}/">${productPicture(product)}<strong>${esc(product.name)}</strong><span>${esc(product.packSize)}</span></a>`).join("")}
        </div>
        <div class="npd-apple-product-links">
          <a class="npd-apple-text-link" href="/products/nutraxin/">Explore Nutraxin</a>
          <a class="npd-apple-text-link" href="/products/strategic-portfolio/">Strategic pharmaceutical portfolio</a>
        </div>
        <p class="npd-apple-footnote">Catalogue information is for qualified review. Pricing, stock, medicinal status and supply availability are not asserted.</p>
      </div>
    </section>
    <section class="npd-apple-intelligence" aria-labelledby="intelligence-title">
      <div class="container npd-apple-feature-grid">
        <div class="npd-apple-feature-copy">
          <p class="npd-apple-eyebrow">NOVAPHARM INTELLIGENCE</p>
          <h2 id="intelligence-title">Understand the medicine.<br>Understand the market.</h2>
          <p>We are building a governed intelligence experience to connect medicines, evidence, market information and explainable analysis.</p>
          <a class="npd-apple-text-link" href="/technology/">Explore our technology direction</a>
          <p class="npd-apple-footnote">In development. The adjacent graphic is an artistic concept, not a working interface or validated forecast.</p>
        </div>
        <div class="npd-apple-nova-art" role="img" aria-label="Conceptual typographic preview for NOVA, the medicines intelligence experience under development">
          <div class="npd-apple-nova-top"><span>NOVAPHARM INTELLIGENCE</span><span>CONCEPT</span></div>
          <div class="npd-apple-nova-wordmark">NOVA<span>.</span></div>
          <p>The living intelligence of medicine.</p>
          <div class="npd-apple-nova-divider"></div>
          <div class="npd-apple-nova-taxonomy"><span>Medicines</span><span>Evidence</span><span>Markets</span><span>Decisions</span></div>
        </div>
      </div>
    </section>
    <section class="npd-apple-sourcing" aria-labelledby="sourcing-title">
      <div class="container">
        <div class="npd-apple-section-lead">
          <p class="npd-apple-eyebrow">SOURCING &amp; MARKET ACCESS</p>
          <h2 id="sourcing-title" aria-label="Three routes. One evidence standard.">Three routes.<br>One evidence standard.</h2>
          <p>Commercial opportunity should never move faster than the permissions and quality evidence behind it.</p>
        </div>
        <div class="npd-apple-sourcing-grid">
          <article><span>01</span><h3>Direct GMP partnerships</h3><p>Qualified manufacturer relationships with controlled technical and quality review.</p></article>
          <article><span>02</span><h3>Product-specific PLPI</h3><p>Evidence-led assessment of appropriate MHRA parallel-import pathways and obligations.</p></article>
          <article><span>03</span><h3>European sourcing</h3><p>Potential authorised routes reviewed for rights, licence standing, provenance and continuity.</p></article>
        </div>
        <a class="npd-apple-text-link" href="/capabilities/">Explore capabilities</a>
      </div>
    </section>
    <section class="npd-apple-governance" aria-labelledby="governance-title">
      <div class="container npd-apple-governance-grid">
        <div>
          <p class="npd-apple-eyebrow">QUALITY &amp; REGULATORY FOUNDATION</p>
          <h2 id="governance-title">Built for trust.<br>Designed for scrutiny.</h2>
          <p>Product rights, WDA(H) readiness, GDP controls, vendor oversight and traceable records must align before any regulated release.</p>
          <a class="npd-apple-text-link" href="/regulatory-services/">Regulatory &amp; quality</a>
        </div>
        <aside class="npd-apple-regulatory-notice">
          <p class="npd-apple-eyebrow">CURRENT STATUS</p>
          <h3>Preparation, not permission.</h3>
          <p>Regulated supply will begin only after the required authorisations, product-specific permissions and quality controls are in place. PLPI activity requires the relevant licence.</p>
        </aside>
      </div>
    </section>
    <section class="npd-apple-contact" aria-labelledby="contact-title">
      <div class="container npd-apple-center">
        <p class="npd-apple-eyebrow">QUALIFIED PARTNERSHIPS</p>
        <h2 id="contact-title">Let's build something meaningful.</h2>
        <p>For manufacturers, product owners, authorised supply partners and organisations pursuing better market access.</p>
        <div class="npd-apple-actions npd-apple-actions-centered">
          <a class="npd-apple-button" href="/contact/" data-cta-id="contact-novapharm">Contact NovaPharm</a>
          <a class="npd-apple-link" href="/partner-with-us/" data-cta-id="explore-partnerships">Partnerships</a>
        </div>
        <p class="npd-apple-footnote">Qualified B2B information only. An enquiry does not confirm authorisation, availability or permission to supply.</p>
      </div>
    </section>
  </main>`;
}

function aboutMain() {
  return `<main id="main" class="npd-main">${hero({ route: "/about/", family: "company", eyebrow: "Company", title: "Built for decisions that must withstand scrutiny.", lead: "NovaPharm Healthcare is an active UK company developing a compliance-first B2B pharmaceutical model around sourcing, quality, regulatory readiness and controlled technology.", actionsHtml: actions("Meet the leadership", "/leadership/", "Review governance", "/about/governance/") })}
  <section class="npd-section"><div class="container npd-split"><div>${sectionIntro("Our purpose", "Connect opportunity to the evidence required to act.", "NovaPharm exists to make sourcing, regulatory, quality and commercial dependencies visible before a product or partnership progresses.")}<dl class="npd-facts"><div><dt>Legal entity</dt><dd>NOVAPHARM HEALTHCARE LTD</dd></div><div><dt>Company number</dt><dd>16716501</dd></div><div><dt>Location</dt><dd>Feltham, England</dd></div><div><dt>Current status</dt><dd>Active company; regulated wholesale supply not commenced</dd></div></dl></div>${responsiveImage("/assets/media/modules/about-operating-model", "Professional reviewing controlled pharmaceutical operating information", )}</div></section>
  <section class="npd-section npd-section-soft"><div class="container">${sectionIntro("Operating principles", "What remains true as NovaPharm develops.")}<ol class="npd-principles"><li><span>01</span><strong>Compliance before revenue.</strong><p>No commercial urgency overrides applicable permission or quality control.</p></li><li><span>02</span><strong>Evidence before claims.</strong><p>Public statements must be supported, scoped and reviewable.</p></li><li><span>03</span><strong>Quality across every partner.</strong><p>Outsourcing changes the operator, not NovaPharm's accountability for oversight.</p></li><li><span>04</span><strong>Human judgement over automation.</strong><p>Technology supports decisions; it does not create pharmaceutical authority.</p></li></ol></div></section>
  <section class="npd-section npd-final"><div class="container"><h2>Understand the people and controls behind the model.</h2>${actions("Leadership", "/leadership/", "Company governance", "/about/governance/")}</div></section></main>`;
}

function capabilitiesMain() {
  return `<main id="main" class="npd-main">${hero({ route: "/capabilities/", family: "capabilities", eyebrow: "Capabilities", title: "The right route depends on the evidence already in place.", lead: "NovaPharm connects commercial intent with sourcing, regulatory, quality, clinical-development and technology decisions without presenting every opportunity as ready to launch.", actionsHtml: actions("Discuss a requirement", "/contact/") })}
  <section class="npd-section"><div class="container">${sectionIntro("Capability model", "Four connected disciplines. Clear individual accountability.")}<div class="npd-capability-list"><a href="/services/"><span>01</span><div><h2>Market-entry and supply services</h2><p>Opportunity framing, sourcing, partner qualification, launch readiness and controlled operating design.</p></div><strong>Services</strong></a><a href="/regulatory-services/"><span>02</span><div><h2>Regulatory &amp; Quality</h2><p>Permission pathways, QMS, GDP, vendor oversight, documentation and release readiness.</p></div><strong>Regulatory &amp; Quality</strong></a><a href="/cro/"><span>03</span><div><h2>Clinical Research &amp; CRO support</h2><p>Programme framing, responsibility mapping, specialist-provider coordination and UK pathway context.</p></div><strong>Clinical Research &amp; CRO</strong></a><a href="/technology/"><span>04</span><div><h2>Governed technology</h2><p>Public information, controlled records and managed workflows with explicit maturity labels.</p></div><strong>Technology</strong></a></div></div></section>
  <section class="npd-section npd-section-soft"><div class="container npd-split"><div>${sectionIntro("Engagement", "Start with one decision, not a catalogue of services.", "A first conversation establishes the organisation, opportunity, evidence position, target market and requested role. NovaPharm then identifies whether a defined workstream is justified.")}${actions("Start a qualified conversation", "/contact/")}</div>${responsiveImage("/assets/media/modules/services-connected-execution", "Team reviewing a controlled pharmaceutical workstream", { caption: "Representative collaboration context." })}</div></section></main>`;
}

function servicesMain() {
  const services = [
    ["Opportunity assessment", "Clarify target market, product rights, evidence, commercial question and decision owner."],
    ["Qualified sourcing", "Assess manufacturer, wholesaler and product-source pathways without lowering the evidence threshold."],
    ["Market-entry planning", "Connect regulatory route, quality responsibilities, supply model and launch dependencies."],
    ["Partner due diligence", "Review authority, scope, technical fit, documentation and oversight requirements."],
    ["Launch readiness", "Make unresolved product, regulatory, quality, logistics and account dependencies visible."],
    ["Controlled account service", "Prepare governed B2B onboarding and evidence access for a managed production environment."]
  ];
  return `<main id="main" class="npd-main">${hero({ route: "/services/", family: "capabilities", eyebrow: "Services", title: "Move from opportunity to a defined, reviewable route.", lead: "NovaPharm's service model is organised around the decisions required for responsible UK pharmaceutical market entry and supply-chain development.", actionsHtml: actions("Discuss a requirement", "/contact/") })}<section class="npd-section"><div class="container">${sectionIntro("What we do", "A concise service model with deeper evidence where it matters.")}<ol class="npd-service-ledger">${services.map(([title, text], index) => `<li><span>${String(index + 1).padStart(2, "0")}</span><h2>${title}</h2><p>${text}</p></li>`).join("")}</ol></div></section><section class="npd-section npd-section-soft"><div class="container">${sectionIntro("Operating sequence", "Frame. Qualify. Govern. Release only when ready.")}<ol class="npd-horizontal-steps"><li><span>01</span><strong>Frame the decision</strong></li><li><span>02</span><strong>Establish evidence</strong></li><li><span>03</span><strong>Assign responsibility</strong></li><li><span>04</span><strong>Control implementation</strong></li><li><span>05</span><strong>Verify readiness</strong></li></ol>${notice("regulatory", "Permission boundary", "Service engagement does not grant a licence, approve a product or permit regulated supply.")}${notice("regulatory", "Third-party logistics boundary", "Owner-attested logistics and warehousing arrangements with Polar Speed are being incorporated into NovaPharm's operating model. The relationship does not transfer Polar Speed's authorisations or certificates to NovaPharm. Regulated use remains subject to NovaPharm authorisation, verified provider scope, approved quality controls and technical onboarding.")}</div></section><section class="npd-section npd-final"><div class="container"><h2>Tell us which decision needs to be made.</h2>${actions("Contact NovaPharm", "/contact/")}</div></section></main>`;
}

function regulatoryMain() {
  const stages = ["WDA(H) application readiness", "Product-specific PLPI assessment", "QMS and SOP governance", "GDP and vendor oversight", "Pharmacovigilance and recall readiness", "Batch and document integrity", "Commercial release only after applicable authorisation"];
  return `<main id="main" class="npd-main">${hero({ route: "/regulatory-services/", family: "capabilities", eyebrow: "Regulatory & Quality", title: "No regulated supply before the required permissions.", lead: "The NovaPharm pathway connects company authority, product responsibility, quality systems and release evidence in a sequence that can be reviewed.", actionsHtml: actions("Discuss regulatory readiness", "/contact/?enquiry=Regulatory%20services") })}<section class="npd-section"><div class="container npd-regulatory-layout"><div>${sectionIntro("Regulatory foundation", "A roadmap built around accountable gates.", "Each stage has its own evidence, owner and completion criteria. Progress in one stage does not silently satisfy another.")}${notice("regulatory", "Current status", "NovaPharm is preparing regulated capabilities. No statement on this page represents MHRA approval, a granted WDA(H), a PLPI licence or permission to supply.")}</div><ol class="npd-roadmap npd-roadmap-large">${stages.map((stage, index) => `<li><span>${String(index + 1).padStart(2, "0")}</span><strong>${stage}</strong><p>${index === 6 ? "Release follows the applicable permission and completed operating controls." : "Evidence, accountable ownership and unresolved risks remain visible."}</p></li>`).join("")}</ol></div></section><section class="npd-section npd-section-soft"><div class="container npd-split"><div>${sectionIntro("Batch integrity", "Evidence should travel with every governed product and transaction.", "Product identity, source, status, documentation, conditions and decision history need a consistent chain of evidence.")}${actions("Review the Trust Centre", "/trust-centre/")}</div>${responsiveImage("/assets/media/stories/regulatory-batch-integrity", "Pharmaceutical packaging and controlled batch documentation", { caption: "Representative traceability context; no active NovaPharm batch or inventory is depicted." })}</div></section></main>`;
}

function croMain() {
  return `<main id="main" class="npd-main">${hero({ route: "/cro/", family: "capabilities", eyebrow: "Clinical Research & CRO support", title: "Define the programme before assembling the delivery model.", lead: "NovaPharm provides evidence-led programme framing and qualified specialist coordination. It does not present itself as a global full-service CRO and does not assume sponsor, investigator or competent-authority duties.", actionsHtml: actions("Discuss a programme", "/contact/?enquiry=Clinical%20development%20%26%20CRO%20support") })}
  <section class="npd-section"><div class="container">${sectionIntro("Designed for", "Product owners and specialist teams facing a complex UK pathway.", "The model is relevant when scientific, operational, regulatory and market-access decisions are fragmented across organisations.")}<ul class="npd-audience-list"><li>Product and dossier owners</li><li>Biotechnology and specialty-pharma teams</li><li>CMO and CDMO partners</li><li>Qualified specialist service providers</li></ul></div></section>
  <section class="npd-section npd-section-soft"><div class="container">${sectionIntro("Common fracture points", "Where programmes lose clarity.")}<ol class="npd-principles"><li><span>01</span><strong>Responsibility is assumed.</strong><p>Critical ownership is implied rather than recorded.</p></li><li><span>02</span><strong>Evidence changes context.</strong><p>Versions, decisions and source limitations separate across hand-offs.</p></li><li><span>03</span><strong>The UK pathway arrives late.</strong><p>Market and regulatory dependencies are considered after avoidable work.</p></li></ol></div></section>
  <section class="npd-section"><div class="container">${sectionIntro("Three lanes", "Scientific direction, delivery coordination and UK continuity.")}<div class="npd-three-lanes"><div><span>01</span><h2>Programme framing</h2><p>Define the decision, evidence state, material gaps and accountable owner.</p></div><div><span>02</span><h2>Qualified orchestration</h2><p>Map specialist providers, interfaces, dependencies and escalation routes.</p></div><div><span>03</span><h2>UK pathway continuity</h2><p>Connect development choices to future regulatory and market-entry context.</p></div></div></div></section>
  <section class="npd-section npd-section-soft"><div class="container">${sectionIntro("Responsibility model", "Three roles. One visible evidence trail.")}<ol class="npd-horizontal-steps"><li><span>01</span><strong>Sponsor-retained duties</strong><p>The sponsor keeps its applicable legal, regulatory and oversight responsibilities.</p></li><li><span>02</span><strong>NovaPharm coordination</strong><p>NovaPharm coordinates only the evidence-backed scope agreed for the programme.</p></li><li><span>03</span><strong>Qualified specialists</strong><p>Appropriately qualified providers perform specialist functions under defined governance.</p></li></ol></div></section>
  <section class="npd-section"><div class="container npd-split"><div>${sectionIntro("Quality and governance", "Evidence remains attached to the decision it supported.", "Responsibilities, versions, risks, escalation and approvals are preserved in a controlled programme record.")}${notice("regulatory", "Programme boundary", "Applicable approvals and sponsor responsibilities must be established for the actual programme. NovaPharm does not guarantee authorisation, ethics opinion, recruitment, timing or outcome.")}</div>${responsiveImage("/assets/media/cro/cro-evidence-architecture", "Clinical-development team reviewing programme evidence and responsibilities", { caption: "Representative programme-review context." })}</div></section>
  <section class="npd-section npd-section-soft"><div class="container">${sectionIntro("Senior judgement", "Corporate, scientific and operational review remain connected.")}<div class="npd-leadership-line">${leadership.slice(0, 3).map((person) => `<a href="/leadership/${person.slug}/"><strong>${esc(person.displayName)}</strong><span>${esc(person.title)}</span></a>`).join("")}</div></div></section>
  <section class="npd-section npd-final"><div class="container"><p class="npd-eyebrow">How engagement begins</p><h2>Start with a non-confidential description of the programme and the decision you need to make.</h2>${actions("Discuss a programme", "/contact/?enquiry=Clinical%20development%20%26%20CRO%20support")}${notice("privacy", "Information boundary", "Do not submit patient data, adverse-event information, urgent medical information or confidential study records through the public form.")}</div></section>
  <section class="npd-section npd-faq"><div class="container">${sectionIntro("Questions", "Before a programme conversation.")}<details><summary>Does NovaPharm replace the sponsor or competent authority?</summary><p>No. Responsibilities remain with the appropriately authorised and accountable parties.</p></details><details><summary>Does an initial discussion establish a delivery commitment?</summary><p>No. Scope, evidence, partners, responsibilities, terms and applicable permissions require separate review.</p></details><details><summary>Can confidential or patient information be submitted through the public form?</summary><p>No. Begin with non-confidential business context and do not submit patient-identifiable or safety-report information.</p></details></div></section></main>`;
}

function oncologyMain() {
  return `<main id="main" class="npd-main npoc-page">
  <section class="npoc-hero npoc-hope-hero" aria-labelledby="npoc-title">
    <div class="npoc-hero-visual" aria-hidden="true"><img src="/assets/media/oncology/hope-tomorrow-portrait.jpg" alt="" width="890" height="550" fetchpriority="high" decoding="async"></div>
    <div class="npoc-hero-shade" aria-hidden="true"></div>
    <div class="container npoc-hero-content"><div class="npoc-hero-copy">
      <p class="npoc-eyebrow">ONCOLOGY</p>
      <h1 id="npoc-title">A Hope for<br>Tomorrow.</h1>
      <p class="npoc-hero-lead">A focused approach to oncology. A deeper commitment to patients. A more hopeful future.</p>
      <div class="npoc-actions"><a class="npoc-button npoc-button-primary" href="#oncology-focus">Explore Our Oncology Portfolio</a></div>
    </div></div>
  </section>
  <section class="npoc-hope-focus" id="oncology-focus" aria-labelledby="npoc-focus-title">
    <div class="container npoc-focus-layout">
      <div class="npoc-focus-copy">
        <p class="npoc-eyebrow">OUR ONCOLOGY PORTFOLIO</p>
        <h2 id="npoc-focus-title">Selected Therapies.<br>Real Impact.</h2>
        <p>A growing portfolio of oncology medicines, built to improve access, expand treatment options and support better outcomes.</p>
        <a class="npoc-focus-link" href="/products/strategic-portfolio/">Explore the Portfolio</a>
      </div>
      <div class="npoc-focus-cards" aria-label="Oncology portfolio areas of interest">
        <a class="npoc-focus-card" href="/contact/?enquiry=Oncology%20solid%20tumours" aria-label="Discuss solid tumour opportunities"><img src="/assets/media/oncology/solid-tumours.jpg" alt="" width="325" height="237" loading="lazy" decoding="async"><span>Solid tumours</span></a>
        <a class="npoc-focus-card" href="/contact/?enquiry=Oncology%20haematological%20cancers" aria-label="Discuss haematological cancer opportunities"><img src="/assets/media/oncology/haematological-cancers.jpg" alt="" width="320" height="237" loading="lazy" decoding="async"><span>Haematological cancers</span></a>
        <a class="npoc-focus-card" href="/contact/?enquiry=Oncology%20supportive%20care" aria-label="Discuss supportive care opportunities"><img src="/assets/media/oncology/supportive-care.jpg" alt="" width="320" height="237" loading="lazy" decoding="async"><span>Supportive care</span></a>
      </div>
    </div>
    <p class="container npoc-focus-disclosure">Illustrative programme categories only. No oncology medicine is represented as approved, stocked or available from NovaPharm.</p>
  </section>
  <aside class="npoc-status" id="scope-boundary" aria-label="Current oncology scope"><div class="container"><strong>Strategic B2B focus</strong><p>Regulated wholesale supply has not commenced. Oncology products are not presented as approved, stocked or available from NovaPharm. All activity remains subject to relevant authorisations and applicable controls.</p><a href="#oncology-faqs">Read our current scope</a></div></aside>
  <section class="npoc-section npoc-introduction" id="approach" aria-labelledby="npoc-approach-title"><div class="container npoc-narrow"><p class="npoc-eyebrow">THE PRINCIPLE</p><h2 id="npoc-approach-title">Every detail<br>matters.</h2><p class="npoc-intro-lead">A medicine is more than its name. Its identity, evidence, source, handling and accountable decisions must remain connected through every hand-off.</p><p class="npoc-intro-support">Commercial interest opens a question. It does not establish a right to supply, the quality of the evidence or readiness for regulated activity.</p></div></section>
  <section class="npoc-section npoc-evidence" id="evidence" aria-labelledby="npoc-evidence-title"><div class="container"><div class="npoc-section-heading"><p class="npoc-eyebrow">OUR EVIDENCE MODEL</p><h2 id="npoc-evidence-title">Six connected decisions.<br>One coherent view.</h2><p>Complex pharmaceutical opportunities need more than a checklist. Each evidence axis should lead to a traceable, accountable next decision.</p></div><ol class="npoc-evidence-list"><li><span class="npoc-index">01</span><div><p class="npoc-eyebrow">Identity</p><h3>Know the exact medicine.</h3><p>Product identity, formulation, presentation, supply rights and the proposed regulated route must be unambiguous.</p></div></li>
<li><span class="npoc-index">02</span><div><p class="npoc-eyebrow">Evidence</p><h3>Make every claim traceable.</h3><p>Dossier status, authorisations, approved information, quality records and stability evidence determine what can be considered.</p></div></li>
<li><span class="npoc-index">03</span><div><p class="npoc-eyebrow">Source</p><h3>Qualify every hand-off.</h3><p>Manufacturers, rights holders, authorised suppliers and specialist providers retain clear responsibilities and oversight.</p></div></li>
<li><span class="npoc-index">04</span><div><p class="npoc-eyebrow">Condition</p><h3>Protect the product requirements.</h3><p>Packaging, storage, transport, monitoring, custody and exception review follow product-specific evidence.</p></div></li>
<li><span class="npoc-index">05</span><div><p class="npoc-eyebrow">Demand</p><h3>Plan without pretending to predict.</h3><p>Approved assumptions, lead times, constraints and uncertainty inform continuity planning without suggesting guaranteed availability.</p></div></li>
<li><span class="npoc-index">06</span><div><p class="npoc-eyebrow">Decision</p><h3>Keep a named accountable owner.</h3><p>Review outcomes, exceptions, release responsibilities and audit evidence must remain visible until the appropriate decision.</p></div></li></ol></div></section>
  <section class="npoc-section npoc-programmes" id="programmes" aria-labelledby="npoc-programmes-title"><div class="container"><div class="npoc-section-heading"><p class="npoc-eyebrow">SPECIALIST PROGRAMMES</p><h2 id="npoc-programmes-title">Complexity deserves precision.</h2><p>Explore how evidence requirements change across pharmaceutical presentations. These are assessment categories, not a product catalogue or availability statement.</p></div><div class="npoc-programme-layout"><div class="npoc-programme-list"><details open><summary><span class="npoc-index">01</span><span>Oral solid programmes</span><span class="npoc-disclosure" aria-hidden="true"></span></summary><div class="npoc-programme-body"><h3>The familiar presentation still requires exact evidence.</h3><p>Strength, pack, source product, shelf life, labelling, repackaging, storage and the applicable licence pathway must be established product by product.</p><ul><li>Identity and reference-product evidence</li><li>Manufacturer and supply rights</li><li>Pack, stability and storage requirements</li><li>Applicable authorisation pathway</li></ul></div></details>
<details><summary><span class="npoc-index">02</span><span>Oral liquid programmes</span><span class="npoc-disclosure" aria-hidden="true"></span></summary><div class="npoc-programme-body"><h3>Formulation determines the pathway.</h3><p>Concentration, excipients, closure compatibility, microbiological controls, in-use conditions and technology-transfer requirements can change both the evidence and the accountable parties.</p><ul><li>Formula and development rationale</li><li>Container-closure and analytical strategy</li><li>Microbiology, stability and in-use evidence</li><li>Manufacturing and transfer responsibilities</li></ul></div></details>
<details><summary><span class="npoc-index">03</span><span>Sterile and temperature-sensitive</span><span class="npoc-disclosure" aria-hidden="true"></span></summary><div class="npoc-programme-body"><h3>Specialist controls need specialist owners.</h3><p>Where applicable, qualified manufacturers, laboratories, packaging systems, release arrangements and logistics providers must demonstrate the required control architecture.</p><ul><li>Authorised specialist organisations</li><li>Sterility and release evidence</li><li>Qualified packaging and transport lanes</li><li>Temperature monitoring and excursion review</li></ul></div></details>
<details><summary><span class="npoc-index">04</span><span>Specialist and supportive care</span><span class="npoc-disclosure" aria-hidden="true"></span></summary><div class="npoc-programme-body"><h3>Clinical significance does not create commercial authority.</h3><p>A substantiated B2B need is only the starting point. Product rights, available evidence, regulated route, quality requirements and permissible claims require separate assessment.</p><ul><li>Documented B2B need</li><li>Product and supplier authority</li><li>Quality, handling and commercial boundaries</li><li>Approved communication and intended audience</li></ul></div></details></div><aside class="npoc-programme-image npoc-editorial-panel" aria-label="Evidence-led programme approach"><p class="npoc-eyebrow">CONTROLLED FROM THE START</p><p class="npoc-panel-headline">The detail behind every decision.</p><p class="npoc-panel-support">Formulation. Evidence. Quality. Accountability.</p><p class="npoc-panel-footer">Different presentations. The same standard of scrutiny.</p></aside></div></div></section>
  <section class="npoc-section npoc-governance" id="governance" aria-labelledby="npoc-governance-title"><div class="container"><div class="npoc-section-heading"><p class="npoc-eyebrow">READINESS BEFORE RELEASE</p><h2 id="npoc-governance-title">The pathway is only as strong as its evidence.</h2><p>Every step requires the appropriate party, documentation and authority. Forecasts and commercial assumptions never replace formal approval.</p></div><ol class="npoc-pathway"><li><span>01</span><strong>Programme evidence</strong></li><li><span>02</span><strong>Product readiness</strong></li><li><span>03</span><strong>Qualified source</strong></li><li><span>04</span><strong>Regulatory pathway</strong></li><li><span>05</span><strong>Accountable release</strong></li></ol><details class="npoc-matrix"><summary>Explore the full readiness matrix<span class="npoc-disclosure" aria-hidden="true"></span></summary><div class="npoc-table-scroll"><table><caption>Six readiness dimensions, required evidence and stop conditions</caption><thead><tr><th scope="col">Dimension</th><th scope="col">Operating question</th><th scope="col">Evidence</th><th scope="col">Stop condition</th></tr></thead><tbody><tr><td>Identity and rights</td><td>Exact product, source, presentation and rights established?</td><td>Identity records, rights and product-specific scope</td><td>Ambiguous identity or unverified rights</td></tr>
<tr><td>Regulatory route</td><td>Applicable UK route established?</td><td>Pathway assessment and accountable owner</td><td>Required permissions absent or route unsupported</td></tr>
<tr><td>Quality and manufacture</td><td>Qualified parties and documented control?</td><td>Authorisations, quality evidence and agreements</td><td>Critical responsibility or evidence gap</td></tr>
<tr><td>Condition and custody</td><td>Product-specific handling controlled?</td><td>Packaging, lane, monitoring and excursion records</td><td>Unqualified lane or unresolved condition risk</td></tr>
<tr><td>Demand and continuity</td><td>Planning assumptions reviewed?</td><td>Demand basis, lead times and uncertainty scenarios</td><td>Unsupported demand or certainty claim</td></tr>
<tr><td>Release and communication</td><td>Decision authority and claims controlled?</td><td>Release evidence, approved copy and audit record</td><td>Promotion or supply before readiness</td></tr></tbody></table></div></details><p class="npoc-boundary">NovaPharm does not provide medical advice, direct patient services or a guarantee of product authorisation, programme outcome or availability.</p></div></section>
  <section class="npoc-section npoc-faq" id="oncology-faqs" aria-labelledby="npoc-faq-title"><div class="container npoc-faq-layout"><div><p class="npoc-eyebrow">QUESTIONS &amp; SCOPE</p><h2 id="npoc-faq-title">Clarity matters.</h2><p>Current operating boundaries and practical questions for prospective partners.</p></div><div class="npoc-faq-list"><details><summary>Does NovaPharm currently sell oncology medicines?</summary><p>No. Oncology and specialist medicines are strategic areas for B2B opportunity assessment. This page does not state that any oncology medicine is approved, stocked or available from NovaPharm. Regulated wholesale activity will begin only after the required authorisations are granted.</p></details>
<details><summary>Is NovaPharm an MHRA-authorised pharmaceutical wholesaler?</summary><p>NovaPharm does not present itself as holding a WDA(H) or another unverified pharmaceutical authorisation. Company incorporation and preparatory work are separate from permissions required for regulated supply.</p></details>
<details><summary>Can patients use this page to choose or order medicines?</summary><p>No. This is a corporate B2B page. NovaPharm does not provide diagnosis, treatment, dosage, medicine-selection or prescribing advice and does not accept patient orders.</p></details>
<details><summary>What does oncology continuity mean here?</summary><p>It means connecting product identity, evidence, source, condition, demand assumptions and accountable decisions so gaps are visible before supply or release decisions. It is a governance framework, not a guarantee of availability.</p></details>
<details><summary>Does NovaPharm operate its own cold chain, laboratory or manufacturing site?</summary><p>No such ownership is claimed. Product-specific manufacture, testing, release, storage and transport would require appropriately qualified and authorised organisations with explicit responsibilities and evidence.</p></details>
<details><summary>How can a product owner or qualified partner begin a discussion?</summary><p>Start with a non-confidential description of the opportunity through the business enquiry route. Do not send patient information, adverse-event reports, urgent medical details or a confidential dossier through the public contact page.</p></details></div></div></section>
  <section class="npoc-section npoc-enquiry" id="oncology-enquiry" aria-labelledby="npoc-enquiry-title"><div class="container npoc-narrow"><p class="npoc-eyebrow">QUALIFIED COLLABORATION</p><h2 id="npoc-enquiry-title">The next conversation starts here.</h2><p>Product and dossier owners, qualified manufacturers, CMO/CDMOs, authorised supply partners and specialist providers can begin with a non-confidential opportunity summary.</p><div class="npoc-actions"><a class="npoc-button npoc-button-primary" href="/contact/?enquiry=Oncology%20%26%20specialist%20medicines">Start a partnership enquiry</a><a class="npoc-button npoc-button-outline" href="mailto:vishal@novapharmhealthcare.com?subject=NovaPharm%20Oncology%20Partnership%20Enquiry">Email our team</a></div><p class="npoc-enquiry-note">Use the Contact page for a non-confidential business enquiry, or email our team directly. Submission and receipt handling are explained on the Contact page. Do not send confidential dossiers, patient-identifiable information, adverse-event reports or urgent medical information through either route.</p></div></section>
</main>`;
}

function productsMain() {
  return `<main id="main" class="npd-main">${hero({ route: "/products/", family: "products", eyebrow: "Products", title: "Three collections. Distinct decisions.", lead: "Explore Nutraxin wellness, ESCO Anand healthcare equipment, and our strategic pharmaceutical priorities. Product-specific availability, pricing and UK regulatory permission are assessed independently." })}
  <section class="npd-section npd-product-feature" id="food-supplement-portfolio-review" data-portfolio-priority="first"><div class="container npd-products-lead"><div>${sectionIntro("Nutraxin UK catalogue reference", "Food Supplement Portfolio Review", "Nineteen owner-supplied catalogue records are available for qualified B2B review with approved pack imagery and source-transcribed composition. Availability, price, stock, claims and regulatory acceptance are not asserted.")}<dl class="npd-inline-facts"><div><dt>References</dt><dd>19</dd></div><div><dt>Classification</dt><dd>Food supplements</dd></div><div><dt>Last reviewed</dt><dd>22 August 2026</dd></div></dl>${actions("Review the food supplement portfolio", "/products/nutraxin/", "Discuss a distribution opportunity", "/contact/?enquiry=Product%20opportunity")}</div>${productPicture(products[0], true, "(max-width: 720px) 84vw, 420px")}</div></section>
  <section class="npd-section"><div class="container npd-split"><div>${sectionIntro("Strategic pharmaceutical portfolio", "Opportunity priorities, not a public product catalogue.", "Selected oncology, specialty, oral-liquid, generics and hard-to-source categories are assessed product by product. Rights, source, evidence, regulatory route, quality and commercial viability must be established separately.")}${actions("Review the strategic portfolio", "/products/strategic-portfolio/")}</div>${responsiveImage("/assets/media/modules/product-portfolio-evidence", "Team reviewing pharmaceutical portfolio evidence", )}</div></section>
  <section class="npd-section npd-section-soft"><div class="container">${sectionIntro("Product governance", "Visibility is not release.", "Every substantive product statement remains subject to the Claims Registry and its underlying evidence.")}<ol class="npd-horizontal-steps"><li><span>01</span><strong>Identity</strong></li><li><span>02</span><strong>Rights</strong></li><li><span>03</span><strong>Source</strong></li><li><span>04</span><strong>Regulatory scope</strong></li><li><span>05</span><strong>Quality and release</strong></li></ol></div></section></main>`;
}

function nutraxinMain() {
  const original = read("src/content/nutraxin-showcase.html");
  const seen = new Set();
  const rendered = original.replace(/<a class="nx-product-card" href="[^"]+" data-nx-product-slug="([a-z0-9-]+)">[\s\S]*?[<][/]a>/gu, (card, slug) => {
    if (seen.has(slug)) throw new Error(`Duplicate Nutraxin card ${slug}`);
    seen.add(slug);
    return `<div class="nx-product-card-shell">${card}<div class="nx-product-publisher">${nutraxinOfficialReference(slug)}</div></div>`;
  });
  if (seen.size !== products.length || [...seen].some((slug) => !expectedNutraxinSlugs.has(slug))) {
    throw new Error(`Expected all ${products.length} Nutraxin catalogue cards; found ${seen.size}`);
  }
  return rendered;
}

function nutraxinBagMain() {
  // Authoritative public Bag markup. Keep in sync with the commerce release test.
  return `<main id="main" class="npd-main nx-shop-bag" data-nx-public-bag>
    <p class="nx-shop-eyebrow">NUTRAXIN / YOUR BAG</p>
    <h1>Your Bag.</h1>
    <p class="nx-shop-intro">One simple checkout. Review your selection, enter your details, pay securely and receive your order confirmation.</p>
    <nav class="nx-purchase-progress" aria-label="Order journey">
      <ol>
        <li class="is-current" aria-current="step"><span>01</span><strong>Your Bag</strong></li>
        <li><span>02</span><strong>Details</strong></li>
        <li><span>03</span><strong>Payment</strong></li>
        <li><span>04</span><strong>Confirmation</strong></li>
      </ol>
    </nav>
    <div class="nx-checkout-identity" aria-labelledby="nx-checkout-identity-title">
      <div><p class="nx-shop-eyebrow">YOUR CHECKOUT</p><h2 id="nx-checkout-identity-title">Simple from start to finish.</h2><p>You can complete your purchase as a guest. Your email and UK delivery address are collected securely during checkout, without a separate business portal.</p></div>
      <div class="nx-checkout-identity-meta"><strong>Guest checkout available</strong><span><a href="/products/nutraxin/account/">Sign in or create your Nutraxin account</a>. Account access activates only after verified email and production security checks.</span></div>
    </div>
    <div class="nx-bag-grid">
      <section aria-label="Items in your bag"><div data-nx-bag-items><p class="nx-bag-empty">Loading your saved selections...</p></div><a href="/products/nutraxin/" class="nx-shop-link">Continue shopping</a></section>
      <aside class="nx-bag-summary" aria-label="Order summary"><h2>Bag summary</h2><dl>
        <div><dt>Products</dt><dd data-nx-bag-subtotal>Pending</dd></div>
        <div><dt>Delivery</dt><dd data-nx-bag-delivery>Included · UK</dd></div>
        <div><dt>Taxes</dt><dd data-nx-bag-tax>20% VAT included</dd></div>
        <div class="nx-bag-total"><dt>Estimated total</dt><dd data-nx-bag-total>Calculating…</dd></div>
      </dl><label class="nx-store-consumer-terms"><input type="checkbox" data-nx-consumer-terms><span>I accept the <a href="/legal/terms/#nutraxin-consumer-sales">Nutraxin consumer shopping terms and rights</a> and understand these supplements are fulfilled by the manufacturer, not reserved as warehouse stock. I acknowledge the stated delivery expectation may be up to 30 days.</span></label><button type="button" class="nx-store-bag-button" data-nx-checkout disabled>Continue to secure checkout</button>
      <p class="nx-store-note" role="status" data-nx-checkout-note>Your final amount is recalculated by NovaPharm’s server. Stripe securely handles your payment details.</p>
      <a class="nx-shop-link" href="/products/nutraxin/">Back to products</a></aside>
    </div>
  </main>`;
}

function nutraxinOrderRequestMain() {
  const lines = products.map((product) => `<div class="nx-order-line" data-nutraxin-line="${esc(product.sku)}"><label for="nx-qty-${esc(product.sku)}"><span class="nx-order-name">${esc(product.name)}</span><span class="nx-order-pack">${esc(product.packSize)}</span></label><input id="nx-qty-${esc(product.sku)}" type="number" min="0" max="10000" step="1" value="0" inputmode="numeric" aria-label="Requested units: ${esc(product.name)}"></div>`).join("");
  return `<main id="main" class="npd-main nx-order">${localNavigation("products", "/products/nutraxin/order-request/")}<section class="nx-order-wrap"><p class="nx-order-eyebrow">NUTRAXIN / QUALIFIED BUSINESS ACCOUNTS</p><h1>Prepare your order request.</h1><p class="nx-order-lead">Select the Nutraxin products and quantities you would like NovaPharm to quote.</p><p class="nx-order-disclosure">This is a non-binding request for a quotation, not a purchase or accepted order. Product availability, customer qualification, compliance, prices, delivery and any applicable VAT must be confirmed by NovaPharm before an order can be accepted. No payment is requested.</p><form data-nutraxin-order-request><div class="nx-order-tablehead"><span>Product reference</span><span>Units requested</span></div>${lines}<p class="nx-order-fineprint">Continue to the secure business enquiry form to provide your company details and submit this request. No financial information is collected here.</p><div class="nx-order-actions"><button type="submit" class="nx-order-submit">Continue to business enquiry</button><a class="nx-order-back" href="/products/nutraxin/">Return to collection</a></div><p class="nx-order-feedback" role="status" aria-live="polite" data-nutraxin-order-feedback>Select a product and enter a quantity to prepare your enquiry.</p><noscript><p>To request a quotation without JavaScript, <a href="/contact/?enquiry=Pharmacy%20or%20wholesaler%20account">contact our business team</a> with the requested products and quantities.</p></noscript></form></section></main>`;
}

function nutraxinProductMain(product) {
  const evidence = product.notes?.length ? "Composition review required" : "Catalogue transcription reviewed";
  const compositionNote = (product.notes ?? []).some((note) => note.includes("publisher"))
    ? "The values below use current Nutraxin UK publisher corrections where expressly noted. The exact approved physical-pack label remains unverified."
    : "The values below reproduce the supplied catalogue record and are not a substitute for approved labelling.";
  return `<main id="main" class="npd-main npd-product-detail">${localNavigation("products", `/products/nutraxin/${product.slug}/`)}<nav class="npd-breadcrumb" aria-label="Breadcrumb"><div class="container"><a href="/products/">Products</a><a href="/products/nutraxin/">Nutraxin</a><span aria-current="page">${esc(product.name)}</span></div></nav><section class="npd-product-hero"><div class="container npd-product-hero-grid"><div class="npd-product-visual">${productPicture(product, true, "(max-width: 720px) 86vw, 520px")}</div><div class="npd-product-copy"><p class="npd-eyebrow">${esc(product.range)}</p><h1>${esc(product.name)}</h1><p class="npd-product-pack">${esc(product.packSize)}</p><dl class="npd-product-meta"><div><dt>Dosage form</dt><dd>${esc(product.dosageForm)}</dd></div><div><dt>Catalogue source</dt><dd>Nutraxin UK catalogue, page ${product.cataloguePage}</dd></div><div><dt>Evidence status</dt><dd>${evidence}</dd></div></dl>${actions("Request business ordering access", `/contact/?enquiry=Pharmacy%20or%20wholesaler%20account&product=${encodeURIComponent(product.name)}&sku=${encodeURIComponent(product.sku)}`, "Discuss this reference", `/contact/?enquiry=Product%20opportunity&product=${encodeURIComponent(product.name)}`)}<p class="npd-product-order-request"><a href="/products/nutraxin/order-request/?sku=${encodeURIComponent(product.sku)}">Select quantity for a business order request</a></p><div class="npd-publisher-action">${nutraxinOfficialReference(product.slug)}<p>External publisher information. Pack details, claims and availability require separate verification.</p></div></div></div></section><section class="npd-section npd-section-soft"><div class="container npd-product-evidence"><div>${sectionIntro("Catalogue composition", "Source-transcribed product information.", compositionNote)}<dl class="npd-composition">${product.formulation.map((item) => `<div><dt>${esc(item.name)}</dt><dd>${esc(item.amount)}</dd></div>`).join("")}</dl></div><div>${notice("regulatory", "Important product status", "This page does not assert current UK availability, price, stock, a permitted health claim, regulatory acceptance or medicinal status.")}${product.notes?.length ? notice("warning", "Source review note", product.notes.map(esc).join(" ")) : ""}</div></div></section><section class="npd-section npd-final"><div class="container"><h2>Continue the portfolio review.</h2>${actions("All Nutraxin references", "/products/nutraxin/", "Strategic portfolio", "/products/strategic-portfolio/")}</div></section></main>`;
}

function strategicPortfolioMain() {
  const categories = [
    ["Oncology medicines", "Strategic focus", "Oral and liquid opportunities assessed with specialist formulation, evidence, demand, storage and regulatory dependencies."],
    ["Specialty medicines", "Opportunity assessment", "Hard-to-source and clinically important categories considered through qualified B2B and regulatory pathways."],
    ["Oral liquid formulations", "Partner sought", "Technically differentiated formulations requiring appropriate development, manufacturing and stability evidence."],
    ["Selected licensed generics", "Regulatory preparation", "Established categories assessed for compliant sourcing, documentation and commercial viability."],
    ["Cardiovascular, respiratory and metabolic categories", "Strategic review", "Selected opportunities considered product by product; no availability is implied."],
    ["Hospital and hard-to-source products", "Qualified enquiry", "B2B opportunities reviewed without implying stock, authorisation or NHS supply."]
  ];
  return `<main id="main" class="npd-main">${hero({ route: "/products/strategic-portfolio/", family: "products", eyebrow: "Strategic pharmaceutical portfolio", title: "A portfolio of questions before it becomes a portfolio of products.", lead: "NovaPharm evaluates selected pharmaceutical categories through product-specific rights, source, regulatory, quality and commercial evidence. This is not an ecommerce or availability catalogue.", actionsHtml: actions("Discuss an opportunity", "/contact/?enquiry=Product%20opportunity") })}<section class="npd-section"><div class="container">${sectionIntro("Current priorities", "Category direction with product-level discipline.")}<div class="npd-portfolio-list">${categories.map(([title, status, text], index) => `<article><span>${String(index + 1).padStart(2, "0")}</span><div><p>${status}</p><h2>${title}</h2><p>${text}</p></div></article>`).join("")}</div>${notice("regulatory", "Portfolio boundary", "A category listing does not mean NovaPharm owns a marketing authorisation, holds stock, has secured supply, serves NHS organisations or may conduct regulated wholesale activity.")}</div></section><section class="npd-section npd-section-soft"><div class="container">${sectionIntro("Assessment sequence", "Every opportunity earns its place.")}<ol class="npd-horizontal-steps"><li><span>01</span><strong>Strategic fit</strong></li><li><span>02</span><strong>Rights and source</strong></li><li><span>03</span><strong>Regulatory route</strong></li><li><span>04</span><strong>Quality evidence</strong></li><li><span>05</span><strong>Commercial viability</strong></li></ol></div></section></main>`;
}

function partnersMain() {
  return `<main id="main" class="npd-main">${hero({ route: "/partner-with-us/", family: "company", eyebrow: "Partners", title: "Partnership begins with a clear role and verifiable evidence.", lead: "NovaPharm is designed for qualified collaboration with product owners, manufacturers, authorised suppliers, buyers and specialist providers.", actionsHtml: actions("Start a partnership conversation", "/contact/") })}<section class="npd-section"><div class="container npd-partner-editorial"><div>${sectionIntro("Collaboration ecosystem", "Different expertise. Shared responsibility for clarity.", "No organisation is presented as a partner until permission to publish the relationship and its accurate scope have been confirmed.")}</div><ul><li>GMP manufacturers</li><li>CMO and CDMO partners</li><li>Product and dossier owners</li><li>Marketing-authorisation holders</li><li>Authorised pharmaceutical wholesalers</li><li>Pharmacies and hospital procurement teams</li><li>Logistics, quality, regulatory and technology specialists</li></ul></div></section><section class="npd-section npd-section-soft"><div class="container">${sectionIntro("Qualification path", "A visible route from introduction to accountable delivery.")}<ol class="npd-horizontal-steps"><li><span>01</span><strong>Strategic fit</strong></li><li><span>02</span><strong>Evidence review</strong></li><li><span>03</span><strong>Due diligence</strong></li><li><span>04</span><strong>Defined agreement</strong></li><li><span>05</span><strong>Controlled implementation</strong></li></ol></div></section><section class="npd-section npd-final"><div class="container"><h2>Describe the opportunity and your organisation's role.</h2>${actions("Contact NovaPharm", "/contact/")}</div></section></main>`;
}

function technologyMain() {
  return read("src/content/technology-intelligence.html");
}

function insightsMain() {
  const [lead, ...rest] = articles;
  const secondary = rest.slice(0, 3);
  const remaining = rest.slice(3);
  return `<main id="main" class="npd-main">${hero({ route: "/news-insights/", eyebrow: "Insights", title: "Regulated-market thinking, written to be challenged.", lead: "Original NovaPharm analysis distinguishes evidence, professional interpretation and future intention. It is corporate B2B information, not medical advice.", compact: true })}<section class="npd-section"><div class="container"><article class="npd-insight-lead"><p>${esc(lead.category)}</p><h2><a href="/news-insights/${lead.slug}/">${esc(lead.title)}</a></h2><p>${esc(lead.summary)}</p><span>${esc(lead.author)} · ${esc(lead.published)}</span></article><div class="npd-insight-secondary">${secondary.map((article) => `<article><p>${esc(article.category)}</p><h2><a href="/news-insights/${article.slug}/">${esc(article.title)}</a></h2><p>${esc(article.summary)}</p></article>`).join("")}</div>${remaining.length ? `<div class="npd-insight-list">${remaining.map((article) => `<a href="/news-insights/${article.slug}/"><span>${esc(article.category)}</span><strong>${esc(article.title)}</strong><time datetime="${esc(article.published)}">${esc(article.published)}</time></a>`).join("")}</div>` : ""}</div></section></main>`;
}

function contactMain(existingHtml) {
  const managedForm = existingHtml.match(/<form class="form-grid contact-form[\s\S]*?<\/form>/)?.[0] || "";
  const managedEnabled = Boolean(managedForm);
  const options = [
    "Product opportunity", "Distribution partnership", "Oncology & specialist medicines",
    "CMO/CDMO partnership", "Regulatory services", "Clinical development & CRO support",
    "Pharmacy or wholesaler account", "Supplier enquiry", "Media", "Careers", "General enquiry"
  ].map((topic) => '<option value="' + esc(topic) + '">' + esc(topic) + '</option>').join("");
  const draft = [
    '<form class="np-contact-reference-form" data-email-enquiry-form action="mailto:vishal@novapharmhealthcare.com" method="post" enctype="text/plain">',
    '<div class="np-contact-reference-grid">',
    '<label class="np-contact-reference-field"><span>Full name</span><input name="name" autocomplete="name" placeholder="Your name" maxlength="120" required></label>',
    '<label class="np-contact-reference-field"><span>Work email</span><input type="email" name="email" autocomplete="email" placeholder="name@company.com" maxlength="160" required></label>',
    '<label class="np-contact-reference-field"><span>Company</span><input name="company" autocomplete="organization" placeholder="Organisation name" maxlength="160" required></label>',
    '<label class="np-contact-reference-field"><span>Country / region</span><input name="country" autocomplete="country-name" placeholder="Select or enter a country" maxlength="80" required></label>',
    '</div>',
    '<label class="np-contact-reference-field np-contact-reference-full"><span>What is your enquiry about?</span><select name="enquiryType" required><option value="" disabled selected>Choose a topic</option>', options, '</select></label>',
    '<label class="np-contact-reference-field np-contact-reference-full np-contact-reference-message"><span>Your message</span><textarea name="message" placeholder="Tell us a little about your enquiry." minlength="20" maxlength="850" required></textarea></label>',
    '<div class="np-contact-reference-actions"><div>',
    '<p class="np-contact-reference-privacy">Your information will be used to respond to your enquiry, in accordance with our <a href="/legal/privacy/">privacy notice</a>.</p>',
    '<p class="np-contact-reference-mode">This website does not submit enquiries. Opening your email draft does not confirm delivery. Please do not include confidential dossiers or patient information.</p>',
    '</div><button type="submit" class="np-contact-reference-submit">Open email draft</button></div>',
    '</form>',
    '<p class="np-contact-reference-status" data-email-draft-status role="status" aria-live="polite">This public information release does not collect or transmit enquiry details. Your email application handles sending.</p>'
  ].join("");
  const control = managedEnabled
    ? '<div class="np-contact-managed">' + managedForm.replace('class="form-grid contact-form"', 'class="form-grid contact-form np-contact-reference-form"') + '</div>'
    : draft;
  return [
    '<main id="main" class="npd-main np-contact np-contact-reference">',
    '<section class="np-contact-reference-hero" aria-labelledby="contact-heading"><div class="np-contact-reference-shell">',
    '<span class="np-contact-reference-kicker">Contact NovaPharm</span>',
    '<h1 id="contact-heading">Let&#39;s talk.</h1>',
    '<p>Big ideas begin with a conversation.<br>Tell us what you&#39;re working on.</p>',
    '</div></section>',
    '<section class="np-contact-reference-content" aria-labelledby="contact-help-heading"><div class="np-contact-reference-shell">',
    '<header class="np-contact-reference-heading"><h2 id="contact-help-heading">How can we help?</h2>',
    '<p>Share a few details and we&#39;ll direct your enquiry to the right team.</p></header>',
    control,
    '</div></section>',
    '<aside class="np-contact-reference-safety" aria-label="Important communication boundaries"><div class="np-contact-reference-shell">',
    '<p>Business enquiries only. This is not a medical or patient-ordering channel. Do not send patient-identifiable information, adverse-event reports or urgent medical details. Report suspected side effects through the <a href="https://yellowcard.mhra.gov.uk/">MHRA Yellow Card service</a>. For UK emergencies call 999 or seek NHS 111 advice.</p>',
    '</div></aside>',
    '<footer class="np-contact-reference-footer"><div class="np-contact-reference-shell np-contact-reference-footer-inner"><div>',
    '<strong>Medicine. Where it needs to be.</strong>',
    '<p>NovaPharm Healthcare Ltd · United Kingdom</p><small>Regulated wholesale supply has not commenced.</small>',
    '</div><nav aria-label="Contact footer"><a href="/about/">Company</a><a href="/legal/privacy/">Privacy</a><a href="/legal/terms/">Terms</a><a href="/legal/accessibility/">Accessibility</a></nav></div></footer>',
    '</main>'
  ].join("");
}
function accountMain(existingHtml) {
  const managedForm = existingHtml.match(/<form class="form-grid application-form[\s\S]*?<\/form>/)?.[0] || "";
  const managedStatus = existingHtml.match(/<div class="alert application-status"[\s\S]*?<\/div>/)?.[0] || "";
  const control = managedForm && managedStatus ? `<div class="npd-managed-control">${managedForm}${managedStatus}</div>` : `<div class="npd-managed-control">${notice("information", "Managed application required", "This public information release does not accept account applications or business documents. No application data is collected here. The workflow remains unavailable until secure managed storage, identity, review and monitoring are verified.")}${verifiedEmailFallback({ subject: "NovaPharm business account eligibility", label: "Discuss account eligibility", context: "You may email a non-confidential expression of business interest to vishal@novapharmhealthcare.com. Do not attach licences, dossiers, identity records or other confidential evidence." })}</div>`;
  const stages = ["Business interest", "Initial qualification", "Application invitation", "Company information", "Regulatory and quality evidence", "Controlled document review", "Credit and commercial review", "Approval decision", "Identity provisioning", "Portal access and ongoing review"];
  return `<main id="main" class="npd-main">${hero({ route: "/account-application/", eyebrow: "Business account", title: "An account is approved through evidence, not created by a public form.", lead: "NovaPharm separates business interest, qualification, private evidence, review, approval, identity provisioning and portal access." })}<section class="npd-section"><div class="container npd-account-layout"><div>${sectionIntro("Governed lifecycle", "Ten distinct stages from interest to controlled access.")}<ol class="npd-account-stages">${stages.map((stage, index) => `<li><span>${String(index + 1).padStart(2, "0")}</span><strong>${stage}</strong></li>`).join("")}</ol>${notice("regulatory", "Account status", "An enquiry or application does not create an approved trading account, confirm product availability, establish credit terms or permit regulated supply.")}</div>${control}</div></section></main>`;
}

function replaceMain(html, main) {
  const pattern = /<main\b[^>]*\bid=["']main["'][^>]*>[\s\S]*?<\/main>/i;
  if (!pattern.test(html)) throw new Error("Corporate product-discipline transform could not find <main id=\"main\">.");
  return html.replace(pattern, main);
}

function replaceChrome(html, route) {
  html = html.replace(/<header\s+class="site-header(?:\s+[^"]*)?"[^>]*>[\s\S]*?<\/header>/, header(route));
  html = html.replace(/<footer class="site-footer"[\s\S]*?<\/footer>/, footer());
  html = html.replace(/<body([^>]*)>/, (_match, attributes) => {
    const governedAttributes = attributes
      .replace(/\sdata-family="[^"]*"/g, "")
      .replace(/\sdata-route="[^"]*"/g, "");
    return `<body${governedAttributes} data-family="${esc(globalSection(route) || "corporate")}" data-route="${esc(route)}">`;
  });
  return html;
}

function setMetadata(html, { route, title, description, robots = "index, follow, max-snippet:-1, max-image-preview:large", schemas = [] }) {
  const canonical = `${siteUrl}${route}`;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(description)}">`)
    .replace(/<meta name="robots" content="[^"]*">/, `<meta name="robots" content="${robots}">`)
    .replace(/<link rel="canonical" href="[^"]+">/, `<link rel="canonical" href="${canonical}">`)
    .replace(/<meta property="og:url" content="[^"]+">/, `<meta property="og:url" content="${canonical}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(title)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(description)}">`)
    .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${esc(title)}">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${esc(description)}">`);
  html = html.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, "");
  const baseSchemas = [{
    "@context": "https://schema.org", "@id": `${canonical}#webpage`, "@type": "WebPage",
    name: title, url: canonical, description, inLanguage: "en-GB",
    isPartOf: { "@id": `${siteUrl}/#website` }, about: { "@id": `${siteUrl}/#organization` }
  }, ...schemas];
  return html.replace("</head>", `${baseSchemas.map((schema) => `  <script type="application/ld+json">${JSON.stringify(schema)}</script>`).join("\n")}\n</head>`);
}

function materialize(relative, route, main, metadata = null, template = null) {
  let html = template ?? read(relative);
  if (route !== "/") {
    html = html.replace(/\s*<link rel="preload" as="image" href="\/assets\/media\/home\/supply-network-hero\.avif"[^>]*>\n?/g, "\n");
  } else {
    // Do not preload the retired supply-network illustration on the homepage.
    html = html.replace(/href="\/assets\/media\/home\/supply-network-hero\.avif"/g, 'href="/assets/media/home/earth-reference-1400.jpg"');
  }
  html = replaceMain(html, main);
  html = replaceChrome(html, route);
  if (metadata) html = setMetadata(html, { route, ...metadata });
  if (route === "/oncology/") {
    const title = "Oncology | Evidence-led Specialist Medicines | NovaPharm Healthcare";
    const description = "Explore NovaPharm's evidence-led B2B oncology model across product identity, quality, qualified sourcing, regulatory readiness and accountable decisions.";
    html = html
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
      .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(description)}">`)
      .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(title)}">`)
      .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(description)}">`)
      .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${esc(title)}">`)
      .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${esc(description)}">`)
      .replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (original, raw) => {
        const schema = JSON.parse(raw);
        if (schema["@type"] === "WebPage") {
          schema.name = title;
          schema.description = description;
          schema.dateModified = "2026-11-07";
          return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
        }
        return original;
      });
    if (!html.includes('href="/assets/css/oncology-editorial.css"')) {
      html = html.replace("</head>", '  <link rel="stylesheet" href="/assets/css/oncology-editorial.css">\n</head>');
    }
    // The owner-approved white visual system must load after the legacy dark Oncology CSS.
    // Unique filename prevents browsers from reusing the old cached presentation.
    if (!html.includes('href="/assets/css/oncology-hope-v2.css"')) {
      html = html.replace("</head>", '  <link rel="stylesheet" href="/assets/css/oncology-hope-v2.css">\n</head>');
    }
    html = html.replace(
      '<link rel="preload" as="image" href="/assets/media/products/oncology-vial-handling.avif" type="image/avif" fetchpriority="high">',
      '<link rel="preload" as="image" href="/assets/media/oncology/hope-tomorrow-portrait.jpg" type="image/jpeg" fetchpriority="high">'
    );
  }
  if (route === "/products/nutraxin/order-request/" && !html.includes('href="/assets/css/nutraxin-order-request.css"')) {
    html = html.replace("</head>", '  <link rel="stylesheet" href="/assets/css/nutraxin-order-request.css">\n</head>');
    html = html.replace("</body>", '  <script type="module" src="/assets/js/nutraxin-order-request.js"></script></body>');
  }
  if (route === "/products/nutraxin/" && !html.includes('href="/assets/css/nutraxin-lineup.css"')) {
    html = html.replace("</head>", '  <link rel="stylesheet" href="/assets/css/nutraxin-lineup.css">\n</head>');
  }
  if (route === "/technology/" && !html.includes('href="/assets/css/technology-intelligence.css"')) {
    html = html.replace("</head>", '  <link rel="stylesheet" href="/assets/css/technology-intelligence.css">\n</head>');
  }
  if (route === "/technology/" && !html.includes('src="/assets/js/medicines-terminal-preview.js"')) {
    html = html.replace("</body>", '<script src="/assets/js/medicines-terminal-preview.js" defer></script></body>');
  }
  if (route === "/technology/" && !html.includes('src="/assets/js/intelligence-research-launcher.js"')) {
    html = html.replace("</body>", '<script src="/assets/js/intelligence-research-launcher.js" defer></script></body>');
  }
  if (route === "/technology/" && !html.includes('src="/assets/js/intelligence-live-research.js"')) {
    html = html.replace("</body>", '<script src="/assets/js/intelligence-live-research.js" defer></script></body>');
  }
  if (route === "/technology/") {
    // Publish one versioned pricing script, even across successive rebuilds.
    // Old cached JS does not know about the inline-hidden annual CTA.
    html = html.replace(/<script src="\/assets\/js\/intelligence-pricing\.js(?:\?[^"]*)?" defer><\/script>/g, "");
    html = html.replace("</body>", '<script src="/assets/js/intelligence-pricing.js?v=20261114-approved-trial-v1" defer></script></body>');
  }
  if (route === "/contact/" && html.includes("data-email-enquiry-form")) {
    html = html.replace("</body>", '<script src="/assets/js/contact-email-draft.js" defer></script></body>');
  }
  write(relative, html);
}

const homeTemplate = read("index.html");
const productsTemplate = read("product-portfolio/index.html");
const nutraxinTemplate = read("product-portfolio/nutraxin/index.html");
const contactTemplate = read("contact/index.html");
const accountTemplate = read("account-application/index.html");

materialize("index.html", "/", homeMain());
materialize("about/index.html", "/about/", aboutMain());
materialize("capabilities/index.html", "/capabilities/", capabilitiesMain(), {
  title: "Pharmaceutical Capabilities | NovaPharm Healthcare",
  description: "Explore NovaPharm capabilities across sourcing, regulatory and quality readiness, clinical research coordination, oncology and governed technology."
}, homeTemplate);
materialize("services/index.html", "/services/", servicesMain());
materialize("regulatory-services/index.html", "/regulatory-services/", regulatoryMain());
materialize("cro/index.html", "/cro/", croMain());
materialize("oncology/index.html", "/oncology/", oncologyMain());
materialize("products/index.html", "/products/", productsMain(), {
  title: "Products | Nutraxin & Pharmaceutical Portfolio | NovaPharm",
  description: "Explore NovaPharm's Nutraxin food supplement collection and separate strategic pharmaceutical portfolio. Consumer browsing and regulated B2B opportunities follow distinct routes."
}, productsTemplate);
materialize("products/nutraxin/index.html", "/products/nutraxin/", nutraxinMain(), {
  title: "Nutraxin UK Supplements | Explore 19 Products | NovaPharm",
  description: "Discover 19 Nutraxin food supplements across six ranges. Explore original pack images, clear product details and build your Bag on the NovaPharm website."
}, nutraxinTemplate);
materialize("products/nutraxin/bag/index.html", "/products/nutraxin/bag/", nutraxinBagMain(), {
  title: "Your Bag | Nutraxin | NovaPharm Healthcare",
  description: "Review your Nutraxin Bag, quantities, VAT and delivery information before choosing the next checkout step.",
  robots: "noindex, follow"
}, nutraxinTemplate);
materialize("products/nutraxin/order-request/index.html", "/products/nutraxin/order-request/", nutraxinOrderRequestMain(), {
  title: "Nutraxin Business Order Request | NovaPharm Healthcare",
  description: "Prepare a product and quantity request for a non-binding NovaPharm Nutraxin business quotation. No prices, stock or orders are guaranteed.",
  robots: "noindex, follow"
}, nutraxinTemplate);
materialize("products/strategic-portfolio/index.html", "/products/strategic-portfolio/", strategicPortfolioMain(), {
  title: "Strategic Pharmaceutical Portfolio | NovaPharm Healthcare",
  description: "Explore NovaPharm's evidence-led pharmaceutical opportunity priorities without implying stock, authorisation, availability or public sale."
}, productsTemplate);
materialize("partner-with-us/index.html", "/partner-with-us/", partnersMain());
materialize("technology/index.html", "/technology/", technologyMain());
materialize("news-insights/index.html", "/news-insights/", insightsMain());
materialize("contact/index.html", "/contact/", contactMain(contactTemplate));
materialize("account-application/index.html", "/account-application/", accountMain(accountTemplate), {
  title: "Open a Business Account | NovaPharm Healthcare",
  description: "Review NovaPharm's controlled B2B account pathway from non-confidential interest through qualification, private evidence, approval, identity provisioning and portal access.",
  robots: "noindex, follow"
});

for (const product of products) {
  const route = `/products/nutraxin/${product.slug}/`;
  const title = `${product.name} ${product.packSize} | Nutraxin | NovaPharm`;
  const description = `${product.name}, ${product.packSize}, presented as an owner-supplied Nutraxin catalogue reference for qualified B2B review; availability and regulatory status are not asserted.`;
  const productSchema = {
    "@context": "https://schema.org", "@id": `${siteUrl}${route}#product`, "@type": "Product",
    name: product.name, sku: product.sku, category: "Food supplement catalogue reference",
    description, image: `${siteUrl}/assets/media/products/nutraxin/${product.imageBase}.png`,
    brand: { "@type": "Brand", name: "Nutraxin" },
    additionalProperty: [
      { "@type": "PropertyValue", name: "Pack size", value: product.packSize },
      { "@type": "PropertyValue", name: "Dosage form", value: product.dosageForm },
      { "@type": "PropertyValue", name: "Public status", value: "Catalogue reference; availability not asserted" }
    ]
  };
  materialize(`products/nutraxin/${product.slug}/index.html`, route, nutraxinProductMain(product), { title, description, schemas: [productSchema] }, nutraxinTemplate);
}

const familyRoutes = [
  ["about/company/index.html", "/about/company/", "company"],
  ["about/governance/index.html", "/about/governance/", "company"],
  ["leadership/index.html", "/leadership/", "company"],
  ["investor-information/index.html", "/investor-information/", "company"],
  ["careers/index.html", "/careers/", "company"]
];
for (const person of leadership) familyRoutes.push([`leadership/${person.slug}/index.html`, `/leadership/${person.slug}/`, "company"]);
for (const [relative, route, family] of familyRoutes) {
  if (!existsSync(join(root, relative))) continue;
  let html = read(relative);
  html = html.replace(/<main\b[^>]*\bid=["']main["'][^>]*>/i, (match) => `${match}${localNavigation(family, route)}`);
  html = replaceChrome(html, route);
  write(relative, html);
}

const otherChromeRoutes = [
  ["trust-centre/index.html", "/trust-centre/"], ["legal/index.html", "/legal/"],
  ["legal/privacy/index.html", "/legal/privacy/"], ["legal/cookies/index.html", "/legal/cookies/"],
  ["legal/terms/index.html", "/legal/terms/"], ["legal/accessibility/index.html", "/legal/accessibility/"],
  ["legal/modern-slavery/index.html", "/legal/modern-slavery/"], ["legal/environment-carbon/index.html", "/legal/environment-carbon/"],
  ["portal/index.html", "/portal/"]
];
for (const [relative, route] of otherChromeRoutes) {
  if (existsSync(join(root, relative))) write(relative, replaceChrome(read(relative), route));
}

function redirectDocument(title, destination) {
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="robots" content="noindex, follow"><link rel="canonical" href="${siteUrl}${destination}"><meta http-equiv="refresh" content="0; url=${destination}"></head><body><main><h1>${esc(title)}</h1><p>This address has moved to <a href="${destination}">${destination}</a>.</p></main></body></html>`;
}
write("product-portfolio/index.html", redirectDocument("Products", "/products/"));
write("product-portfolio/nutraxin/index.html", redirectDocument("Nutraxin", "/products/nutraxin/"));

for (const relative of [
  "index.html", "about/index.html", "capabilities/index.html", "services/index.html", "regulatory-services/index.html",
  "cro/index.html", "oncology/index.html", "products/index.html", "products/nutraxin/index.html",
  "products/strategic-portfolio/index.html", "partner-with-us/index.html", "technology/index.html", "news-insights/index.html",
  "contact/index.html", "account-application/index.html", "products/nutraxin/order-request/index.html", "products/nutraxin/bag/index.html"
]) {
  const html = read(relative);
  if (/<svg\b/i.test(html)) throw new Error(`Corporate product-discipline route contains an inline SVG illustration: ${relative}`);
  if (/→|&rarr;|&#8594;/i.test(html)) throw new Error(`Corporate product-discipline route contains a decorative arrow: ${relative}`);
  if (/lucide|heroicon|font-awesome/i.test(html)) throw new Error(`Corporate product-discipline route contains a prohibited UI icon system: ${relative}`);
}

console.log(`Applied corporate product discipline to core routes and generated ${products.length} Nutraxin product pages.`);
