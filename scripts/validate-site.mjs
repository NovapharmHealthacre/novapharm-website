import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { leadership, pageMeta } from "../src/content/site-content.mjs";

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
  "cro/index.html",
  "product-portfolio/index.html",
  "product-portfolio/nutraxin/index.html",
  "partner-with-us/index.html",
  "technology/index.html",
  "news-insights/index.html",
  "contact/index.html",
  "investor-information/index.html",
  "careers/index.html",
  "account-application/index.html",
  "legal/index.html",
  "legal/privacy/index.html",
  "legal/cookies/index.html",
  "legal/terms/index.html",
  "legal/accessibility/index.html",
  "legal/modern-slavery/index.html",
  "legal/environment-carbon/index.html"
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
  "architecture/portal-domain-map.md",
  "architecture/portal-module-contracts.md",
  "architecture/portal-event-catalogue.md",
  "database/schema.sql",
  "database/portal-data-dictionary.md",
  "database/portal-erd.md",
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
  "audit/portal-module-audit.md",
  "audit/portal-integration-report.md",
  "audit/portal-security-report.md",
  "audit/portal-accessibility-report.md",
  "audit/portal-browser-report.md",
  "audit/visual-acceptance-report.md",
  "audit/global-digital-benchmark.md",
  "audit/current-experience-gap-analysis.md",
  "seo/keyword-strategy.md",
  "geo/geo-strategy.md",
  "security/security-report.md",
  "security/git-history-sanitisation.md",
  "compliance/privacy-data-map.md",
  "compliance/retention-schedule.md",
  "compliance/cookie-register.md",
  "compliance/modern-slavery-applicability.md",
  "compliance/environmental-reporting-applicability.md",
  "compliance/legal-review-register.md",
  "performance/lighthouse-report.md",
  "deployment/deployment-guide.md",
  "deployment/private-preview-guide.md",
  "deployment/environment-variables.md",
  "deployment/rollback-guide.md",
  "deployment/history-rollback.md",
  "final-report/implementation-summary.md",
  "final-report/enterprise-portal-owner-handoff.md",
  "final-report/official-logo-register.md",
  "final-report/remaining-items.md",
  "creative-assets/image-generation-brief.md",
  "creative-assets/asset-register.json",
  "creative-assets/visual-provenance.md",
  "assets/css/novapharm.css",
  "assets/css/novapharm.bundle.css",
  "assets/css/base.css",
  "assets/css/tokens.css",
  "assets/css/foundations.css",
  "assets/css/premium-experience.css",
  "assets/css/motion.css",
  "assets/css/portal.css",
  "assets/css/nutraxin-catalogue.css",
  "assets/css/cro.css",
  "assets/css/responsive.css",
  "assets/js/api-client.js",
  "assets/js/novapharm.js",
  "assets/js/portal-login.js",
  "assets/js/portal-app.js",
  "assets/js/password-change.js",
  "assets/js/cookie-consent.js",
  "assets/js/admin-app.js",
  "assets/js/account-application.js",
  "assets/js/cro.js",
  "assets/js/enterprise-app.js",
  "assets/brand/novapharm-healthcare-logo.svg",
  "assets/brand/novapharm-healthcare-logo.png",
  "assets/media/home/supply-network-hero.jpg",
  "assets/media/home/supply-network-hero-1200.jpg",
  "assets/media/editorial/oncology-specialty.svg",
  "assets/media/editorial/digital-traceability.svg",
  "assets/media/editorial/quality-batch-integrity.svg",
  "assets/media/editorial/partnership-pathway.svg",
  "assets/media/insights/compliance-first-distribution.svg",
  "assets/media/insights/gdp-qms-foundations.svg",
  "assets/media/insights/oncology-demand-forecasting.svg",
  "assets/media/insights/plpi-supply-resilience.svg",
  "assets/media/insights/three-pillar-sourcing.svg",
  "assets/media/insights/batch-to-buyer-traceability.svg",
  "src/content/site-content.mjs",
  "src/content/cro-content.mjs",
  "src/core/auth-service.mjs",
  "src/core/domain-service.mjs",
  "src/core/enterprise-domain-service.mjs",
  "src/core/nutraxin-catalogue.mjs",
  "src/core/portal-module-catalog.mjs",
  "src/core/document-service.mjs",
  "src/core/sharepoint-mapping.mjs",
  "src/data/database.mjs",
  "src/integrations/email/client.mjs",
  "src/integrations/sharepoint/graph-client.mjs",
  "src/integrations/sharepoint/secure-content-branding.mjs",
  "src/integrations/sharepoint/sync-engine.mjs",
  "src/integrations/polar-speed/client.mjs",
  "src/integrations/polar-speed/sync-engine.mjs",
  "scripts/build-pages.mjs",
  "scripts/build-public-pages.mjs",
  "scripts/sync-secure-content.mjs",
  "scripts/test-server.mjs",
  "scripts/test-enterprise-migrations.mjs",
  "scripts/test-enterprise-portal.mjs",
  "scripts/test-browser-validation-preparation.mjs",
  "scripts/start-browser-validation.mjs",
  "scripts/run-browser-validation-tests.mjs",
  "scripts/stop-browser-validation.mjs",
  "scripts/import-nutraxin-catalogue.mjs",
  "scripts/generate-enterprise-portal-docs.mjs",
  "scripts/test-production-security.mjs",
  "scripts/test-database-migration.mjs",
  "scripts/check-syntax.mjs",
  "scripts/check-css.mjs",
  "scripts/test-visual-contracts.mjs",
  "scripts/optimise-images.mjs",
  "scripts/scan-secrets.mjs",
  "scripts/backup-database.mjs",
  "scripts/verify-database-backup.mjs",
  "scripts/audit-public-claims.mjs",
  ".github/workflows/ci.yml",
  ".node-version",
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
for (const file of ["assets/novapharm-healthcare-hero.jpg", "assets/novapharm-og.jpg"]) {
  if (existsSync(join(root, file))) fail(`unused legacy stock asset must not ship: ${file}`);
}

const assetRegister = JSON.parse(source("creative-assets/asset-register.json"));
for (const asset of assetRegister.assets || []) {
  if (!asset.path || !existsSync(join(root, asset.path))) fail(`asset register references missing file ${asset.path || "(no path)"}`);
  for (const field of ["source", "dimensions", "pageUsage", "altText", "technicalStatus", "ownerApproval"]) {
    if (asset[field] === undefined) fail(`${asset.path || "asset"} is missing provenance field ${field}`);
  }
}

const insightFiles = readdirSync(join(root, "src/content/insights")).filter((file) => file.endsWith(".json"));
if (insightFiles.length < 6) fail("at least six original insight articles are required");
const insightHeroImages = new Set();
for (const file of insightFiles) {
  const article = JSON.parse(source(`src/content/insights/${file}`));
  const words = article.sections.flatMap((section) => [...(section.paragraphs || []), ...(section.list || [])]).join(" ").trim().split(/\s+/).filter(Boolean).length;
  if (words < 900 || words > 1400) fail(`${file} contains ${words} body words; expected 900-1400`);
  const output = `news-insights/${article.slug}/index.html`;
  if (!existsSync(join(root, output))) fail(`${file} has no generated article page`);
  if (!article.heroImage || !existsSync(join(root, article.heroImage.replace(/^\//, "")))) fail(`${file} has no valid hero image`);
  if (insightHeroImages.has(article.heroImage)) fail(`${file} reuses the hero image ${article.heroImage}`);
  insightHeroImages.add(article.heroImage);
  publicPages.push(output);
}

const titles = new Map();
const descriptions = new Map();
const canonicals = new Map();
const observedSchemaTypes = new Set();

function uniqueValue(map, value, file, label) {
  if (!value) return;
  if (map.has(value)) fail(`${file} duplicates ${label} from ${map.get(value)}`);
  else map.set(value, file);
}

function validateDocumentBasics(file, html) {
  if (!/<html\s+lang="en-GB"/i.test(html)) fail(`${file} must declare British English`);
  if (!/<meta name="viewport" content="width=device-width,\s*initial-scale=1">/i.test(html)) fail(`${file} is missing the mobile viewport declaration`);
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\balt="[^"]*"/i.test(match[0])) fail(`${file} contains an image without alternative text`);
    if (!/\bwidth="\d+"/i.test(match[0]) || !/\bheight="\d+"/i.test(match[0])) fail(`${file} contains an image without intrinsic dimensions`);
  }
  const headingLevels = [...html.matchAll(/<h([1-6])\b/gi)].map((match) => Number(match[1]));
  for (let index = 1; index < headingLevels.length; index += 1) {
    if (headingLevels[index] > headingLevels[index - 1] + 1) fail(`${file} skips from h${headingLevels[index - 1]} to h${headingLevels[index]}`);
  }
}

for (const file of publicPages) {
  const html = source(file);
  validateDocumentBasics(file, html);
  if (!/<title>[^<]{10,}<\/title>/i.test(html)) fail(`${file} needs a substantive title`);
  if (!/<meta name="description" content="[^"]{70,}"/i.test(html)) fail(`${file} needs a substantive meta description`);
  if (!/<link rel="canonical" href="https:\/\/novapharmhealthcare\.com\/[^"]*">/i.test(html)) fail(`${file} needs an apex-domain canonical URL`);
  for (const marker of ['property="og:title"', 'property="og:description"', 'name="twitter:card"']) {
    if (!html.includes(marker)) fail(`${file} missing ${marker}`);
  }
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1];
  const description = html.match(/<meta name="description" content="([^"]+)"/i)?.[1];
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1];
  uniqueValue(titles, title, file, "title");
  uniqueValue(descriptions, description, file, "meta description");
  uniqueValue(canonicals, canonical, file, "canonical URL");
  if (!html.includes('/assets/brand/novapharm-healthcare-logo.svg')) fail(`${file} does not reference the approved SVG logo`);
  if (!html.includes('/assets/brand/novapharm-healthcare-logo.png')) fail(`${file} does not include the approved PNG fallback or social image`);
  if (!html.includes('alt="NovaPharm Healthcare"')) fail(`${file} is missing the approved logo alternative text`);
  if (html.includes('/assets/Novapharm-logo.svg')) fail(`${file} references the retired logo path`);
  if (!html.includes(`property="og:image" content="${siteUrl}/assets/brand/novapharm-healthcare-logo.png"`)) fail(`${file} does not use the approved social identity image`);
  if (!html.includes('property="og:image:width" content="3356"') || !html.includes('property="og:image:height" content="420"')) fail(`${file} has incorrect social identity dimensions`);
  if (/\b(?:undefined|lorem ipsum|placeholder content)\b/i.test(html)) fail(`${file} contains unfinished content`);
  if (/The string did not match the expected pattern|Secure portal backend is not active on this static host yet/i.test(html)) fail(`${file} contains a retired technical error message`);
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  if (!blocks.length) fail(`${file} missing JSON-LD`);
  for (const [, block] of blocks) {
    try {
      const parsed = JSON.parse(block);
      const types = Array.isArray(parsed["@type"]) ? parsed["@type"] : [parsed["@type"]];
      types.filter(Boolean).forEach((type) => observedSchemaTypes.add(type));
    } catch { fail(`${file} contains invalid JSON-LD`); }
  }
  if ((html.match(/<h1\b/gi) || []).length !== 1) fail(`${file} must contain exactly one h1`);
  if (!html.includes('href="#main"') || !html.includes('id="main"')) fail(`${file} needs a working skip link`);
}

const expectedPublicPageCount = Object.keys(pageMeta).length + leadership.length + insightFiles.length + 1;
if (publicPages.length !== expectedPublicPageCount) fail(`expected ${expectedPublicPageCount} source-defined public pages; found ${publicPages.length}`);
for (const type of ["Organization", "Person", "Article", "BlogPosting", "Service", "BreadcrumbList"]) {
  if (!observedSchemaTypes.has(type)) fail(`structured data is missing ${type}`);
}

const logoHashes = new Map([
  ["assets/brand/novapharm-healthcare-logo.svg", "0450a3a7957b5a0ce0bb2f1764bddc2c07711222cb5b787d23b77c85cfee0239"],
  ["assets/brand/novapharm-healthcare-logo.png", "b381ee4929b4014a40c889d26941c994bcbe7bfc558cd81f0f47d2d1917d00ad"]
]);
for (const [file, expectedHash] of logoHashes) {
  const hash = createHash("sha256").update(readFileSync(join(root, file))).digest("hex");
  if (hash !== expectedHash) fail(`${file} no longer matches the supplied official master`);
}
const manifest = JSON.parse(source("manifest.webmanifest"));
if (manifest.icons?.[0]?.src !== "/assets/brand/novapharm-healthcare-logo.svg" || manifest.icons?.[0]?.purpose !== "any") fail("web manifest must use the uncropped approved SVG identity");

for (const file of redirectPages) {
  const html = source(file);
  validateDocumentBasics(file, html);
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
  validateDocumentBasics(file, html);
  if (!html.includes("This public shell does not expose dashboards, records or controlled documents.")) fail(`${file} is not a locked public shell`);
  if (/data-(?:live-metric|order-rows|product-rows|customer-rows|supplier-rows|po-rows|admin-metric|leads)/.test(html)) fail(`${file} exposes an operational binding publicly`);
}
validateDocumentBasics("portal/index.html", source("portal/index.html"));
for (const file of ["404.html", "500.html", "service-unavailable/index.html"]) validateDocumentBasics(file, source(file));

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
const nishitaProfile = source("leadership/nishita-trivedi/index.html");
if (!/not a statutory director/i.test(nishitaProfile)) fail("Dr Nishita Trivedi must be identified as a non-director adviser");
if (/Dr Nishita Trivedi[^<]{0,100}(?:statutory director|Director &|Director,)/i.test(nishitaProfile)) fail("Dr Nishita Trivedi is incorrectly presented as a director");

const technologyPage = source("technology/index.html");
for (const label of ["Live capabilities", "In development capabilities", "Planned capabilities"]) {
  if (!technologyPage.includes(label)) fail(`technology page is missing ${label}`);
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
for (const blockedPath of ["_secure", "compliance", "data", "database", "src", "scripts", "integrations", "sharepoint"]) {
  if (!serverSource.includes(`"${blockedPath}"`)) fail(`server static denylist is missing ${blockedPath}`);
}
for (const table of ["auth_credentials", "auth_sessions", "rate_limit_buckets", "security_events", "lead_details"]) {
  if (!source("database/schema.sql").includes(`CREATE TABLE IF NOT EXISTS ${table}`)) fail(`database schema is missing ${table}`);
}

if (failures) process.exit(1);
console.log(`Validated ${publicPages.length} public pages, ${insightFiles.length} long-form articles, ${protectedPages.length} locked shells and the security/data contracts.`);
