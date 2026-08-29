import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { company, leadership } from "../src/content/site-content.mjs";
import { validateNutraxinRegister } from "../src/core/nutraxin-catalogue.mjs";

const root = resolve(process.cwd());
const siteUrl = "https://novapharmhealthcare.com";
const register = validateNutraxinRegister({ repositoryRoot: root }).register;
const products = [...register.products].sort((a, b) => a.catalogueOrder - b.catalogueOrder);
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
  if (["/capabilities/", "/services/", "/regulatory-services/", "/cro/", "/technology/"].some((prefix) => route === prefix || route.startsWith(prefix))) return "capabilities";
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
  ["Oncology", "/oncology/", "oncology"],
  ["Products", "/products/", "products"],
  ["Insights", "/news-insights/", "insights"],
  ["Contact", "/contact/", "contact"],
  ["Secure Portal", "/portal/", "portal"]
];

function header(route) {
  const current = globalSection(route);
  return `<header class="site-header npd-header" data-site-header>
    <div class="container header-inner npd-header-inner">
      <a class="brand" href="/" aria-label="NovaPharm Healthcare home">
        <picture class="brand-logo"><source srcset="/assets/brand/novapharm-healthcare-logo.svg" type="image/svg+xml"><img src="/assets/brand/novapharm-healthcare-logo.png" alt="NovaPharm Healthcare" width="2048" height="258" fetchpriority="high" decoding="async"></picture>
      </a>
      <button class="nav-toggle npd-menu" type="button" aria-expanded="false" aria-controls="primary-navigation" data-nav-toggle><span data-menu-label>Menu</span><span class="sr-only">Open navigation</span></button>
      <nav class="site-nav npd-global-nav" id="primary-navigation" aria-label="Primary navigation" data-site-nav>
        ${globalNavigation.map(([label, href, section]) => `<a href="${href}"${current === section ? ' aria-current="page"' : ""}>${label}</a>`).join("")}
      </nav>
    </div>
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
        <div><h2>Capabilities</h2><a href="/services/">Services</a><a href="/regulatory-services/">Regulatory &amp; Quality</a><a href="/cro/">Clinical Research &amp; CRO</a><a href="/technology/">Technology</a></div>
        <div><h2>Products</h2><a href="/products/nutraxin/">Nutraxin</a><a href="/products/strategic-portfolio/">Strategic portfolio</a><a href="/contact/?enquiry=Product%20opportunity">Discuss an opportunity</a></div>
        <div><h2>Connect</h2><a href="/news-insights/">Insights</a><a href="/contact/">Contact</a><a href="/account-application/">Open a business account</a><a href="/portal/">Secure Portal</a><a href="/trust-centre/">Trust centre</a></div>
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
    ["Overview", "/products/"], ["Nutraxin", "/products/nutraxin/"],
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
  return `<main id="main" class="npd-main npd-home">
    ${hero({
      eyebrow: "NovaPharm Healthcare",
      title: "Medicine. Where it needs to be.",
      lead: "Qualified sourcing, regulatory readiness and controlled B2B supply-chain development for the UK pharmaceutical market.",
      actionsHtml: actions("Explore NovaPharm", "/about/", "Discuss an opportunity", "/contact/"),
      media: `<div class="npd-hero-background" aria-hidden="true"><picture><source srcset="/assets/media/home/supply-network-hero.avif" type="image/avif"><img src="/assets/media/home/supply-network-hero.jpg" alt="" width="1672" height="941" fetchpriority="high" decoding="async"></picture></div>`,
      boundary: "Conceptual supply-chain visual. No NovaPharm facility, vehicle, inventory or current distribution activity is depicted."
    })}
    <section class="npd-section npd-statement"><div class="container"><p class="npd-eyebrow">Why NovaPharm</p><h2>Pharmaceutical opportunity should move no faster than the evidence behind it.</h2><p>NovaPharm is building a B2B model that connects product rights, qualified sources, regulatory scope, quality governance and commercial judgement before release.</p></div></section>
    <section class="npd-section"><div class="container">${sectionIntro("Sourcing strategy", "Three routes. One evidence standard.", "Each route is assessed independently. None bypasses product-specific rights, quality or regulatory review.")}<ol class="npd-numbered-grid"><li><span>01</span><h3>Direct GMP partnerships</h3><p>Qualified manufacturer relationships supported by technical assessment, vendor qualification and appropriate agreements.</p></li><li><span>02</span><h3>Product-specific PLPI</h3><p>Evidence-led assessment of suitable opportunities, subject to the applicable MHRA route and continuing obligations.</p></li><li><span>03</span><h3>European sourcing</h3><p>Diversified authorised supply routes reviewed for licence standing, quality, provenance and continuity.</p></li></ol></div></section>
    <section class="npd-section npd-section-soft"><div class="container npd-regulatory-layout"><div>${sectionIntro("Regulatory foundation", "Permission, quality and product responsibility must align before release.", "The pathway makes sequence and accountability visible without suggesting that an application or approval has already been granted.")}${notice("regulatory", "Current status", "Regulated wholesale supply has not commenced. Commercial release remains subject to applicable authorisation, product evidence and operating controls.")}</div><ol class="npd-roadmap"><li><span>01</span><strong>WDA(H) application readiness</strong></li><li><span>02</span><strong>Product-specific PLPI assessment</strong></li><li><span>03</span><strong>QMS and SOP governance</strong></li><li><span>04</span><strong>GDP and vendor oversight</strong></li><li><span>05</span><strong>Pharmacovigilance and recall readiness</strong></li><li><span>06</span><strong>Batch and document integrity</strong></li><li><span>07</span><strong>Commercial release only after applicable authorisation</strong></li></ol></div></section>
    <section class="npd-section npd-media-section"><div class="container npd-split">${responsiveImage("/assets/media/products/oncology-vial-handling", "Controlled laboratory handling used as representative oncology context", { caption: "Representative scientific context. No NovaPharm facility or active programme is depicted." })}<div>${sectionIntro("Oncology", "Continuity begins before a product moves.", "Formulation, evidence, source, condition control and accountable hand-offs need to be considered as one system.")}${actions("Explore oncology", "/oncology/")}</div></div></section>
    <section class="npd-section npd-product-feature"><div class="container"><div class="npd-product-feature-head">${sectionIntro("Nutraxin", "Nineteen catalogue references. Presented as products, governed as evidence.", "Approved pack imagery and source-transcribed composition support qualified B2B review. Availability, price, stock and claims are not asserted.")}${actions("Review Nutraxin", "/products/nutraxin/")}</div><div class="npd-product-stage">${featured.map((product) => `<a href="/products/nutraxin/${product.slug}/">${productPicture(product)}<span>${esc(product.name)}</span><small>${esc(product.packSize)}</small></a>`).join("")}</div></div></section>
    <section class="npd-section"><div class="container">${sectionIntro("Technology", "Use the smallest system that preserves control.", "NovaPharm separates what is live, what is in development and what remains planned.")}<div class="npd-maturity"><div><span>Live</span><h3>Public corporate platform</h3><p>Approved public information, entity records and governed publication controls.</p></div><div><span>In development</span><h3>Managed workflows</h3><p>Secure account, document and role-based services requiring production authority.</p></div><div><span>Planned</span><h3>Data-assisted operations</h3><p>Future forecasting and traceability capabilities subject to governed data and validation.</p></div></div>${actions("Review technology", "/technology/")}</div></section>
    <section class="npd-section npd-section-soft"><div class="container npd-partner-editorial"><div>${sectionIntro("Qualified collaboration", "Different organisations. One disciplined route into partnership.", "NovaPharm is designed for evidence-led conversations with organisations that can establish their role, authority and intended scope.")}${actions("Explore partnerships", "/partner-with-us/")}</div><ul><li>GMP manufacturers and CMO/CDMOs</li><li>Product and dossier owners</li><li>Marketing-authorisation holders</li><li>Authorised pharmaceutical wholesalers</li><li>Pharmacies and hospital procurement teams</li><li>Quality, regulatory, logistics and technology specialists</li></ul></div></section>
    <section class="npd-section npd-final"><div class="container"><p class="npd-eyebrow">Qualified conversations</p><h2>Bring the opportunity. We will start with the evidence.</h2>${actions("Contact NovaPharm", "/contact/", "Open a business account", "/account-application/")}<p class="npd-disclosure">B2B only. A conversation, enquiry or application does not confirm approval, availability or permission to supply.</p></div></section>
  </main>`;
}

function aboutMain() {
  return `<main id="main" class="npd-main">${hero({ route: "/about/", family: "company", eyebrow: "Company", title: "Built for decisions that must withstand scrutiny.", lead: "NovaPharm Healthcare is an active UK company developing a compliance-first B2B pharmaceutical model around sourcing, quality, regulatory readiness and controlled technology.", actionsHtml: actions("Meet the leadership", "/leadership/", "Review governance", "/about/governance/") })}
  <section class="npd-section"><div class="container npd-split"><div>${sectionIntro("Our purpose", "Connect opportunity to the evidence required to act.", "NovaPharm exists to make sourcing, regulatory, quality and commercial dependencies visible before a product or partnership progresses.")}<dl class="npd-facts"><div><dt>Legal entity</dt><dd>NOVAPHARM HEALTHCARE LTD</dd></div><div><dt>Company number</dt><dd>16716501</dd></div><div><dt>Location</dt><dd>Feltham, England</dd></div><div><dt>Current status</dt><dd>Active company; regulated wholesale supply not commenced</dd></div></dl></div>${responsiveImage("/assets/media/modules/about-operating-model", "Professional reviewing controlled pharmaceutical operating information", { caption: "Representative business context; no current regulated operation is implied." })}</div></section>
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
  return `<main id="main" class="npd-main">${hero({ route: "/oncology/", eyebrow: "Oncology", title: "Continuity is designed before supply begins.", lead: "NovaPharm's oncology model connects formulation, evidence, qualified sourcing, condition control and UK market-readiness decisions without asserting current product availability or clinical authority.", actionsHtml: actions("Discuss an oncology opportunity", "/contact/?enquiry=Oncology%20%26%20specialist%20medicines") })}
  <section class="npd-section"><div class="container npd-statement"><p class="npd-eyebrow">The operating question</p><h2>Can the evidence, product and accountable parties remain aligned through every hand-off?</h2><p>A positive commercial signal is not enough. Product rights, formulation, source, quality, permissions, handling and release responsibilities must be read together.</p></div></section>
  <section class="npd-section npd-section-soft"><div class="container">${sectionIntro("Readiness", "Five dependencies that should be visible early.")}<ol class="npd-service-ledger"><li><span>01</span><h2>Product and rights</h2><p>Establish the product identity, rights position and intended role.</p></li><li><span>02</span><h2>Formulation and evidence</h2><p>Identify technical, stability, manufacturing and documentation dependencies.</p></li><li><span>03</span><h2>Qualified source</h2><p>Assess the accountable manufacturer or authorised supply route.</p></li><li><span>04</span><h2>Condition control</h2><p>Connect requirements to packaging, lane, monitoring and exception review.</p></li><li><span>05</span><h2>UK pathway</h2><p>Make applicable regulatory, quality and market-entry decisions explicit.</p></li></ol></div></section>
  <section class="npd-section npd-media-section"><div class="container npd-split">${responsiveImage("/assets/media/products/oncology-vial-handling", "Controlled vial handling in a laboratory setting", { caption: "Representative scientific context; it does not depict a NovaPharm facility, product or active programme." })}<div>${sectionIntro("Controlled handling", "A temperature range alone is not a control system.", "Where condition sensitivity applies, product requirements must connect to packaging, qualification, monitoring, custody, exception review and release responsibility.")}</div></div></section>
  <section class="npd-section"><div class="container">${sectionIntro("Development to access", "Preserve context through each accountable hand-off.")}<ol class="npd-horizontal-steps"><li><span>01</span><strong>Programme evidence</strong></li><li><span>02</span><strong>Product readiness</strong></li><li><span>03</span><strong>Qualified source</strong></li><li><span>04</span><strong>Regulatory path</strong></li><li><span>05</span><strong>Controlled release</strong></li></ol>${notice("regulatory", "Oncology boundary", "NovaPharm does not provide medical advice, direct patient services or a guarantee of product authorisation, programme outcome or availability.")}</div></section>
  <section class="npd-section npd-section-soft"><div class="container npd-partner-editorial"><div>${sectionIntro("Qualified collaboration", "Bring evidence, authority and a defined role.", "A first conversation is an opportunity review, not qualification, approval or a commitment to supply.")}${actions("Start an oncology conversation", "/contact/?enquiry=Oncology%20%26%20specialist%20medicines")}</div><ul><li>Product and dossier owners</li><li>Qualified manufacturers and CMO/CDMOs</li><li>Authorised supply partners</li><li>Specialist quality and regulatory providers</li></ul></div></section></main>`;
}

function productsMain() {
  return `<main id="main" class="npd-main">${hero({ route: "/products/", family: "products", eyebrow: "Products", title: "Two portfolios. Two different decisions.", lead: "Nutraxin is presented as a verified catalogue-reference experience. The strategic pharmaceutical portfolio describes non-commerce opportunity priorities. Neither is a statement of current stock or permission to supply." })}
  <section class="npd-section npd-product-feature" id="food-supplement-portfolio-review" data-portfolio-priority="first"><div class="container npd-products-lead"><div>${sectionIntro("Nutraxin UK catalogue reference", "Food Supplement Portfolio Review", "Nineteen owner-supplied catalogue records are available for qualified B2B review with approved pack imagery and source-transcribed composition. Availability, price, stock, claims and regulatory acceptance are not asserted.")}<dl class="npd-inline-facts"><div><dt>References</dt><dd>19</dd></div><div><dt>Classification</dt><dd>Food supplements</dd></div><div><dt>Last reviewed</dt><dd>22 August 2026</dd></div></dl>${actions("Review the food supplement portfolio", "/products/nutraxin/", "Discuss a distribution opportunity", "/contact/?enquiry=Product%20opportunity")}</div>${productPicture(products[0], true, "(max-width: 720px) 84vw, 420px")}</div></section>
  <section class="npd-section"><div class="container npd-split"><div>${sectionIntro("Strategic pharmaceutical portfolio", "Opportunity priorities, not a public product catalogue.", "Selected oncology, specialty, oral-liquid, generics and hard-to-source categories are assessed product by product. Rights, source, evidence, regulatory route, quality and commercial viability must be established separately.")}${actions("Review the strategic portfolio", "/products/strategic-portfolio/")}</div>${responsiveImage("/assets/media/modules/product-portfolio-evidence", "Team reviewing pharmaceutical portfolio evidence", { caption: "Representative portfolio-review context; no availability or facility ownership is implied." })}</div></section>
  <section class="npd-section npd-section-soft"><div class="container">${sectionIntro("Product governance", "Visibility is not release.", "Every substantive product statement remains subject to the Claims Registry and its underlying evidence.")}<ol class="npd-horizontal-steps"><li><span>01</span><strong>Identity</strong></li><li><span>02</span><strong>Rights</strong></li><li><span>03</span><strong>Source</strong></li><li><span>04</span><strong>Regulatory scope</strong></li><li><span>05</span><strong>Quality and release</strong></li></ol></div></section></main>`;
}

function nutraxinMain() {
  const ranges = [...new Set(products.map((product) => product.range))];
  return `<main id="main" class="npd-main">${hero({ route: "/products/nutraxin/", family: "products", eyebrow: "Nutraxin", title: "A catalogue designed around the product itself.", lead: "Nineteen owner-supplied food supplement references are presented for qualified B2B review. This is not a consumer shop, an availability statement or an authorised claims library." })}
  <section class="npd-section npd-section-soft npd-compact-section"><div class="container npd-catalogue-status"><div><strong>19 catalogue references</strong><span>Six product ranges</span><span>No public price or stock</span></div>${notice("regulatory", "Catalogue status", esc(register.controls.warning))}</div></section>
  <nav class="npd-range-nav" aria-label="Nutraxin ranges"><div class="container">${ranges.map((range) => `<a href="#${range.toLowerCase().replace(/[^a-z0-9]+/g, "-")}">${esc(range)}</a>`).join("")}</div></nav>
  ${ranges.map((range, rangeIndex) => { const rangeProducts = products.filter((product) => product.range === range); return `<section class="npd-section npd-catalogue-range" id="${range.toLowerCase().replace(/[^a-z0-9]+/g, "-")}"><div class="container"><header><p class="npd-eyebrow">Range ${String(rangeIndex + 1).padStart(2, "0")}</p><h2>${esc(range)}</h2><span>${rangeProducts.length} ${rangeProducts.length === 1 ? "reference" : "references"}</span></header><div class="npd-product-grid">${rangeProducts.map((product, productIndex) => `<a class="npd-product-card" href="/products/nutraxin/${product.slug}/">${productPicture(product, rangeIndex === 0 && productIndex === 0)}<div><p>${esc(product.range)}</p><h3>${esc(product.name)}</h3><span>${esc(product.packSize)}</span><strong>Review product</strong></div></a>`).join("")}</div></div></section>`; }).join("")}
  <section class="npd-section npd-final"><div class="container"><h2>A catalogue reference is the start of review, not a release decision.</h2>${actions("Discuss the Nutraxin portfolio", "/contact/?enquiry=Product%20opportunity", "Return to Products", "/products/")}<p class="npd-disclosure">Approved labelling, rights, source, regulatory classification, claims, commercial terms and availability require separate confirmation.</p></div></section></main>`;
}

function nutraxinProductMain(product) {
  const evidence = product.notes?.length ? "Composition review required" : "Catalogue transcription reviewed";
  return `<main id="main" class="npd-main npd-product-detail">${localNavigation("products", `/products/nutraxin/${product.slug}/`)}<nav class="npd-breadcrumb" aria-label="Breadcrumb"><div class="container"><a href="/products/">Products</a><a href="/products/nutraxin/">Nutraxin</a><span aria-current="page">${esc(product.name)}</span></div></nav><section class="npd-product-hero"><div class="container npd-product-hero-grid"><div class="npd-product-visual">${productPicture(product, true, "(max-width: 720px) 86vw, 520px")}</div><div class="npd-product-copy"><p class="npd-eyebrow">${esc(product.range)}</p><h1>${esc(product.name)}</h1><p class="npd-product-pack">${esc(product.packSize)}</p><dl class="npd-product-meta"><div><dt>Dosage form</dt><dd>${esc(product.dosageForm)}</dd></div><div><dt>Catalogue source</dt><dd>Nutraxin UK catalogue, page ${product.cataloguePage}</dd></div><div><dt>Evidence status</dt><dd>${evidence}</dd></div></dl>${actions("Discuss this reference", `/contact/?enquiry=Product%20opportunity&product=${encodeURIComponent(product.name)}`)}</div></div></section><section class="npd-section npd-section-soft"><div class="container npd-product-evidence"><div>${sectionIntro("Catalogue composition", "Source-transcribed product information.", "The values below reproduce the supplied catalogue record and are not a substitute for approved labelling.")}<dl class="npd-composition">${product.formulation.map((item) => `<div><dt>${esc(item.name)}</dt><dd>${esc(item.amount)}</dd></div>`).join("")}</dl></div><div>${notice("regulatory", "Important product status", "This page does not assert current UK availability, price, stock, a permitted health claim, regulatory acceptance or medicinal status.")}${product.notes?.length ? notice("warning", "Source review note", product.notes.map(esc).join(" ")) : ""}</div></div></section><section class="npd-section npd-final"><div class="container"><h2>Continue the portfolio review.</h2>${actions("All Nutraxin references", "/products/nutraxin/", "Strategic portfolio", "/products/strategic-portfolio/")}</div></section></main>`;
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
  return `<main id="main" class="npd-main">${hero({ route: "/technology/", family: "capabilities", eyebrow: "Technology", title: "Control first. Automation only where it earns trust.", lead: "NovaPharm uses technology to preserve approved information, authority, decision history and secure workflow boundaries. Capability maturity is stated plainly.", actionsHtml: actions("Review the Trust Centre", "/trust-centre/") })}<section class="npd-section"><div class="container">${sectionIntro("Maturity", "One source of truth for what exists today.")}<div class="npd-maturity npd-maturity-full"><div><span>Live</span><h2>Public company platform</h2><p>Responsive corporate publication, structured entity information, public evidence and release controls.</p></div><div><span>Repository complete</span><h2>Managed application architecture</h2><p>Corporate, API, portal, status and supporting infrastructure code subject to environment activation and exact-SHA acceptance.</p></div><div><span>External verification pending</span><h2>Production identity and data services</h2><p>Entra, SQL, Blob, email, malware scanning and protected operational authority require production evidence.</p></div><div><span>Planned</span><h2>Forecasting and advanced traceability</h2><p>Future capabilities require governed source data, validation, monitoring and accountable human ownership.</p></div></div></div></section><section class="npd-section npd-section-soft"><div class="container npd-split"><div>${sectionIntro("Evidence architecture", "Records should explain what happened, who was authorised and which version supported the decision.", "Public content remains separate from protected customer, product, document and operational data.")}${notice("information", "No faux dashboard", "The public website does not display synthetic operational metrics as though they were production data.")}</div>${responsiveImage("/assets/media/stories/technology-control-architecture", "Professional reviewing controlled pharmaceutical technology records", { caption: "Representative technology context; no live customer or operational data is shown." })}</div></section></main>`;
}

function insightsMain() {
  const [lead, ...rest] = articles;
  const secondary = rest.slice(0, 3);
  const remaining = rest.slice(3);
  return `<main id="main" class="npd-main">${hero({ route: "/news-insights/", eyebrow: "Insights", title: "Regulated-market thinking, written to be challenged.", lead: "Original NovaPharm analysis distinguishes evidence, professional interpretation and future intention. It is corporate B2B information, not medical advice.", compact: true })}<section class="npd-section"><div class="container"><article class="npd-insight-lead"><p>${esc(lead.category)}</p><h2><a href="/news-insights/${lead.slug}/">${esc(lead.title)}</a></h2><p>${esc(lead.summary)}</p><span>${esc(lead.author)} · ${esc(lead.published)}</span></article><div class="npd-insight-secondary">${secondary.map((article) => `<article><p>${esc(article.category)}</p><h2><a href="/news-insights/${article.slug}/">${esc(article.title)}</a></h2><p>${esc(article.summary)}</p></article>`).join("")}</div>${remaining.length ? `<div class="npd-insight-list">${remaining.map((article) => `<a href="/news-insights/${article.slug}/"><span>${esc(article.category)}</span><strong>${esc(article.title)}</strong><time datetime="${esc(article.published)}">${esc(article.published)}</time></a>`).join("")}</div>` : ""}</div></section></main>`;
}

function contactMain(existingHtml) {
  const managedForm = existingHtml.match(/<form class="form-grid contact-form[\s\S]*?<\/form>/)?.[0] || "";
  const control = managedForm || `${notice("information", "Managed enquiry required", "This public information release does not collect or transmit enquiry details. The production enquiry workflow will be enabled only when authoritative server persistence, delivery, privacy and monitoring evidence are available.")}${verifiedEmailFallback({ subject: "NovaPharm business enquiry", label: "Email NovaPharm", context: "For a non-confidential qualified business enquiry, you can contact NovaPharm directly at vishal@novapharmhealthcare.com." })}`;
  return `<main id="main" class="npd-main">${hero({ route: "/contact/", eyebrow: "Contact", title: "Start with the reason for the conversation.", lead: "Choose the closest business topic. NovaPharm uses the shortest relevant route and does not invite patient information, adverse-event reports or confidential dossiers through a public form." })}<section class="npd-section"><div class="container npd-contact-layout"><div>${sectionIntro("Enquiry topics", "A qualified B2B contact route.")}<ul class="npd-topic-list"><li>Product or dossier opportunity</li><li>Distribution partnership</li><li>Clinical development and CRO support</li><li>Oncology and specialist medicines</li><li>CMO or CDMO collaboration</li><li>Regulatory and quality services</li><li>Business account</li><li>Supplier, media or careers</li></ul>${notice("warning", "Not a medical or safety channel", "Do not submit patient-identifiable information, adverse-event reports or urgent medical information. Use the MHRA Yellow Card service for suspected side effects; call 999 in an emergency or NHS 111 for urgent advice.")}</div><div class="npd-managed-control">${control}</div></div></section></main>`;
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
  html = html.replace(/<header class="site-header"[\s\S]*?<\/header>/, header(route));
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
  }
  html = replaceMain(html, main);
  html = replaceChrome(html, route);
  if (metadata) html = setMetadata(html, { route, ...metadata });
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
  title: "Products | NovaPharm Healthcare",
  description: "Review NovaPharm's Nutraxin food supplement catalogue reference and non-commerce strategic pharmaceutical opportunity portfolio."
}, productsTemplate);
materialize("products/nutraxin/index.html", "/products/nutraxin/", nutraxinMain(), {
  title: "Nutraxin Food Supplement Catalogue | NovaPharm Healthcare",
  description: "Review 19 owner-supplied Nutraxin catalogue references with approved pack imagery and source-transcribed composition details for qualified B2B evaluation."
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
  "contact/index.html", "account-application/index.html"
]) {
  const html = read(relative);
  if (/<svg\b/i.test(html)) throw new Error(`Corporate product-discipline route contains an inline SVG illustration: ${relative}`);
  if (/→|&rarr;|&#8594;/i.test(html)) throw new Error(`Corporate product-discipline route contains a decorative arrow: ${relative}`);
  if (/lucide|heroicon|font-awesome/i.test(html)) throw new Error(`Corporate product-discipline route contains a prohibited UI icon system: ${relative}`);
}

console.log(`Applied corporate product discipline to core routes and generated ${products.length} Nutraxin product pages.`);
