import { existsSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const root = resolve(process.cwd());
const required = [
  "index.html",
  "about/index.html",
  "company-profile/index.html",
  "services/index.html",
  "regulatory-services/index.html",
  "uk-international-regulatory-services/index.html",
  "product-portfolio/index.html",
  "partner-with-us/index.html",
  "distributor-opportunities/index.html",
  "investor-information/index.html",
  "contact/index.html",
  "news-insights/index.html",
  "careers/index.html",
  "portal/index.html",
  "portal/dashboard/index.html",
  "portal/documents/index.html",
  "portal/downloads/index.html",
  "portal/settings/index.html",
  "admin/dashboard/index.html",
  "admin/users/index.html",
  "admin/content/index.html",
  "admin/analytics/index.html",
  "integrations/sharepoint/README.md",
  "integrations/sharepoint/setup-guide.md",
  "integrations/sharepoint/graph-client.ts",
  "audit/technical-audit.md",
  "seo/keyword-strategy.md",
  "geo/geo-strategy.md",
  "security/security-report.md",
  "performance/lighthouse-report.md",
  "deployment/deployment-guide.md",
  "final-report/implementation-summary.md",
  "assets/css/novapharm.css",
  "assets/js/novapharm.js",
  "assets/js/portal-login.js",
  "assets/js/portal-app.js",
  "assets/js/admin-app.js",
  "assets/novapharm-healthcare-hero.jpg",
  "assets/novapharm-og.jpg",
  "sitemap.xml",
  "robots.txt",
  "server.mjs",
  ".env.example"
];

const localExtensions = new Set([".html", ".css", ".js", ".jpg", ".jpeg", ".png", ".svg", ".pdf", ".xml", ".txt", ".webmanifest"]);

function fail(message) {
  console.error(`Validation failed: ${message}`);
  process.exitCode = 1;
}

function exists(path) {
  return existsSync(join(root, path));
}

for (const file of required) {
  if (!exists(file)) fail(`missing ${file}`);
}

const executivePages = [
  "NP_Hub.html",
  "NP_CEO.html",
  "NP_Sales.html",
  "NP_Customers.html",
  "NP_Products.html",
  "NP_NHS_Data.html",
  "NP_PLPI.html",
  "NP_Sourcing.html",
  "NP_SLA.html",
  "NP_Warehouse.html",
  "NP_Tenders.html",
  "NP_PV.html",
  "NP_Blockchain.html",
  "NP_AI_Tech.html",
  "NP_Finance.html",
  "NP_Capital.html",
  "NP_M365.html",
  "NP_Documents.html"
];

for (const page of executivePages) {
  if (!exists(`portal/executive-platform/${page}`)) fail(`missing executive platform page ${page}`);
}

for (const doc of ["NP_Implementation_Blueprint_v2.pdf", "NP_Flowcharts_v3.pdf"]) {
  if (!exists(`portal/executive-platform/docs/${doc}`)) fail(`missing executive platform document ${doc}`);
}

function localTarget(from, ref) {
  if (/^(https?:|mailto:|tel:|#|javascript:)/i.test(ref)) return null;
  const clean = ref.split("#")[0].split("?")[0];
  if (!clean) return null;
  if (!localExtensions.has(extname(clean))) return null;
  if (clean.startsWith("/")) return clean.slice(1);
  const base = from.endsWith("index.html") ? from.split("/").slice(0, -1).join("/") : from.split("/").slice(0, -1).join("/");
  return join(base, clean);
}

const htmlFiles = required.filter((file) => file.endsWith(".html")).concat(executivePages.map((page) => `portal/executive-platform/${page}`));

for (const file of htmlFiles) {
  const html = readFileSync(join(root, file), "utf8");
  if (!/<title>.+<\/title>/i.test(html)) fail(`${file} missing title`);
  const refs = [...html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)].map((match) => match[1]);
  for (const ref of refs) {
    const target = localTarget(file, ref);
    if (target && !exists(target)) fail(`${file} references missing ${ref} -> ${target}`);
  }
  if (!file.startsWith("portal/") && !file.startsWith("admin/") && !html.includes("application/ld+json") && file !== "portal/index.html") {
    fail(`${file} missing JSON-LD`);
  }
}

if (process.exitCode) process.exit(process.exitCode);
console.log(`Validated ${required.length} required files, ${htmlFiles.length} HTML pages, and ${executivePages.length} Executive Platform modules.`);
