import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { company, leadership, pageMeta } from "../src/content/site-content.mjs";
import {
  INDEXNOW_KEY,
  ORGANIZATION_ID,
  SITE_URL,
  WEBSITE_ID,
  canonicalEntities,
  crawlerPolicy,
  performanceBudgets
} from "../src/seo/authority-config.mjs";

const root = resolve(process.cwd());
let failures = 0;
const fail = (message) => { failures += 1; console.error(`SEO authority validation failed: ${message}`); };
const source = (path) => readFileSync(join(root, path), "utf8");
const unique = (values) => new Set(values).size === values.length;

const articles = readdirSync(join(root, "src/content/insights"))
  .filter((file) => file.endsWith(".json"))
  .map((file) => JSON.parse(source(`src/content/insights/${file}`)));
const publicFiles = [
  ...Object.keys(pageMeta).map((slug) => slug ? `${slug}/index.html` : "index.html"),
  ...leadership.map((person) => `leadership/${person.slug}/index.html`),
  ...articles.map((article) => `news-insights/${article.slug}/index.html`),
  "account-application/index.html"
];
const files = [...new Set(publicFiles)];
const records = [];
const linkedRoutes = new Set(["/"]);

function routeFor(file) {
  return file === "index.html" ? "/" : `/${file.replace(/index\.html$/, "")}`;
}

function parseSchemas(html, file) {
  const schemas = [];
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    try { schemas.push(JSON.parse(match[1])); }
    catch { fail(`${file} contains invalid JSON-LD`); }
  }
  return schemas;
}

for (const file of files) {
  if (!existsSync(join(root, file))) { fail(`missing generated public page ${file}`); continue; }
  const html = source(file);
  const route = routeFor(file);
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1];
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1];
  const description = html.match(/<meta name="description" content="([^"]+)"/i)?.[1];
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  const robots = html.match(/<meta name="robots" content="([^"]+)"/i)?.[1] || "";
  const schemas = parseSchemas(html, file);
  const schemaText = JSON.stringify(schemas);

  if (canonical !== `${SITE_URL}${route}`) fail(`${file} canonical is not the exact apex route`);
  if (!title || title.length < 20 || title.length > 75) fail(`${file} title length is outside the editorial range`);
  if (!description || description.length < 70 || description.length > 200) fail(`${file} meta description length is outside the editorial range`);
  if (h1s.length !== 1) fail(`${file} must contain exactly one H1`);
  if (/noindex/i.test(robots)) fail(`${file} is an intended public page but is noindex`);
  if (!html.includes('hreflang="en-GB"') || !html.includes('hreflang="x-default"')) fail(`${file} lacks canonical language alternates`);
  if (!html.includes('property="og:image:secure_url"') || !html.includes('name="twitter:image:alt"')) fail(`${file} lacks complete social image metadata`);
  if (!html.includes('/assets/js/marketing-attribution.js')) fail(`${file} lacks consent-aware attribution support`);
  if (schemaText.includes("#organisation")) fail(`${file} uses the retired British-spelling entity id`);
  if (!schemaText.includes("#organization")) fail(`${file} is not connected to the canonical organisation entity`);
  if (!schemaText.includes(WEBSITE_ID)) fail(`${file} is not connected to the canonical WebSite entity`);
  if (!schemas.some((schema) => {
    const types = Array.isArray(schema["@type"]) ? schema["@type"] : [schema["@type"]];
    return types.includes("WebPage") || types.includes("ProfilePage") || types.includes("AboutPage") || types.includes("ContactPage");
  })) fail(`${file} lacks an appropriate page entity`);

  for (const image of html.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\balt="[^"]*"/i.test(image[0])) fail(`${file} has an image without alt text`);
    if (!/\bwidth="\d+"/i.test(image[0]) || !/\bheight="\d+"/i.test(image[0])) fail(`${file} has an image without dimensions`);
  }
  for (const link of html.matchAll(/href="(\/[^"]*)"/gi)) {
    const value = link[1].split(/[?#]/)[0];
    if (value.endsWith("/") && !/^\/(portal|employee|admin|_secure|docs|api)\//.test(value)) linkedRoutes.add(value);
  }
  records.push({ file, route, canonical, title, description });
}

if (!unique(records.map((record) => record.title))) fail("public titles are not unique");
if (!unique(records.map((record) => record.description))) fail("public descriptions are not unique");
if (!unique(records.map((record) => record.canonical))) fail("public canonical URLs are not unique");
for (const record of records) if (record.route !== "/" && !linkedRoutes.has(record.route)) fail(`${record.route} is orphaned from internal navigation`);

const homepageSchemas = parseSchemas(source("index.html"), "index.html");
const organisation = homepageSchemas.find((schema) => (Array.isArray(schema["@type"]) ? schema["@type"] : [schema["@type"]]).includes("Organization"));
const website = homepageSchemas.find((schema) => schema["@type"] === "WebSite");
if (organisation?.["@id"] !== ORGANIZATION_ID || organisation?.name !== company.name || organisation?.legalName !== company.legalName) fail("homepage Organization entity is incomplete or inconsistent");
if (organisation?.address) fail("homepage Organization schema must not amplify the registered residential address");
if (website?.["@id"] !== WEBSITE_ID || website?.publisher?.["@id"] !== ORGANIZATION_ID) fail("homepage WebSite entity is not linked to the publisher");

for (const person of leadership) {
  const file = `leadership/${person.slug}/index.html`;
  const schemas = parseSchemas(source(file), file);
  const profile = schemas.find((schema) => schema["@type"] === "ProfilePage");
  const personSchema = schemas.find((schema) => schema["@type"] === "Person");
  const personId = `${SITE_URL}/leadership/${person.slug}/#person`;
  if (profile?.mainEntity?.["@id"] !== personId) fail(`${file} ProfilePage does not identify its canonical Person`);
  if (personSchema?.["@id"] !== personId || personSchema?.name !== person.displayName) fail(`${file} Person entity uses an inconsistent name or id`);
  if (personSchema?.worksFor?.["@id"] !== ORGANIZATION_ID) fail(`${file} Person entity is not connected to NovaPharm`);
  if (person.image && typeof personSchema?.image !== "object") fail(`${file} lacks an ImageObject for the approved portrait`);
}

for (const article of articles) {
  const file = `news-insights/${article.slug}/index.html`;
  const html = source(file);
  const schemas = parseSchemas(html, file);
  const articleSchema = schemas.find((schema) => {
    const types = Array.isArray(schema["@type"]) ? schema["@type"] : [schema["@type"]];
    return types.includes("Article") || types.includes("BlogPosting");
  });
  if (!articleSchema) { fail(`${file} lacks Article structured data`); continue; }
  if (articleSchema.publisher?.["@id"] !== ORGANIZATION_ID) fail(`${file} article publisher is not NovaPharm`);
  if (!articleSchema.author?.["@id"]?.includes("/leadership/")) fail(`${file} article author is not a canonical leadership entity`);
  if (!articleSchema.datePublished || !articleSchema.dateModified) fail(`${file} lacks accurate publication dates`);
  if (!articleSchema.wordCount || !articleSchema.timeRequired) fail(`${file} lacks article depth metadata`);
  if (!html.includes("data-editorial-trust")) fail(`${file} lacks the visible editorial trust statement`);
}

const robots = source("robots.txt");
for (const crawler of ["Googlebot", "Bingbot", "OAI-SearchBot", "GPTBot", "Google-Extended"]) {
  if (!robots.includes(`User-agent: ${crawler}`)) fail(`robots.txt lacks an explicit ${crawler} policy`);
}
if (!/User-agent: OAI-SearchBot[\s\S]*?Allow: \//.test(robots)) fail("OAI-SearchBot is not allowed to discover public content");
if (!/User-agent: GPTBot[\s\S]*?Disallow: \//.test(robots)) fail("GPTBot training policy is not explicitly separated");
for (const sitemap of ["sitemap.xml", "sitemap-insights.xml", "sitemap-images.xml"]) {
  if (!existsSync(join(root, sitemap))) fail(`missing ${sitemap}`);
  if (!robots.includes(`Sitemap: ${SITE_URL}/${sitemap}`)) fail(`robots.txt does not reference ${sitemap}`);
}

const sitemap = source("sitemap.xml");
for (const record of records) if (!sitemap.includes(`<loc>${record.canonical}</loc>`)) fail(`sitemap.xml omits ${record.route}`);
for (const privatePath of ["/portal/", "/employee/", "/admin/", "/_secure/", "/docs/", "/api/"]) {
  if (sitemap.includes(`${SITE_URL}${privatePath}`)) fail(`sitemap.xml exposes ${privatePath}`);
}
if (!existsSync(join(root, `${INDEXNOW_KEY}.txt`)) || source(`${INDEXNOW_KEY}.txt`).trim() !== INDEXNOW_KEY) fail("IndexNow root verification file is missing or invalid");

for (const path of [
  "seo/generated/entity-register.json",
  "seo/generated/page-metadata-register.json",
  "seo/generated/crawler-policy.json",
  "seo/generated/source-register.json",
  "seo/generated/indexnow-config.json",
  "seo/implementation-report.md",
  "seo/content-authority-strategy.md",
  "seo/digital-pr-distribution-plan.md",
  "seo/owner-action-guide.md"
]) if (!existsSync(join(root, path))) fail(`missing authority deliverable ${path}`);

if (!source("legal/index.html").includes('id="editorial-standards"')) fail("public legal page lacks editorial, sourcing and corrections standards");
if (canonicalEntities.length !== leadership.length + 1) fail("entity register count does not match the organisation and leadership source of truth");
if (!crawlerPolicy.some((item) => item.crawler === "OAI-SearchBot" && item.publicAccess)) fail("crawler register does not allow ChatGPT Search discovery");

const jsBytes = ["assets/js/novapharm.js", "assets/js/api-client.js", "assets/js/marketing-attribution.js"]
  .filter((file) => existsSync(join(root, file))).reduce((sum, file) => sum + statSync(join(root, file)).size, 0);
const cssBytes = ["assets/css/novapharm.css", "assets/css/base.css", "assets/css/tokens.css", "assets/css/foundations.css", "assets/css/premium-experience.css", "assets/css/motion.css", "assets/css/responsive.css"]
  .filter((file) => existsSync(join(root, file))).reduce((sum, file) => sum + statSync(join(root, file)).size, 0);
if (jsBytes > performanceBudgets.initialJavaScriptBytes) fail(`initial public JavaScript budget exceeded: ${jsBytes} bytes`);
if (cssBytes > performanceBudgets.initialCssBytes) fail(`public CSS budget exceeded: ${cssBytes} bytes`);

if (failures) process.exit(1);
console.log(`Validated ${records.length} canonical public pages, ${articles.length} articles, ${leadership.length} leadership entities, crawler policy, sitemaps, IndexNow and authority deliverables.`);
