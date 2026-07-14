import { company, leadership, pageMeta } from "../content/site-content.mjs";

export const SITE_URL = company.siteUrl;
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const INDEXNOW_KEY = "da125ceca8032e01fc98782c388f894f";
export const INDEXNOW_KEY_URL = `${SITE_URL}/${INDEXNOW_KEY}.txt`;

export const officialSourceRegister = Object.freeze([
  {
    topic: "Google AI features and generative-search eligibility",
    url: "https://developers.google.com/search/docs/appearance/ai-features",
    reviewed: "2026-07-14",
    decision: "Use normal people-first SEO, indexable HTML, internal linking, matching structured data and high-quality media; no AI-only duplicate pages or special AI schema."
  },
  {
    topic: "Google Organization structured data",
    url: "https://developers.google.com/search/docs/appearance/structured-data/organization",
    reviewed: "2026-07-14",
    decision: "Publish one consistent Organization entity with a persistent @id, verified legal identity, official logo, founder relationship and conservative business description."
  },
  {
    topic: "Google ProfilePage structured data",
    url: "https://developers.google.com/search/docs/appearance/structured-data/profile-page",
    reviewed: "2026-07-14",
    decision: "Use ProfilePage only on visible canonical leadership biographies and connect mainEntity to the same Person @id used site-wide."
  },
  {
    topic: "Google Article structured data",
    url: "https://developers.google.com/search/docs/appearance/structured-data/article",
    reviewed: "2026-07-14",
    decision: "Connect each visible article to its canonical author and publisher, accurate dates, representative image and visible headline."
  },
  {
    topic: "Google sitemaps",
    url: "https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview",
    reviewed: "2026-07-14",
    decision: "Generate canonical page, insight and image sitemaps from the repository source of truth; exclude redirects, noindex and protected routes."
  },
  {
    topic: "Google robots.txt",
    url: "https://developers.google.com/search/docs/crawling-indexing/robots/intro",
    reviewed: "2026-07-14",
    decision: "Allow public corporate content while keeping portals, private documents and validation environments outside discovery; never treat robots.txt as an access-control mechanism."
  },
  {
    topic: "Google site names",
    url: "https://developers.google.com/search/docs/appearance/site-names",
    reviewed: "2026-07-14",
    decision: "Use NovaPharm Healthcare consistently in visible branding, WebSite structured data and social metadata."
  },
  {
    topic: "Google Knowledge Panels",
    url: "https://support.google.com/knowledgepanel/answer/9163198",
    reviewed: "2026-07-14",
    decision: "Build verifiable entity consistency; never claim that schema or repository work guarantees a panel. Claim or suggest changes only through an owner-controlled Google flow if a panel exists."
  },
  {
    topic: "IndexNow protocol",
    url: "https://www.indexnow.org/documentation",
    reviewed: "2026-07-14",
    decision: "Host a root verification key and submit only canonical URLs that were created, materially updated, redirected or removed; support dry-run and explicit response handling."
  },
  {
    topic: "OpenAI search crawling",
    url: "https://help.openai.com/en/articles/12627856-publishers-and-developers-faq",
    reviewed: "2026-07-14",
    decision: "Allow OAI-SearchBot on public content, retain noindex and authentication on private areas, and recognise utm_source=chatgpt.com for attribution. GPTBot is governed separately."
  },
  {
    topic: "Core Web Vitals",
    url: "https://web.dev/articles/vitals",
    reviewed: "2026-07-14",
    decision: "Maintain LCP <= 2.5s, INP <= 200ms and CLS <= 0.1 at the 75th percentile where field data exists."
  },
  {
    topic: "WAI-ARIA authoring practices",
    url: "https://www.w3.org/WAI/ARIA/apg/",
    reviewed: "2026-07-14",
    decision: "Use semantic HTML first and accurate names, roles, states and keyboard behaviour for interactive controls and agent accessibility."
  }
]);

export const canonicalEntities = Object.freeze([
  {
    type: "Organization",
    canonicalName: company.name,
    legalName: company.legalName,
    alternateNames: ["NovaPharm Healthcare Ltd"],
    canonicalUrl: SITE_URL,
    id: ORGANIZATION_ID,
    companyNumber: company.companyNumber,
    description: company.summary,
    image: `${SITE_URL}/assets/brand/novapharm-healthcare-logo.png`,
    role: "UK corporate entity preparing regulated B2B pharmaceutical market-entry, sourcing and distribution capabilities",
    verifiedSources: [company.companiesHouseUrl, SITE_URL],
    lastVerified: "2026-07-14"
  },
  ...leadership.map((person) => ({
    type: "Person",
    canonicalName: person.displayName,
    legalName: person.name,
    alternateNames: person.name === person.displayName ? [] : [person.name],
    canonicalUrl: `${SITE_URL}/leadership/${person.slug}/`,
    id: `${SITE_URL}/leadership/${person.slug}/#person`,
    description: person.summary,
    image: person.image ? `${SITE_URL}${person.image}` : null,
    role: person.schemaTitle,
    organizationRelationship: ORGANIZATION_ID,
    verifiedSources: [...person.sameAs, `${SITE_URL}/leadership/${person.slug}/`],
    lastVerified: "2026-07-14"
  }))
]);

export const crawlerPolicy = Object.freeze([
  { crawler: "Googlebot", purpose: "Google Search and Google AI features", publicAccess: true, trainingAccess: null },
  { crawler: "Bingbot", purpose: "Bing Search and Microsoft search experiences", publicAccess: true, trainingAccess: null },
  { crawler: "OAI-SearchBot", purpose: "ChatGPT Search discovery and citation", publicAccess: true, trainingAccess: false },
  { crawler: "GPTBot", purpose: "Potential OpenAI model improvement", publicAccess: false, trainingAccess: false },
  { crawler: "Google-Extended", purpose: "Google model training and grounding outside normal Search crawling", publicAccess: false, trainingAccess: false }
]);

export const protectedPaths = Object.freeze([
  "/portal/",
  "/employee/",
  "/admin/",
  "/entra-complete/",
  "/_secure/",
  "/docs/",
  "/api/",
  "/NP_"
]);

export const topicPillars = Object.freeze([
  "UK pharmaceutical market entry",
  "Pharmaceutical sourcing resilience",
  "PLPI strategy and product assessment",
  "WDA(H), GDP and quality readiness",
  "Pharmaceutical market access",
  "CMO and CDMO partnerships",
  "Oral-liquid development and technology transfer",
  "Supplier qualification and vendor oversight",
  "Pharmaceutical supply-chain integrity",
  "Batch, expiry and documentation controls",
  "Post-Brexit UK and European pharmaceutical pathways",
  "Oncology and specialty-medicine supply considerations",
  "Pharmaceutical distribution operations",
  "Cross-border pharmaceutical partnerships",
  "Regulatory-commercial launch sequencing",
  "Quality systems, CAPA, complaints and recall readiness",
  "Data and technology in regulated pharmaceutical operations",
  "Nutraceutical and medical-device market-entry considerations"
]);

export const audienceStrategy = Object.freeze([
  ["Pharmaceutical manufacturers", "Find a controlled UK market-entry and distribution route", "/services/", "Discuss UK market entry"],
  ["CMO and CDMO organisations", "Assess technical transfer, quality and commercial fit", "/services/", "Discuss CMO/CDMO collaboration"],
  ["Marketing-authorisation and dossier owners", "Evaluate product-specific UK regulatory and commercial viability", "/regulatory-services/", "Submit a product opportunity"],
  ["EU and UK licensed wholesalers", "Develop qualified sourcing and distribution relationships", "/partner-with-us/", "Become a supply partner"],
  ["Independent pharmacies and pharmacy groups", "Understand planned account, supply and service pathways", "/account-application/", "Open a business account"],
  ["Hospital procurement stakeholders", "Review future B2B supply and governance capability without unsupported availability claims", "/contact/", "Discuss a qualified requirement"],
  ["Logistics providers", "Integrate controlled storage, transport and evidence flows", "/technology/", "Discuss logistics integration"],
  ["Regulatory and quality professionals", "Evaluate governance, QMS, GDP and product-readiness thinking", "/regulatory-services/", "Discuss quality readiness"],
  ["Technology providers", "Connect data, document and controlled workflow capabilities", "/technology/", "Explore a technology partnership"],
  ["Strategic partners and investors", "Understand governance, operating model and staged execution", "/investor-information/", "Start a strategic conversation"]
]);

export const conversionJourneys = Object.freeze([
  { id: "uk-market-entry", landing: "/services/", cta: "Discuss UK market entry", enquiryType: "Distribution partnership" },
  { id: "product-opportunity", landing: "/product-portfolio/", cta: "Submit a product opportunity", enquiryType: "Product opportunity" },
  { id: "supply-partner", landing: "/partner-with-us/", cta: "Become a supply partner", enquiryType: "Supplier enquiry" },
  { id: "cmo-cdmo", landing: "/services/", cta: "Discuss CMO/CDMO collaboration", enquiryType: "CMO/CDMO partnership" },
  { id: "regulatory-quality", landing: "/regulatory-services/", cta: "Speak with our regulatory team", enquiryType: "Regulatory services" },
  { id: "technology-partnership", landing: "/technology/", cta: "Explore a technology partnership", enquiryType: "General enquiry" },
  { id: "business-account", landing: "/account-application/", cta: "Open a business account", enquiryType: "Pharmacy or wholesaler account" },
  { id: "media", landing: "/contact/", cta: "Contact the company", enquiryType: "Media" }
]);

export const performanceBudgets = Object.freeze({
  lcpMilliseconds: 2500,
  inpMilliseconds: 200,
  cls: 0.1,
  initialJavaScriptBytes: 180000,
  initialCssBytes: 180000,
  heroMediaBytes: 900000,
  singleImageBytes: 450000,
  initialTransferBytes: 1800000
});

export const publicPageMeta = Object.freeze(Object.fromEntries(
  Object.entries(pageMeta).map(([slug, meta]) => [slug, {
    ...meta,
    canonical: `${SITE_URL}${slug ? `/${slug}/` : "/"}`,
    indexable: true,
    language: "en-GB"
  }])
));
