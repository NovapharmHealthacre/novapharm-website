import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
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
import { croContent } from "../src/content/cro-content.mjs";
import { oncologyContent } from "../src/content/oncology-content.mjs";
import { nutraxinExpectedRangeCounts, validateNutraxinRegister } from "../src/core/nutraxin-catalogue.mjs";

const root = resolve(process.cwd());
const nutraxinCatalogue = validateNutraxinRegister({ repositoryRoot: root }).register;
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

function productCategoryMedia(category) {
  const publicBase = `/assets/media/products/${category.imageBase}`;
  const localBase = join(root, "assets", "media", "products", category.imageBase);
  const hasLicensedMedia = ["avif", "webp", "jpg"].every((extension) => existsSync(`${localBase}.${extension}`));

  if (!hasLicensedMedia) {
    return `<figure class="portfolio-media portfolio-media-pending"><img src="/assets/media/products/licensed-image-pending.svg" alt="" width="1600" height="900" loading="lazy" decoding="async"><figcaption>Licensed category photography is undergoing final asset validation.</figcaption></figure>`;
  }

  return `<figure class="portfolio-media"><picture><source srcset="${publicBase}.avif" type="image/avif"><source srcset="${publicBase}.webp" type="image/webp"><img src="${publicBase}.jpg" alt="${esc(category.imageAlt)}" width="1600" height="900" loading="lazy" decoding="async"></picture><figcaption>Representative licensed stock image; not a NovaPharm-owned facility or product.</figcaption></figure>`;
}

function nutraxinProductMedia(product, eager = false) {
  const base = `/assets/media/products/nutraxin/${product.imageBase}`;
  return `<picture class="nutraxin-product-picture"><source srcset="${base}-480.avif 480w, ${base}-800.avif 800w" sizes="(max-width: 640px) 86vw, (max-width: 1040px) 44vw, 28vw" type="image/avif"><source srcset="${base}-480.webp 480w, ${base}-800.webp 800w" sizes="(max-width: 640px) 86vw, (max-width: 1040px) 44vw, 28vw" type="image/webp"><img src="${base}.png" alt="${esc(product.altText)}" width="700" height="700" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></picture>`;
}

function nutraxinProductCard(product, eager = false) {
  const evidenceStatus = product.notes?.length ? "Composition review required" : "Catalogue transcription reviewed";
  return `<article class="nutraxin-card" id="${esc(product.slug)}">
    <figure class="nutraxin-card-media">${nutraxinProductMedia(product, eager)}<figcaption>Owner-supplied catalogue pack image; availability is not asserted.</figcaption></figure>
    <div class="nutraxin-card-copy">
      <div class="nutraxin-card-meta"><span>${esc(product.range)}</span><span>${esc(product.packSize)}</span></div>
      <h3>${esc(product.name)}</h3>
      <p class="nutraxin-form">${esc(product.dosageForm)} · ${esc(product.servingText)}</p>
      <details class="nutraxin-composition"><summary>Catalogue composition</summary><dl>${product.formulation.map((item) => `<div><dt>${esc(item.name)}</dt><dd>${esc(item.amount)}</dd></div>`).join("")}</dl></details>
      <p class="nutraxin-evidence${product.notes?.length ? " nutraxin-evidence-review" : ""}">${esc(evidenceStatus)}</p>
    </div>
  </article>`;
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

function formatDate(value) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
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
  if (slug.startsWith("technology/")) return "technology";
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
        <a class="nav-search" href="/search/" data-ai-search-open>Search <kbd>Ctrl K</kbd></a>
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
        <div><h3>Capabilities</h3><a href="/services/">Services</a><a href="/regulatory-services/">Regulatory</a><a href="/cro/">Clinical Research & CRO</a><a href="/oncology/">Oncology continuity</a><a href="/product-portfolio/">Products</a><a href="/partner-with-us/">Partners</a><a href="/technology/">Technology</a></div>
        <div><h3>Connect</h3><a href="/news-insights/">Insights</a><a href="/contact/">Contact</a><a href="/account-application/">Open an account</a><a href="/portal/">Secure portal</a><a href="/feed.xml">Insights feed</a></div>
        <div><h3>Legal</h3><a href="/legal/privacy/">Privacy</a><a href="/legal/cookies/">Cookies</a><a href="/legal/terms/">Terms</a><a href="/legal/accessibility/">Accessibility</a><a href="/legal/modern-slavery/">Modern slavery</a><a href="/legal/environment-carbon/">Environment and carbon</a><button class="footer-link-button" type="button" data-cookie-settings>Cookie settings</button></div>
      </div>
      <div class="footer-notices">
        <p>${esc(company.regulatoryNotice)}</p>
        <p>${esc(company.medicalDisclaimer)}</p>
      </div>
      <div class="footer-bottom"><span>© <span data-year></span> NovaPharm Healthcare Ltd.</span><span>Registered in England and Wales · ${company.companyNumber}</span></div>
    </div>
  </footer>`;
}

function aiSearchDialog() {
  return `<dialog class="ai-search-dialog" data-ai-search-dialog aria-labelledby="ai-search-title">
    <div class="ai-search-shell">
      <header class="ai-search-header"><div><span class="section-kicker">Private, source-led retrieval</span><h2 id="ai-search-title">Search &amp; Ask NovaPharm</h2></div><button class="icon-button" type="button" data-ai-close aria-label="Close search"><span aria-hidden="true">X</span></button></header>
      <div class="ai-mode-control" role="group" aria-label="Search mode"><button type="button" data-ai-mode="search" aria-pressed="true">Search the website</button><button type="button" data-ai-mode="ask" aria-pressed="false">Ask from published evidence</button></div>
      <p class="ai-mode-help" data-ai-mode-help>Fast keyword and metadata search. No model is used.</p>
      <form class="ai-search-form" data-ai-search-form role="search"><label for="ai-search-query">Search query</label><div><input id="ai-search-query" data-ai-search-input type="search" maxlength="500" autocomplete="off" placeholder="Search NovaPharm pages and Insights" required><button class="btn btn-primary" type="submit">Search</button></div></form>
      <details class="ai-semantic-disclosure"><summary>Optional private on-device semantic retrieval</summary><div><p>This optional NovaPharm retrieval model is downloaded only after you enable it. The model and search query stay in this browser; no external AI provider is contacted. Download: <strong data-ai-model-size>a small local asset</strong>.</p><div class="ai-semantic-actions"><button class="btn btn-outline" type="button" data-ai-semantic-enable>Enable private semantic retrieval</button><button class="inline-link-button" type="button" data-ai-semantic-cancel hidden>Cancel download</button><button class="inline-link-button" type="button" data-ai-cache-clear hidden>Clear optional cache</button></div><progress data-ai-progress value="0" max="1" hidden><span>Preparing local retrieval</span></progress><p data-ai-progress-label aria-live="polite">Conventional search remains available without this download.</p></div></details>
      <div class="ai-search-status sr-only" data-ai-status role="status" aria-live="polite">Search is ready.</div>
      <div class="ai-results" data-ai-results aria-live="polite"><div class="ai-search-welcome"><h2>Published information only</h2><p>Search public NovaPharm pages and Insights, or ask for an extractive answer with exact source passages. The assistant cannot access portal records, private documents, live stock, pricing or business-plan forecasts, and it does not provide medical advice.</p></div></div>
      <footer class="ai-search-footer"><a href="/technology/ai-governance/">How responsible AI works</a><a href="/legal/privacy/#artificial-intelligence">Privacy information</a><button class="inline-link-button" type="button" data-ai-copy hidden>Copy answer and sources</button></footer>
    </div>
  </dialog>`;
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
    address: {
      "@type": "PostalAddress",
      streetAddress: company.registeredStreet,
      addressLocality: "Feltham",
      addressRegion: "England",
      postalCode: company.registeredPostcode,
      addressCountry: "GB"
    },
    areaServed: ["United Kingdom", "International"],
    description: company.summary,
    sameAs: [company.companiesHouseUrl],
    founder: { "@id": `${siteUrl}/leadership/vishal-chakravarty/#person` },
    knowsAbout: ["UK pharmaceutical distribution", "PLPI pharmaceutical sourcing", "Good Distribution Practice", "pharmaceutical quality systems", "oncology medicine supply", "clinical-development programme coordination"]
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
  const schemaMarkup = schemas.length
    ? `  ${schemas.map((schema) => `<script type="application/ld+json">${JSON.stringify(schema)}</script>`).join("\n  ")}\n`
    : "";
  const preloads = [
    options.preloadHero
      ? '<link rel="preload" as="image" href="/assets/media/home/supply-network-hero.jpg" imagesrcset="/assets/media/home/supply-network-hero-1200.jpg 1200w, /assets/media/home/supply-network-hero.jpg 1672w" imagesizes="100vw" fetchpriority="high">'
      : "",
    options.preloadCroHero
      ? '<link rel="preload" as="image" href="/assets/media/cro/cro-evidence-architecture-1600.avif" imagesrcset="/assets/media/cro/cro-evidence-architecture-640.avif 640w, /assets/media/cro/cro-evidence-architecture-960.avif 960w, /assets/media/cro/cro-evidence-architecture-1600.avif 1600w" imagesizes="100vw" type="image/avif" fetchpriority="high">'
      : "",
    options.preloadOncologyHero
      ? '<link rel="preload" as="image" href="/assets/media/products/oncology-vial-handling.avif" type="image/avif" fetchpriority="high">'
      : ""
  ].filter(Boolean);
  const preloadMarkup = preloads.length ? `  ${preloads.join("\n  ")}\n` : "";
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
${preloadMarkup}  <link rel="stylesheet" href="/assets/css/novapharm.bundle.css">
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
${schemaMarkup}</head>`;
}

function documentShell({ meta, slug = "", body, options = {} }) {
  return `${head(meta, slug, options)}
<body data-page="${slug || "home"}">
${header(slug)}
<main id="main">${body}</main>
${footer()}
${aiSearchDialog()}
<script src="/assets/js/api-client.js" defer></script>
<script src="/assets/js/novapharm.js" defer></script>
<script type="module" src="/assets/js/ai-search.js"></script>
<script type="module" src="/assets/js/cookie-consent.js"></script>
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
    <div class="page-hero-signal" aria-hidden="true"><span></span><span></span><span></span></div>
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

function responsiveEditorialImage(src, alt, { eager = false, sizes = "100vw" } = {}) {
  if (!src.endsWith(".jpg")) {
    return `<img src="${src}" alt="${esc(alt)}" width="1600" height="900" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="${eager ? "sync" : "async"}">`;
  }
  const base = src.slice(0, -4);
  return `<picture><source srcset="${base}-960.avif 960w, ${base}.avif 1600w" sizes="${sizes}" type="image/avif"><source srcset="${base}-960.webp 960w, ${base}.webp 1600w" sizes="${sizes}" type="image/webp"><img src="${src}" srcset="${base}-960.jpg 960w, ${src} 1600w" sizes="${sizes}" alt="${esc(alt)}" width="1600" height="900" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="${eager ? "sync" : "async"}"></picture>`;
}

function responsiveCroImage(base, alt, { eager = false, sizes = "100vw", className = "" } = {}) {
  const loading = eager ? 'fetchpriority="high"' : 'loading="lazy"';
  return `<picture${className ? ` class="${className}"` : ""}><source srcset="${base}-640.avif 640w, ${base}-960.avif 960w, ${base}-1600.avif 1600w" sizes="${sizes}" type="image/avif"><source srcset="${base}-640.webp 640w, ${base}-960.webp 960w, ${base}-1600.webp 1600w" sizes="${sizes}" type="image/webp"><img src="${base}-1600.jpg" srcset="${base}-640.jpg 640w, ${base}-960.jpg 960w, ${base}-1600.jpg 1600w" sizes="${sizes}" alt="${esc(alt)}" width="1600" height="900" ${loading} decoding="${eager ? "sync" : "async"}"></picture>`;
}

function responsiveProductImage(base, alt, { eager = false, className = "" } = {}) {
  const loading = eager ? 'fetchpriority="high"' : 'loading="lazy"';
  return `<picture${className ? ` class="${className}"` : ""}><source srcset="${base}.avif" type="image/avif"><source srcset="${base}.webp" type="image/webp"><img src="${base}.jpg" alt="${esc(alt)}" width="1600" height="900" ${loading} decoding="${eager ? "sync" : "async"}"></picture>`;
}

function responsiveCroPortrait(profile) {
  const portraitBaseBySlug = {
    "vishal-chakravarty": "/assets/media/cro/leadership/vishal-chakravarty",
    "girish-achliya": "/assets/media/cro/leadership/girish-achliya"
  };
  const base = portraitBaseBySlug[profile.slug];
  if (!base) return leaderVisual(profile);
  const sizes = "(max-width: 720px) 92vw, (max-width: 1080px) 44vw, 390px";
  return `<picture><source srcset="${base}-480.avif 480w, ${base}-800.avif 800w" sizes="${sizes}" type="image/avif"><source srcset="${base}-480.webp 480w, ${base}-800.webp 800w" sizes="${sizes}" type="image/webp"><img src="${base}-800.jpg" srcset="${base}-480.jpg 480w, ${base}-800.jpg 800w" sizes="${sizes}" alt="${esc(profile.imageAlt)}" width="800" height="600" loading="lazy" decoding="async"></picture>`;
}

function articleCard(article, featured = false, withMedia = true) {
  const media = withMedia ? `<a class="article-card-media" href="/news-insights/${article.slug}/" aria-label="Read ${esc(article.title)}">${responsiveEditorialImage(article.heroImage, "", { sizes: "(max-width: 760px) 100vw, 33vw" })}</a>` : "";
  return `<article class="article-card${featured ? " article-card-featured" : ""}" data-article-card data-category="${esc(article.category)}">${media}<div class="article-card-copy"><span class="article-category">${esc(article.category)}</span><h3><a href="/news-insights/${article.slug}/">${esc(article.title)}</a></h3><p>${esc(article.summary)}</p><div class="article-meta"><span>${esc(article.author)}</span><span>${readingTime(article)} min read</span></div></div>
  </article>`;
}

function mediaStory({ src, alt, kicker, title, text, reverse = false }) {
  return `<section class="section media-story${reverse ? " media-story-reverse" : ""}" data-reveal><div class="container media-story-grid"><figure class="media-story-figure"><img src="${src}" alt="${esc(alt)}" width="1200" height="675" loading="lazy" decoding="async"></figure><div class="media-story-copy"><span class="section-kicker">${esc(kicker)}</span><h2>${esc(title)}</h2><p>${esc(text)}</p></div></div></section>`;
}

function contactForm({ formId = "contact-form", defaultType = "", compact = false } = {}) {
  const enquiryTypes = [
    "Product opportunity", "Distribution partnership", "Pharmacy or wholesaler account", "CMO/CDMO partnership",
    "Regulatory services", "Clinical development & CRO support", "Oncology & specialist medicines", "Supplier enquiry", "Media", "Careers", "General enquiry"
  ];
  return `<form class="form-grid contact-form${compact ? " contact-form-compact" : ""}" data-contact-form novalidate>
    <div class="form-error-summary" data-error-summary tabindex="-1" hidden><h2>Check the information below</h2><ul></ul></div>
    <div class="honeypot" aria-hidden="true"><label for="${formId}-website">Website</label><input id="${formId}-website" name="website" tabindex="-1" autocomplete="off"></div>
    <div class="form-row"><div class="field"><label for="${formId}-name">Full name</label><input id="${formId}-name" name="name" autocomplete="name" maxlength="120" required></div><div class="field"><label for="${formId}-email">Business email</label><input id="${formId}-email" name="email" type="email" autocomplete="email" maxlength="160" required></div></div>
    <div class="form-row"><div class="field"><label for="${formId}-company">Company</label><input id="${formId}-company" name="company" autocomplete="organization" maxlength="160" required></div><div class="field"><label for="${formId}-role">Role or job title</label><input id="${formId}-role" name="role" autocomplete="organization-title" maxlength="120" required></div></div>
    <div class="form-row"><div class="field"><label for="${formId}-country">Country</label><input id="${formId}-country" name="country" autocomplete="country-name" maxlength="80" required></div><div class="field"><label for="${formId}-telephone">Telephone <span>(optional)</span></label><input id="${formId}-telephone" name="telephone" type="tel" autocomplete="tel" maxlength="40"></div></div>
    <div class="field"><label for="${formId}-type">Enquiry type</label><select id="${formId}-type" name="enquiryType" required><option value="">Select an enquiry</option>${enquiryTypes.map((type) => `<option${type === defaultType ? " selected" : ""}>${esc(type)}</option>`).join("")}</select></div>
    <div class="field"><label for="${formId}-message">Message</label><textarea id="${formId}-message" name="message" minlength="20" maxlength="2000" aria-describedby="${formId}-warning" required></textarea><p class="field-help" id="${formId}-warning">Do not include patient-identifiable information, adverse-event reports or urgent medical information. Report suspected medicine side effects through the <a href="https://yellowcard.mhra.gov.uk/">MHRA Yellow Card service</a>. For emergencies call 999; for urgent NHS advice use 111.</p></div>
    <label class="checkbox"><input type="checkbox" name="safetyConfirmation" value="yes" required><span>I confirm that this message contains no patient-identifiable information, adverse-event report or urgent medical information.</span></label>
    <label class="checkbox"><input type="checkbox" name="privacyAcknowledgement" value="yes" required><span>I have read the <a href="/legal/privacy/#business-enquiries">business-enquiry privacy information</a>. NovaPharm will use these details to assess and respond to this enquiry; this is not marketing consent.</span></label>
    <button class="btn btn-primary" type="submit" data-submit-button>Submit enquiry</button>
    <div class="alert form-status" data-form-status role="status" aria-live="polite">Your information is transmitted to the secure NovaPharm API when the production Node service is active.</div>
  </form>`;
}

function homePage() {
  const meta = pageMeta[""];
  const body = `<section class="hero hero-flagship">
    <div class="hero-media" aria-hidden="true"><picture><source media="(max-width: 760px)" srcset="/assets/media/home/supply-network-hero-1200.jpg"><img src="/assets/media/home/supply-network-hero.jpg" srcset="/assets/media/home/supply-network-hero-1200.jpg 1200w, /assets/media/home/supply-network-hero.jpg 1672w" sizes="100vw" alt="" width="1672" height="941" fetchpriority="high" decoding="async"></picture></div>
    <div class="container hero-content"><div class="hero-copy"><span class="eyebrow">${esc(meta.eyebrow)}</span><h1>Building a more resilient pharmaceutical supply network.</h1><p class="hero-lead">NovaPharm Healthcare brings together regulatory intelligence, diversified sourcing, quality-led distribution and digital infrastructure to improve access to oncology, specialty and licensed medicines.</p><div class="hero-actions"><a class="btn btn-primary" href="/about/">Explore NovaPharm</a><a class="btn btn-ghost" href="/partner-with-us/">Partner with us</a></div><p class="hero-status">Pre-operational for regulated wholesale supply · B2B only · Subject to applicable MHRA authorisation</p></div></div>
  </section>
  <section class="trust-strip" aria-label="NovaPharm positioning"><div class="container trust-strip-inner">${["UK pharmaceutical company", "Compliance-first model", "B2B healthcare partnerships", "Quality-led sourcing", "Technology-enabled infrastructure"].map((item) => `<span>${item}</span>`).join("")}</div></section>
  <section class="section sourcing-story" data-network-story><div class="container"><div class="sourcing-story-grid"><div class="sourcing-story-copy">${sectionHeading("Three-pillar sourcing", "Three routes. One governed supply strategy.", "The proposed model is designed to diversify regulatory, geographic and supplier dependencies without lowering the evidence required for each product.")}<div class="sourcing-steps">${sourcingPillars.map((pillar, index) => `<article class="sourcing-step" data-network-step="${index}"${index === 0 ? ' aria-current="step"' : ""}><div class="sourcing-step-head"><span class="sourcing-step-number">${pillar.number}</span><span class="status-label">${pillar.status}</span></div><h3>${pillar.title}</h3><p>${pillar.text}</p></article>`).join("")}</div></div><figure class="sourcing-visual" data-network-visual data-active-step="0" aria-label="Three qualified sourcing routes converging on a governed NovaPharm portfolio"><svg viewBox="0 0 720 620" aria-hidden="true"><path class="network-line" d="M74 126C264 126 282 310 526 310"/><path class="network-line network-line-active" data-route="0" d="M74 126C264 126 282 310 526 310"/><path class="network-line" d="M74 310H526"/><path class="network-line network-line-active" data-route="1" d="M74 310H526"/><path class="network-line" d="M74 494C264 494 282 310 526 310"/><path class="network-line network-line-active" data-route="2" d="M74 494C264 494 282 310 526 310"/><path class="network-line" d="M526 310H664"/><circle class="network-node" cx="74" cy="126" r="18"/><circle class="network-node" cx="74" cy="310" r="18"/><circle class="network-node" cx="74" cy="494" r="18"/><circle class="network-node network-node-core" cx="526" cy="310" r="26"/><circle class="network-node" cx="664" cy="310" r="18"/></svg><figcaption class="network-caption"><strong>Governed convergence</strong><span data-network-caption>European buying and sourcing</span></figcaption></figure></div><div class="outcome-ribbon"><strong>Portfolio outcome</strong><span>Resilience</span><span>Quality</span><span>Availability</span><span>Cost discipline</span></div></div></section>
  <section class="section section-dark focus-section" data-reveal><div class="container focus-grid"><div>${sectionHeading("Oncology & specialty focus", "Specialised categories require specialised operating discipline.", "NovaPharm's planned portfolio prioritises categories where sourcing, demand, storage, documentation and continuity need closer attention.")}<a class="text-link-light" href="/oncology/">Explore the oncology continuity model</a></div><div class="focus-list">${["Oral oncology formulation planning", "Liquid formulation evidence", "Specialty and hard-to-source categories", "Product-specific readiness", "Controlled-temperature governance where applicable"].map((item) => `<span>${item}</span>`).join("")}</div></div></section>
  <section class="section regulatory-foundation" data-reveal><div class="container two-column-story"><div>${sectionHeading("Regulatory foundation", "No regulated supply before the required permissions.", "The roadmap connects authorisation, quality systems and product-specific responsibilities before commercial release.")} ${regulatoryNotice()}</div><ol class="numbered-principles">${["WDA(H) application readiness", "Product-specific PLPI assessment", "QMS and SOP governance", "GDP and vendor oversight", "Pharmacovigilance and recall readiness", "Batch and document integrity"].map((item, index) => `<li><span>${String(index + 1).padStart(2, "0")}</span>${item}</li>`).join("")}</ol></div></section>
  <section class="visual-band" data-reveal><img src="/assets/media/editorial/quality-batch-integrity.svg" alt="Controlled packs linked through quality evidence and release checkpoints" width="1200" height="675" loading="lazy" decoding="async"><div class="visual-band-copy"><div class="container"><span class="section-kicker">Batch integrity</span><h2>Evidence should travel with every governed product and transaction.</h2></div></div></section>
  <section class="section logistics-story" data-reveal><div class="container editorial-split"><div class="editorial-index">01 / Operations</div><div><span class="section-kicker">Logistics & distribution</span><h2>A capital-efficient third-party model, governed as an outsourced pharmaceutical activity.</h2><p>NovaPharm plans to integrate with Polar Speed/Marken for pharmaceutical storage, transport and delivery services. The relationship, scope, locations, performance commitments and system interfaces remain subject to final contract, authorisation and onboarding.</p><a class="btn btn-outline" href="/services/#logistics">Explore logistics operations</a></div></div></section>
  <section class="section home-cro-bridge" data-reveal><div class="container home-cro-bridge-grid"><div><span class="section-kicker">Clinical Research & CRO Support</span><h2>Connect clinical-development decisions to the evidence and UK pathway that follow.</h2><p>NovaPharm's evidence-led model combines programme framing, responsibility mapping, UK pathway coordination and qualified specialist orchestration. It is not presented as a global full-service CRO.</p><div class="hero-actions"><a class="btn btn-primary" href="/cro/">Explore clinical-development support</a><a class="btn btn-outline" href="/contact/?enquiry=Clinical%20development%20%26%20CRO%20support">Discuss a programme</a></div></div><ol aria-label="Clinical-development evidence architecture"><li><span>01</span>Programme question</li><li><span>02</span>Responsibility map</li><li><span>03</span>Controlled evidence</li><li><span>04</span>UK pathway</li><li><span>05</span>Market continuity</li></ol></div></section>
  <section class="section section-band" data-reveal><div class="container">${sectionHeading("Technology maturity", "Tell people what is live, what is being built and what remains planned.", "NovaPharm's digital architecture separates working foundations from development and roadmap claims.")}<div class="maturity-preview">${Object.entries(technologyMaturity).map(([stage, items]) => `<div><span class="maturity-label maturity-${stage}">${maturityLabels[stage]}</span><h3>${items[0][0]}</h3><p>${items[0][1]}</p></div>`).join("")}</div><a class="text-link" href="/technology/">Review the full technology maturity model</a></div></section>
  <section class="section" data-reveal><div class="container">${sectionHeading("Partner ecosystem", "Designed for qualified pharmaceutical collaboration.", "NovaPharm is preparing a controlled pathway for product owners, manufacturers, authorised suppliers, buyers, logistics providers and technology partners.")}<div class="partner-type-grid">${partnerTypes.slice(0, 8).map((type) => `<span>${type}</span>`).join("")}</div><div class="hero-actions"><a class="btn btn-primary" href="/partner-with-us/">Explore partnerships</a><a class="btn btn-outline" href="/contact/">Submit an opportunity</a></div></div></section>
  <section class="section section-band" data-reveal><div class="container">${sectionHeading("Featured insights", "Original analysis for regulated pharmaceutical operators.", "Educational perspectives on regulation, quality, supply and technology, written in British English and reviewed against NovaPharm's claims guardrails.")}<div class="article-grid article-grid-editorial-links">${articles.slice(0, 3).map((article, index) => articleCard(article, index === 0, false)).join("")}</div><a class="text-link" href="/news-insights/">View all insights</a></div></section>
  ${finalCta()}`;
  return documentShell({ meta, body, options: { preloadHero: true } });
}

function aboutPage() {
  const meta = pageMeta.about;
  const body = `${pageHero(meta, "A pharmaceutical company designed around evidence, optionality and accountable growth.", "NovaPharm exists to connect qualified supply, regulatory intelligence, quality governance and useful technology around the needs of UK B2B healthcare.", "about")}
  <section class="section"><div class="container editorial-split"><div class="editorial-index">Why NovaPharm</div><div><h2>The supply problem is operational, not only commercial.</h2><p>Specialty pharmaceutical supply can become fragmented across product rights, regulatory pathways, supplier evidence, warehouse systems and customer processes. NovaPharm's model is designed to make those dependencies visible and govern them together.</p><p>The company is preparing a three-pillar sourcing strategy, a capital-efficient third-party logistics model and a digital B2B operating platform. Those capabilities remain staged: strategy, preparation and roadmap are not presented as licences, inventory or achieved NHS supply.</p></div></div></section>
  ${mediaStory({ src: "/assets/media/editorial/quality-batch-integrity.svg", alt: "Controlled medicine packs linked through quality evidence and release checkpoints", kicker: "Operating discipline", title: "Build the evidence trail before building the volume.", text: "NovaPharm's model connects product identity, supplier evidence, quality status, documents, orders and fulfilment events around one governed record." })}
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
  ${mediaStory({ src: "/assets/media/editorial/quality-batch-integrity.svg", alt: "Product packs connected through quality and release controls", kicker: "Connected services", title: "Commercial progress should follow an unbroken line of evidence.", text: "Each service pillar is designed to connect opportunity review, regulatory scope, partner qualification, quality controls, fulfilment and account-level evidence." })}
  <section class="section"><div class="container service-stack">${servicePillars.map((service, index) => `<article class="service-detail" id="${service.slug}"><div class="service-number">${String(index + 1).padStart(2, "0")}</div><div><span class="section-kicker">Who it is for</span><p>${esc(service.audience)}</p><h2>${esc(service.title)}</h2><div class="service-detail-grid"><div><h3>Problem</h3><p>${esc(service.problem)}</p></div><div><h3>NovaPharm approach</h3><p>${esc(service.approach)}</p></div><div><h3>Operational value</h3><p>${esc(service.value)}</p></div></div><p class="service-caveat"><strong>Regulatory boundary:</strong> ${esc(service.caveat)}</p><a class="text-link" href="/contact/?enquiry=${encodeURIComponent(service.cta)}">${esc(service.cta)}</a></div></article>`).join("")}</div></section>
  <section class="section section-dark related-capability"><div class="container editorial-split"><div class="editorial-index">Clinical development</div><div><span class="section-kicker">Connected capability</span><h2>Evidence-led CRO support for focused programmes.</h2><p>Programme framing, UK pathway coordination, specialist-provider architecture and document governance are presented with direct, partner-led and sponsor-retained responsibilities visible.</p><a class="btn btn-primary" href="/cro/">Explore Clinical Research & CRO Support</a></div></div></section>
  <section class="section related-capability"><div class="container editorial-split"><div class="editorial-index">Oncology continuity</div><div><span class="section-kicker">Specialist operating model</span><h2>Connect product evidence, qualified source, condition and release decisions.</h2><p>The oncology continuity model turns a strategic category into a controlled readiness pathway without implying current products, stock or authorisation.</p><a class="btn btn-outline" href="/oncology/">Explore Oncology continuity</a></div></div></section>
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
  ${mediaStory({ src: "/assets/media/insights/gdp-qms-foundations.svg", alt: "Layered quality documents connected to operational controls", kicker: "Regulatory architecture", title: "Permissions, procedures and evidence must agree.", text: "NovaPharm's preparation model treats authorisation, product status, quality responsibilities and outsourced activities as connected controls, not independent workstreams.", reverse: true })}
  <section class="section"><div class="container regulatory-layout"><aside class="regulatory-index"><span>Regulatory framework</span>${regulatorySections.map(([title], index) => `<a href="#reg-${index + 1}">${String(index + 1).padStart(2, "0")} ${esc(title)}</a>`).join("")}</aside><div class="regulatory-content">${regulatoryNotice()}${regulatorySections.map(([title, text], index) => `<article id="reg-${index + 1}"><span>${String(index + 1).padStart(2, "0")}</span><h2>${esc(title)}</h2><p>${esc(text)}</p></article>`).join("")}</div></div></section>
  <section class="section section-band"><div class="container"><div class="faq">${faqs.map(([question, answer]) => `<details><summary>${esc(question)}</summary><p>${esc(answer)}</p></details>`).join("")}</div></div></section>
  <section class="section related-capability"><div class="container editorial-split"><div class="editorial-index">Connected readiness</div><div><span class="section-kicker">Clinical and oncology pathways</span><h2>Coordinate authority preparation with programme, product and specialist-provider decisions.</h2><p>The CRO and oncology models preserve accountable responsibilities while connecting UK pathway planning, controlled evidence and qualified specialist delivery.</p><div class="hero-actions"><a class="btn btn-outline" href="/cro/#quality-governance">Review CRO governance</a><a class="text-link" href="/oncology/#product-readiness">Review oncology readiness</a></div></div></section>
  ${finalCta("Speak to NovaPharm about a regulatory or quality opportunity.")}`;
  return documentShell({ meta, slug, body, options: { faqs } });
}

function croPage() {
  const slug = "cro";
  const meta = pageMeta[slug];
  const enquiry = "/contact/?enquiry=Clinical%20development%20%26%20CRO%20support";
  const canonical = absoluteUrl(routePath(slug));
  const schemas = pageSchemas(meta, slug, {
    faqs: croContent.faqs,
    breadcrumbs: [{ name: "Home", href: "/" }, { name: "Clinical Research & CRO Support", href: "/cro/" }]
  });
  const serviceId = `${canonical}#service`;
  schemas[2].mainEntity = { "@id": serviceId };
  schemas.push({
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": serviceId,
    name: croContent.title,
    serviceType: "Clinical-development programme coordination and CRO support",
    description: croContent.introduction,
    provider: { "@id": organisationId },
    areaServed: [{ "@type": "Country", name: "United Kingdom" }],
    audience: croContent.audiences.map(([name]) => ({ "@type": "Audience", audienceType: name })),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Evidence-controlled clinical-development support modules",
      itemListElement: croContent.services.map((service, index) => ({
        "@type": "Offer",
        position: index + 1,
        itemOffered: { "@type": "Service", name: service.title, description: service.approach }
      }))
    }
  });

  const chiefExecutive = leadership.find((profile) => profile.slug === "vishal-chakravarty");
  const chiefScientificOfficer = leadership.find((profile) => profile.slug === "girish-achliya");
  const croLeadershipSummary = new Map([
    ["vishal-chakravarty", "Leads strategic direction, UK market entry, regulatory pathway coordination and board governance."],
    ["girish-achliya", "Supports scientific strategy, product development and technical due diligence."]
  ]);

  const body = `<section class="cro-hero" data-cro-hero>
    <div class="cro-hero-media">${responsiveCroImage("/assets/media/cro/cro-evidence-architecture", "Clinical-development team reviewing programme evidence, responsibilities and milestones", { eager: true, sizes: "100vw" })}<div class="cro-hero-scrim" aria-hidden="true"></div></div>
    <div class="container cro-hero-inner">${breadcrumb([{ name: "Home", href: "/" }, { name: "Clinical Research & CRO Support" }])}<div class="cro-hero-copy"><span class="eyebrow">Clinical Research &amp; CRO Support</span><h1>${esc(croContent.proposition)}</h1><p>${esc(croContent.introduction)}</p><div class="hero-actions"><a class="btn btn-primary" href="${enquiry}">Discuss a development programme</a><a class="btn btn-ghost" href="#delivery-model">Explore our delivery model</a></div><p class="cro-hero-caption">Conceptual programme-governance visual; not NovaPharm personnel, premises or a live clinical programme.</p></div></div>
    <div class="cro-answer-band"><div class="container"><div><span>Supports</span><strong>Emerging, specialty and international developers</strong></div><div><span>Coordinates</span><strong>UK pathway, quality and specialist interfaces</strong></div><div><span>Separates</span><strong>NovaPharm, specialist and sponsor duties</strong></div><div><span>Connects</span><strong>Development evidence to later market decisions</strong></div></div></div>
  </section>
  <section class="cro-boundary" aria-label="Clinical research service boundary"><div class="container"><strong>Scope stated plainly</strong><p>${esc(croContent.status)}</p></div></section>

  <section class="section cro-context" id="sponsor-context" data-reveal><div class="container"><div class="cro-context-grid"><div>${sectionHeading("Sponsor context", "Complexity grows at the interfaces.", "NovaPharm makes the programme question, responsibility boundaries and evidence route visible before specialist work is commissioned.")}<div class="cro-audience-list">${croContent.audiences.map(([title, text]) => `<article><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join("")}</div></div><aside class="cro-challenge-panel"><span class="section-kicker">Where programmes fracture</span><ol>${croContent.challenges.map((item, index) => `<li><span>${String(index + 1).padStart(2, "0")}</span>${esc(item)}</li>`).join("")}</ol><a class="text-link" href="${enquiry}&amp;topic=responsibility-map">Map programme responsibilities</a></aside></div></div></section>

  <section class="section section-dark cro-delivery" id="delivery-model" data-reveal><div class="container"><div class="cro-delivery-head">${sectionHeading("Transparent Delivery Architecture", "Three responsibility lanes. One visible programme.", "Delivery starts with clarity about who coordinates, who performs specialist work and what the sponsor retains.")}<p class="cro-delivery-principle">Delegation allocates activities. It does not erase sponsor oversight or applicable legal and regulatory duties.</p></div><div class="cro-responsibility-map" role="list" aria-label="Clinical-development responsibility architecture"><div class="cro-evidence-spine" aria-hidden="true"><span>Controlled programme evidence</span></div><div class="cro-lanes">${croContent.deliveryLanes.map((lane, index) => `<article role="listitem" class="cro-lane cro-lane-${lane.key}"><header><span>0${index + 1}</span><h3>${esc(lane.label)}</h3></header><p>${esc(lane.summary)}</p><ul>${lane.items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul></article>`).join("")}</div><div class="cro-shared-output"><span>Shared line of sight</span><strong>Scope</strong><strong>Decision</strong><strong>Evidence</strong><strong>Escalation</strong></div></div><a class="btn btn-primary" href="${enquiry}&amp;topic=delivery-architecture">Review the delivery architecture</a></div></section>

  <section class="section cro-navigator" id="development-lifecycle" data-cro-navigator><div class="container"><div class="cro-navigator-head">${sectionHeading("Clinical Development Navigator", "Eight stages. Responsibilities and evidence visible at every gate.", "Select a stage to orient the programme. Every stage remains available without JavaScript.")}<span class="cro-navigator-status" data-cro-stage-status aria-live="polite">Stage 1 of 8: Development strategy</span></div><nav class="cro-stage-nav" aria-label="Clinical development stages">${croContent.lifecycle.map((stage, index) => `<a href="#cro-stage-${index + 1}" data-cro-stage-link="${index + 1}"${index === 0 ? ' aria-current="step"' : ""}><span>${stage.number}</span><strong>${esc(stage.title)}</strong></a>`).join("")}</nav><ol class="cro-stage-list">${croContent.lifecycle.map((stage, index) => `<li id="cro-stage-${index + 1}" data-cro-stage="${index + 1}"><span class="cro-stage-number">${stage.number}</span><div><span class="cro-stage-mode">${esc(stage.mode)}</span><h3>${esc(stage.title)}</h3><p>${esc(stage.text)}</p></div></li>`).join("")}</ol></div></section>

  <section class="section section-band cro-services" id="service-modules" data-reveal><div class="container">${sectionHeading("Service architecture", "Commission the right work, with the right boundary.", "Eight modules connect programme need to an explicit evidence output. Expand a module for the full scope.")}<div class="cro-service-grid">${croContent.services.map((service, index) => `<details class="cro-service" id="${service.id}"><summary><span>${String(index + 1).padStart(2, "0")}</span><small>${esc(service.status)}</small><h3>${esc(service.title)}</h3></summary><div class="cro-service-detail"><p><b>Programme need</b>${esc(service.problem)}</p><p><b>NovaPharm approach</b>${esc(service.approach)}</p><p><b>Defined output</b>${esc(service.outcome)}</p><a class="text-link" href="${enquiry}&amp;topic=${encodeURIComponent(service.id)}">${esc(service.cta)}</a></div></details>`).join("")}</div></div></section>

  <section class="section cro-decision" id="decision-framework" data-reveal><div class="container cro-decision-grid"><div>${sectionHeading("Sponsor Decision Framework", "Choose the right delivery architecture.", "Some programmes need a conventional global CRO. Others benefit from focused coordination, transparent specialist delivery and direct senior oversight.")}<div class="cro-decision-questions" data-cro-decision>${croContent.decisionOptions.map((item, index) => `<button type="button" data-cro-decision-item data-cro-output-title="${esc(item.title)}" data-cro-output-copy="${esc(item.output)}" aria-pressed="${index === 0 ? "true" : "false"}"><span>${String(index + 1).padStart(2, "0")}</span><strong>${esc(item.question)}</strong><small>${esc(item.signal)}</small></button>`).join("")}</div></div><aside class="cro-decision-output" aria-live="polite"><span class="section-kicker">Framework output</span><h3 data-cro-decision-title>${esc(croContent.decisionOptions[0].title)}</h3><p data-cro-decision-copy>${esc(croContent.decisionOptions[0].output)}</p><ul><li>Accountable sponsor decision</li><li>Required specialist input</li><li>Evidence output</li><li>Next controlled gate</li></ul></aside></div></section>

  <section class="section cro-governance" id="quality-governance" data-reveal><div class="container"><div class="cro-governance-grid"><div>${sectionHeading("Quality and governance", "Evidence should move with every accountable decision.", "The model connects responsibility, records, risk and escalation. It does not replace programme-specific legal, medical or regulatory advice.")}<div class="cro-governance-map" role="img" aria-label="Governance dependencies connected to a controlled programme record"><div class="cro-governance-core"><span>Controlled programme record</span><strong>Decision context preserved</strong></div><div class="cro-governance-node cro-node-responsibility"><span>01</span><strong>Responsibility</strong><small>Accountable owner</small></div><div class="cro-governance-node cro-node-evidence"><span>02</span><strong>Evidence</strong><small>Version and source</small></div><div class="cro-governance-node cro-node-risk"><span>03</span><strong>Risk</strong><small>Material signal</small></div><div class="cro-governance-node cro-node-escalation"><span>04</span><strong>Escalation</strong><small>Decision and action</small></div></div></div><div class="cro-quality-principles">${croContent.qualityPrinciples.map(([title, text], index) => `<article><span>${String(index + 1).padStart(2, "0")}</span><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join("")}<p class="cro-regulatory-caveat">Applicable UK approvals and sponsor responsibilities must be established for the actual programme. NovaPharm does not guarantee authorisation, ethics opinion, recruitment, timing or outcome.</p><a class="text-link" href="/regulatory-services/">Explore UK pathway support</a></div></div><div class="cro-engagement" id="operating-model"><div><span class="section-kicker">Engagement path</span><h3>From discussion to a defined route.</h3></div><ol>${croContent.operatingSteps.map(([number, title, text]) => `<li><span>${number}</span><div><h4>${esc(title)}</h4><p>${esc(text)}</p></div></li>`).join("")}</ol></div></div></section>

  <section class="section section-band cro-focus-tech" data-reveal><div class="container"><div class="cro-intelligence-grid"><figure class="cro-delivery-figure">${responsiveCroImage("/assets/media/cro/cro-delivery-architecture", "Programme records, risk indicators and milestones reviewed across controlled documents and a dashboard", { sizes: "(max-width: 900px) 100vw, 48vw" })}<figcaption>Conceptual oversight architecture; no live sponsor, study or operational data is shown.</figcaption></figure><div>${sectionHeading("Scientific and digital continuity", "Judgement stays human. Programme evidence stays connected.", "Strategic focus areas and the technology architecture inform scoped conversations; neither is presented as completed NovaPharm trial delivery or a live sponsor workspace.")}<div class="cro-focus-list">${croContent.focusAreas.map(([title, text]) => `<article><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join("")}</div><div class="cro-tech-list">${croContent.technology.map(([title, text]) => `<article><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join("")}</div><a class="text-link" href="/technology/">Explore the technology maturity model</a></div></div></div></section>

  <section class="section cro-leadership" data-reveal><div class="container">${sectionHeading("Senior judgement", "Scientific scrutiny and accountable programme framing.", "Verified NovaPharm leadership connects corporate direction, scientific review and controlled UK pathway decisions without inventing trial history.")}<div class="cro-leadership-grid">${[chiefExecutive, chiefScientificOfficer].map((profile) => `<a class="cro-leader" href="/leadership/${profile.slug}/"><div class="cro-leader-media">${responsiveCroPortrait(profile)}</div><div><span>${esc(profile.title)}</span><h3>${esc(profile.displayName)}</h3><p>${esc(croLeadershipSummary.get(profile.slug))}</p><strong>View verified profile</strong></div></a>`).join("")}<aside class="cro-leadership-proof"><span class="section-kicker">What this adds</span>${croContent.differentiators.map(([title, text]) => `<div><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`).join("")}</aside></div></div></section>

  <section class="section cro-continuity" id="market-continuity" data-reveal><div class="container"><div class="cro-continuity-head">${sectionHeading("Development-to-Market Continuity", "Carry the evidence forward instead of rebuilding the story.", "Development outputs remain connected to the regulatory, product, quality, supply and market decisions that follow.")}<p>Every transition remains conditional on verified evidence and applicable permission.</p></div><div class="cro-continuity-path" role="list"><article role="listitem"><span>01</span><h3>Development question</h3><p>What must be decided?</p></article><i aria-hidden="true"></i><article role="listitem"><span>02</span><h3>Controlled evidence</h3><p>Which records support it?</p></article><i aria-hidden="true"></i><article role="listitem"><span>03</span><h3>Regulatory decision</h3><p>Which pathway applies?</p></article><i aria-hidden="true"></i><article role="listitem"><span>04</span><h3>Product and supply design</h3><p>Can continuity be governed?</p></article><i aria-hidden="true"></i><article role="listitem"><span>05</span><h3>Market readiness</h3><p>Proceed only when authorised.</p></article></div></div></section>

  <section class="section cro-insights" data-reveal><div class="container">${sectionHeading("Related evidence", "Quality, traceability and regulated-operation perspectives.", "Adjacent context, not clinical-trial case studies or regulatory advice.")}<div class="cro-insight-grid">${croContent.insightLinks.map(([title, href, category]) => `<a href="${href}"><span>${esc(category)}</span><h3>${esc(title)}</h3><strong>Read the insight</strong></a>`).join("")}</div></div></section>

  <section class="section section-band cro-faq" id="cro-faq"><div class="container">${sectionHeading("Clinical-development FAQs", "Six clear answers before a programme conversation.")}<div class="faq">${croContent.faqs.map(([question, answer]) => `<details><summary>${esc(question)}</summary><p>${esc(answer)}</p></details>`).join("")}</div><details class="cro-sources"><summary>Official sources used for the UK responsibility and governance framework</summary><ul>${croContent.officialSources.map(([label, href]) => `<li><a href="${href}">${esc(label)}</a></li>`).join("")}</ul><p>Reviewed 18 July 2026. Programme-specific requirements must be confirmed against current official guidance and professional advice.</p></details></div></section>

  <section class="section final-cta cro-final-cta"><div class="container final-cta-inner"><div><span class="section-kicker">Clinical-development enquiry</span><h2>Bring the programme question. Start with the responsibility map.</h2><p>A web enquiry does not confirm acceptance, scope, confidentiality arrangements, timing or a proposal. Share only high-level, non-confidential business information. Do not submit patient data, adverse-event information or urgent medical information.</p></div><div class="hero-actions"><a class="btn btn-primary" href="${enquiry}">Discuss a development programme</a><a class="btn btn-outline" href="#operating-model">Review the engagement path</a></div></div></section>`;

  return documentShell({
    meta,
    slug,
    body,
    options: {
      schemas,
      preloadCroHero: true,
      scripts: ["/assets/js/cro.js"]
    }
  });
}

function oncologyPage() {
  const slug = "oncology";
  const meta = pageMeta[slug];
  const canonical = absoluteUrl(routePath(slug));
  const schemas = pageSchemas(meta, slug, {
    breadcrumbs: [{ name: "Home", href: "/" }, { name: "Oncology continuity", href: "/oncology/" }],
    faqs: oncologyContent.faqs
  });
  schemas.push({
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${canonical}#service`,
    name: "Oncology supply continuity and readiness",
    serviceType: "B2B oncology programme, product-readiness and supply-continuity coordination",
    description: meta.description,
    provider: { "@id": organisationId },
    audience: {
      "@type": "Audience",
      audienceType: "Pharmaceutical product owners, manufacturers, CMO and CDMO organisations, authorised supply partners and qualified B2B stakeholders"
    },
    areaServed: { "@type": "Country", name: "United Kingdom" },
    termsOfService: `${canonical}#scope-boundary`
  });
  const body = `<section class="oncology-hero">
    <div class="oncology-hero-media">${responsiveProductImage("/assets/media/products/oncology-vial-handling", "Gloved laboratory professional handling a vial with a pipette in a controlled scientific setting", { eager: true })}<div class="oncology-hero-scrim" aria-hidden="true"></div></div>
    <div class="container oncology-hero-grid"><div class="oncology-hero-copy">${breadcrumb([{ name: "Home", href: "/" }, { name: "Oncology continuity" }])}<span class="eyebrow">${esc(oncologyContent.scope.eyebrow)}</span><h1>${esc(oncologyContent.scope.title)}</h1><p class="oncology-hero-lead">${esc(oncologyContent.scope.lead)}</p><div class="hero-actions"><a class="btn btn-primary" href="#continuity-architecture">Explore the continuity model</a><a class="btn btn-ghost" href="/contact/?enquiry=Oncology%20%26%20specialist%20medicines">Discuss an opportunity</a></div><p class="oncology-hero-status">Strategic focus · B2B only · Product-specific evidence · Subject to applicable authorisation</p></div></div>
    <p class="oncology-media-disclosure">Representative licensed scientific image; not a NovaPharm product, employee or facility.</p>
  </section>
  <section class="oncology-scope" id="scope-boundary" aria-label="Oncology scope boundary"><div class="container"><strong>Scope boundary</strong><p>${esc(oncologyContent.scope.boundary)} This is a strategic B2B focus with no product approval, availability or treatment claim.</p><a href="#oncology-faqs">Read the category FAQs</a></div></section>

  <section class="section oncology-specialist-model" data-reveal><div class="container"><div class="oncology-section-intro">${sectionHeading("Specialist operating model", "Continuity is a system of evidence and accountable decisions.", "Oncology opportunities can combine formulation complexity, specialist manufacture, clinical-development dependencies, condition-sensitive handling, uncertain demand and strict regulatory boundaries. NovaPharm's proposed role is to make those dependencies visible and govern the hand-offs between qualified parties.")}<p class="oncology-pullquote">A product should not move faster than the evidence and permissions that support it.</p></div><div class="oncology-principles">${oncologyContent.principles.map(([title, text], index) => `<article><span>${String(index + 1).padStart(2, "0")}</span><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join("")}</div></div></section>

  <section class="section section-dark oncology-continuity" id="continuity-architecture" data-reveal><div class="container"><div class="oncology-section-intro oncology-section-intro-light">${sectionHeading("Signature architecture", "Oncology Supply Continuity Architecture", "Six controlled lenses converge on one decision record. The model is designed to expose uncertainty, missing evidence and ownership before a product or programme advances.")}</div><div class="continuity-architecture" role="group" aria-label="Oncology Supply Continuity Architecture"><div class="continuity-core"><span>Controlled continuity record</span><strong>Evidence before release</strong><small>Identity · status · owner · decision · date</small></div><div class="continuity-axes">${oncologyContent.continuityAxes.map(([title, text], index) => `<article style="--axis:${index}"><span>${String(index + 1).padStart(2, "0")}</span><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join("")}</div><div class="continuity-output"><span>Decision output</span><strong>Advance · hold · resolve evidence · stop</strong></div></div><p class="oncology-architecture-note">This is a governance model, not a live inventory, availability or regulatory-approval system.</p></div></section>

  <section class="section oncology-formulation" id="formulation-navigator" data-reveal><div class="container"><div class="oncology-formulation-head">${sectionHeading("Signature navigator", "Formulation and Complexity Navigator", "Different presentations create different evidence questions. Use the navigator to compare planning lenses; it does not name, recommend or advertise a prescription medicine and does not indicate a NovaPharm product pipeline.")}<figure>${responsiveProductImage("/assets/media/products/oral-liquid-formulation", "Gloved laboratory professional holding an amber glass bottle during liquid analysis")}<figcaption>Representative formulation context; not a NovaPharm laboratory or marketed product.</figcaption></figure></div><div class="formulation-navigator" data-formulation-navigator><div class="formulation-tabs" role="tablist" aria-label="Formulation planning lenses">${oncologyContent.formulations.map((item, index) => `<button type="button" role="tab" id="formulation-tab-${item.id}" aria-controls="formulation-panel-${item.id}" aria-selected="${index === 0 ? "true" : "false"}" tabindex="${index === 0 ? "0" : "-1"}" data-formulation-tab="${item.id}"><span>${String(index + 1).padStart(2, "0")}</span>${esc(item.label)}</button>`).join("")}</div><div class="formulation-panels">${oncologyContent.formulations.map((item) => `<article role="tabpanel" id="formulation-panel-${item.id}" aria-labelledby="formulation-tab-${item.id}" data-formulation-panel="${item.id}" tabindex="0"><span class="status-label">Planning lens</span><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p><h4>Evidence questions</h4><ul>${item.evidence.map((entry) => `<li>${esc(entry)}</li>`).join("")}</ul></article>`).join("")}</div></div></div></section>

  <section class="section section-band oncology-sourcing" data-reveal><div class="container"><div class="oncology-section-intro">${sectionHeading("Three-pillar oncology sourcing", "Diversification does not lower the evidence threshold.", "A potential route is assessed product by product. The model does not assert that a supplier, licence, product or commercial relationship is currently approved.")}</div><ol class="oncology-sourcing-lanes">${oncologyContent.sourcing.map(([number, title, text]) => `<li><span>${number}</span><div><h3>${esc(title)}</h3><p>${esc(text)}</p></div></li>`).join("")}</ol><a class="text-link" href="/services/#european-sourcing">Explore the wider sourcing model</a></div></section>

  <section class="section oncology-readiness" id="product-readiness" data-reveal><div class="container"><div class="oncology-section-intro">${sectionHeading("Product-readiness pathway", "Oncology Product-Readiness Matrix", "Readiness is evidenced across every critical dimension. The matrix is a decision aid for qualified B2B discussion; it does not calculate approval probability, replace a competent authority or produce an automatic release decision.")}</div><div class="readiness-table-wrap" tabindex="0" role="region" aria-label="Oncology Product-Readiness Matrix"><table class="readiness-table"><thead><tr><th scope="col">Dimension</th><th scope="col">Control question</th><th scope="col">Evidence expected</th><th scope="col">Hold or stop trigger</th></tr></thead><tbody>${oncologyContent.readiness.map((item, index) => `<tr><th scope="row"><span>${String(index + 1).padStart(2, "0")}</span>${esc(item.dimension)}</th><td>${esc(item.question)}</td><td>${esc(item.required)}</td><td>${esc(item.stop)}</td></tr>`).join("")}</tbody></table></div><div class="readiness-legend" aria-label="Readiness status legend"><span><i data-state="evidence"></i> Evidence required</span><span><i data-state="review"></i> Human review</span><span><i data-state="decision"></i> Accountable decision</span></div></div></section>

  <section class="section section-dark oncology-temperature" data-reveal><div class="container oncology-temperature-grid"><figure>${responsiveProductImage("/assets/media/products/specialty-pharmacy-handling", "Gloved laboratory professional using a multichannel pipette during controlled sample analysis")}<figcaption>Representative controlled scientific handling; no facility ownership or active service is implied.</figcaption></figure><div>${sectionHeading("Condition & quality governance", "Controlled temperature is more than a temperature range.", "Where a product or programme is condition-sensitive, the evidence must connect the product requirement to packaging, lane qualification, monitoring, custody, exception review and the accountable release decision.")}<ol class="temperature-path">${oncologyContent.temperatureControls.map(([title, text], index) => `<li><span>${String(index + 1).padStart(2, "0")}</span><div><h3>${esc(title)}</h3><p>${esc(text)}</p></div></li>`).join("")}</ol></div></div></section>

  <section class="section oncology-development" id="development-to-access" data-reveal><div class="container"><div class="oncology-section-intro">${sectionHeading("Connected continuity", "Development-to-Access Continuity", "Evidence should survive every programme hand-off. The map joins the CRO responsibility model to formulation, regulatory, source and market-readiness decisions. Each stage keeps its own accountable owner; NovaPharm does not assume sponsor or competent-authority duties.")}</div><ol class="development-continuity" aria-label="Development-to-Access Continuity stages">${oncologyContent.continuityStages.map(([title, text], index) => `<li><span>${String(index + 1).padStart(2, "0")}</span><div><h3>${esc(title)}</h3><p>${esc(text)}</p></div></li>`).join("")}</ol><div class="oncology-linked-actions"><a class="btn btn-outline" href="/cro/#delivery-model">Review the CRO responsibility model</a><a class="text-link" href="/regulatory-services/">Review the regulatory roadmap</a></div></div></section>

  <section class="section section-band oncology-ai-roadmap" data-reveal><div class="container"><div class="oncology-section-intro">${sectionHeading("Technology maturity", "AI supports evidence retrieval before it supports forecasting.", "NovaPharm separates a working public evidence-search foundation from experimental on-device retrieval, internal human-review tools and longer-term demand-planning research.")}</div><div class="oncology-ai-stages">${oncologyContent.aiRoadmap.map(([status, title, text]) => `<article><span class="maturity-label maturity-${status.toLowerCase().replace(/\s+/g, "-")}">${esc(status)}</span><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join("")}</div><div class="oncology-ai-actions"><a class="btn btn-outline" href="/technology/ai-governance/">Read Responsible AI at NovaPharm</a><button class="text-link-button" type="button" data-ai-search-open>Search published evidence</button></div></div></section>

  <section class="section oncology-partners" data-reveal><div class="container"><div class="oncology-section-intro">${sectionHeading("Qualified partner model", "Start with the opportunity, evidence and accountable owner.", "NovaPharm is open to carefully scoped conversations with organisations that can evidence their rights, authorisations, quality responsibilities and intended role. A first conversation is not qualification, approval or a commitment to supply.")}</div><div class="oncology-partner-grid">${oncologyContent.partners.map(([title, text]) => `<article><h3>${esc(title)}</h3><p>${esc(text)}</p><span>Evidence-led introduction</span></article>`).join("")}</div></div></section>

  <section class="section section-dark oncology-evidence" data-reveal><div class="container oncology-evidence-grid"><div>${sectionHeading("Evidence & current sources", "Public claims should lead back to accountable sources.", "The page uses current official guidance for UK clinical, wholesale, GDP and market-access context. Links are provided for qualified readers; NovaPharm's interpretation is not legal, regulatory or medical advice.")}<ul class="oncology-source-list">${oncologyContent.sources.map(([title, href]) => `<li><a href="${href}">${esc(title)}</a></li>`).join("")}</ul></div><aside><span class="section-kicker">Related NovaPharm analysis</span>${articles.filter((article) => article.category === "Oncology" || article.tags.some((tag) => /oncology|supply|quality/i.test(tag))).slice(0, 3).map((article) => `<a href="/news-insights/${article.slug}/"><strong>${esc(article.title)}</strong><span>${esc(article.summary)}</span></a>`).join("")}<a class="text-link-light" href="/news-insights/">View all Insights</a></aside></div></section>

  <section class="section oncology-faq" id="oncology-faqs" data-reveal><div class="container"><div class="oncology-section-intro">${sectionHeading("Oncology FAQs", "Clear answers within a controlled public scope.", "These answers define NovaPharm's current position and the limits of this corporate B2B page.")}</div><div class="faq-list">${oncologyContent.faqs.map(([question, answer]) => `<details><summary>${esc(question)}</summary><p>${esc(answer)}</p></details>`).join("")}</div></div></section>

  <section class="section oncology-conversion" id="oncology-enquiry"><div class="container form-feature"><div>${sectionHeading("Oncology & specialist-medicine opportunities", "Begin with a non-confidential evidence summary.", "Product owners, qualified manufacturers, CMO/CDMOs and authorised supply partners can describe an opportunity for controlled review. Do not include patient information, safety reports, urgent medical information or a confidential dossier in this form.")}<ul class="list-check"><li>Intended B2B market and audience</li><li>Product or formulation category</li><li>Rights and source position</li><li>Current evidence and known gaps</li><li>Requested NovaPharm role</li></ul></div>${contactForm({ formId: "oncology-opportunity", defaultType: "Oncology & specialist medicines", compact: true })}</div></section>
  ${finalCta("Discuss an evidence-led oncology or specialist-medicine opportunity.")}`;

  return documentShell({
    meta,
    slug,
    body,
    options: {
      schemas,
      preloadOncologyHero: true,
      scripts: ["/assets/js/oncology.js"]
    }
  });
}

function productsPage() {
  const slug = "product-portfolio";
  const meta = pageMeta[slug];
  const body = `${pageHero(meta, "A strategic B2B portfolio, not a public pharmacy catalogue.", "Product categories describe NovaPharm's focus and partnership pipeline. They do not indicate marketing-authorisation ownership, current stock, pricing or availability.", slug)}
  ${mediaStory({ src: "/assets/media/editorial/oncology-specialty.svg", alt: "Scientific network representing oncology and specialty portfolio discipline", kicker: "Portfolio focus", title: "Category focus is not a claim of availability.", text: "Oncology, specialty and hard-to-source categories remain strategic areas of assessment. Every product requires its own rights, regulatory, quality, source and commercial evidence before release." })}
  <section class="section"><div class="container">${regulatoryNotice()}<p class="portfolio-image-disclosure">Category photography is representative and does not depict NovaPharm-owned premises, current stock or an authorised NovaPharm product.</p><div class="portfolio-table" role="list">${productCategories.map((category) => `<article role="listitem">${productCategoryMedia(category)}<div class="portfolio-card-body"><span class="status-label">${esc(category.status)}</span><h2>${esc(category.title)}</h2><p>${esc(category.text)}</p>${category.title === "Oncology medicines" ? '<a href="/oncology/">Explore the continuity model</a>' : '<a href="#submit-opportunity">Submit a relevant opportunity</a>'}</div></article>`).join("")}</div></div></section>
  <section class="section section-band"><div class="container nutraxin-feature"><div class="nutraxin-feature-copy"><span class="section-kicker">Food supplement portfolio review</span><h2>Nutraxin UK catalogue reference.</h2><p>Review 19 owner-supplied catalogue records with pack imagery and source-transcribed composition information. The catalogue is presented for qualified B2B evaluation and does not state current availability, price, stock, approved claims or medicinal status.</p><a class="btn btn-outline" href="/product-portfolio/nutraxin/">Review the catalogue</a></div>${nutraxinProductMedia(nutraxinCatalogue.products[0])}</div></section>
  <section class="section section-dark" id="submit-opportunity"><div class="container form-feature"><div>${sectionHeading("Product opportunity", "Bring an evidence-backed B2B opportunity.", "Dossier owners, manufacturers and authorised wholesalers can submit an initial enquiry. Do not include patient information, confidential dossiers or adverse-event reports in this form.")}<ul class="list-check list-check-light"><li>Dossier-owner enquiry</li><li>Manufacturer partnership</li><li>Wholesaler sourcing opportunity</li><li>UK distribution discussion</li></ul></div>${contactForm({ formId: "product-opportunity", defaultType: "Product opportunity", compact: true })}</div></section>
  ${finalCta()}`;
  return documentShell({ meta, slug, body });
}

function nutraxinPage() {
  const slug = "product-portfolio/nutraxin";
  const meta = pageMeta[slug];
  const ranges = Object.keys(nutraxinExpectedRangeCounts);
  const products = [...nutraxinCatalogue.products].sort((a, b) => a.catalogueOrder - b.catalogueOrder);
  const itemList = {
    "@context": "https://schema.org",
    "@id": `${absoluteUrl(routePath(slug))}#catalogue`,
    "@type": "ItemList",
    name: "Nutraxin UK catalogue references",
    numberOfItems: products.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${absoluteUrl(routePath(slug))}#${product.slug}`,
      item: {
        "@type": "Thing",
        name: product.name,
        description: `${product.packSize}; ${product.dosageForm}. Owner-supplied catalogue reference for B2B evaluation; availability and regulatory status are not asserted.`,
        image: absoluteUrl(`/assets/media/products/nutraxin/${product.imageBase}.png`)
      }
    }))
  };
  const schemas = [...pageSchemas(meta, slug, {
    breadcrumbs: [
      { name: "Home", href: "/" },
      { name: "Products", href: "/product-portfolio/" },
      { name: "Nutraxin catalogue", href: routePath(slug) }
    ]
  }), itemList];
  const body = `${pageHero(meta, "Nutraxin food supplement catalogue references.", "Nineteen owner-supplied catalogue records are presented for qualified B2B portfolio evaluation. This is not a consumer shop, product-availability statement or authorised-claims library.", slug, { parent: { name: "Products", href: "/product-portfolio/" } })}
  <section class="section nutraxin-introduction"><div class="container nutraxin-introduction-grid"><div>${sectionHeading("Catalogue scope", "Pack imagery and source-transcribed composition, under evidence control.", "The products below are grouped as they appear in the supplied UK catalogue. Product identity, pack presentation and composition remain subject to approved-label, legal, regulatory, claims and commercial review before any market use.")}<div class="nutraxin-facts" role="list"><span role="listitem"><strong>19</strong> catalogue references</span><span role="listitem"><strong>6</strong> product ranges</span><span role="listitem"><strong>0</strong> availability claims</span></div></div><aside class="nutraxin-disclosure" aria-label="Important catalogue status"><strong>Important status</strong><p>${esc(nutraxinCatalogue.controls.warning)}</p><ul><li>No price or stock is published.</li><li>No health or medicinal claim is authorised by this page.</li><li>Some source values require approved-label confirmation.</li><li>Images reproduce the owner-supplied catalogue artwork.</li></ul></aside></div></section>
  <nav class="nutraxin-range-nav" aria-label="Nutraxin catalogue ranges"><div class="container">${ranges.map((range) => `<a href="#range-${range.toLowerCase().replace(/[^a-z0-9]+/g, "-")}">${esc(range)} <span>${nutraxinExpectedRangeCounts[range]}</span></a>`).join("")}</div></nav>
  ${ranges.map((range, rangeIndex) => {
    const rangeProducts = products.filter((product) => product.range === range);
    const anchor = range.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return `<section class="section nutraxin-range" id="range-${anchor}"><div class="container"><header class="nutraxin-range-head"><div><span class="section-kicker">Range ${String(rangeIndex + 1).padStart(2, "0")}</span><h2>${esc(range)}</h2></div><p>${rangeProducts.length} catalogue ${rangeProducts.length === 1 ? "reference" : "references"}</p></header><div class="nutraxin-grid">${rangeProducts.map((product, index) => nutraxinProductCard(product, rangeIndex === 0 && index === 0)).join("")}</div></div></section>`;
  }).join("")}
  <section class="section section-dark"><div class="container two-column-story"><div>${sectionHeading("Governed next step", "A catalogue entry is the start of review, not a release decision.", "Qualified organisations can discuss portfolio fit, approved labelling, evidence, rights, regulatory scope and supply arrangements through NovaPharm's controlled product-opportunity route.")}<div class="hero-actions"><a class="btn btn-primary" href="/contact/?enquiry=Product%20opportunity">Discuss a product opportunity</a><a class="btn btn-ghost" href="/product-portfolio/">Return to portfolio</a></div></div><ul class="list-check list-check-light"><li>Approved artwork and composition verification</li><li>UK nutrition and health-claims review</li><li>Rights, source and supplier qualification</li><li>Commercial and availability assessment</li><li>Release only after applicable approvals</li></ul></div></section>`;
  return documentShell({ meta, slug, body, options: { schemas } });
}

function partnersPage() {
  const slug = "partner-with-us";
  const meta = pageMeta[slug];
  const body = `${pageHero(meta, "Partnerships built through qualification, not logo walls.", "NovaPharm is preparing structured routes for manufacturers, product owners, authorised suppliers, B2B buyers, logistics providers and technology partners.", slug)}
  ${mediaStory({ src: "/assets/media/editorial/partnership-pathway.svg", alt: "Five controlled stages in a pharmaceutical partnership pathway", kicker: "Qualified collaboration", title: "The route from introduction to launch should be visible.", text: "Strategic fit, evidence, due diligence, agreement, implementation and review are treated as explicit stages. No organisation is presented as a partner until permission and scope are confirmed.", reverse: true })}
  <section class="section"><div class="container">${sectionHeading("Partner ecosystem", "Who NovaPharm is designed to work with.")}<div class="partner-type-grid partner-type-grid-large">${partnerTypes.map((type) => `<span>${esc(type)}</span>`).join("")}</div></div></section>
  <section class="section section-band"><div class="container">${sectionHeading("Partner journey", "Ten controlled stages from first conversation to ongoing review.")}<ol class="partner-journey">${partnerJourney.map((step, index) => `<li><span>${String(index + 1).padStart(2, "0")}</span><strong>${esc(step)}</strong></li>`).join("")}</ol></div></section>
  <section class="section"><div class="container cta-grid"><a href="/contact/?enquiry=Product%20opportunity"><span>Product owners</span><strong>Submit a product opportunity</strong></a><a href="/contact/?enquiry=Supplier%20enquiry"><span>Suppliers</span><strong>Become a supply partner</strong></a><a href="/contact/?enquiry=Distribution%20partnership"><span>Distribution</span><strong>Discuss UK distribution</strong></a><a href="/contact/?enquiry=CMO%2FCDMO%20partnership"><span>Manufacturing</span><strong>Discuss CMO/CDMO collaboration</strong></a><a href="/cro/"><span>Clinical development</span><strong>Map a specialist delivery model</strong></a><a href="/oncology/"><span>Oncology</span><strong>Review the continuity architecture</strong></a><a href="/account-application/"><span>Customers</span><strong>Open a business account</strong></a></div></section>
  ${finalCta()}`;
  return documentShell({ meta, slug, body });
}

function technologyPage() {
  const slug = "technology";
  const meta = pageMeta[slug];
  const body = `${pageHero(meta, "Useful infrastructure, with maturity stated plainly.", "NovaPharm's architecture is API-first, role-based and audit-aware. Public status labels distinguish deployed foundations from active development and longer-term plans.", slug)}
  <section class="section" data-reveal><div class="container architecture-story"><div>${sectionHeading("Connected architecture", "One record. Controlled documents. Explicit maturity.", "The platform is organised around a canonical operational record, secure role boundaries and SharePoint document relationships. Status labels prevent roadmap ideas from appearing live.")}<p>Technology supports accountable pharmaceutical work; it does not replace qualified judgement, regulatory responsibility or source verification.</p><a class="text-link" href="/about/governance/">Review claims and governance controls</a></div><figure class="architecture-map" aria-label="NovaPharm platform architecture from public and portal experiences through shared APIs to data and document systems"><div class="architecture-layer"><div class="architecture-node" data-stage="live"><strong>Public website</strong><span>Live foundation</span></div><div class="architecture-node" data-stage="development"><strong>Customer portal</strong><span>In development</span></div><div class="architecture-node" data-stage="development"><strong>Enterprise workspaces</strong><span>In development</span></div></div><div class="architecture-layer"><div class="architecture-node" data-stage="live"><strong>Role and session controls</strong><span>Live foundation</span></div><div class="architecture-node" data-stage="live"><strong>Canonical domain APIs</strong><span>Live foundation</span></div><div class="architecture-node" data-stage="live"><strong>Audit and outbox</strong><span>Live foundation</span></div></div><div class="architecture-layer"><div class="architecture-node" data-stage="live"><strong>Persistent data model</strong><span>Live foundation</span></div><div class="architecture-node" data-stage="development"><strong>SharePoint document backbone</strong><span>In development</span></div><div class="architecture-node" data-stage="planned"><strong>External operational feeds</strong><span>Planned</span></div></div></figure></div></section>
  <section class="section"><div class="container maturity-model">${Object.entries(technologyMaturity).map(([stage, items]) => `<section><header><span class="maturity-label maturity-${stage}">${maturityLabels[stage]}</span><h2>${maturityLabels[stage]} capabilities</h2></header><div>${items.map(([title, text]) => `<article><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join("")}</div></section>`).join("")}</div></section>
  <section class="section section-band"><div class="container two-column-story"><div>${sectionHeading("Security & continuity", "Identity, access and evidence are architectural requirements.")}<p>The production design uses server-side role scopes, HttpOnly secure cookies, CSRF protection, persistent session records, rate limits, audit events, private content storage and health checks. Microsoft Entra ID is the preferred production identity path.</p></div><ul class="list-check"><li>API-first integration boundaries</li><li>Customer, employee, board and admin scopes</li><li>SharePoint document metadata and version history</li><li>Source and data-freshness indicators</li><li>Business-continuity and rollback procedures</li><li>No secure documents in the public output</li></ul></div></section>
  <section class="section related-capability"><div class="container editorial-split"><div class="editorial-index">Programme oversight</div><div><span class="section-kicker">Clinical-development architecture</span><h2>Technology should preserve responsibility, evidence and sponsor visibility.</h2><p>The CRO page shows how structured records, controlled documents, actions and milestones can support an engagement without presenting synthetic dashboards as a live sponsor service.</p><a class="btn btn-outline" href="/cro/#decision-framework">Explore the Sponsor Decision Framework</a></div></div></section>
  <section class="section section-band related-capability"><div class="container editorial-split"><div class="editorial-index">Responsible AI</div><div><span class="section-kicker">Evidence before generation</span><h2>Public AI should cite approved information or abstain.</h2><p>NovaPharm's public search retrieves approved canonical pages and sources. It does not query portal records, send questions to an external AI provider or generate medical advice.</p><a class="btn btn-outline" href="/technology/ai-governance/">Read Responsible AI at NovaPharm</a></div></div></section>
  ${finalCta("Discuss a pharmaceutical technology or integration partnership.")}`;
  return documentShell({ meta, slug, body });
}

function aiGovernancePage() {
  const slug = "technology/ai-governance";
  const meta = pageMeta[slug];
  const maturity = [
    ["Live", "Conventional public search", "Keyword and metadata retrieval from approved public pages. No model, account, cookie or external AI provider is required."],
    ["Experimental", "Private on-device semantic retrieval", "A small NovaPharm lexical-semantic retrieval model is downloaded only after explicit activation. Queries remain in the visitor's browser."],
    ["Internal development", "Governed review assistance", "Bounded prototypes can flag possible claims contradictions, document gaps and enquiry categories for human review. They cannot approve records or regulated decisions."],
    ["Planned", "Forecasting and traceability research", "Demand planning and stronger batch traceability require governed data, validation, monitoring and accountable owners. No performance or blockchain-deployment claim is made."],
    ["Prohibited", "Medical and autonomous regulated decisions", "Public AI must not provide diagnosis, treatment, dosage, medicine selection, patient advice, availability claims or autonomous regulatory, quality, safety, credit or release decisions."]
  ];
  const body = `${pageHero(meta, "Responsible AI starts with evidence, privacy and a clear right to abstain.", "NovaPharm uses the smallest justified technology for each task. Public search is retrieval-led, private by default and unable to access secure records. Internal AI is provider-disabled by default and remains subordinate to human accountability.", slug, { parent: { name: "Technology", href: "/technology/" }, actions: '<button class="btn btn-primary" type="button" data-ai-search-open>Open Search &amp; Ask NovaPharm</button><a class="btn btn-outline" href="#maturity">Review the maturity model</a>' })}
  <section class="section ai-governance-intro"><div class="container two-column-story"><div>${sectionHeading("Operating principle", "Retrieve approved evidence before considering generation.", "The public experience does not use a general-purpose chatbot. It finds controlled NovaPharm pages and Insights, applies deterministic safety rules, shows exact supporting passages and abstains when the approved corpus cannot support an answer.")}<p>Semantic similarity helps find a passage; it does not establish that the passage is true beyond its source, current beyond its review date or sufficient for a regulated decision.</p></div><aside class="regulatory-notice"><strong>Current public boundary</strong><p>No public query is sent to OpenAI, Anthropic, Google, Microsoft, Hugging Face or another external inference provider. Portal, customer, supplier, uploaded-document and business-plan data are excluded from the public index.</p></aside></div></section>
  <section class="section section-band" id="maturity"><div class="container">${sectionHeading("AI maturity", "Every capability has a visible status and a prohibited-use boundary.", "Status is based on implemented and tested behaviour, not a business-plan ambition.")}<div class="ai-maturity-grid">${maturity.map(([status, title, text]) => `<article data-ai-maturity="${status.toLowerCase().replace(/\s+/g, "-")}"><span>${esc(status)}</span><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join("")}</div></div></section>
  <section class="section ai-citation-architecture"><div class="container"><div>${sectionHeading("Citation architecture", "An answer is a view over sources, not a new authority.", "Permitted questions are searched across deterministic chunks derived from approved canonical pages. The interface returns source title, URL, heading, supporting passage, date, capability boundary and evidence status.")}<ol class="ai-citation-flow"><li><span>01</span><strong>Policy first</strong><p>Refuse medical, safety, private, financial, live-stock and prompt-injection requests before retrieval.</p></li><li><span>02</span><strong>Approved corpus</strong><p>Search only registered public pages, published Insights and approved leadership profiles.</p></li><li><span>03</span><strong>Exact passage</strong><p>Build a concise extractive answer and retain the underlying passage and canonical source.</p></li><li><span>04</span><strong>Abstain</strong><p>Say “I could not verify that from NovaPharm's approved public information” when support is insufficient.</p></li></ol></div></div></section>
  <section class="section section-dark ai-privacy-architecture" id="privacy"><div class="container"><div>${sectionHeading("Privacy by default", "The public evidence assistant does not need to know who you are.", "Conventional and optional semantic retrieval are designed without query logging, external inference, microphone access or transcript retention.")}</div><dl class="ai-privacy-list"><div><dt>Query text</dt><dd>Processed in the browser and not sent to an external AI provider or stored by the assistant.</dd></div><div><dt>Model activation</dt><dd>Optional, explicit and cancellable. The size is shown before download.</dd></div><div><dt>Browser storage</dt><dd>Optional semantic assets may be cached locally; the interface provides a clear-cache control and falls back when storage is denied.</dd></div><div><dt>Analytics</dt><dd>No query or answer text is measured. Only non-sensitive aggregate interaction events may be considered after consent and approval.</dd></div><div><dt>Secure records</dt><dd>Portal records, customer data, uploaded documents, credentials and private business-plan content are not in the public corpus.</dd></div><div><dt>Medical information</dt><dd>The assistant refuses patient, treatment, dosage, adverse-event and product-defect content and directs users to controlled routes.</dd></div></dl></div></section>
  <section class="section"><div class="container two-column-story"><div>${sectionHeading("Model governance", "A small local retrieval model, not a public generative model.", "NovaPharm Evidence Vector v1 creates deterministic sparse embeddings from approved English vocabulary. It has no neural weights, no remote model dependency and no ability to generate prose independently of retrieved passages.")}<p>The model, source manifest, corpus hash, asset checksums, licence decision and limitations are recorded in the repository. The optional model is lazy-loaded in a Web Worker so the normal website experience remains independent of AI.</p><a class="text-link" href="/search/">Use the no-JavaScript search directory</a></div><div>${sectionHeading("Internal gateway", "Private AI remains off unless an authorised use case and provider are configured.", "The secured Node architecture defaults to provider `none`. A loopback-only Ollama adapter is available for local development, with server-side role checks, source restrictions, redaction and audit metadata that excludes prompt bodies.")}<p>No internal AI route can write a production record, approve a supplier, release a batch, make a regulatory decision or cross customer boundaries. Any future provider requires security, privacy, legal, model and use-case approval.</p></div></div></section>
  <section class="section section-band"><div class="container">${sectionHeading("Governance references", "Controls are aligned to current primary guidance.", "These sources inform the governance approach; they do not certify NovaPharm or replace a task-specific legal and regulatory review.")}<div class="source-grid"><a href="https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/artificial-intelligence/guidance-on-ai-and-data-protection/about-this-guidance/"><strong>ICO</strong><span>Guidance on AI and data protection</span></a><a href="https://www.nist.gov/itl/ai-risk-management-framework"><strong>NIST</strong><span>AI Risk Management Framework</span></a><a href="https://www.gov.uk/government/publications/ai-playbook-for-the-uk-government/artificial-intelligence-playbook-for-the-uk-government-html"><strong>UK Government</strong><span>Artificial Intelligence Playbook</span></a></div></div></section>
  <section class="section ai-issue-route"><div class="container final-cta-inner"><div><span class="section-kicker">Report an issue</span><h2>Challenge an answer, source or boundary.</h2><p>Send the public page or source URL and a non-sensitive description. Do not submit patient data, private documents, passwords or confidential commercial information.</p></div><div class="hero-actions"><a class="btn btn-primary" href="/contact/?enquiry=General%20enquiry">Report an AI issue</a><button class="btn btn-outline" type="button" data-ai-search-open>Test published evidence</button></div></div></section>`;
  return documentShell({ meta, slug, body });
}

function searchPage() {
  const slug = "search";
  const meta = {
    title: "Search NovaPharm Healthcare",
    description: "Find NovaPharm Healthcare's approved public company, oncology, CRO, regulatory, product, partnership, technology, leadership and Insights pages.",
    eyebrow: "Search"
  };
  const topicLinks = [
    ["Company and governance", "/about/company/"],
    ["Leadership", "/leadership/"],
    ["Pharmaceutical services", "/services/"],
    ["Regulatory readiness", "/regulatory-services/"],
    ["Clinical Research & CRO Support", "/cro/"],
    ["Oncology continuity", "/oncology/"],
    ["Strategic product portfolio", "/product-portfolio/"],
    ["Partner pathways", "/partner-with-us/"],
    ["Technology maturity", "/technology/"],
    ["Responsible AI", "/technology/ai-governance/"],
    ["Insights", "/news-insights/"],
    ["Contact", "/contact/"]
  ];
  const body = `${pageHero(meta, "Find approved public NovaPharm information.", "This directory keeps core route discovery available without JavaScript. Use Search & Ask NovaPharm for keyword retrieval and optional private on-device semantic search when JavaScript is available.", slug, { actions: '<button class="btn btn-primary" type="button" data-ai-search-open>Open Search &amp; Ask NovaPharm</button>' })}<section class="section"><div class="container">${sectionHeading("Public topics", "Browse the canonical information architecture.", "Private portals, account records, secure documents, submissions and APIs are deliberately excluded.")}<div class="search-directory">${topicLinks.map(([title, href]) => `<a href="${href}"><strong>${esc(title)}</strong><span>Open canonical page</span></a>`).join("")}</div></div></section>`;
  return documentShell({ meta, slug, body, options: { robots: "noindex,follow", schemas: [] } });
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
  const croRelevant = ["Regulatory", "Quality", "Technology", "Supply chain"].includes(article.category);
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
  const body = `<article class="article-page"><header class="article-hero"><div class="article-hero-media">${responsiveEditorialImage(article.heroImage, `Editorial visual for ${article.title}`, { eager: true })}</div><div class="container">${breadcrumb([{ name: "Home", href: "/" }, { name: "Insights", href: "/news-insights/" }, { name: article.title }])}<span class="eyebrow">${esc(article.category)}</span><h1>${esc(article.title)}</h1><p>${esc(article.summary)}</p><div class="article-byline"><span>${esc(article.author)}</span><time datetime="${article.published}">${formatDate(article.published)}</time><span>${readingTime(article)} min read</span></div></div></header>
  <div class="container article-layout"><div class="article-body"><p class="article-disclaimer">${esc(article.disclaimer)}</p>${article.sections.map((section) => `<section><h2>${esc(section.heading)}</h2>${(section.paragraphs || []).map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}${section.list ? `<ul>${section.list.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>` : ""}</section>`).join("")}<section class="article-sources"><h2>Sources and further reading</h2>${article.references.length ? `<ul>${article.references.map((source) => `<li><a href="${source.href}">${esc(source.label)}</a></li>`).join("")}</ul>` : "<p>This perspective is based on NovaPharm's operating analysis and does not rely on unsupported market statistics.</p>"}</section></div><aside class="article-aside"><h2>Related NovaPharm pages</h2>${article.internalLinks.map((link) => `<a href="${link.href}">${esc(link.label)}</a>`).join("")}${croRelevant ? '<a href="/cro/">Clinical Research &amp; CRO Support</a>' : ""}<h2>Topics</h2><div class="tag-list">${article.tags.map((tag) => `<span>${esc(tag)}</span>`).join("")}</div></aside></div></article>
  <section class="section section-band"><div class="container">${sectionHeading("Related insights", "Continue reading.")}<div class="article-grid article-grid-editorial-links">${article.related.map((relatedSlug) => articles.find((candidate) => candidate.slug === relatedSlug)).filter(Boolean).slice(0, 3).map((related) => articleCard(related, false, false)).join("")}</div></div></section>`;
  return documentShell({ meta, slug, body, options: { ogType: "article", schemas } });
}

function contactPage() {
  const slug = "contact";
  const meta = pageMeta[slug];
  const body = `${pageHero(meta, "Start a qualified business conversation.", "Use the secure enquiry form for product, distribution, clinical development, customer account, manufacturing, regulatory, supplier, media or career discussions.", slug)}
  <section class="section"><div class="container form-feature"><div><span class="section-kicker">Corporate enquiries</span><h2>Tell us what you are working on.</h2><p>NovaPharm reviews B2B enquiries against strategic fit, regulatory status, evidence quality and next-step requirements. The form is not a patient or adverse-event reporting channel.</p><div class="contact-route-list"><span>Product and dossier opportunities</span><span>Oncology & specialist medicines</span><span>UK distribution partnerships</span><span>Clinical development & CRO support</span><span>Pharmacy and wholesaler accounts</span><span>CMO/CDMO collaboration</span><span>Regulatory and quality services</span><span>Supplier, media and career enquiries</span></div></div>${contactForm({ formId: "contact" })}</div></section>`;
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
      <fieldset data-application-step hidden><legend><span>Step 4 of 4</span>Documents and confirmation</legend><p class="field-help">Upload only business records needed for account due diligence. Files are retained in controlled storage and, when configured, synchronised to access-restricted SharePoint libraries. Do not upload patient information or unrelated identity documents. See the <a href="/legal/privacy/#account-applications">account-application privacy information</a>.</p><div class="field"><label for="licenceFiles">Licences and GDP certificates</label><input id="licenceFiles" name="licenceFiles" type="file" accept=".pdf,.jpg,.jpeg,.png,.docx" multiple data-document-class="licence"></div><div class="field"><label for="companyFiles">Company registration, VAT, insurance and bank confirmation</label><input id="companyFiles" name="companyFiles" type="file" accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx" multiple data-document-class="company_due_diligence"></div><div class="field"><label for="agreementFiles">Quality agreements and signed contracts</label><input id="agreementFiles" name="agreementFiles" type="file" accept=".pdf,.docx" multiple data-document-class="agreement"></div><label class="checkbox"><input type="checkbox" name="bankConfirmation" value="yes" required><span>I confirm that bank details and supporting evidence can be made available for controlled compliance review.</span></label><label class="checkbox"><input type="checkbox" name="applicantDeclaration" value="yes" required><span>I confirm that the information supplied is accurate to the best of my knowledge and that I am authorised to submit it for this organisation.</span></label><label class="checkbox"><input type="checkbox" name="privacyAcknowledgement" value="yes" required><span>I have read the <a href="/legal/privacy/#account-applications">account-application privacy information</a>.</span></label><div class="application-actions"><button class="btn btn-outline" type="button" data-step-back>Back</button><button class="btn btn-primary" type="submit">Submit application</button></div></fieldset>
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

const policyDetails = Object.freeze({
  effective: "11 July 2026",
  reviewed: "14 July 2026",
  owner: "NovaPharm Healthcare Ltd Board",
  version: "1.1",
  schedule: "At least annually and after a material legal, operational or supplier change"
});

function policyMeta(details = policyDetails) {
  return `<dl class="policy-meta"><div><dt>Effective</dt><dd>${details.effective}</dd></div><div><dt>Last reviewed</dt><dd>${details.reviewed}</dd></div><div><dt>Document owner</dt><dd>${details.owner}</dd></div><div><dt>Version</dt><dd>${details.version}</dd></div><div><dt>Review schedule</dt><dd>${details.schedule}</dd></div></dl>`;
}

function policyPage(slug, title, intro, content) {
  const meta = pageMeta[slug];
  const body = `${pageHero(meta, title, intro, slug)}<section class="section legal-section"><div class="container legal-layout"><aside>${policyMeta()}<a class="btn btn-outline" href="/contact/?enquiry=General%20enquiry">Contact NovaPharm</a></aside><article class="legal-content">${content}</article></div></section>`;
  return documentShell({ meta, slug, body, options: { pageType: "WebPage" } });
}

function legalHubPage() {
  const slug = "legal";
  const meta = pageMeta[slug];
  const items = [
    ["Privacy notice", "/legal/privacy/", "Personal data, lawful bases, recipients, retention criteria and rights."],
    ["Cookie and storage notice", "/legal/cookies/", "Necessary cookies, browser storage and consent preferences."],
    ["Website terms", "/legal/terms/", "Corporate website and secure-portal use."],
    ["Accessibility", "/legal/accessibility/", "WCAG 2.2 AA target, testing and support."],
    ["Modern slavery and human rights", "/legal/modern-slavery/", "Voluntary ethical-sourcing and supply-chain policy."],
    ["Environment and carbon", "/legal/environment-carbon/", "Voluntary measurement and responsible-procurement statement."]
  ];
  const body = `${pageHero(meta, "Legal information, accountability and responsible business.", "This area explains how NovaPharm governs website use, personal data, accessibility, ethical sourcing and its developing environmental responsibilities.", slug)}<section class="section"><div class="container legal-index">${items.map(([name, href, text]) => `<a href="${href}"><h2>${name}</h2><p>${text}</p><span>Read document</span></a>`).join("")}</div></section>`;
  return documentShell({ meta, slug, body });
}

function privacyPage() {
  return policyPage("legal/privacy", "Privacy notice", "This notice explains how NovaPharm Healthcare Ltd processes personal data across its corporate website, business relationships, applications and secure systems.", `
    <section><h2>1. Controller and privacy contact</h2><p>${company.legalName} (company number ${company.companyNumber}), registered in England and Wales with registered office at ${company.registeredAddress}, is the controller for the processing described here. Use the <a href="/contact/?enquiry=General%20enquiry">contact form</a> and mark the message for the Privacy Lead. NovaPharm has not formally appointed a Data Protection Officer; the website does not represent that one has been appointed.</p></section>
    <section><h2>2. Who and what this notice covers</h2><p>This notice covers website visitors; business enquirers; account applicants; customers; suppliers; manufacturers and distribution partners; portal users; employees and job applicants; board members; professional advisers; regulatory contacts; email recipients; SharePoint users; uploaded business documents; and security, audit, cookie and device records. It does not invite patient-identifiable data.</p></section>
    <section id="business-enquiries"><h2>3. Business enquiries</h2><p>The enquiry form collects name, business email, company, role, country, optional telephone number, enquiry type, message, privacy acknowledgement, safety declaration, timestamp and anti-abuse evidence. NovaPharm uses these data to assess and respond to the enquiry, protect the service and preserve an accountable business record. The usual lawful bases are legitimate interests in operating and protecting a B2B pharmaceutical business and, where a person asks NovaPharm to consider a contract, steps requested before entering a contract. Marketing requires a separate choice and is not bundled into the enquiry.</p></section>
    <section id="account-applications"><h2>4. Account applications and uploads</h2><p>Applications collect company and contact details, responsible-person information, addresses, licence and GDP information, credit and trade references, insurance and bank-confirmation status, declarations and uploaded due-diligence records. Processing supports requested pre-contract steps, legal and regulatory duties where applicable, and NovaPharm's legitimate interests in customer due diligence, quality governance, fraud prevention and controlled account creation. Do not upload patient data or unrelated identity records.</p></section>
    <section><h2>5. Other purposes and lawful bases</h2><div class="table-wrap" role="region" aria-label="Processing purposes and lawful bases" tabindex="0"><table><thead><tr><th>Purpose</th><th>Typical data</th><th>Lawful basis</th></tr></thead><tbody><tr><td>Customer, supplier and partner administration</td><td>Contacts, contracts, orders, invoices, quality and regulatory records</td><td>Contract, legal obligation and legitimate interests in managed B2B operations</td></tr><tr><td>Portal identity, access and security</td><td>Username, role, scopes, sessions, device/network security evidence and audit events</td><td>Legitimate interests in secure access and, where relevant, contract and legal obligation</td></tr><tr><td>Employment, recruitment and governance</td><td>Professional, employment, application, training and board records</td><td>Contract, pre-contract steps, legal obligation and legitimate interests; special-category conditions would be documented where needed</td></tr><tr><td>Regulatory, quality and legal work</td><td>Professional contacts, licences, approvals, complaints and controlled evidence</td><td>Legal obligation, public-interest conditions where applicable, contract and legitimate interests</td></tr><tr><td>Optional marketing</td><td>Contact details and recorded preferences</td><td>Consent where required; withdrawal is available at any time</td></tr></tbody></table></div></section>
    <section><h2>6. Sources</h2><p>Data come from the individual, their employer or organisation, authorised representatives, customers and suppliers, public registers such as Companies House and regulatory registers, approved service providers, security logs and records created through NovaPharm's business processes. NovaPharm does not buy patient lists.</p></section>
    <section><h2>7. Recipients and processors</h2><p>Access is limited by role and business need. GitHub currently hosts the public static website. Microsoft Azure is the approved target for the managed application, database, private files, security telemetry and identity services, but will process application data only after the controlled deployment is activated. Microsoft may also process data through Microsoft 365, Entra ID and SharePoint when configured. Resend processes transactional email only when enabled. Approved logistics, finance, quality, regulatory or technology providers receive data only when a contract, lawful purpose and real data flow require it; naming a prospective provider does not make it a recipient. Regulators, courts or public bodies may receive data where lawfully required.</p></section>
    <section><h2>8. International transfers</h2><p>Some approved providers may process data outside the UK. Before enabling such a flow, NovaPharm will identify the destination and recipient, check whether UK adequacy regulations apply and, where needed, put in place an International Data Transfer Agreement or UK Addendum and a transfer risk assessment. Provider contracts and subprocessor locations remain subject to due diligence.</p></section>
    <section><h2>9. Retention and security</h2><p>NovaPharm keeps data only while needed for the stated purpose and any applicable company, tax, contractual, regulatory, quality, employment, limitation, security or legal requirement. The internal retention schedule records the owner, trigger, legal or operational rationale and disposal action for each record class; periods that depend on a licence, product, contract or dispute are set only after the relevant obligation is confirmed. Implemented application controls include access scopes, password hashing for the transitional fallback, secure cookies, CSRF protection, audit events and private storage. The approved Azure design adds managed identity, Azure SQL, private Blob quarantine, Key Vault and monitored backups after deployment. SharePoint least-privilege changes remain subject to separate owner approval. No internet service can promise absolute security.</p></section>
    <section><h2>10. Rights</h2><p>Depending on the circumstances, individuals may request access, rectification, erasure, restriction, portability or objection, and may withdraw consent without affecting earlier lawful processing. Requests can be made through the privacy contact route. Identity and authority may need to be verified. Individuals may complain to the <a href="https://ico.org.uk/make-a-complaint/">Information Commissioner's Office</a>.</p></section>
    <section id="artificial-intelligence"><h2>11. Public search, AI and automated decisions</h2><p>NovaPharm's public Search &amp; Ask experience uses a repository-generated index of approved public pages. Conventional search and optional semantic retrieval process the query in the visitor's browser. The query and answer are not sent to an external AI provider, recorded by the assistant or included in analytics. The optional NovaPharm Evidence Vector asset and its approved-content embeddings are downloaded only after explicit activation and may be stored in a browser IndexedDB cache until the visitor clears it or the browser removes it. The interface includes a clear-cache control. Portal records, submissions, uploaded documents, customer data and private business-plan material are excluded from the public index.</p><p>NovaPharm does not currently use solely automated decisions that produce legal or similarly significant effects through this website. Internal AI prototypes are provider-disabled by default, restricted to authorised users and designed only to support human review. They cannot approve, publish or change a production record. The B2B website is not directed to children and NovaPharm does not knowingly seek children's data here. The general form and public assistant must not be used for adverse-event reports, product-quality complaints containing patient data or medical emergencies.</p></section>
    <section><h2>12. Changes</h2><p>NovaPharm will update the version, effective date and review record when this notice or the underlying data map changes materially. Important changes will be communicated through an appropriate website or direct notice.</p><p>Relevant official guidance includes the <a href="https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-be-informed/">ICO right-to-be-informed guidance</a> and <a href="https://ico.org.uk/about-the-ico/what-we-do/legislation-we-cover/data-use-and-access-act-2025/the-data-use-and-access-act-2025-what-does-it-mean-for-organisations/">ICO Data (Use and Access) Act 2025 overview</a>.</p></section>`);
}

function cookiesPage() {
  return policyPage("legal/cookies", "Cookie and storage notice", "NovaPharm uses only the technologies listed below. Non-essential categories remain off unless the visitor makes an affirmative choice.", `
    <section><h2>1. Current register</h2><div class="table-wrap" role="region" aria-label="Cookie and browser storage register" tabindex="0"><table><thead><tr><th>Name</th><th>Type and provider</th><th>Purpose</th><th>Duration</th><th>Consent or activation</th></tr></thead><tbody><tr><td><code>np_csrf</code></td><td>First-party cookie; NovaPharm</td><td>Prevents forged form and portal requests</td><td>1 hour</td><td>Strictly necessary</td></tr><tr><td><code>np_session</code></td><td>First-party cookie; NovaPharm</td><td>Maintains an authenticated, role-scoped secure session</td><td>30 minutes of inactivity or 8 hours absolute, with earlier logout/revocation</td><td>Strictly necessary for the requested portal</td></tr><tr><td><code>np_cookie_consent</code></td><td>First-party local storage; NovaPharm</td><td>Remembers consent version, selected categories, timestamp and a random preference-record identifier</td><td>180 days</td><td>Necessary to remember the visitor's choice</td></tr><tr><td><code>novapharm-public-ai</code></td><td>First-party IndexedDB; NovaPharm</td><td>Optionally caches the approved local semantic retrieval asset and public-content embeddings so a visitor can reuse private on-device search</td><td>Until the visitor uses Clear optional cache, the browser removes it or site data are cleared</td><td>Created only after the visitor explicitly enables private semantic retrieval; no query or answer is stored</td></tr></tbody></table></div></section>
    <section><h2>2. Categories</h2><p>Strictly necessary technologies support security, forms and an authenticated portal. Preference storage remembers the choices a visitor asks the site to retain. Analytics and marketing are separate optional categories. The current production candidate contains no enabled analytics, advertising, social pixel or marketing tag, and no such tool may be added without updating this register, completing a transfer and privacy review, and honouring the saved category choice.</p></section>
    <section><h2>3. Your choices</h2><p>The first layer offers equally accessible controls to accept all, reject non-essential technologies or manage categories. Optional boxes are off by default. Use <button class="inline-link-button" type="button" data-cookie-settings>Cookie settings</button> at any time to change or withdraw a choice. Rejecting optional categories does not block ordinary public content.</p></section>
    <section><h2>4. Evidence and transfers</h2><p>The preference record stays in the browser and is not used for unrelated tracking. It contains no name, email or portal data. Current first-party cookies do not themselves initiate an international transfer. Any future third-party analytics or marketing provider requires a documented recipient, purpose, duration and transfer assessment before activation.</p></section>
    <section><h2>5. Audit method</h2><p>The release audit checks application source and generated response headers, and automated tests assert that optional categories default to off and remain off after rejection. Browser inspection of cookies, local storage and network requests remains a required preview and production acceptance step. The approach follows the ICO's final April 2026 <a href="https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/">guidance on storage and access technologies</a>. NovaPharm does not rely on a statistical-purpose exception in this release; optional analytics remains absent and off.</p></section>`);
}

function termsPage() {
  return policyPage("legal/terms", "Website terms of use", "These terms govern the public corporate website and, together with applicable account terms, the secure NovaPharm portal.", `
    <section><h2>1. Operator and acceptance</h2><p>This website is operated by ${company.legalName}, company number ${company.companyNumber}, registered in England and Wales with registered office at ${company.registeredAddress}. By using it, you agree to use it lawfully and consistently with these terms. Separate signed terms govern any supply, service, employment, investment or partnership relationship.</p></section>
    <section><h2>2. B2B and regulatory boundary</h2><p>The website is for corporate and qualified B2B information. It is not a patient-ordering service and provides no medical, prescribing or dispensing advice. Nothing on the website is an offer to supply an unauthorised product. Product availability, WDA(H), PLPI, NHS supply, partnership, logistics, AI and traceability statements are subject to the status labels and regulatory caveats shown on the relevant page.</p></section>
    <section><h2>3. Permitted use and intellectual property</h2><p>You may view and use public content for legitimate business evaluation. Unless law or a signed agreement permits otherwise, you must not reproduce substantial content, remove notices, misrepresent NovaPharm material, scrape secure areas, introduce malicious code, test security without written authorisation or use the website to infringe another person's rights. NovaPharm and its licensors retain applicable intellectual-property rights.</p></section>
    <section><h2>4. Portal accounts and confidential documents</h2><p>Users must protect credentials, complete required password changes, use only authorised access scopes and notify NovaPharm of suspected compromise. Portal documents, board materials, prices, customer records and operational data may be confidential and may be used only for the authorised purpose. Attempts to bypass access controls, enumerate users or retrieve another customer's data are prohibited.</p></section>
    <section><h2>5. Accuracy, availability and links</h2><p>NovaPharm aims to keep corporate information accurate and labels developing capabilities conservatively, but information may change and should be independently checked before a regulated or commercial decision. Availability is not guaranteed. External links are provided for context; NovaPharm does not control their content or privacy practices.</p></section>
    <section><h2>6. Liability and law</h2><p>Nothing in these terms excludes liability that cannot lawfully be excluded, including liability for death or personal injury caused by negligence, fraud or fraudulent misrepresentation. Any remaining limitation must be interpreted in the context of the user's status and any signed agreement. These terms are intended to be governed by the law of England and Wales with the courts of England and Wales having jurisdiction, subject to mandatory rights and final legal review.</p><div class="regulatory-notice"><strong>Legal review</strong><p>The liability, jurisdiction and portal-contract wording requires final review by a UK solicitor before production approval.</p></div></section>
    <section><h2>7. Contact and changes</h2><p>Questions or reports of misuse can be submitted through the <a href="/contact/?enquiry=General%20enquiry">corporate contact route</a>. Material changes will update the version and review date.</p></section>`);
}

function accessibilityPage() {
  return policyPage("legal/accessibility", "Accessibility statement", "NovaPharm is designing the public website and secure portals toward WCAG 2.2 Level AA and will correct verified barriers.", `
    <section><h2>Commitment and target</h2><p>NovaPharm aims for perceivable, operable, understandable and robust experiences across keyboard, touch and assistive technology use. The implementation includes semantic landmarks, skip links, visible focus, labelled controls, error summaries, responsive layouts, reduced-motion support, intrinsic image dimensions and accessible status messages.</p></section>
    <section><h2>Testing approach</h2><p>Repository checks validate headings, language, image alternatives, form structure, links and protected shells. Automated accessibility and rendered Chromium and WebKit tests are part of the release gate. Manual keyboard, zoom, contrast, mobile reflow and screen-reader sampling are also required before claiming conformance.</p></section>
    <section><h2>Current status and known limitations</h2><p>NovaPharm targets WCAG 2.2 AA but does not claim full conformance until the live cross-browser, assistive-technology and independent review gates pass. Some controlled third-party documents may require accessible alternatives, and legacy Executive Platform source documents require page-by-page verification after secure synchronisation. These are tracked as acceptance items rather than treated as compliant by assumption.</p></section>
    <section><h2>Help and feedback</h2><p>To report a problem or request information in another format, use the <a href="/contact/?enquiry=General%20enquiry">contact route</a>, identify the page or document and describe the format or assistance needed. NovaPharm will acknowledge the request and assess a reasonable accessible alternative. If a response does not resolve the issue, ask for escalation to the website owner.</p></section>`);
}

function modernSlaveryPage() {
  return policyPage("legal/modern-slavery", "Modern Slavery and Human Rights Policy", "This is a voluntary policy. NovaPharm has not verified that the section 54 turnover threshold currently applies and does not publish this as a mandatory statutory statement.", `
    <section><h2>Applicability conclusion</h2><p>NovaPharm is a UK commercial organisation preparing to supply goods and services, but no verified evidence currently shows consolidated global turnover of at least GBP 36 million. On the information available, the mandatory section 54 publication duty has not been established. The Board will reassess turnover, group relationships and UK business activity annually and after a material transaction. If the duty applies, NovaPharm will prepare a financial-year-specific statement for board approval and director signature.</p></section>
    <section><h2>Commitment</h2><p>NovaPharm opposes forced labour, servitude, human trafficking and exploitative recruitment. The company expects lawful work, freely chosen employment, safe conditions, fair treatment and transparent subcontracting in its own operations and supply relationships.</p></section>
    <section><h2>Pharmaceutical supply-chain risks</h2><p>Risk assessment will consider manufacturing and raw-material labour; packaging; overseas sourcing; warehousing and temperature-controlled logistics; transport subcontractors; cleaning and facilities; recruitment and temporary labour; and CMO, CDMO, wholesaler and other subcontractor chains. Country, labour model, worker vulnerability, use of agents and visibility beyond the first tier may affect risk.</p></section>
    <section><h2>Due diligence and response</h2><p>Planned onboarding will collect ownership, licence, site, labour-practice and subcontracting information proportionate to risk; include contractual expectations and escalation routes; and record review decisions in the supplier master and controlled documents. Higher-risk evidence may require clarification, independent information or a corrective plan before approval. NovaPharm will not claim that audits, training or remediation occurred until records verify them. A concern will be assessed with worker safety as the priority; response may include escalation, remediation, suspension, termination or reporting where legally required.</p></section>
    <section><h2>Governance and effectiveness</h2><p>The Board owns this policy. Procurement, quality and operations roles will be assigned as the operating model matures. Effectiveness measures will be defined from real onboarding and incident data, such as risk-screen completion, evidence gaps and corrective actions; no unsupported zero-risk or zero-incident claim is made.</p><p>The current statutory threshold is described in the UK Government's <a href="https://www.gov.uk/government/publications/transparency-in-supply-chains-a-practical-guide">transparency in supply chains guidance</a>.</p></section>`);
}

function environmentPage() {
  return policyPage("legal/environment-carbon", "Environmental and Carbon Responsibility Statement", "This is a voluntary statement. NovaPharm has not established that mandatory SECR reporting applies and has not published unverified emissions or reduction claims.", `
    <section><h2>Applicability conclusion</h2><p>NovaPharm is not presented as a quoted company and no verified company data currently show that it meets at least two applicable SECR large-company tests. Mandatory reporting has therefore not been established. Company size, group position, energy use and procurement requirements will be reviewed with the accounts process each year. A contract-specific Carbon Reduction Plan will be prepared only where the procurement rules for that opportunity require one.</p></section>
    <section><h2>Measurement in development</h2><p>Operational emissions measurement is in development and a defensible baseline has not yet been established. The planned boundary will distinguish direct fuel and refrigerant emissions, purchased electricity and material value-chain categories. Any future target will remain provisional until the baseline, method, boundary and supporting data have been reviewed.</p></section>
    <section><h2>Priority sources and actions</h2><p>Materiality assessment will consider contracted warehousing; temperature-controlled and international freight; purchased logistics; packaging; waste; business travel; digital infrastructure; supplier energy and manufacturing evidence; and responsible procurement. Early action focuses on collecting reliable activity data, avoiding unnecessary transport and waste, reviewing packaging, engaging suppliers and considering energy efficiency in provider selection.</p></section>
    <section><h2>Claims and governance</h2><p>NovaPharm does not claim carbon neutrality, net zero, zero emissions, science-based targets, carbon-negative operations or verified reductions. Figures will be published only with the reporting period, organisational boundary, methodology, conversion factors, intensity measure, limitations and appropriate review. Evidence will be retained with the accounts or procurement record.</p><p>Reference sources include the UK Government's <a href="https://www.gov.uk/government/publications/environmental-reporting-guidelines-including-mandatory-greenhouse-gas-emissions-reporting-guidance">environmental reporting guidance</a> and current <a href="https://www.gov.uk/government/publications/ppn-006-taking-account-of-carbon-reduction-plans-in-the-procurement-of-major-government-contracts">PPN 006 Carbon Reduction Plan guidance</a>.</p></section>`);
}

function errorPage(code, title, message) {
  const meta = { title: `${code} ${title} | NovaPharm Healthcare`, description: message, eyebrow: `Error ${code}` };
  return `${head(meta, code === "404" ? "404" : "service-unavailable", { robots: "noindex,nofollow", schemas: [] })}<body class="error-page"><main id="main" class="error-shell"><a class="error-brand" href="/" aria-label="NovaPharm Healthcare home">${brandPicture({ width: 320, height: 40, eager: true })}</a><span>${code}</span><h1>${esc(title)}</h1><p>${esc(message)}</p><a class="btn btn-primary" href="/">Return to NovaPharm</a><button class="inline-link-button" type="button" data-cookie-settings>Cookie settings</button></main><script type="module" src="/assets/js/cookie-consent.js"></script></body></html>`;
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
  write("cro/index.html", croPage());
  write("oncology/index.html", oncologyPage());
  write("product-portfolio/index.html", productsPage());
  write("product-portfolio/nutraxin/index.html", nutraxinPage());
  write("partner-with-us/index.html", partnersPage());
  write("technology/index.html", technologyPage());
  write("technology/ai-governance/index.html", aiGovernancePage());
  write("search/index.html", searchPage());
  write("news-insights/index.html", insightsPage());
  for (const article of articles) write(`news-insights/${article.slug}/index.html`, articlePage(article));
  write("contact/index.html", contactPage());
  write("account-application/index.html", accountApplicationPage());
  write("investor-information/index.html", investorPage());
  write("careers/index.html", careersPage());
  write("legal/index.html", legalHubPage());
  write("legal/privacy/index.html", privacyPage());
  write("legal/cookies/index.html", cookiesPage());
  write("legal/terms/index.html", termsPage());
  write("legal/accessibility/index.html", accessibilityPage());
  write("legal/modern-slavery/index.html", modernSlaveryPage());
  write("legal/environment-carbon/index.html", environmentPage());
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
  write("robots.txt", `User-agent: *\nAllow: /\nDisallow: /portal/\nDisallow: /employee/\nDisallow: /admin/\nDisallow: /entra-complete/\nDisallow: /_secure/\nDisallow: /docs/\nDisallow: /NP_\nSitemap: ${siteUrl}/sitemap.xml\n`);
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
