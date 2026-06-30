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
  "account-application/index.html",
  "portal/index.html",
  "portal/dashboard/index.html",
  "portal/account/index.html",
  "portal/orders/index.html",
  "portal/invoices/index.html",
  "portal/statements/index.html",
  "portal/products/index.html",
  "portal/price-lists/index.html",
  "portal/stock-availability/index.html",
  "portal/order-tracking/index.html",
  "portal/delivery-tracking/index.html",
  "portal/returns/index.html",
  "portal/quality-complaints/index.html",
  "portal/documents/index.html",
  "portal/support/index.html",
  "portal/regulatory-documents/index.html",
  "portal/downloads/index.html",
  "portal/analytics/index.html",
  "portal/settings/index.html",
  "employee/dashboard/index.html",
  "employee/customers/index.html",
  "employee/suppliers/index.html",
  "employee/products/index.html",
  "employee/orders/index.html",
  "employee/warehouse/index.html",
  "employee/purchasing/index.html",
  "employee/finance/index.html",
  "employee/quality/index.html",
  "employee/regulatory/index.html",
  "employee/crm/index.html",
  "employee/reports/index.html",
  "employee/administration/index.html",
  "admin/index.html",
  "admin/dashboard/index.html",
  "admin/users/index.html",
  "admin/content/index.html",
  "admin/analytics/index.html",
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
  "deployment/github-live-guide.md",
  "final-report/implementation-summary.md",
  "final-report/remaining-items.md",
  "assets/css/novapharm.css",
  "assets/js/novapharm.js",
  "assets/js/portal-login.js",
  "assets/js/portal-app.js",
  "assets/js/admin-app.js",
  "assets/js/account-application.js",
  "assets/js/enterprise-app.js",
  "assets/novapharm-healthcare-hero.jpg",
  "assets/novapharm-og.jpg",
  "sitemap.xml",
  "robots.txt",
  "server.mjs",
  "src/core/domain-service.mjs",
  "src/core/document-service.mjs",
  "src/core/sharepoint-mapping.mjs",
  "src/data/database.mjs",
  "src/integrations/sharepoint/graph-client.mjs",
  "src/integrations/sharepoint/sync-engine.mjs",
  "src/integrations/polar-speed/client.mjs",
  "src/integrations/polar-speed/sync-engine.mjs",
  "scripts/build-pages.mjs",
  "scripts/validate-app.mjs",
  "scripts/validate-domain.mjs",
  "scripts/merge-to-website-repo.mjs",
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
  if (!file.startsWith("portal/") && !file.startsWith("employee/") && !file.startsWith("admin/") && !html.includes("application/ld+json")) {
    fail(`${file} missing JSON-LD`);
  }
}

if (process.exitCode) process.exit(process.exitCode);
console.log(`Validated ${required.length} required files, ${htmlFiles.length} HTML pages, and ${executivePages.length} Executive Platform modules.`);
