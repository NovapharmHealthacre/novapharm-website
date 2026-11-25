import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { company, leadership, pageMeta } from "../src/content/site-content.mjs";
import { textContentFromFragment } from "./lib/html-text.mjs";
import { personIdForSlug, personUrlForSlug, VISHAL_PROFILE_ID } from "../src/seo/person-identity.mjs";
import { publicAnalyticsRoute, validGa4Id } from "../assets/js/consent-analytics.js";
import {
  INDEXNOW_KEY,
  INDEXNOW_KEY_URL,
  ORGANIZATION_ID,
  SITE_URL,
  WEBSITE_ID,
  canonicalEntities,
  crawlerPolicy,
  officialSourceRegister,
  protectedPaths
} from "../src/seo/authority-config.mjs";

const root = resolve(process.cwd());
const officialNeutrals = JSON.parse(readFileSync(join(root, "config/brand-neutrals.json"), "utf8"));
if (officialNeutrals.primary !== "#FFFFFF") {
  throw new Error("Canonical public HTML generator requires approved Pure White");
}

// Canonical pages are sourced from both fresh templates and older product HTML.
// Normalise only the browser theme tag; never rewrite inverse text, dark visuals,
// a product's source data, or protected-route metadata.
function normalizePublicTheme(html, file) {
  const headEnd = html.search(/<\/head\s*>/i);
  if (headEnd < 0) throw new Error("Canonical HTML has no closing head: " + file);
  const head = html.slice(0, headEnd);
  const themeTags = [...head.matchAll(/<meta\b[^>]*\bname\s*=\s*["']theme-color["'][^>]*>/gi)];
  if (themeTags.length > 1) throw new Error("Duplicate canonical browser theme tags: " + file);
  const replacement = '<meta name="theme-color" content="' + officialNeutrals.primary + '">';
  if (themeTags.length === 0) {
    return html.slice(0, headEnd) + replacement + "\n" + html.slice(headEnd);
  }
  return html.replace(themeTags[0][0], replacement);
}

const releaseDate = process.env.SEO_LASTMOD || "2026-07-18";
const materialPageReleaseDate = (route) => {
  if (route === "/" || route === "/about/company/") return "2026-11-22";
  if (route.startsWith("/products/nutraxin/") && route !== "/products/nutraxin/") return "2026-11-20";
  return ["/services/", "/distribution/", "/market-access/", "/markets/"].includes(route)
    ? "2026-11-10" : releaseDate;
};
const logoUrl = `${SITE_URL}/assets/brand/novapharm-healthcare-logo.png`;
// The approved 512px square NovaPharm mark is the preferred Google Organization logo.
// Keep the wide wordmark as a separate image for on-site corporate branding.
const squareLogoUrl = `${SITE_URL}/assets/brand/pwa-icon-512.png`;
const leaderBySlug = new Map(leadership.map((person) => [person.slug, person]));
const articleDirectory = join(root, "src", "content", "insights");
const articles = readdirSync(articleDirectory)
  .filter((file) => file.endsWith(".json"))
  .map((file) => JSON.parse(readFileSync(join(articleDirectory, file), "utf8")));
const articleBySlug = new Map(articles.map((article) => [article.slug, article]));

function escXml(value) {
  return String(value).replace(/[<>&'\"]/g, (character) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;"
  })[character]);
}

function write(path, content) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function routeForFile(file) {
  if (file === "index.html") return "/";
  return `/${file.replace(/index\.html$/, "").split(sep).join("/")}`;
}

function canonicalForRoute(route) {
  return new URL(route, `${SITE_URL}/`).toString();
}

function extract(html, pattern, fallback = "") {
  return html.match(pattern)?.[1] || fallback;
}

function textContent(value = "") {
  return textContentFromFragment(value);
}

function canonicalOrganization() {
  return {
    "@context": "https://schema.org",
    "@id": ORGANIZATION_ID,
    "@type": ["Organization", "Corporation"],
    name: company.name,
    legalName: company.legalName,
    alternateName: "NovaPharm Healthcare Ltd",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      "@id": `${SITE_URL}/#logo`,
      url: squareLogoUrl,
      contentUrl: squareLogoUrl,
      width: 512,
      height: 512,
      caption: `${company.name} brand mark`
    },
    image: {
      "@type": "ImageObject",
      "@id": `${SITE_URL}/#wordmark`,
      url: logoUrl,
      contentUrl: logoUrl,
      width: 2048,
      height: 258,
      caption: company.name
    },
    identifier: {
      "@type": "PropertyValue",
      propertyID: "Companies House company number",
      value: company.companyNumber,
      url: company.companiesHouseUrl
    },
    foundingDate: company.incorporated,
    location: { "@type": "Country", name: company.headquarters },
    department: company.divisions.map(division => ({ "@type": "Organization", "@id": `${company.siteUrl}/#${division.id}`, name: division.name, url: `${company.siteUrl}${division.path}`, parentOrganization: { "@id": `${company.siteUrl}/#organization` } })),
    foundingLocation: { "@type": "Country", name: "United Kingdom" },
    mainEntityOfPage: { "@id": `${SITE_URL}/#webpage` },
    description: company.summary,
    telephone: company.publicTelephone,
    email: company.publicEnquiriesEmail,
    contactPoint: { "@type": "ContactPoint", contactType: "business enquiries and customer service", telephone: company.publicTelephone, email: company.publicEnquiriesEmail, url: `${SITE_URL}/contact/`, availableLanguage: "en-GB", areaServed: "GB" },
    sameAs: [company.companiesHouseUrl, "https://www.linkedin.com/company/novapharm-healthcare/", "https://www.wikidata.org/wiki/Q137660644"],
    founder: leadership.filter(person => person.governance.startsWith("Founder")).map(person => ({ "@type": "Person", "@id": personIdForSlug(person.slug), name: person.displayName, jobTitle: person.schemaTitle, url: personUrlForSlug(person.slug) })),
    member: leadership.filter(person => person.governance === "Founder and statutory director" || person.governance === "Statutory director").map(person => ({ "@type": "Person", "@id": personIdForSlug(person.slug), name: person.displayName, jobTitle: person.schemaTitle, url: personUrlForSlug(person.slug), ...(person.image ? { image: `${SITE_URL}${person.image}` } : {}) })),
    areaServed: [
      { "@type": "Country", name: "United Kingdom" },
      { "@type": "AdministrativeArea", name: "Selected international regulated markets" }
    ],
    knowsAbout: [
      company.industry,
      "UK pharmaceutical market entry",
      "pharmaceutical sourcing resilience",
      "PLPI strategy",
      "Good Distribution Practice",
      "pharmaceutical quality systems",
      "CMO and CDMO partnerships",
      "pharmaceutical supply-chain integrity",
      "clinical-development programme coordination"
    ],
    ethicsPolicy: `${SITE_URL}/legal/#editorial-standards`
  };
}

function canonicalWebsite() {
  return {
    "@context": "https://schema.org",
    "@id": WEBSITE_ID,
    "@type": "WebSite",
    name: company.name,
    alternateName: "NovaPharm Healthcare Ltd",
    url: SITE_URL,
    publisher: { "@id": ORGANIZATION_ID },
    inLanguage: "en-GB"
  };
}

function normalizePerson(schema, person) {
  const canonicalUrl = `${SITE_URL}/leadership/${person.slug}/`;
  return {
    ...schema,
    "@context": "https://schema.org",
    "@id": personIdForSlug(person.slug),
    "@type": "Person",
    name: person.displayName,
    alternateName: person.name !== person.displayName ? person.name : undefined,
    jobTitle: person.schemaTitle,
    url: personUrlForSlug(person.slug),
    image: person.image ? {
      "@type": "ImageObject",
      url: `${SITE_URL}${person.image}`,
      contentUrl: `${SITE_URL}${person.image}`,
      caption: `${person.displayName}, ${person.schemaTitle} at NovaPharm Healthcare`
    } : undefined,
    description: person.summary,
    worksFor: { "@id": ORGANIZATION_ID },
    affiliation: { "@id": ORGANIZATION_ID },
    sameAs: person.sameAs,
    knowsAbout: person.expertise,
    mainEntityOfPage: { "@id": person.slug === "vishal-chakravarty" ? VISHAL_PROFILE_ID : `${canonicalUrl}#webpage` }
  };
}

function normalizeArticle(schema, article, canonical, html) {
  const author = leadership.find((person) => person.displayName === article.author || person.name === article.author) || leadership[0];
  const image = canonicalForRoute(article.heroImage);
  const words = article.sections.flatMap((section) => [
    ...(section.paragraphs || []),
    ...(section.list || [])
  ]).join(" ").match(/\S+/g)?.length || 0;
  const updated = article.updated || article.published;
  return {
    ...schema,
    "@context": "https://schema.org",
    "@id": `${canonical}#article`,
    "@type": ["Article", "BlogPosting"],
    headline: article.title,
    description: article.summary,
    url: canonical,
    mainEntityOfPage: { "@id": `${canonical}#webpage` },
    author: { "@id": personIdForSlug(author.slug) },
    publisher: { "@id": ORGANIZATION_ID },
    image: {
      "@type": "ImageObject",
      url: image,
      contentUrl: image,
      width: 1200,
      height: 675,
      caption: article.title
    },
    datePublished: article.published,
    dateModified: updated,
    inLanguage: "en-GB",
    isAccessibleForFree: true,
    wordCount: words,
    timeRequired: `PT${Math.max(4, Math.ceil(words / 220))}M`,
    articleSection: article.category,
    about: { "@id": ORGANIZATION_ID },
    keywords: [...new Set([article.category, ...(article.keywords || [])])].join(", "),
    copyrightHolder: { "@id": ORGANIZATION_ID },
    copyrightYear: Number(article.published.slice(0, 4)),
    speakable: undefined,
    text: undefined,
    _visibleH1: textContent(extract(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i))
  };
}

function cleanUndefined(value) {
  if (Array.isArray(value)) return value.map(cleanUndefined).filter((item) => item !== undefined);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, cleanUndefined(item)]));
  }
  return value;
}

function enhanceJsonLd(html, route, article, leader) {
  const canonical = canonicalForRoute(route);
  const matches = [...html.matchAll(/\s*<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  const schemas = [];
  for (const match of matches) {
    try {
      let schema = JSON.parse(match[1].replaceAll("#organisation", "#organization"));
      const types = Array.isArray(schema["@type"]) ? schema["@type"] : [schema["@type"]];
      if (types.includes("Organization")) {
        if (route === "/") schemas.push(canonicalOrganization());
        continue;
      }
      if (types.includes("WebSite")) {
        if (route === "/") schemas.push(canonicalWebsite());
        continue;
      }
      if (types.includes("Person") && leader) schema = normalizePerson(schema, leader);
      if ((types.includes("Article") || types.includes("BlogPosting")) && article) schema = normalizeArticle(schema, article, canonical, html);
      if (types.includes("ProfilePage") && leader) {
        schema = {
          ...schema,
          "@id": `${canonical}#webpage`,
          "@type": "ProfilePage",
          url: canonical,
          isPartOf: { "@id": WEBSITE_ID },
          about: { "@id": personIdForSlug(leader.slug) },
          mainEntity: { "@id": personIdForSlug(leader.slug) },
          primaryImageOfPage: leader.image ? { "@type": "ImageObject", url: `${SITE_URL}${leader.image}` } : undefined,
          dateModified: releaseDate
        };
      }
      if (types.includes("WebPage")) {
        schema = {
          ...schema,
          "@id": `${canonical}#webpage`,
          url: canonical,
          isPartOf: { "@id": WEBSITE_ID },
          about: schema.about || { "@id": ORGANIZATION_ID },
          ...(route === "/about/company/" ? { mainEntity: { "@id": ORGANIZATION_ID } } : {}),
          dateModified: materialPageReleaseDate(route)
        };
      }
      schema = JSON.parse(JSON.stringify(schema).replaceAll("#organisation", "#organization"));
      schemas.push(cleanUndefined(schema));
    } catch {
      throw new Error(`Invalid JSON-LD encountered while enhancing ${route}.`);
    }
  }

  if (route === "/" && !schemas.some((schema) => (Array.isArray(schema["@type"]) ? schema["@type"] : [schema["@type"]]).includes("Organization"))) {
    schemas.unshift(canonicalOrganization(), canonicalWebsite());
  }

  html = html.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, "");
  const serialized = schemas.map((schema) => `  <script type="application/ld+json">${JSON.stringify(schema)}</script>`).join("\n");
  return html.replace("</head>", `${serialized}\n</head>`);
}

function addCompanyIdentityLinks(html, route) {
  if (route !== "/about/company/" || html.includes("data-company-identity-links")) return html;
  const anchor = `<a class="text-link" href="${company.companiesHouseUrl}">View the official company record</a>`;
  if (!html.includes(anchor)) throw new Error("Company identity references need the visible Companies House record link.");
  const links = '<p data-company-identity-links>Public company identity cross-references: ' +
    '<a href="https://www.linkedin.com/company/novapharm-healthcare/">NovaPharm on LinkedIn</a> and ' +
    '<a href="https://www.wikidata.org/wiki/Q137660644">Wikidata (community-maintained)</a>.</p>';
  return html.replace(anchor, anchor + links);
}

function insertHeadSignals(html, canonical, article, leader) {
  const additions = [];
  if (!html.includes('hreflang="en-GB"')) additions.push(`<link rel="alternate" hreflang="en-GB" href="${canonical}">`);
  if (!html.includes('hreflang="x-default"')) additions.push(`<link rel="alternate" hreflang="x-default" href="${canonical}">`);
  if (!html.includes('name="referrer"')) additions.push('<meta name="referrer" content="strict-origin-when-cross-origin">');
  if (!html.includes('property="og:image:secure_url"')) {
    const image = extract(html, /<meta property="og:image" content="([^"]+)"/i, logoUrl);
    additions.push(`<meta property="og:image:secure_url" content="${image}">`);
  }
  if (!html.includes('name="twitter:image:alt"')) {
    const alt = extract(html, /<meta property="og:image:alt" content="([^"]+)"/i, "NovaPharm Healthcare");
    additions.push(`<meta name="twitter:image:alt" content="${alt}">`);
  }
  if (leader) additions.push(`<link rel="author" href="${canonical}">`);
  if (article) {
    const author = leadership.find((person) => person.displayName === article.author || person.name === article.author) || leadership[0];
    additions.push(
      `<link rel="author" href="${SITE_URL}/leadership/${author.slug}/">`,
      `<meta property="article:published_time" content="${article.published}">`,
      `<meta property="article:modified_time" content="${article.updated || article.published}">`,
      `<meta property="article:section" content="${article.category}">`
    );
  }
  return html.replace("</head>", `  ${additions.join("\n  ")}\n</head>`);
}

function addEditorialTrust(html, article) {
  if (!article || html.includes("data-editorial-trust")) return html;
  const author = leadership.find((person) => person.displayName === article.author || person.name === article.author) || leadership[0];
  const reviewLabel = article.reviewer ? ` Reviewed by ${article.reviewer}.` : "";
  const block = `<section class="section" data-editorial-trust><div class="container"><aside class="regulatory-notice" aria-label="Editorial standards"><strong>Editorial standards</strong><p>Written by <a href="/leadership/${author.slug}/">${author.displayName}</a>.${reviewLabel} This corporate B2B analysis distinguishes verified facts, professional interpretation and future NovaPharm intentions. It is not medical advice. <a href="/legal/#editorial-standards">Read the editorial, sourcing and corrections standards</a>.</p></aside></div></section>`;
  return html.replace("</main>", `${block}</main>`);
}

// Free, first-party link sharing. No LinkedIn SDK, tracking pixel, login or
// account permission is loaded until a visitor explicitly opens LinkedIn.
function addNativeArticleShare(html, article, canonical) {
  if (!article || html.includes("data-native-article-share")) return html;
  const destination = "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(canonical);
  const block = `<section class="section" data-native-article-share aria-label="Share this analysis"><div class="container"><p class="section-kicker">Continue the conversation</p><a class="btn btn-secondary" href="${destination}" target="_blank" rel="noopener noreferrer external" referrerpolicy="no-referrer">Share on LinkedIn <span class="sr-only">(opens a new tab)</span></a></div></section>`;
  return html.replace("</main>", `${block}</main>`);
}

function addLegalEditorialStandards(html, route) {
  if (route !== "/legal/" || html.includes('id="editorial-standards"')) return html;
  const section = `<section class="section" id="editorial-standards"><div class="container"><div class="section-head"><span class="section-kicker">Editorial governance</span><h2>Standards for pharmaceutical and corporate content.</h2><p>NovaPharm publishes corporate B2B information, operating frameworks and analysis under evidence, authorship and correction controls.</p></div><div class="grid grid-3"><article class="card"><h3>Authorship and review</h3><p>Named authors and reviewers are used where their verified role and contribution support the subject. “Medically reviewed” is not used unless a suitably qualified reviewer actually performs that review.</p></article><article class="card"><h3>Sources and updates</h3><p>Primary sources such as legislation, competent authorities, ICH, official filings and peer-reviewed literature are preferred. Material updates change the displayed modified date; cosmetic builds do not create false freshness.</p></article><article class="card"><h3>Corrections and conflicts</h3><p>Material factual errors are corrected transparently. Commercial relationships, future intentions and professional interpretation must not be presented as independent regulatory approval or current product availability.</p></article></div><div class="regulatory-notice"><strong>Scope limitation</strong><p>The website does not provide patient-level diagnosis, treatment or medicine-use advice. Questions about a published fact or correction may be submitted through the <a href="/contact/">corporate contact route</a>.</p></div></div></section>`;
  return html.replace("</main>", `${section}</main>`);
}

function addFooterEditorialLink(html) {
  if (html.includes('href="/legal/#editorial-standards"')) return html;
  return html.replace('<a href="/feed.xml">Insights feed</a>', '<a href="/feed.xml">Insights feed</a><a href="/legal/#editorial-standards">Editorial standards</a>');
}

function addAttributionSignals(html) {
  html = html.replace(/<a([^>]+)href="\/(contact|account-application|partner-with-us)\/"([^>]*)>([\s\S]*?)<\/a>/gi, (match, before, destination, after, label) => {
    if (/data-cta-id=/i.test(match)) return match;
    const ctaId = textContent(label).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || destination;
    return `<a${before}href="/${destination}/"${after} data-cta-id="${ctaId}">${label}</a>`;
  });
  if (!html.includes('/assets/js/marketing-attribution.js')) {
    html = html.replace("</body>", '<script type="module" src="/assets/js/marketing-attribution.js"></script>\n</body>');
  }
  return html;
}

const publicFiles = [];
const retiredOrCompatibilitySlugs = new Set([
  "search",
  "technology/ai-governance",
  "product-portfolio",
  "product-portfolio/nutraxin"
]);
for (const slug of Object.keys(pageMeta)) {
  if (!retiredOrCompatibilitySlugs.has(slug)) publicFiles.push(slug ? `${slug}/index.html` : "index.html");
}
for (const person of leadership) publicFiles.push(`leadership/${person.slug}/index.html`);
for (const article of articles) publicFiles.push(`news-insights/${article.slug}/index.html`);
const nutraxinProductDirectory = join(root, "products", "nutraxin");
if (existsSync(nutraxinProductDirectory)) {
  for (const entry of readdirSync(nutraxinProductDirectory, { withFileTypes: true })) {
    if (entry.isDirectory() && existsSync(join(nutraxinProductDirectory, entry.name, "index.html"))) {
      publicFiles.push(`products/nutraxin/${entry.name}/index.html`);
    }
  }
}
// ESCO is generated before SEO enhancement, not stored as a checked-in HTML directory.
// Its public collection page needs a canonical sitemap URL and consistent metadata.
publicFiles.push("products/esco/index.html");
publicFiles.push("account-application/index.html");

const pageRecords = [];
const imageRecords = [];
for (const file of [...new Set(publicFiles)]) {
  if (!existsSync(join(root, file))) throw new Error(`SEO enhancement expected ${file}.`);
  const route = routeForFile(file);
  const canonical = canonicalForRoute(route);
  const article = route.startsWith("/news-insights/") ? articleBySlug.get(route.split("/")[2]) : null;
  const leader = route.startsWith("/leadership/") ? leaderBySlug.get(route.split("/")[2]) : null;
  let html = readFileSync(join(root, file), "utf8").replaceAll("#organisation", "#organization");
  html = normalizePublicTheme(html, file);
  html = enhanceJsonLd(html, route, article, leader);
  html = insertHeadSignals(html, canonical, article, leader);
  html = addCompanyIdentityLinks(html, route);
  // Keep the editorial trust notice last: the downstream authorship reconciler
  // replaces its terminal section, so the native share link must precede it.
  html = addNativeArticleShare(html, article, canonical);
  html = addEditorialTrust(html, article);
  html = addLegalEditorialStandards(html, route);
  html = addFooterEditorialLink(html);
  html = addAttributionSignals(html);
  const measurementId = process.env.PUBLIC_GA4_MEASUREMENT_ID || "G-897L1VS8BX";
  const analyticsApproved = process.env.PUBLIC_ANALYTICS_PRIVACY_APPROVED === "true";
  if (analyticsApproved && measurementId && !validGa4Id(measurementId)) {
    throw new Error("Approved GA4 measurement identifier is invalid.");
  }
  // Every rebuild must remove stale GA4 tags from routes that are no longer
  // explicitly approved. Previously enhanced HTML is not evidence of consent.
  html = html.replace(/<meta name="novapharm-ga4-id" content="[^"]*">\s*\n?/g, "");
  html = html.replace(/<script type="module" src="\/assets\/js\/consent-analytics\.js"><\/script>\s*\n?/g, "");
  // The HTML publisher and the browser share exactly the same fail-closed
  // allowlist. Owner activation alone never enables a protected route.
  if (analyticsApproved && validGa4Id(measurementId) && publicAnalyticsRoute(route)) {
    html = html.replace("</head>", `  <meta name="novapharm-ga4-id" content="${measurementId}">\n</head>`);
    if (!html.includes('/assets/js/consent-analytics.js')) {
      html = html.replace("</body>", '<script type="module" src="/assets/js/consent-analytics.js"></script>\n</body>');
    }
  }
  write(file, html);

  const title = textContent(extract(html, /<title>([\s\S]*?)<\/title>/i));
  const description = extract(html, /<meta name="description" content="([^"]+)"/i);
  const h1 = textContent(extract(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i));
  const robots = extract(html, /<meta name="robots" content="([^"]+)"/i, "index,follow");
  pageRecords.push({
    route,
    canonical,
    file,
    title,
    description,
    h1,
    indexable: !/noindex/i.test(robots),
    schemaTypes: [...html.matchAll(/"@type":"([^"]+)"/g)].map((match) => match[1]),
    intendedCta: [...html.matchAll(/data-cta-id="([^"]+)"/g)].map((match) => match[1])
  });
  for (const image of html.matchAll(/<img\b[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/gi)) {
    if (!image[1].startsWith("/")) continue;
    imageRecords.push({ page: canonical, url: canonicalForRoute(image[1]), alt: image[2] });
  }
}

const sitemapEntries = pageRecords.filter((page) => page.indexable).map((page) => {
  const article = page.route.startsWith("/news-insights/") ? articleBySlug.get(page.route.split("/")[2]) : null;
  const lastmod = article ? (article.updated || article.published) : materialPageReleaseDate(page.route);
  return `<url><loc>${escXml(page.canonical)}</loc><lastmod>${lastmod}</lastmod></url>`;
});
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapEntries.join("")}</urlset>\n`);

const insightEntries = pageRecords.filter((page) => page.route.startsWith("/news-insights/") && page.route !== "/news-insights/").map((page) => {
  const article = articleBySlug.get(page.route.split("/")[2]);
  return `<url><loc>${escXml(page.canonical)}</loc><lastmod>${article.updated || article.published}</lastmod></url>`;
});
write("sitemap-insights.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${insightEntries.join("")}</urlset>\n`);

const imagesByPage = new Map();
for (const image of imageRecords) {
  if (!imagesByPage.has(image.page)) imagesByPage.set(image.page, new Map());
  imagesByPage.get(image.page).set(image.url, image);
}
const imageEntries = [...imagesByPage.entries()].map(([page, images]) => `<url><loc>${escXml(page)}</loc>${[...images.values()].map((image) => `<image:image><image:loc>${escXml(image.url)}</image:loc>${image.alt ? `<image:caption>${escXml(image.alt)}</image:caption>` : ""}</image:image>`).join("")}</url>`);
write("sitemap-images.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${imageEntries.join("")}</urlset>\n`);

const privateRules = protectedPaths.map((path) => `Disallow: ${path}`).join("\n");
write("robots.txt", `User-agent: *\nAllow: /\n${privateRules}\n\nUser-agent: Googlebot\nAllow: /\n${privateRules}\n\nUser-agent: Bingbot\nAllow: /\n${privateRules}\n\nUser-agent: OAI-SearchBot\nAllow: /\n${privateRules}\n\nUser-agent: Claude-SearchBot\nAllow: /\n${privateRules}\n\nUser-agent: PerplexityBot\nAllow: /\n${privateRules}\n\nUser-agent: Applebot\nAllow: /\n${privateRules}\n\n# Public search access is independent of model-training permission.\nUser-agent: GPTBot\nDisallow: /\n\nUser-agent: Google-Extended\nDisallow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\nSitemap: ${SITE_URL}/sitemap-insights.xml\nSitemap: ${SITE_URL}/sitemap-images.xml\n`);
write(`${INDEXNOW_KEY}.txt`, `${INDEXNOW_KEY}\n`);
write("llms.txt", "# NovaPharm Healthcare\n> Official public pages for NovaPharm Healthcare Ltd, a UK healthcare and pharmaceutical business. This is a navigational guide for readers and AI-assisted search tools, not an independent source of regulatory approval or commercial authorisation.\n\n## Official company and identity\n- [Official website](https://novapharmhealthcare.com/): Corporate overview and published capabilities\n- [Company](https://novapharmhealthcare.com/about/): Corporate background and operating context\n- [Leadership](https://novapharmhealthcare.com/leadership/): Named leadership biographies\n- [Governance](https://novapharmhealthcare.com/about/governance/): Public governance information\n- [Capabilities](https://novapharmhealthcare.com/capabilities/): Services and operating scope\n- [Contact](https://novapharmhealthcare.com/contact/): Official business contact route\n\n## Nutraxin UK food supplements\n- [Nutraxin product collection](https://novapharmhealthcare.com/products/nutraxin/): Browse the 19 listed food supplement products and product detail pages\n- [Products overview](https://novapharmhealthcare.com/products/): Consumer supplement and separate pharmaceutical portfolio navigation\n- [Vitamin D3 + K2, 120 tablets](https://novapharmhealthcare.com/products/nutraxin/vitamin-d3-k2-120-tablets/): Example individual product with pack details and current published UK price\n- [Magnesium Complex + Vitamin B6, 60 tablets](https://novapharmhealthcare.com/products/nutraxin/magnesium-complex-60-tablets/): Example individual product with supplier-transcribed composition\n\n## Pharmaceutical and technology work\n- [Regulatory services](https://novapharmhealthcare.com/regulatory-services/): UK and international regulatory services\n- [Oncology](https://novapharmhealthcare.com/oncology/): Oncology strategy and planned capabilities\n- [Technology](https://novapharmhealthcare.com/technology/): NovaPharm Intelligence and published technology status\n- [Insights](https://novapharmhealthcare.com/news-insights/): Editorial articles with published attribution\n\n## Index and boundaries\n- [Canonical XML sitemap](https://novapharmhealthcare.com/sitemap.xml): Public indexable URL inventory\n- [Editorial and legal standards](https://novapharmhealthcare.com/legal/): Source and content governance\n- Product availability, medicines authorisations, regulatory status and health claims should be assessed from the current official product pages and competent authorities, not assumed from this guide.\n- Private account, portal, internal documentation and customer records are not public reference sources.\n- Discovery and citation by any third-party search engine or AI assistant is controlled by that service; publication of this guide does not guarantee indexing, inclusion, ranking or endorsement.\n");


write("seo/generated/entity-register.json", `${JSON.stringify(canonicalEntities, null, 2)}\n`);
write("seo/generated/page-metadata-register.json", `${JSON.stringify(pageRecords, null, 2)}\n`);
write("seo/generated/crawler-policy.json", `${JSON.stringify(crawlerPolicy, null, 2)}\n`);
write("seo/generated/source-register.json", `${JSON.stringify(officialSourceRegister, null, 2)}\n`);
write("seo/generated/indexnow-config.json", `${JSON.stringify({ key: INDEXNOW_KEY, keyLocation: INDEXNOW_KEY_URL, host: new URL(SITE_URL).host }, null, 2)}\n`);

console.log(`Enhanced ${pageRecords.length} public pages, ${articles.length} Insights articles and ${leadership.length} leadership entities.`);
