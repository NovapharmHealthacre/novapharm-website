import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const siteUrl = "https://novapharmhealthcare.com";
const publicPages = [
  "index.html",
  "about/index.html",
  "about/company/index.html",
  "about/governance/index.html",
  "leadership/index.html",
  "leadership/vishal-chakravarty/index.html",
  "leadership/prabhakar-lahare/index.html",
  "leadership/girish-achliya/index.html",
  "leadership/helly-panchal/index.html",
  "leadership/nishita-trivedi/index.html",
  "services/index.html",
  "regulatory-services/index.html",
  "product-portfolio/index.html",
  "partner-with-us/index.html",
  "technology/index.html",
  "news-insights/index.html",
  "contact/index.html",
  "investor-information/index.html",
  "careers/index.html",
  "account-application/index.html"
];
const redirectPages = [
  "company-profile/index.html",
  "uk-international-regulatory-services/index.html",
  "distributor-opportunities/index.html",
  "contact.html",
  "solutions.html",
  "supply-chain.html",
  "team.html"
];
const protectedShellRoots = ["portal", "employee", "admin"];
const requiredFiles = [
  ...publicPages,
  ...redirectPages,
  "404.html",
  "500.html",
  "service-unavailable/index.html",
  "architecture/master-data-model.md",
  "architecture/system-relationships.md",
  "architecture/data-flow-diagrams.md",
  "architecture/entity-relationship-diagrams.md",
  "database/schema.sql",
  "integrations/sharepoint/README.md",
  "integrations/sharepoint/setup-guide.md",
  "integrations/sharepoint/graph-client.ts",
  "integrations/polar-speed/README.md",
  "integrations/polar-speed/setup-guide.md",
  "sharepoint/README.md",
  "sharepoint/document-libraries/README.md",
  "sharepoint/metadata-model/README.md",
  "sharepoint/workflows/README.md",
  "sharepoint/permissions/README.md",
  "audit/technical-audit.md",
  "seo/keyword-strategy.md",
  "geo/geo-strategy.md",
  "security/security-report.md",
  "performance/lighthouse-report.md",
  "deployment/deployment-guide.md",
  "deployment/environment-variables.md",
  "deployment/rollback-guide.md",
  "final-report/implementation-summary.md",
  "final-report/remaining-items.md",
  "assets/css/novapharm.css",
  "assets/js/api-client.js",
  "assets/js/novapharm.js",
  "assets/js/portal-login.js",
  "assets/js/portal-app.js",
  "assets/js/admin-app.js",
  "assets/js/account-application.js",
  "assets/js/enterprise-app.js",
  "assets/novapharm-healthcare-hero.jpg",
  "assets/novapharm-og.jpg",
  "src/content/site-content.mjs",
  "src/core/auth-service.mjs",
  "src/core/domain-service.mjs",
  "src/core/document-service.mjs",
  "src/core/sharepoint-mapping.mjs",
  "src/data/database.mjs",
  "src/integrations/email/client.mjs",
  "src/integrations/sharepoint/graph-client.mjs",
  "src/integrations/sharepoint/sync-engine.mjs",
  "src/integrations/polar-speed/client.mjs",
  "src/integrations/polar-speed/sync-engine.mjs",
  "scripts/build-pages.mjs",
  "scripts/build-public-pages.mjs",
  "scripts/sync-secure-content.mjs",
  "scripts/test-server.mjs",
  ".github/workflows/ci.yml",
  ".dockerignore",
  "Dockerfile",
  "render.yaml",
  "sitemap.xml",
  "feed.xml",
  "robots.txt",
  "manifest.webmanifest",
  "CNAME",
  "server.mjs",
  ".env.example"
];

let failures = 0;
function fail(message) {
  failures += 1;
  console.error(`Validation failed: ${message}`);
}

function source(path) {
  return readFileSync(join(root, path), "utf8");
}

for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) fail(`missing ${file}`);
}

const insightFiles = readdirSync(join(root, "src/content/insights")).filter((file) => file.endsWith(".json"));
if (insightFiles.length < 6) fail("at least six original insight articles are required");
for (const file of insightFiles) {
  const article = JSON.parse(source(`src/content/insights/${file}`));
  const words = article.sections.flatMap((section) => [...(section.paragraphs || []), ...(section.list || [])]).join(" ").trim().split(/\s+/).filter(Boolean).length;
  if (words < 900 || words > 1400) fail(`${file} contains ${words} body words; expected 900-1400`);
  const output = `news-insights/${article.slug}/index.html`;
  if (!existsSync(join(root, output))) fail(`${file} has no generated article page`);
  publicPages.push(output);
}

for (const file of publicPages) {
  const html = source(file);
  if (!/<title>[^<]{10,}<\/title>/i.test(html)) fail(`${file} needs a substantive title`);
  if (!/<meta name="description" content="[^"]{70,}"/i.test(html)) fail(`${file} needs a substantive meta description`);
  if (!/<link rel="canonical" href="https:\/\/novapharmhealthcare\.com\/[^"]*">/i.test(html)) fail(`${file} needs an apex-domain canonical URL`);
  for (const marker of ['property="og:title"', 'property="og:description"', 'name="twitter:card"']) {
    if (!html.includes(marker)) fail(`${file} missing ${marker}`);
  }
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  if (!blocks.length) fail(`${file} missing JSON-LD`);
  for (const [, block] of blocks) {
    try { JSON.parse(block); } catch { fail(`${file} contains invalid JSON-LD`); }
  }
  if ((html.match(/<h1\b/gi) || []).length !== 1) fail(`${file} must contain exactly one h1`);
  if (!html.includes('href="#main"') || !html.includes('id="main"')) fail(`${file} needs a working skip link`);
}

for (const file of redirectPages) {
  const html = source(file);
  if (!html.includes('http-equiv="refresh"') || !html.includes('name="robots" content="noindex,follow"')) {
    fail(`${file} is not a controlled noindex redirect`);
  }
}

function collectHtml(directory) {
  const files = [];
  for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
    const relative = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectHtml(relative));
    else if (entry.name.endsWith(".html")) files.push(relative);
  }
  return files;
}

const protectedPages = protectedShellRoots.flatMap((directory) => collectHtml(directory));
for (const file of protectedPages) {
  if (file === "portal/index.html") continue;
  const html = source(file);
  if (!html.includes("This static public site does not expose dashboards, records or controlled documents.")) fail(`${file} is not a locked public shell`);
  if (/data-(?:live-metric|order-rows|product-rows|customer-rows|supplier-rows|po-rows|admin-metric|leads)/.test(html)) fail(`${file} exposes an operational binding publicly`);
}

for (const [file, person] of [
  ["leadership/vishal-chakravarty/index.html", "Vishal Chakravarty"],
  ["leadership/prabhakar-lahare/index.html", "Prabhakar Vitthal Lahare"],
  ["leadership/girish-achliya/index.html", "Dr Girish Shantilal Achliya"],
  ["leadership/helly-panchal/index.html", "Dr Helly Kamlesh Panchal"],
  ["leadership/nishita-trivedi/index.html", "Dr Nishita Trivedi"]
]) {
  const html = source(file);
  if (!html.includes('"@type":"ProfilePage"') || !html.includes(`"name":"${person}"`)) fail(`${file} is missing its ProfilePage and Person entities`);
}

const sitemap = source("sitemap.xml");
const sitemapLocations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
if (new Set(sitemapLocations).size !== sitemapLocations.length) fail("sitemap contains duplicate URLs");
for (const privatePrefix of ["/portal/", "/employee/", "/admin/", "/_secure/", "/docs/"]) {
  if (sitemap.includes(`${siteUrl}${privatePrefix}`)) fail(`sitemap exposes private route ${privatePrefix}`);
}
for (const page of publicPages.filter((file) => file.endsWith("index.html") && file !== "index.html")) {
  const route = `/${page.replace(/index\.html$/, "")}`;
  if (!sitemapLocations.includes(`${siteUrl}${route}`)) fail(`sitemap missing ${route}`);
}

if (source("CNAME").trim() !== "novapharmhealthcare.com") fail("CNAME must preserve the apex production domain");
if (!source("robots.txt").includes(`Sitemap: ${siteUrl}/sitemap.xml`)) fail("robots.txt needs the production sitemap URL");

const serverSource = source("server.mjs");
for (const blockedPath of ["_secure", "data", "database", "src", "scripts", "integrations", "sharepoint"]) {
  if (!serverSource.includes(`"${blockedPath}"`)) fail(`server static denylist is missing ${blockedPath}`);
}
for (const table of ["auth_credentials", "auth_sessions", "rate_limit_buckets", "security_events", "lead_details"]) {
  if (!source("database/schema.sql").includes(`CREATE TABLE IF NOT EXISTS ${table}`)) fail(`database schema is missing ${table}`);
}

if (failures) process.exit(1);
console.log(`Validated ${publicPages.length} public pages, ${insightFiles.length} long-form articles, ${protectedPages.length} locked shells and the security/data contracts.`);
