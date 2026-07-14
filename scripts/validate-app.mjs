import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { applyExecutiveBranding } from "../src/integrations/sharepoint/secure-content-branding.mjs";

const root = resolve(process.cwd());
const secureRoot = resolve(process.env.SECURE_CONTENT_ROOT || join(root, "_secure"));

const pages = ["index.html", "portal/index.html", "portal/executive-platform/index.html"];

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

const pagesToValidate = pages;
const localExtensions = new Set([".html", ".pdf", ".js", ".css", ".json", ".webmanifest", ".svg", ".png"]);

function fail(message) {
  console.error(`Validation failed: ${message}`);
  process.exitCode = 1;
}

function fileExists(path) {
  return existsSync(join(root, path));
}

function assetExists(path) {
  return fileExists(path) || fileExists(join("public", path));
}

for (const page of pagesToValidate) {
  if (!fileExists(page)) {
    fail(`missing page ${page}`);
  }
}

function localTarget(from, cleanRef) {
  if (cleanRef.startsWith("/")) return cleanRef.slice(1);
  return join(dirname(from), cleanRef);
}

for (const page of pagesToValidate.filter((name) => name.endsWith(".html"))) {
  if (!fileExists(page)) {
    continue;
  }

  const html = readFileSync(join(root, page), "utf8");
  if (!/<title>.+<\/title>/i.test(html)) {
    fail(`${page} is missing a title`);
  }

  if (page !== "index.html" && !html.includes("NovaPharm")) {
    fail(`${page} does not include NovaPharm branding`);
  }

  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((match) => match[1]);
  const srcs = [...html.matchAll(/src=["']([^"']+)["']/gi)].map((match) => match[1]);
  const refs = [...hrefs, ...srcs];

  for (const ref of refs) {
    if (/^(https?:|mailto:|tel:|#|javascript:)/i.test(ref)) {
      continue;
    }

    const cleanRef = ref.split("#")[0].split("?")[0];
    if (!cleanRef) {
      continue;
    }

    if (!localExtensions.has(extname(cleanRef).toLowerCase())) {
      continue;
    }

    const localPath = localTarget(page, cleanRef);
    if (!assetExists(localPath)) {
      fail(`${page} references missing local asset ${ref}`);
    }
  }

}

const login = readFileSync(join(root, "portal/index.html"), "utf8");
if (!login.includes("name=\"accessType\"")) fail("portal login is missing access-type selection");
if (login.includes("href=\"/portal/executive-platform/NP_")) fail("portal login exposes executive launch links");
if (!login.includes("/assets/brand/novapharm-healthcare-logo.svg") || !login.includes("/assets/brand/novapharm-healthcare-logo.png")) fail("portal login is missing the approved logo and fallback");
if (login.includes("Vishal has customer")) fail("portal login exposes administrator access details");

const executiveFixture = `<html><head><style></style></head><body><div class="sb-hd">
  <div class="sb-brand">
    <div class="sb-mark">NP</div>
    <div><div class="sb-name">NovaPharm</div><div class="sb-co">Healthcare Ltd &middot; EIP v2.0</div></div>
  </div>
</div></body></html>`;
const brandedFixture = applyExecutiveBranding(executiveFixture, "NP_Hub.html");
if (!brandedFixture.includes("/assets/brand/novapharm-healthcare-logo.svg") || brandedFixture.includes("sb-mark")) fail("Executive Platform official-brand transformation failed");

for (const page of executivePages) {
  if (fileExists(page) || fileExists(`portal/executive-platform/${page}`)) {
    fail(`public Executive Platform page still exists: ${page}`);
  }
  const securePage = join(secureRoot, "executive-platform", page);
  if (!existsSync(securePage)) {
    fail(`missing protected Executive Platform page: ${page}`);
    continue;
  }
  const secureHtml = readFileSync(securePage, "utf8");
  if (!secureHtml.includes("noindex,nofollow") || !secureHtml.includes("/assets/brand/novapharm-healthcare-logo.svg")) {
    fail(`protected Executive Platform page is missing privacy or official-brand controls: ${page}`);
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(`Validated ${pagesToValidate.length} public entry pages and ${executivePages.length} protected Executive Platform modules.`);
