import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  company,
  insightCategories,
  leadership,
  navigation,
  pageMeta,
  partnerJourney,
  partnerTypes,
  productCategories,
  regulatorySections,
  servicePillars,
  sourcingPillars,
  technologyMaturity
} from "../src/content/site-content.mjs";

const root = resolve(process.cwd());
const articlesDirectory = join(root, "src", "content", "insights");
const articles = readdirSync(articlesDirectory)
  .filter((name) => name.endsWith(".json"))
  .map((name) => JSON.parse(readFileSync(join(articlesDirectory, name), "utf8")))
  .sort((a, b) => b.published.localeCompare(a.published) || a.title.localeCompare(b.title));

const publicRoutes = Object.keys(pageMeta);
const siteUrl = company.siteUrl;
const organisationId = `${siteUrl}/#organisation`;
const websiteId = `${siteUrl}/#website`;
const brandLogoSvg = "/assets/brand/novapharm-healthcare-logo.svg";
const brandLogoPng = "/assets/brand/novapharm-healthcare-logo.png";
const brandLogoWidth = 3356;
const brandLogoHeight = 420;
const maturityLabels = Object.freeze({ live: "Live", development: "In development", planned: "Planned" });

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[character]);
}

function routePath(slug = "") {
  return slug ? `/${slug}/` : "/";
}

function absoluteUrl(path = "/") {
  return new URL(path, `${siteUrl}/`).toString();
}

function write(path, content) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function brandPicture({ className = "brand-logo", width = 280, height = 35, eager = false } = {}) {
  return `<picture class="${className}"><source srcset="${brandLogoSvg}" type="image/svg+xml"><img src="${brandLogoPng}" alt="NovaPharm Healthcare" width="${width}" height="${height}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"></picture>`;
}

function articleWordCount(article) {
  const content = article.sections.flatMap((section) => [
    ...(section.paragraphs || []),
    ...(section.list || [])
  ]).join(" ");
  return (content.match(/\S+/g) || []).length;
}

function readingTime(article) {
  return Math.max(4, Math.ceil(articleWordCount(article) / 220));
}

for (const article of articles) {
  const words = articleWordCount(article);
  if (words < 900 || words > 1400) {
    throw new Error(`${article.slug} must contain 900-1400 article-body words; found ${words}.`);
  }
}

function primarySection(slug) {
  if (slug.startsWith("about/") || slug === "leadership" || slug.startsWith("leadership/")) return "about";
  if (slug.startsWith("news-insights/")) return "news-insights";
  return slug;
}

function header(slug = "") {
  const current = primarySection(slug);
  return `<a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header" data-site-header>
    <div class="container header-inner">
      <a class="brand" href="/" aria-label="NovaPharm Healthcare home">
        ${brandPicture({ eager: true })}
      </a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="primary-navigation" data-nav-toggle>
        <span class="nav-toggle-lines" aria-hidden="true"><i></i><i></i></span><span class="sr-only">Open navigation</span>
      </button>
      <nav class="site-nav" id="primary-navigation" aria-label="Primary navigation" data-site-nav>
        ${navigation.map(([label, href]) => `<a href="${href}"${current && href === routePath(current) ? ' aria-current="page"' : ""}>${esc(label)}</a>`).join("")}
        <a class="nav-portal" href="/portal/">Secure portal</a>
        <a class="btn btn-primary nav-cta" href="/account-application/">Open an account</a>
      </nav>
    </div>
  </header>`;
}

function footer() {
  return `<footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-intro">
          <a class="footer-brand" href="/" aria-label="NovaPharm Healthcare home">${brandPicture({ width: 280, height: 35 })}</a>
          <p>${esc(company.purpose)}</p>
          <a class="footer-registration" href="${company.companiesHouseUrl}">${company.legalName} · Company ${company.companyNumber}</a>
        </div>
        <div><h3>Company</h3><a href="/about/company/">Company</a><a href="/leadership/">Leadership</a><a href="/about/governance/">Governance</a><a href="/investor-information/">Investors</a><a href="/careers/">Careers</a></div>
        <div><h3>Capabilities</h3><a href="/services/">Services</a><a href="/regulatory-services/">Regulatory</a><a href="/product-portfolio/">Products</a><a href="/partner-with-us/">Partners</a><a href="/technology/">Technology</a></div>
        <div><h3>Connect</h3><a href="/news-insights/">Insights</a><a href="/contact/">Contact</a><a href="/account-application/">Open an account</a><a href="/portal/">Secure portal</a><a href="/feed.xml">Insights feed</a></div>
      </div>
      <div class="footer-notices">
        <p>${esc(company.regulatoryNotice)}</p>
        <p>${esc(company.medicalDisclaimer)}</p>
      </div>
      <div class="footer-bottom"><span>© <span data-year></span> NovaPharm Healthcare Ltd.</span><span>Registered in England and Wales · ${company.companyNumber}</span></div>
    </div>
  </footer>`;
}

function organisationSchema() {
  return {
    "@context": "https://schema.org",
    "@id": organisationId,
    "@type": ["Organization", "Corporation"],
    name: company.name,
    legalName: company.legalName,
    url: siteUrl,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl(brandLogoPng),
      contentUrl: absoluteUrl(brandLogoPng),
      width: brandLogoWidth,
      height: brandLogoHeight,
      caption: "NovaPharm Healthcare"
    },
    identifier: { "@type": "PropertyValue", propertyID: "Companies House company number", value: company.companyNumber },
    foundingDate: company.incorporated,
    foundingLocation: { "@type": "Country", name: "United Kingdom" },
    address: { "@type": "PostalAddress", addressLocality: "Feltham", addressCountry: "GB" },
    areaServed: ["United Kingdom", "International"],
    description: company.summary,
    sameAs: [company.companiesHouseUrl, "https://www.wikidata.org/wiki/Q137660644"],
    founder: { "@id": `${siteUrl}/leadership/vishal-chakravarty/#person` },
    knowsAbout: ["UK pharmaceutical distribution", "PLPI pharmaceutical sourcing", "Good Distribution Practice", "pharmaceutical quality systems", "oncology medicine supply"]
  };
}

function breadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.href)
    }))
  };
}

function pageSchemas(meta, slug, options = {}) {
  const canonical = absoluteUrl(routePath(slug));
  const schemas = [
    organisationSchema(),
    {
      "@context": "https://schema.org",
      "@id": websiteId,
      "@type": "WebSite",
      name: company.name,
      url: siteUrl,
      publisher: { "@id": organisationId },
      inLanguage: "en-GB"
    },
    {
      "@context": "https://schema.org",
      "@id": `${canonical}#webpage`,
      "@type": options.pageType || "WebPage",
      name: meta.title,
      url: canonical,
      description: meta.description,
      inLanguage: "en-GB",
      isPartOf: { "@id": websiteId },
      about: { "@id": organisationId }
    },
    breadcrumbSchema(options.breadcrumbs || [
      { name: "Home", href: "/" },
      ...(slug ? [{ name: meta.eyebrow, href: routePath(slug) }] : [])
    ])
  ];
  if (options.services) {
    schemas.push(...servicePillars.map((service) => ({
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": `${siteUrl}/services/#${service.slug}`,
      name: service.title,
      description: service.approach,
      provider: { "@id": organisationId },
      audience: { "@type": "Audience", audienceType: service.audience },
      areaServed: "United Kingdom"
    })));
  }
  if (options.faqs?.length) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: options.faqs.map(([question, answer]) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer }
      }))
    });
  }
  return schemas;
}

function head(meta, slug = "", options = {}) {
  const canonical = absoluteUrl(routePath(slug));
  const usesBrandImage = !options.image;
  const image = options.image || absoluteUrl(brandLogoPng);
  const imageWidth = options.imageWidth || (usesBrandImage ? brandLogoWidth : 1672);
  const imageHeight = options.imageHeight || (usesBrandImage ? brandLogoHeight : 941);
  const imageType = options.imageType || (usesBrandImage ? "image/png" : "image/jpeg");
  const imageAlt = options.imageAlt || (usesBrandImage ? "NovaPharm Healthcare official logo" : "NovaPharm Healthcare pharmaceutical supply infrastructure");
  const twitterCard = usesBrandImage ? "summary" : "summary_large_image";
  const type = options.ogType || "website";
  const schemas = options.schemas || pageSchemas(meta, slug, options);
  return `<!DOCTYPE html>
<html lang="en-GB" data-api-base="${esc(process.env.PUBLIC_API_ORIGIN || "")}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#b81220">
  <title>${esc(meta.title)}</title>
  <meta name="description" content="${esc(meta.description)}">
  <meta name="robots" content="${options.robots || "index, follow, max-snippet:-1, max-image-preview:large"}">
  <meta name="author" content="NovaPharm Healthcare Ltd">
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" type="application/rss+xml" title="NovaPharm Healthcare Insights" href="${siteUrl}/feed.xml">
  <link rel="icon" href="${brandLogoSvg}" type="image/svg+xml">
  <link rel="manifest" href="/manifest.webmanifest">
  ${options.preloadHero ? '<link rel="preload" as="image" href="/assets/novapharm-healthcare-hero.jpg" fetchpriority="high">' : ""}
  <link rel="stylesheet" href="/assets/css/novapharm.css">
  <meta property="og:type" content="${type}">
  <meta property="og:site_name" content="NovaPharm Healthcare">
  <meta property="og:locale" content="en_GB">
  <meta property="og:url" content="${canonical}">
  <meta property="og:title" content="${esc(meta.title)}">
  <meta property="og:description" content="${esc(meta.description)}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:type" content="${imageType}">
  <meta property="og:image:width" content="${imageWidth}">
  <meta property="og:image:height" content="${imageHeight}">
  <meta property="og:image:alt" content="${esc(imageAlt)}">
  <meta name="twitter:card" content="${twitterCard}">
  <meta name="twitter:title" content="${esc(meta.title)}">
  <meta name="twitter:description" content="${esc(meta.description)}">
  <meta name="twitter:image" content="${image}">
  ${schemas.map((schema) => `<script type="application/ld+json">${JSON.stringify(schema)}</script>`).join("\n  ")}
</head>`;
}

function documentShell({ meta, slug = "", body, options = {} }) {
  return `${head(meta, slug, options)}
<body>
${header(slug)}
<main id="main">${body}</main>
${footer()}
<script src="/assets/js/api-client.js" defer></script>
<script src="/assets/js/novapharm.js" defer></script>
${(options.scripts || []).map((src) => `<script src="${src}" defer></script>`).join("\n")}
</body>
</html>`;
}

function breadcrumb(items) {
  return `<nav class="breadcrumb" aria-label="Breadcrumb">${items.map((item, index) => item.href ? `<a href="${item.href}">${esc(item.name)}</a>${index < items.length - 1 ? "<span>/</span>" : ""}` : `<span>${esc(item.name)}</span>`).join("")}</nav>`;
}

function pageHero(meta, title, intro, slug, options = {}) {
  return `<section class="page-hero${options.dark ? " page-hero-dark" : ""}">
    <div class="container">
      ${breadcrumb([{ name: "Home", href: "/" }, ...(options.parent ? [options.parent] : []), { name: meta.eyebrow }])}
      <span class="eyebrow">${esc(meta.eyebrow)}</span>
      <h1>${esc(title)}</h1>
      <p>${esc(intro)}</p>
      ${options.actions ? `<div class="hero-actions">${options.actions}</div>` : ""}
    </div>
  </section>`;
}

function sectionHeading(kicker, title, text = "") {
  return `<div class="section-head"><span class="section-kicker">${esc(kicker)}</span><h2>${esc(title)}</h2>${text ? `<p>${esc(text)}</p>` : ""}</div>`;
}

function regulatoryNotice() {
  return `<aside class="regulatory-notice" aria-label="Regulatory status"><strong>Regulatory status</strong><p>${esc(company.regulatoryNotice)}</p></aside>`;
}

function finalCta(title = "Build the next pharmaceutical partnership with NovaPharm.") {
  return `<section class="section final-cta"><div class="container final-cta-inner"><div><span class="section-kicker">Start a qualified conversation</span><h2>${esc(title)}</h2></div><div class="hero-actions"><a class="btn btn-primary" href="/contact/">Discuss a partnership</a><a class="btn btn-outline" href="/account-application/">Open an account</a></div></div></section>`;
}

function leaderVisual(profile, eager = false) {
  return profile.image
    ? `<img src="${profile.image}" alt="${esc(profile.imageAlt)}" width="${profile.imageWidth}" height="${profile.imageHeight}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`
    : `<div class="leader-placeholder" role="img" aria-label="Portrait pending approval for ${esc(profile.displayName)}"><span>${profile.initials}</span><small>Portrait pending approval</small></div>`;
}

function leaderCard(profile) {
  return `<a class="leader-card" href="/leadership/${profile.slug}/">
    <div class="leader-card-media">${leaderVisual(profile)}</div>
    <div class="leader-card-copy"><span>${esc(profile.governance)}</span><h3>${esc(profile.displayName)}</h3><p class="leader-role">${esc(profile.title)}</p><p>${esc(profile.summary)}</p><strong>View profile</strong></div>
  </a>`;
}

function articleCard(article, featured = false) {
  return `<article class="article-card${featured ? " article-card-featured" : ""}" data-article-card data-category="${esc(article.category)}">
    <a class="article-card-media" href="/news-insights/${article.slug}/"><img src="${article.heroImage}" alt="" width="1672" height="941" loading="lazy" decoding="async"></a>
    <div class="article-card-copy"><span class="article-category">${esc(article.category)}</span><h3><a href="/news-insights/${article.slug}/">${esc(article.title)}</a></h3><p>${esc(article.summary)}</p><div class="article-meta"><span>${esc(article.author)}</span><span>${readingTime(article)} min read</span></div></div>
  </article>`;
}

function contactForm({ formId = "contact-form", defaultType = "", compact = false } = {}) {
  const enquiryTypes = [
    "Product opportunity", "Distribution partnership", "Pharmacy or wholesaler account", "CMO/CDMO partnership",
    "Regulatory services", "Supplier enquiry", "Media", "Careers", "General enquiry"
  ];
  return `<form class="form-grid contact-form${compact ? " contact-form-compact" : ""}" data-contact-form novalidate>
    <div class="form-error-summary" data-error-summary tabindex="-1" hidden><h2>Check the information below</h2><ul></ul></div>
    <div class="honeypot" aria-hidden="true"><label for="${formId}-website">Website</label><input id="${formId}-website" name="website" tabindex="-1" autocomplete="off"></div>
    <div class="form-row"><div class="field"><label for="${formId}-name">Full name</label><input id="${formId}-name" name="name" autocomplete="name" maxlength="120" required></div><div class="field"><label for="${formId}-email">Business email</label><input id="${formId}-email" name="email" type="email" autocomplete="email" maxlength="160" required></div></div>
    <div class="form-row"><div class="field"><label for="${formId}-company">Company</label><input id="${formId}-company" name="company" autocomplete="organization" maxlength="160" required></div><div class="field"><label for="${formId}-role">Role or job title</label><input id="${formId}-role" name="role" autocomplete="organization-title" maxlength="120" required></div></div>
    <div class="form-row"><div class="field"><label for="${formId}-country">Country</label><input id="${formId}-country" name="country" autocomplete="country-name" maxlength="80" required></div><div class="field"><label for="${formId}-telephone">Telephone <span>(optional)</span></label><input id="${formId}-telephone" name="telephone" type="tel" autocomplete="tel" maxlength="40"></div></div>
    <div class="field"><label for="${formId}-type">Enquiry type</label><select id="${formId}-type" name="enquiryType" required><option value="">Select an enquiry</option>${enquiryTypes.map((type) => `<option${type === defaultType ? " selected" : ""}>${esc(type)}</option>`).join("")}</select></div>
    <div class="field"><label for="${formId}-message">Message</label><textarea id="${formId}-message" name="message" minlength="20" maxlength="2000" aria-describedby="${formId}-warning" required></textarea><p class="field-help" id="${formId}-warning">Do not include patient-identifiable information, adverse-event reports or urgent medical information. Use established safety-reporting channels.</p></div>
    <label class="checkbox"><input type="checkbox" name="consent" value="yes" required><span>I agree that NovaPharm may use this information to assess and respond to my business enquiry.</span></label>
    <button class="btn btn-primary" type="submit" data-submit-button>Submit enquiry</button>
    <div class="alert form-status" data-form-status role="status" aria-live="polite">Your information is transmitted to the secure NovaPharm API when the production Node service is active.</div>
  </form>`;
}

function homePage() {
  const meta = pageMeta[""];
  const body = `<section class="hero hero-flagship">
    <div class="hero-media" aria-hidden="true"><img src="/assets/novapharm-healthcare-hero.jpg" alt="" width="1672" height="941" fetchpriority="high" decoding="async"></div>
    <div class="container hero-content"><span class="eyebrow">${esc(meta.eyebrow)}</span><h1>Building a more resilient pharmaceutical supply network.</h1><p class="hero-lead">NovaPharm Healthcare brings together regulatory intelligence, diversified sourcing, quality-led distribution and digital infrastructure to improve access to oncology, specialty and licensed medicines.</p><div class="hero-actions"><a class="btn btn-primary" href="/about/">Explore NovaPharm</a><a class="btn btn-ghost" href="/partner-with-us/">Partner with us</a></div><p class="hero-status">Pre-operational for regulated wholesale supply · B2B only · Subject to applicable MHRA authorisation</p></div>
  </section>
  <section class="trust-strip" aria-label="NovaPharm positioning"><div class="container trust-strip-inner">${["UK pharmaceutical company", "Compliance-first model", "B2B healthcare partnerships", "Quality-led sourcing", "Technology-enabled infrastructure"].map((item) => `<span>${item}</span>`).join("")}</div></section>
  <section class="section sourcing-section"><div class="container">${sectionHeading("Three-pillar sourcing", "Three routes. One governed supply strategy.", "The proposed model is designed to diversify regulatory, geographic and supplier dependencies without lowering the evidence required for each product.")}<div class="sourcing-map">${sourcingPillars.map((pillar) => `<article><span class="sourcing-number">${pillar.number}</span><span class="status-label">${pillar.status}</span><h3>${pillar.title}</h3><p>${pillar.text}</p></article>`).join("")}<div class="sourcing-outcome"><strong>Portfolio outcome</strong><span>Resilience</span><span>Quality</span><span>Availability</span><span>Cost discipline</span></div></div></div></section>
  <section class="section section-dark focus-section"><div class="container focus-grid"><div>${sectionHeading("Oncology & specialty focus", "Specialised categories require specialised operating discipline.", "NovaPharm's planned portfolio prioritises categories where sourcing, demand, storage, documentation and continuity need closer attention.")}<a class="text-link-light" href="/product-portfolio/">Explore the strategic portfolio</a></div><div class="focus-list">${["Oral oncology formulations", "Liquid oncology formulations", "Specialty and hard-to-source medicines", "Selected licensed generics", "Controlled-temperature capability where applicable"].map((item) => `<span>${item}</span>`).join("")}</div></div></section>
  <section class="section regulatory-foundation"><div class="container two-column-story"><div>${sectionHeading("Regulatory foundation", "No regulated supply before the required permissions.", "The roadmap connects authorisation, quality systems and product-specific responsibilities before commercial release.")} ${regulatoryNotice()}</div><ol class="numbered-principles">${["WDA(H) application readiness", "Product-specific PLPI assessment", "QMS and SOP governance", "GDP and vendor oversight", "Pharmacovigilance and recall readiness", "Batch and document integrity"].map((item, index) => `<li><span>${String(index + 1).padStart(2, "0")}</span>${item}</li>`).join("")}</ol></div></section>
  <section class="section logistics-story"><div class="container editorial-split"><div class="editorial-index">01 / Operations</div><div><span class="section-kicker">Logistics & distribution</span><h2>A capital-efficient third-party model, governed as an outsourced pharmaceutical activity.</h2><p>NovaPharm plans to integrate with Polar Speed/Marken for pharmaceutical storage, transport and delivery services. The relationship, scope, locations, performance commitments and system interfaces remain subject to final contract, authorisation and onboarding.</p><a class="btn btn-outline" href="/services/#logistics">Explore logistics operations</a></div></div></section>
  <section class="section section-band"><div class="container">${sectionHeading("Technology maturity", "Tell people what is live, what is being built and what remains planned.", "NovaPharm's digital architecture separates working foundations from development and roadmap claims.")}<div class="maturity-preview">${Object.entries(technologyMaturity).map(([stage, items]) => `<div><span class="maturity-label maturity-${stage}">${maturityLabels[stage]}</span><h3>${items[0][0]}</h3><p>${items[0][1]}</p></div>`).join("")}</div><a class="text-link" href="/technology/">Review the full technology maturity model</a></div></section>
  <section class="section"><div class="container">${sectionHeading("Partner ecosystem", "Designed for qualified pharmaceutical collaboration.", "NovaPharm is preparing a controlled pathway for product owners, manufacturers, authorised suppliers, buyers, logistics providers and technology partners.")}<div class="partner-type-grid">${partnerTypes.slice(0, 8).map((type) => `<span>${type}</span>`).join("")}</div><div class="hero-actions"><a class="btn btn-primary" href="/partner-with-us/">Explore partnerships</a><a class="btn btn-outline" href="/contact/">Submit an opportunity</a></div></div></section>
  <section class="section section-band"><div class="container">${sectionHeading("Featured insights", "Original analysis for regulated pharmaceutical operators.", "Educational perspectives on regulation, quality, supply and technology, written in British English and reviewed against NovaPharm's claims guardrails.")}<div class="article-grid">${articles.slice(0, 3).map((article, index) => articleCard(article, index === 0)).join("")}</div><a class="text-link" href="/news-insights/">View all insights</a></div></section>
  ${finalCta()}`;
  return documentShell({ meta, body, options: { preloadHero: true } });
}

function aboutPage() {
  const meta = pageMeta.about;
  const body = `${pageHero(meta, "A pharmaceutical company designed around evidence, optionality and accountable growth.", "NovaPharm exists to connect qualified supply, regulatory intelligence, quality governance and useful technology around the needs of UK B2B healthcare.", "about")}
  <section class="section"><div class="container editorial-split"><div class="editorial-index">Why NovaPharm</div><div><h2>The supply problem is operational, not only commercial.</h2><p>Specialty pharmaceutical supply can become fragmented across product rights, regulatory pathways, supplier evidence, warehouse systems and customer processes. NovaPharm's model is designed to make those dependencies visible and govern them together.</p><p>The company is preparing a three-pillar sourcing strategy, a capital-efficient third-party logistics model and a digital B2B operating platform. Those capabilities remain staged: strategy, preparation and roadmap are not presented as licences, inventory or achieved NHS supply.</p></div></div></section>
  <section class="section section-band"><div class="container">${sectionHeading("Operating principles", "What must remain true as NovaPharm develops.")}<div class="principle-grid">${[["01", "Compliance before revenue"], ["02", "Evidence before claims"], ["03", "Quality across every partner"], ["04", "One source of operational truth"], ["05", "Human accountability for technology"], ["06", "Transparent capability maturity"]].map(([n, text]) => `<article><span>${n}</span><h3>${text}</h3></article>`).join("")}</div></div></section>
  <section class="section"><div class="container">${sectionHeading("Company structure", "Explore the organisation behind the strategy.")}<div class="link-panels"><a href="/about/company/"><span>Company</span><strong>Business model, facts and status</strong></a><a href="/leadership/"><span>Leadership</span><strong>Directors and specialist adviser</strong></a><a href="/about/governance/"><span>Governance</span><strong>Accountability and claims discipline</strong></a></div></div></section>
  ${finalCta("Discuss a pharmaceutical opportunity with an evidence-led team.")}`;
  return documentShell({ meta, slug: "about", body });
}

function companyPage() {
  const slug = "about/company";
  const meta = pageMeta[slug];
  const body = `${pageHero(meta, "A UK B2B pharmaceutical business in regulated preparation.", company.summary, slug, { parent: { name: "About", href: "/about/" } })}
  <section class="section"><div class="container facts-layout"><dl class="company-facts"><div><dt>Legal name</dt><dd>${company.legalName}</dd></div><div><dt>Company number</dt><dd>${company.companyNumber}</dd></div><div><dt>Status</dt><dd>${company.status}</dd></div><div><dt>Incorporated</dt><dd>15 September 2025</dd></div><div><dt>Registered location</dt><dd>${company.location}</dd></div><div><dt>Market</dt><dd>United Kingdom, with planned international development</dd></div></dl><div><h2>Business model</h2><p>NovaPharm is preparing pharmaceutical trading, licensing and wholesale distribution capabilities supported by a three-pillar sourcing model, outsourced pharmaceutical logistics, quality governance and a digital B2B platform.</p>${regulatoryNotice()}<a class="text-link" href="${company.companiesHouseUrl}">View the official company record</a></div></div></section>
  <section class="section section-band"><div class="container">${sectionHeading("Sourcing model", "Diversified by design, qualified product by product.")}<div class="grid grid-3">${sourcingPillars.map((pillar) => `<article class="card"><span class="status-label">${pillar.status}</span><h3>${pillar.title}</h3><p>${pillar.text}</p></article>`).join("")}</div></div></section>
  ${finalCta()}`;
  return documentShell({ meta, slug, body });
}

function governancePage() {
  const slug = "about/governance";
  const meta = pageMeta[slug];
  const directors = leadership.filter((profile) => profile.governance.includes("director") || profile.governance.includes("Founder"));
  const body = `${pageHero(meta, "Accountability for a company preparing to operate in a regulated market.", "NovaPharm separates statutory governance, proposed executive responsibilities and specialist advisory support so that public titles do not imply unverified appointments.", slug, { parent: { name: "About", href: "/about/" } })}
  <section class="section"><div class="container">${sectionHeading("Statutory board", "Four active directors are recorded at Companies House.", "Executive responsibilities are described from the March 2026 business plan and remain subject to current board confirmation.")}<div class="governance-list">${directors.map((profile) => `<a href="/leadership/${profile.slug}/"><strong>${profile.displayName}</strong><span>${profile.title}</span><small>${profile.governance}</small></a>`).join("")}</div><p class="source-note">Source: Companies House officer record, checked 11 July 2026. Companies House notes that filed information is not independently verified by the service.</p></div></section>
  <section class="section section-band"><div class="container two-column-story"><div>${sectionHeading("Claims governance", "A planned capability is not a current authorisation.")}<p>Public copy, product records and structured data use status language for regulatory preparation, partner development and technology roadmap items.</p></div><ul class="list-check"><li>No WDA(H) claim without official verification</li><li>No PLPI licence or available-stock claim without product evidence</li><li>No NHS supply or framework claim without confirmation</li><li>No partner-logo or scope claim without permission</li><li>No roadmap technology presented as deployed</li></ul></div></section>
  ${finalCta("Bring a governed pharmaceutical opportunity to NovaPharm.")}`;
  return documentShell({ meta, slug, body });
}

function leadershipIndexPage() {
  const slug = "leadership";
  const meta = pageMeta[slug];
  const body = `${pageHero(meta, "Leadership for scientific, regulatory and operational scrutiny.", "NovaPharm's public profiles distinguish independently verified directorships from proposed executive and specialist advisory responsibilities.", slug, { parent: { name: "About", href: "/about/" } })}
  <section class="section"><div class="container">${sectionHeading("Leadership profiles", "Directors and specialist advisory support.", "Public profiles distinguish verified statutory governance from executive and advisory responsibilities described in the company plan.")}<div class="leadership-list">${leadership.map(leaderCard).join("")}</div></div></section>
  ${finalCta("Discuss a partnership with NovaPharm leadership.")}`;
  return documentShell({ meta, slug, body });
}

function profilePage(profile) {
  const slug = `leadership/${profile.slug}`;
  const meta = {
    title: `${profile.displayName} | ${profile.title} | NovaPharm Healthcare`,
    description: `${profile.displayName} is ${profile.title} at NovaPharm Healthcare. ${profile.summary}`,
    eyebrow: profile.title
  };
  const canonical = absoluteUrl(routePath(slug));
  const personId = `${canonical}#person`;
  const person = {
    "@context": "https://schema.org",
    "@id": personId,
    "@type": "Person",
    name: profile.name,
    jobTitle: profile.schemaTitle,
    url: canonical,
    ...(profile.image ? { image: absoluteUrl(profile.image) } : {}),
    description: profile.summary,
    ...(profile.slug === "nishita-trivedi" ? { affiliation: { "@id": organisationId } } : { worksFor: { "@id": organisationId } }),
    sameAs: profile.sameAs,
    knowsAbout: profile.expertise
  };
  const schemas = pageSchemas(meta, slug, {
    pageType: "ProfilePage",
    breadcrumbs: [{ name: "Home", href: "/" }, { name: "Leadership", href: "/leadership/" }, { name: profile.displayName, href: routePath(slug) }]
  });
  schemas.push(person);
  schemas[2].mainEntity = { "@id": personId };
  const body = `<section class="profile-hero profile-hero-v3"><div class="profile-hero-media">${leaderVisual(profile, true)}</div><div class="container profile-hero-content">${breadcrumb([{ name: "Home", href: "/" }, { name: "Leadership", href: "/leadership/" }, { name: profile.displayName }])}<span class="eyebrow">${esc(profile.title)}</span><h1>${esc(profile.displayName)}</h1><p>${esc(profile.summary)}</p><span class="governance-badge">${esc(profile.governance)}</span></div></section>
  <section class="section"><div class="container profile-content-grid"><article>${sectionHeading("Executive profile", "Responsibilities grounded in NovaPharm's operating plan.")} ${profile.biography.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}${profile.companiesHouseUrl ? `<a class="text-link" href="${profile.companiesHouseUrl}">View Companies House appointment</a>` : ""}</article><aside class="profile-facts"><h2>Focus areas</h2><ul>${profile.expertise.map((item) => `<li>${esc(item)}</li>`).join("")}</ul><p>${esc(profile.governance)}</p></aside></div></section>
  ${finalCta("Discuss a qualified pharmaceutical partnership.")}`;
  return documentShell({ meta, slug, body, options: { schemas } });
}

function servicesPage() {
  const slug = "services";
  const meta = pageMeta[slug];
  const body = `${pageHero(meta, "Substantive capabilities for regulated pharmaceutical growth.", "Eight connected service pillars support manufacturers, product owners, authorised suppliers, buyers and operational partners from opportunity review through launch readiness.", slug)}
  <section class="section"><div class="container service-stack">${servicePillars.map((service, index) => `<article class="service-detail" id="${service.slug}"><div class="service-number">${String(index + 1).padStart(2, "0")}</div><div><span class="section-kicker">Who it is for</span><p>${esc(service.audience)}</p><h2>${esc(service.title)}</h2><div class="service-detail-grid"><div><h3>Problem</h3><p>${esc(service.problem)}</p></div><div><h3>NovaPharm approach</h3><p>${esc(service.approach)}</p></div><div><h3>Operational value</h3><p>${esc(service.value)}</p></div></div><p class="service-caveat"><strong>Regulatory boundary:</strong> ${esc(service.caveat)}</p><a class="text-link" href="/contact/?enquiry=${encodeURIComponent(service.cta)}">${esc(service.cta)}</a></div></article>`).join("")}</div></section>
  ${finalCta()}`;
  return documentShell({ meta, slug, body, options: { services: true } });
}

function regulatoryPage() {
  const slug = "regulatory-services";
  const meta = pageMeta[slug];
  const faqs = [
    ["Does NovaPharm currently hold a WDA(H)?", "NovaPharm does not publish a claim that it holds a WDA(H). The company is preparing its operating and quality systems and will not commence regulated wholesale supply until the required authorisation is in place."],
    ["Does NovaPharm hold PLPI product licences?", "No product-specific PLPI licence is represented as granted on this website. PLPI is a strategic pathway under regulatory preparation and each product would require the applicable MHRA approval."],
    ["Can a third-party logistics provider carry all regulatory responsibility?", "No. Outsourced providers perform agreed activities, while the pharmaceutical company must define, qualify and oversee the relationship and retain its applicable responsibilities."]
  ];
  const body = `${pageHero(meta, "Regulatory readiness before regulated activity.", "NovaPharm's regulatory model connects authorisation, QMS, GDP, vendor evidence, pharmacovigilance and product lifecycle responsibilities.", slug)}
  <section class="section"><div class="container regulatory-layout"><aside class="regulatory-index"><span>Regulatory framework</span>${regulatorySections.map(([title], index) => `<a href="#reg-${index + 1}">${String(index + 1).padStart(2, "0")} ${esc(title)}</a>`).join("")}</aside><div class="regulatory-content">${regulatoryNotice()}${regulatorySections.map(([title, text], index) => `<article id="reg-${index + 1}"><span>${String(index + 1).padStart(2, "0")}</span><h2>${esc(title)}</h2><p>${esc(text)}</p></article>`).join("")}</div></div></section>
  <section class="section section-band"><div class="container"><div class="faq">${faqs.map(([question, answer]) => `<details><summary>${esc(question)}</summary><p>${esc(answer)}</p></details>`).join("")}</div></div></section>
  ${finalCta("Speak to NovaPharm about a regulatory or quality opportunity.")}`;
  return documentShell({ meta, slug, body, options: { faqs } });
}

function productsPage() {
  const slug = "product-portfolio";
  const meta = pageMeta[slug];
  const body = `${pageHero(meta, "A strategic B2B portfolio, not a public pharmacy catalogue.", "Product categories describe NovaPharm's focus and partnership pipeline. They do not indicate marketing-authorisation ownership, current stock, pricing or availability.", slug)}
  <section class="section"><div class="container">${regulatoryNotice()}<div class="portfolio-table" role="list">${productCategories.map(([title, status, text]) => `<article role="listitem"><span class="status-label">${esc(status)}</span><h2>${esc(title)}</h2><p>${esc(text)}</p><a href="#submit-opportunity">Submit a relevant opportunity</a></article>`).join("")}</div></div></section>
  <section class="section section-dark" id="submit-opportunity"><div class="container form-feature"><div>${sectionHeading("Product opportunity", "Bring an evidence-backed B2B opportunity.", "Dossier owners, manufacturers and authorised wholesalers can submit an initial enquiry. Do not include patient information, confidential dossiers or adverse-event reports in this form.")}<ul class="list-check list-check-light"><li>Dossier-owner enquiry</li><li>Manufacturer partnership</li><li>Wholesaler sourcing opportunity</li><li>UK distribution discussion</li></ul></div>${contactForm({ formId: "product-opportunity", defaultType: "Product opportunity", compact: true })}</div></section>
  ${finalCta()}`;
  return documentShell({ meta, slug, body });
}

function partnersPage() {
  const slug = "partner-with-us";
  const meta = pageMeta[slug];
  const body = `${pageHero(meta, "Partnerships built through qualification, not logo walls.", "NovaPharm is preparing structured routes for manufacturers, product owners, authorised suppliers, B2B buyers, logistics providers and technology partners.", slug)}
  <section class="section"><div class="container">${sectionHeading("Partner ecosystem", "Who NovaPharm is designed to work with.")}<div class="partner-type-grid partner-type-grid-large">${partnerTypes.map((type) => `<span>${esc(type)}</span>`).join("")}</div></div></section>
  <section class="section section-band"><div class="container">${sectionHeading("Partner journey", "Ten controlled stages from first conversation to ongoing review.")}<ol class="partner-journey">${partnerJourney.map((step, index) => `<li><span>${String(index + 1).padStart(2, "0")}</span><strong>${esc(step)}</strong></li>`).join("")}</ol></div></section>
  <section class="section"><div class="container cta-grid"><a href="/contact/?enquiry=Product%20opportunity"><span>Product owners</span><strong>Submit a product opportunity</strong></a><a href="/contact/?enquiry=Supplier%20enquiry"><span>Suppliers</span><strong>Become a supply partner</strong></a><a href="/contact/?enquiry=Distribution%20partnership"><span>Distribution</span><strong>Discuss UK distribution</strong></a><a href="/contact/?enquiry=CMO%2FCDMO%20partnership"><span>Manufacturing</span><strong>Discuss CMO/CDMO collaboration</strong></a><a href="/account-application/"><span>Customers</span><strong>Open a business account</strong></a></div></section>
  ${finalCta()}`;
  return documentShell({ meta, slug, body });
}

function technologyPage() {
  const slug = "technology";
  const meta = pageMeta[slug];
  const body = `${pageHero(meta, "Useful infrastructure, with maturity stated plainly.", "NovaPharm's architecture is API-first, role-based and audit-aware. Public status labels distinguish deployed foundations from active development and longer-term plans.", slug)}
  <section class="section"><div class="container maturity-model">${Object.entries(technologyMaturity).map(([stage, items]) => `<section><header><span class="maturity-label maturity-${stage}">${maturityLabels[stage]}</span><h2>${maturityLabels[stage]} capabilities</h2></header><div>${items.map(([title, text]) => `<article><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join("")}</div></section>`).join("")}</div></section>
  <section class="section section-band"><div class="container two-column-story"><div>${sectionHeading("Security & continuity", "Identity, access and evidence are architectural requirements.")}<p>The production design uses server-side role scopes, HttpOnly secure cookies, CSRF protection, persistent session records, rate limits, audit events, private content storage and health checks. Microsoft Entra ID is the preferred production identity path.</p></div><ul class="list-check"><li>API-first integration boundaries</li><li>Customer, employee, board and admin scopes</li><li>SharePoint document metadata and version history</li><li>Source and data-freshness indicators</li><li>Business-continuity and rollback procedures</li><li>No secure documents in the public output</li></ul></div></section>
  ${finalCta("Discuss a pharmaceutical technology or integration partnership.")}`;
  return documentShell({ meta, slug, body });
}

function insightsPage() {
  const slug = "news-insights";
  const meta = pageMeta[slug];
  const body = `${pageHero(meta, "Evidence-led perspectives for regulated pharmaceutical work.", "Original NovaPharm articles distinguish established requirements, operating opinion, proposed capability and future roadmap.", slug)}
  <section class="section"><div class="container">${sectionHeading("Latest analysis", "Regulatory, quality and supply-chain perspectives.", "Browse original NovaPharm analysis written for qualified pharmaceutical and healthcare audiences.")}<div class="filter-bar" role="group" aria-label="Filter insights">${insightCategories.map((category) => `<button type="button" data-article-filter="${esc(category)}"${category === "All" ? ' aria-pressed="true"' : ' aria-pressed="false"'}>${esc(category)}</button>`).join("")}</div><p class="filter-status" data-filter-status role="status" aria-live="polite">Showing all ${articles.length} articles.</p><div class="article-grid article-grid-all">${articles.map((article, index) => articleCard(article, index === 0)).join("")}</div></div></section>`;
  return documentShell({ meta, slug, body });
}

function articlePage(article) {
  const slug = `news-insights/${article.slug}`;
  const meta = { title: article.seoTitle, description: article.seoDescription, eyebrow: article.category };
  const canonical = absoluteUrl(routePath(slug));
  const schemas = pageSchemas(meta, slug, {
    breadcrumbs: [{ name: "Home", href: "/" }, { name: "Insights", href: "/news-insights/" }, { name: article.title, href: routePath(slug) }]
  });
  schemas[2]["@type"] = "Article";
  schemas.push({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${canonical}#article`,
    headline: article.title,
    description: article.summary,
    image: absoluteUrl(article.heroImage),
    datePublished: article.published,
    dateModified: article.updated,
    author: { "@type": "Organization", name: article.author, url: siteUrl },
    publisher: { "@id": organisationId },
    mainEntityOfPage: { "@id": `${canonical}#webpage` },
    articleSection: article.category,
    keywords: article.tags.join(", "),
    inLanguage: "en-GB"
  });
  const body = `<article class="article-page"><header class="article-hero"><div class="article-hero-media"><img src="${article.heroImage}" alt="" width="1672" height="941" fetchpriority="high"></div><div class="container">${breadcrumb([{ name: "Home", href: "/" }, { name: "Insights", href: "/news-insights/" }, { name: article.title }])}<span class="eyebrow">${esc(article.category)}</span><h1>${esc(article.title)}</h1><p>${esc(article.summary)}</p><div class="article-byline"><span>${esc(article.author)}</span><time datetime="${article.published}">11 July 2026</time><span>${readingTime(article)} min read</span></div></div></header>
  <div class="container article-layout"><div class="article-body"><p class="article-disclaimer">${esc(article.disclaimer)}</p>${article.sections.map((section) => `<section><h2>${esc(section.heading)}</h2>${(section.paragraphs || []).map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}${section.list ? `<ul>${section.list.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>` : ""}</section>`).join("")}<section class="article-sources"><h2>Sources and further reading</h2>${article.references.length ? `<ul>${article.references.map((source) => `<li><a href="${source.href}">${esc(source.label)}</a></li>`).join("")}</ul>` : "<p>This perspective is based on NovaPharm's operating analysis and does not rely on unsupported market statistics.</p>"}</section></div><aside class="article-aside"><h2>Related NovaPharm pages</h2>${article.internalLinks.map((link) => `<a href="${link.href}">${esc(link.label)}</a>`).join("")}<h2>Topics</h2><div class="tag-list">${article.tags.map((tag) => `<span>${esc(tag)}</span>`).join("")}</div></aside></div></article>
  <section class="section section-band"><div class="container">${sectionHeading("Related insights", "Continue reading.")}<div class="article-grid">${article.related.map((relatedSlug) => articles.find((candidate) => candidate.slug === relatedSlug)).filter(Boolean).slice(0, 3).map((related) => articleCard(related)).join("")}</div></div></section>`;
  return documentShell({ meta, slug, body, options: { ogType: "article", schemas } });
}

function contactPage() {
  const slug = "contact";
  const meta = pageMeta[slug];
  const body = `${pageHero(meta, "Start a qualified business conversation.", "Use the secure enquiry form for product, distribution, customer account, manufacturing, regulatory, supplier, media or career discussions.", slug)}
  <section class="section"><div class="container form-feature"><div><span class="section-kicker">Corporate enquiries</span><h2>Tell us what you are working on.</h2><p>NovaPharm reviews B2B enquiries against strategic fit, regulatory status, evidence quality and next-step requirements. The form is not a patient or adverse-event reporting channel.</p><div class="contact-route-list"><span>Product and dossier opportunities</span><span>UK distribution partnerships</span><span>Pharmacy and wholesaler accounts</span><span>CMO/CDMO collaboration</span><span>Regulatory and quality services</span><span>Supplier, media and career enquiries</span></div></div>${contactForm({ formId: "contact" })}</div></section>`;
  return documentShell({ meta, slug, body, options: { pageType: "ContactPage" } });
}

function accountApplicationPage() {
  const slug = "account-application";
  const meta = {
    title: "Open a Pharmaceutical Customer Account | NovaPharm Healthcare",
    description: "Apply for a future NovaPharm Healthcare B2B customer account through a controlled company, responsible-person, GDP, credit and document onboarding workflow.",
    eyebrow: "Customer onboarding"
  };
  const body = `${pageHero(meta, "A controlled route into the future NovaPharm customer network.", "Submit company, responsible-person, address, quality, credit and licence information once. Applications are reviewed before any account, commercial terms or portal access is activated.", slug)}
  <section class="section"><h2 class="sr-only">Customer account application form</h2><div class="container onboarding-layout"><aside class="onboarding-aside"><span class="section-kicker">Application stages</span><ol class="application-progress" data-application-progress><li aria-current="step">Company</li><li>Responsible people</li><li>Compliance</li><li>Documents</li></ol><div class="regulatory-notice"><strong>Account status</strong><p>Submitting this form does not create an approved trading account, confirm product availability or permit regulated supply. Due diligence, credit review and applicable regulatory checks are required.</p></div></aside><div class="onboarding-form-shell">
    <form class="form-grid application-form" data-account-application novalidate>
      <fieldset data-application-step><legend><span>Step 1 of 4</span>Company details</legend><div class="form-row"><div class="field"><label for="legalName">Legal company name</label><input id="legalName" name="legalName" autocomplete="organization" maxlength="160" required></div><div class="field"><label for="tradingName">Trading name <span>(optional)</span></label><input id="tradingName" name="tradingName" maxlength="160"></div></div><div class="form-row"><div class="field"><label for="companyNumber">Company number</label><input id="companyNumber" name="companyNumber" maxlength="30" required></div><div class="field"><label for="vatNumber">VAT number <span>(optional)</span></label><input id="vatNumber" name="vatNumber" maxlength="30"></div></div><div class="field"><label for="customerType">Customer type</label><select id="customerType" name="customerType" required><option value="">Select</option><option value="pharmacy">Pharmacy</option><option value="hospital">Hospital</option><option value="wholesaler">Wholesaler</option><option value="clinic">Clinic</option><option value="other_healthcare">Other healthcare organisation</option></select></div><div class="application-actions"><button class="btn btn-primary" type="button" data-step-next>Continue</button></div></fieldset>
      <fieldset data-application-step hidden><legend><span>Step 2 of 4</span>Responsible person and addresses</legend><div class="form-row"><div class="field"><label for="responsiblePerson">Responsible person</label><input id="responsiblePerson" name="responsiblePerson" autocomplete="name" maxlength="120" required></div><div class="field"><label for="responsibleRole">Role</label><input id="responsibleRole" name="responsibleRole" maxlength="120" required></div></div><div class="field"><label for="responsibleEmail">Responsible person email</label><input id="responsibleEmail" name="responsibleEmail" type="email" autocomplete="email" maxlength="160" required></div><div class="field"><label for="registeredAddress">Registered address</label><textarea id="registeredAddress" name="registeredAddress" maxlength="500" required></textarea></div><div class="form-row"><div class="field"><label for="registeredPostcode">Registered postcode</label><input id="registeredPostcode" name="registeredPostcode" maxlength="20" required></div><div class="field"><label for="deliveryPostcode">Delivery postcode <span>(optional)</span></label><input id="deliveryPostcode" name="deliveryPostcode" maxlength="20"></div></div><div class="field"><label for="deliveryAddress">Delivery address <span>(if different)</span></label><textarea id="deliveryAddress" name="deliveryAddress" maxlength="500"></textarea></div><div class="application-actions"><button class="btn btn-outline" type="button" data-step-back>Back</button><button class="btn btn-primary" type="button" data-step-next>Continue</button></div></fieldset>
      <fieldset data-application-step hidden><legend><span>Step 3 of 4</span>Compliance and credit</legend><div class="form-row"><div class="field"><label for="wdaNumber">WDA(H) number <span>(if applicable)</span></label><input id="wdaNumber" name="wdaNumber" maxlength="50"></div><div class="field"><label for="gdpStatus">GDP status</label><select id="gdpStatus" name="gdpStatus" required><option value="">Select</option><option value="certified">Certified</option><option value="in_progress">In progress</option><option value="not_applicable">Not applicable</option></select></div></div><div class="field"><label for="insuranceStatus">Insurance status</label><input id="insuranceStatus" name="insuranceStatus" maxlength="200" required></div><div class="field"><label for="creditReferences">Credit references</label><textarea id="creditReferences" name="creditReferences" maxlength="1000" required></textarea></div><div class="field"><label for="tradeReferences">Trade references</label><textarea id="tradeReferences" name="tradeReferences" maxlength="1000" required></textarea></div><div class="field"><label for="email">Application contact email</label><input id="email" name="email" type="email" autocomplete="email" maxlength="160" required></div><div class="application-actions"><button class="btn btn-outline" type="button" data-step-back>Back</button><button class="btn btn-primary" type="button" data-step-next>Continue</button></div></fieldset>
      <fieldset data-application-step hidden><legend><span>Step 4 of 4</span>Documents and confirmation</legend><p class="field-help">Upload only business records needed for account due diligence. Do not upload patient information or unrelated identity documents.</p><div class="field"><label for="licenceFiles">Licences and GDP certificates</label><input id="licenceFiles" name="licenceFiles" type="file" accept=".pdf,.jpg,.jpeg,.png,.docx" multiple data-document-class="licence"></div><div class="field"><label for="companyFiles">Company registration, VAT, insurance and bank confirmation</label><input id="companyFiles" name="companyFiles" type="file" accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx" multiple data-document-class="company_due_diligence"></div><div class="field"><label for="agreementFiles">Quality agreements and signed contracts</label><input id="agreementFiles" name="agreementFiles" type="file" accept=".pdf,.docx" multiple data-document-class="agreement"></div><label class="checkbox"><input type="checkbox" name="bankConfirmation" value="yes" required><span>I confirm that bank details and supporting evidence can be made available for controlled compliance review.</span></label><div class="application-actions"><button class="btn btn-outline" type="button" data-step-back>Back</button><button class="btn btn-primary" type="submit">Submit application</button></div></fieldset>
    </form><div class="alert application-status" data-application-status role="status" aria-live="polite">Application data and approved file types are transmitted to the secure NovaPharm service.</div>
  </div></div></section>`;
  return documentShell({ meta, slug, body, options: { scripts: ["/assets/js/account-application.js"] } });
}

function investorPage() {
  const slug = "investor-information";
  const meta = pageMeta[slug];
  const body = `${pageHero(meta, "An investable thesis governed as a development plan.", "NovaPharm's strategy combines diversified sourcing, regulatory preparation, quality-led third-party logistics and a staged digital platform. Forecasts remain business-plan targets, not achieved performance.", slug)}
  <section class="section"><div class="container">${sectionHeading("Investment narrative", "Capital efficiency without compliance shortcuts.")}<div class="grid grid-3"><article class="card"><h3>Structural opportunity</h3><p>Address fragmented specialty supply through qualified manufacturing, product-specific PLPI assessment and a European buying network.</p></article><article class="card"><h3>Operating model</h3><p>Use contracted pharmaceutical logistics and governed systems rather than represent warehouse ownership or network scale prematurely.</p></article><article class="card"><h3>Technology roadmap</h3><p>Develop portal, integration, forecasting and traceability capabilities through explicit maturity gates and source-backed data.</p></article></div>${regulatoryNotice()}</div></section>
  <section class="section section-band"><div class="container editorial-split"><div class="editorial-index">Investor access</div><div><h2>Controlled business plans and investor materials belong in the secure portal.</h2><p>Financial forecasts, board packs and confidential plans are not published on the corporate website. Access is subject to authentication, role scope and document permission.</p><a class="btn btn-primary" href="/portal/">Access the secure portal</a></div></div></section>
  ${finalCta("Discuss a strategic or investment partnership.")}`;
  return documentShell({ meta, slug, body });
}

function careersPage() {
  const slug = "careers";
  const meta = pageMeta[slug];
  const roles = ["Pharmaceutical operations", "Quality and regulatory affairs", "Supply chain and sourcing", "Business development and partnerships", "Customer success", "Data, integration and platform engineering"];
  const body = `${pageHero(meta, "Build the operating discipline behind a new pharmaceutical company.", "NovaPharm's recruitment roadmap is staged with regulatory and commercial development. No role is presented as open unless formally advertised.", slug)}
  <section class="section"><div class="container two-column-story"><div>${sectionHeading("Future disciplines", "Skills the operating model is expected to require.")}<p>Expressions of interest are welcome, but they are not applications to a currently advertised vacancy unless a specific role is published.</p></div><div class="focus-list focus-list-light">${roles.map((role) => `<span>${role}</span>`).join("")}</div></div></section>
  <section class="section section-band"><div class="container final-cta-inner"><div><h2>Register a professional interest.</h2><p>Use the contact form and select Careers. Do not submit sensitive identity documents at the enquiry stage.</p></div><a class="btn btn-primary" href="/contact/?enquiry=Careers">Contact NovaPharm</a></div></section>`;
  return documentShell({ meta, slug, body });
}

function errorPage(code, title, message) {
  const meta = { title: `${code} ${title} | NovaPharm Healthcare`, description: message, eyebrow: `Error ${code}` };
  return `${head(meta, code === "404" ? "404" : "service-unavailable", { robots: "noindex,nofollow", schemas: [] })}<body class="error-page"><main id="main" class="error-shell"><a class="error-brand" href="/" aria-label="NovaPharm Healthcare home">${brandPicture({ width: 320, height: 40, eager: true })}</a><span>${code}</span><h1>${esc(title)}</h1><p>${esc(message)}</p><a class="btn btn-primary" href="/">Return to NovaPharm</a></main></body></html>`;
}

function redirectPage(title, target) {
  return `<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0; url=${target}"><link rel="canonical" href="${absoluteUrl(target)}"><meta name="robots" content="noindex,follow"><title>${esc(title)} | NovaPharm Healthcare</title></head><body><p><a href="${target}">Continue to ${esc(title)}</a></p></body></html>`;
}

function buildFeed() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>NovaPharm Healthcare Insights</title><link>${siteUrl}/news-insights/</link><description>Regulatory, quality, oncology, supply-chain and technology perspectives from NovaPharm Healthcare.</description><language>en-gb</language><atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>${articles.map((article) => `<item><title>${esc(article.title)}</title><link>${siteUrl}/news-insights/${article.slug}/</link><guid isPermaLink="true">${siteUrl}/news-insights/${article.slug}/</guid><pubDate>${new Date(`${article.published}T12:00:00Z`).toUTCString()}</pubDate><description>${esc(article.summary)}</description><category>${esc(article.category)}</category></item>`).join("")}</channel></rss>`;
}

function buildSitemap() {
  const paths = [
    ...publicRoutes.map(routePath),
    ...leadership.map((profile) => `/leadership/${profile.slug}/`),
    ...articles.map((article) => `/news-insights/${article.slug}/`),
    "/account-application/"
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${absoluteUrl(path)}</loc><lastmod>2026-07-11</lastmod><changefreq>${path.startsWith("/news-insights/") ? "monthly" : "weekly"}</changefreq><priority>${path === "/" ? "1.0" : ["/services/", "/regulatory-services/", "/product-portfolio/", "/partner-with-us/"].includes(path) ? "0.9" : "0.8"}</priority></url>`).join("")}</urlset>`;
}

export function buildPublicPages() {
  write("index.html", homePage());
  write("about/index.html", aboutPage());
  write("about/company/index.html", companyPage());
  write("about/governance/index.html", governancePage());
  write("leadership/index.html", leadershipIndexPage());
  for (const profile of leadership) write(`leadership/${profile.slug}/index.html`, profilePage(profile));
  write("services/index.html", servicesPage());
  write("regulatory-services/index.html", regulatoryPage());
  write("product-portfolio/index.html", productsPage());
  write("partner-with-us/index.html", partnersPage());
  write("technology/index.html", technologyPage());
  write("news-insights/index.html", insightsPage());
  for (const article of articles) write(`news-insights/${article.slug}/index.html`, articlePage(article));
  write("contact/index.html", contactPage());
  write("account-application/index.html", accountApplicationPage());
  write("investor-information/index.html", investorPage());
  write("careers/index.html", careersPage());
  write("404.html", errorPage("404", "Page not found", "The page may have moved, or the address may be incorrect."));
  write("500.html", errorPage("500", "Service unavailable", "NovaPharm's secure service is temporarily unavailable. Please try again later."));
  write("service-unavailable/index.html", errorPage("503", "Service temporarily unavailable", "The secure NovaPharm service is not ready to accept this request."));
  write("contact.html", redirectPage("Contact", "/contact/"));
  write("company-profile/index.html", redirectPage("Company", "/about/company/"));
  write("distributor-opportunities/index.html", redirectPage("Partners", "/partner-with-us/"));
  write("uk-international-regulatory-services/index.html", redirectPage("Services", "/services/"));
  write("solutions.html", redirectPage("Services", "/services/"));
  write("supply-chain.html", redirectPage("Partners", "/partner-with-us/"));
  write("team.html", redirectPage("Leadership", "/leadership/"));
  write("feed.xml", buildFeed());
  write("news-insights/feed.xml", buildFeed());
  write("sitemap.xml", buildSitemap());
  write("robots.txt", `User-agent: *\nAllow: /\nDisallow: /portal/\nDisallow: /employee/\nDisallow: /admin/\nDisallow: /_secure/\nDisallow: /docs/\nDisallow: /NP_\nSitemap: ${siteUrl}/sitemap.xml\n`);
  write("manifest.webmanifest", JSON.stringify({
    name: "NovaPharm Healthcare",
    short_name: "NovaPharm",
    description: company.summary,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6f7f8",
    theme_color: "#b81220",
    icons: [{ src: brandLogoSvg, sizes: "any", type: "image/svg+xml", purpose: "any" }]
  }, null, 2));
  return { publicRoutes, articles, leadership };
}
