import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";

const root = resolve(process.cwd());

const pages = [
  "index.html",
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

const documents = [
  "public/docs/NP_Implementation_Blueprint_v2.pdf",
  "public/docs/NP_Flowcharts_v3.pdf",
  "portal/executive-platform/docs/NP_Implementation_Blueprint_v2.pdf",
  "portal/executive-platform/docs/NP_Flowcharts_v3.pdf"
];

const portalPages = pages.filter((name) => name.startsWith("NP_")).map((name) => `portal/executive-platform/${name}`);
const pagesToValidate = pages.concat(portalPages);
const localExtensions = new Set([".html", ".pdf", ".js", ".css", ".json", ".webmanifest", ".svg"]);

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

for (const doc of documents) {
  if (!fileExists(doc)) {
    fail(`missing document ${doc}`);
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

  const basename = page.split("/").pop();
  if (basename.startsWith("NP_") && basename !== "NP_Documents.html") {
    for (const linkedPage of pages.filter((name) => name.startsWith("NP_") && name.endsWith(".html"))) {
      if (!html.includes(`href="${linkedPage}"`)) {
        fail(`${page} sidebar is missing link to ${linkedPage}`);
      }
    }
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(`Validated ${pagesToValidate.length} pages and ${documents.length} PDF documents.`);
