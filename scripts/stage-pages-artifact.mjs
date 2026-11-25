import { createHash } from "node:crypto";
import {
  cpSync,
  constants,
  closeSync,
  existsSync,
  fstatSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readdirSync,
  renameSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const root = resolve(process.cwd());
const output = resolve(process.argv[2] || "_site");

const allowedTopLevelDirectories = new Set([
  ".well-known",
  "about",
  "our-story",
  "account-application",
  "assets",
  "capabilities",
  "careers",
  "contact",
  "cro",
  "distribution",
  "investor-information",
  "leadership",
  "market-access",
  "markets",
  "legal",
  "news-insights",
  "oncology",
  "partner-with-us",
  "products",
  "product-portfolio",
  "regulatory-services",
  "service-unavailable",
  "services",
  "technology",
  "trust-centre"
]);

const allowedRootFiles = new Set([
  ".nojekyll",
  "404.html",
  "500.html",
  "BingSiteAuth.xml",
  "CNAME",
  "da125ceca8032e01fc98782c388f894f.txt",
  "apple-touch-icon.png",
  "browserconfig.xml",
  "favicon-16x16.png",
  "favicon-32x32.png",
  "favicon.ico",
  "feed.xml",
  "humans.txt",
  "index.html",
  "llms.txt",
  "manifest.webmanifest",
  "mstile-150x150.png",
  "robots.txt",
  "safari-pinned-tab.svg",
  "security.txt",
  "site.webmanifest",
  "sitemap-images.xml",
  "sitemap-insights.xml",
  "sitemap.xml",
  "web-app-manifest-192x192.png",
  "web-app-manifest-512x512.png"
]);

const allowedPublicGiftFiles = new Set(["corporate-gifts/index.html"]);
const allowedPublicShoppingFiles = new Set(["shopping/nutraxin-uk.tsv"]);
const allowedPublicPortalFiles = new Set(["portal/index.html"]);
// Public research content is exactly one reviewed HTML file, never an entire directory.
const allowedPublicQuantumFiles = new Set(["quantum-research/index.html"]);

const requiredPublicPaths = [
  "index.html",
  "404.html",
  "CNAME",
  "da125ceca8032e01fc98782c388f894f.txt",
  "feed.xml",
  "llms.txt",
  "assets",
  "capabilities/index.html",
  "cro/index.html",
  "distribution/index.html",
  "market-access/index.html",
  "markets/index.html",
  "oncology/index.html",
  "contact/index.html",
  "portal/index.html",
  "products/index.html",
  "corporate-gifts/index.html",
  "products/marketplace/index.html",
  "products/track/index.html",
  "assets/data/commerce-marketplace.json",
  "assets/js/commerce-marketplace.js",
  "assets/css/commerce-marketplace.css",
  "assets/js/commerce-order-track.js",
  "assets/css/commerce-order-track.css",
  "products/esco/index.html",
  "products/esco/bag/index.html",
  "assets/js/esco-bag.js",
  "assets/data/esco-uk-guide-prices.json",
  "assets/data/esco-checkout-config.json",
  "assets/media/esco/previews/esco-cat-0373.svg",
  "assets/css/esco-catalogue.css",
  "assets/js/esco-catalogue.js",
  "products/nutraxin/index.html",
  "shopping/nutraxin-uk.tsv",
  "products/strategic-portfolio/index.html",
  "quantum-research/index.html",
  "trust-centre/index.html"
];

const forbiddenPublicMarkers = [
  "data-login-form",
  "data-account-application",
  "data-contact-form",
  'type="password"',
  'type="file"',
  'name="accessType"',
  "data-enterprise-module"
];

function copyDirectory(source, destination) {
  cpSync(source, destination, {
    recursive: true,
    dereference: true,
    errorOnExist: false,
    force: true,
    filter(path) {
      const name = basename(path);
      return name !== ".DS_Store" && name !== "Thumbs.db";
    }
  });
}

function walk(directory, files = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, files);
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

if (output === root || output.startsWith(`${root}/assets`)) {
  throw new Error(`Refusing to stage Pages output into an unsafe path: ${output}`);
}

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

for (const entry of readdirSync(root, { withFileTypes: true })) {
  const source = join(root, entry.name);
  if (source === output) continue;

  const destination = join(output, entry.name);
  // Publish the public portal landing page only, never generated authenticated
  // routes such as /portal/change-password or /portal/dashboard.
  if (entry.isDirectory() && entry.name === "portal") {
    for (const publicPath of allowedPublicPortalFiles) {
      const approvedSource = join(root, publicPath);
      if (!existsSync(approvedSource)) throw new Error("Missing reviewed public portal page: " + publicPath);
      const approvedDestination = join(output, publicPath);
      mkdirSync(dirname(approvedDestination), { recursive: true });
      cpSync(approvedSource, approvedDestination, { force: true });
    }
    continue;
  }
  if (entry.isDirectory() && entry.name === "quantum-research") {
    const contents = readdirSync(source, { withFileTypes: true });
    if (contents.length !== 1 || contents[0].name !== "index.html" ||
        !contents[0].isFile()) {
      throw new Error("Unreviewed file in public quantum-research directory");
    }
    for (const reviewedPath of allowedPublicQuantumFiles) {
      const reviewedSource = join(root, reviewedPath);
      const reviewedDestination = join(output, reviewedPath);
      mkdirSync(dirname(reviewedDestination), { recursive: true });
      cpSync(reviewedSource, reviewedDestination, { force: true });
    }
    continue;
  }
  if (entry.isDirectory() && entry.name === "corporate-gifts") {
    const contents = readdirSync(source, { withFileTypes: true });
    if (contents.length !== 1 || contents[0].name !== "index.html" || !contents[0].isFile()) throw new Error("Unreviewed corporate gifting file");
    for (const publicPath of allowedPublicGiftFiles) {
      const target = join(output, publicPath);
      mkdirSync(dirname(target), { recursive: true });
      cpSync(join(root, publicPath), target, { force: true });
    }
    continue;
  }
  if (entry.isDirectory() && allowedTopLevelDirectories.has(entry.name)) {
    copyDirectory(source, destination);
    continue;
  }

  if (entry.isFile() && allowedRootFiles.has(entry.name)) {
    cpSync(source, destination, { force: true });
  }
}

// Publish only the approved Merchant Center feed, never an unrestricted shopping directory.
for (const stagedPath of allowedPublicShoppingFiles) {
  const source = join(root, stagedPath);
  if (!existsSync(source)) throw new Error("Merchant feed missing: " + stagedPath);
  const destination = join(output, stagedPath);
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination, { force: true });
}

writeFileSync(join(output, ".nojekyll"), "");

for (const requiredPath of requiredPublicPaths) {
  const target = join(output, requiredPath);
  if (!existsSync(target)) throw new Error(`Pages artifact is missing required public path: ${requiredPath}`);
}

// The source catalogue includes confidential pricing-planning metadata.
// Public storefronts need product data, never NovaPharm's internal margin.
const escoDataPath = join(output, "assets/data/esco-catalogue.json");
// Open exactly the generated regular file, without following a substituted
// symlink. Never check a pathname and later write through that pathname.
const escoReadFd = openSync(escoDataPath, constants.O_RDONLY | constants.O_NOFOLLOW);
let escoPublicData;
try {
  if (!fstatSync(escoReadFd).isFile()) throw new Error("Public ESCO catalogue is not a regular file");
  escoPublicData = JSON.parse(readFileSync(escoReadFd, "utf8"));
} finally {
  closeSync(escoReadFd);
}
if (escoPublicData.entriesTotal !== 373 || escoPublicData.categories?.length !== 12 ||
    escoPublicData.requestQuoteOnly !== true || escoPublicData.checkoutEnabled !== false) {
  throw new Error("Refusing a public ESCO catalogue with unverified item count or commercial eligibility");
}
delete escoPublicData.targetGrossMargin;
const safeEscoJson = JSON.stringify(escoPublicData, null, 2) + "\n";
if (safeEscoJson.includes("targetGrossMargin")) {
  throw new Error("Confidential ESCO margin reached the public artifact");
}
// An exclusively created temporary file plus atomic rename prevents the
// public candidate ever containing a partially rewritten or symlinked JSON.
const escoTmpPath = escoDataPath + ".sanitized-" + process.pid;
const escoWriteFd = openSync(escoTmpPath,
  constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
try {
  writeFileSync(escoWriteFd, safeEscoJson, "utf8");
  fsyncSync(escoWriteFd);
} finally {
  closeSync(escoWriteFd);
}
try {
  renameSync(escoTmpPath, escoDataPath);
} finally {
  rmSync(escoTmpPath, { force: true });
}

// ESCO category-level price research is for public guide figures only;
// never publish supplier landed-cost ceilings, margin assumptions, or
// owner-declared inventory planning quantities from the generated model.
const escoGuidePath = join(output, "assets/data/esco-uk-guide-prices.json");
const escoGuideReadFd = openSync(escoGuidePath, constants.O_RDONLY | constants.O_NOFOLLOW);
let escoGuide;
try {
  if (!fstatSync(escoGuideReadFd).isFile()) throw new Error("ESCO guide is not a regular file");
  escoGuide = JSON.parse(readFileSync(escoGuideReadFd, "utf8"));
} finally {
  closeSync(escoGuideReadFd);
}
if (escoGuide.entriesTotal !== 373 ||
    escoGuide.checkoutEnabled !== false ||
    escoGuide.paymentCollectionEnabled !== false ||
    escoGuide.requestQuoteOnly !== true ||
    Object.keys(escoGuide.guidePrices ?? {}).length !== 373 ||
    Object.keys(escoGuide.visualPreviews ?? {}).length !== 373) {
  throw new Error("Cannot publish unverified ESCO guide count, status, or product previews");
}
const safeGuidePrices = Object.fromEntries(
  Object.entries(escoGuide.guidePrices).map(([id, item]) => {
    if (!/^ESCO-CAT-\d{4}$/.test(id) || item.catalogueReference !== id ||
        !Number.isFinite(item.guidePriceExVatGbp) || item.guidePriceExVatGbp <= 0 ||
        item.priceApprovedForCheckout !== false ||
        item.checkoutEligible !== false || item.publicGuideOnly !== true) {
      throw new Error("ESCO guide row is not public-safe or owner-reviewed: " + id);
    }
    return [id, {
      catalogueReference: id,
      category: item.category,
      guidePriceExVatGbp: item.guidePriceExVatGbp,
      currency: item.currency,
      taxDisplay: item.taxDisplay,
      sourceType: item.sourceType,
      deliveryIncluded: false,
      priceApprovedForCheckout: false,
      checkoutEligible: false,
      publicGuideOnly: true
    }];
  })
);
const publicEscoGuide = {
  version: escoGuide.version.replace(/-public-safe$/, "") + "-public-safe",
  source: escoGuide.source,
  taxPolicy: escoGuide.taxPolicy,
  checkoutEnabled: false,
  paymentCollectionEnabled: false,
  requestQuoteOnly: true,
  currency: escoGuide.currency,
  inventoryEvidence: escoGuide.inventoryEvidence,
  stockVerified: false,
  availableToPromiseVerified: false,
  entriesTotal: 373,
  guidePrices: safeGuidePrices,
  visualPreviews: escoGuide.visualPreviews
};
const safeEscoGuideJson = JSON.stringify(publicEscoGuide, null, 2) + "\n";
if (/targetGrossMargin|unitEconomics|maximumSupplier|grossMargin|marginPolicy|maximumFullyLandedCost|ownerDeclared|totalOwnerDeclared|supplierCost|modelFeasible/i.test(safeEscoGuideJson)) {
  throw new Error("Confidential ESCO economics leaked into public guide");
}
// Write a new regular file exclusively and swap into the private build tree
// atomically. Never reopen a validated output pathname for writing.
const escoGuideTmpPath = escoGuidePath + ".sanitized-" + process.pid;
const escoGuideWriteFd = openSync(escoGuideTmpPath,
  constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
try {
  writeFileSync(escoGuideWriteFd, safeEscoGuideJson, "utf8");
  fsyncSync(escoGuideWriteFd);
} finally {
  closeSync(escoGuideWriteFd);
}
try {
  renameSync(escoGuideTmpPath, escoGuidePath);
} finally {
  rmSync(escoGuideTmpPath, { force: true });
}

// Fail closed if an older Next.js or root-static build would overwrite the
// owner-approved Earth homepage and the 19 restored, sellable-by-policy-only
// Nutraxin public pages. A git merge alone is not proof of an approved Pages build.
const restoredHomeHtml = readFileSync(join(output, "index.html"), "utf8");
for (const approvedMarker of [
  "/assets/media/home/earth-reference-1400.jpg",
  "Medicine. Where it needs to be.",
  "Better access begins with better decisions.",
  "Specialist medicines.",
  "Thoughtfully selected.",
  "Understand the medicine.",
  "Built for trust."
]) {
  if (!restoredHomeHtml.includes(approvedMarker)) {
    throw new Error("Refusing pre-restoration corporate homepage publishing: " + approvedMarker);
  }
}
const reviewedGtinRegister = JSON.parse(readFileSync(join(root, "assets/data/nutraxin-gtin-uk.json"), "utf8"));
if (!Array.isArray(reviewedGtinRegister.products) || reviewedGtinRegister.products.length !== 19) {
  throw new Error("Reviewed Nutraxin GTIN register must contain exactly 19 products");
}
const seenGtinProductSlugs = new Set();
for (const { slug, gtin13 } of reviewedGtinRegister.products) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !/^\d{13}$/.test(gtin13) || seenGtinProductSlugs.has(slug)) {
    throw new Error("Unsafe or duplicate reviewed Nutraxin product slug or GTIN");
  }
  seenGtinProductSlugs.add(slug);
  const productFile = join(output, "products", "nutraxin", slug, "index.html");
  if (!existsSync(productFile)) throw new Error("Restored Nutraxin product missing: " + slug);
  const product = readFileSync(productFile, "utf8");
  for (const required of [
    '"gtin13":"' + gtin13 + '"',
    '"@type":"Product"',
    'data-nutraxin-answers="true"',
    'https://novapharmhealthcare.com/products/nutraxin/' + slug + '/',
    '/assets/js/nutraxin-retail-store.js'
  ]) {
    if (!product.includes(required)) throw new Error("Refusing outdated or partial Nutraxin release: " + slug + " missing " + required);
  }
}
for (const path of [
  "assets/data/nutraxin-retail-catalogue.json",
  "assets/data/nutraxin-consumer-auth.json",
  "assets/js/nutraxin-retail-store.js",
  "assets/js/nutraxin-consumer-account.js",
  "assets/css/nutraxin-retail-store.css",
  "assets/css/nutraxin-consumer-account.css",
  "assets/css/nutraxin-merchant.css",
  "products/nutraxin/bag/index.html",
  "products/nutraxin/account/index.html"
]) {
  if (!existsSync(join(output, path))) {
    throw new Error("Restored Nutraxin storefront dependency missing: " + path);
  }
}

// Prevent a future "successful" Pages rebuild from silently losing the
// previously restored 392-product Marketplace or the noindex status-only page.
// This validates source-derived content, not the ability to take payments.
const marketplaceHtml = readFileSync(join(output, "products/marketplace/index.html"), "utf8");
if (!marketplaceHtml.includes('data-commerce-marketplace') ||
    (marketplaceHtml.match(/class="mp-source-index-link"/g) ?? []).length !== 392 ||
    !marketplaceHtml.includes('https://novapharmhealthcare.com/products/marketplace/') ||
    !marketplaceHtml.includes('/assets/js/commerce-marketplace.js')) {
  throw new Error("Missing owner-reviewed 392-product Commerce Marketplace");
}
const marketplaceData = JSON.parse(readFileSync(join(output, "assets/data/commerce-marketplace.json"), "utf8"));
if (marketplaceData.schema !== "novapharm-public-merchant-discovery-v1" ||
    marketplaceData.sourceProductCount !== 392 ||
    marketplaceData.notPaymentAuthority !== true ||
    !Array.isArray(marketplaceData.products) ||
    marketplaceData.products.length !== 392 ||
    marketplaceData.products.filter(p => p.brand === "Nutraxin").length !== 19 ||
    marketplaceData.products.filter(p => p.brand === "ESCO").length !== 373 ||
    new Set(marketplaceData.products.map(p => p.sku)).size !== 392 ||
    marketplaceData.products.some(p => p.cardCheckoutAuthority !== false || p.availabilityQuantity !== null)) {
  throw new Error("Commerce catalog source, inventory, or payment authority contract changed");
}
const trackingHtml = readFileSync(join(output, "products/track/index.html"), "utf8");
if (!trackingHtml.includes("data-np-order-lookup") ||
    !trackingHtml.includes('name="order_ref"') ||
    !trackingHtml.includes('/assets/js/commerce-order-track.js') ||
    !trackingHtml.includes('https://novapharmhealthcare.com/products/track/') ||
    !/<meta\s+name="robots"\s+content="noindex,\s*follow"/i.test(trackingHtml)) {
  throw new Error("Customer order tracking privacy or source contract changed");
}
const productsOverviewHtml = readFileSync(join(output, "products/index.html"), "utf8");
if (!productsOverviewHtml.includes('data-products-editorial="approved-2026-11"') ||
    !productsOverviewHtml.includes('/products/marketplace/') ||
    !productsOverviewHtml.includes('/products/track/')) {
  throw new Error("Approved November Products overview or its Commerce navigation was lost");
}
const stagedSitemap = readFileSync(join(output, "sitemap.xml"), "utf8");
if (!stagedSitemap.includes('<loc>https://novapharmhealthcare.com/products/marketplace/</loc>') ||
    !stagedSitemap.includes('<loc>https://novapharmhealthcare.com/products/esco/</loc>') ||
    stagedSitemap.includes('<loc>https://novapharmhealthcare.com/products/track/</loc>') ||
    stagedSitemap.includes('<loc>https://novapharmhealthcare.com/products/esco/bag/</loc>')) {
  throw new Error("Commerce sitemap cannot index private order tracking or omit restored catalogues");
}

for (const forbiddenPath of ["admin", "employee", "entra-complete", "_secure", "portal/change-password", "portal/dashboard", "portal/executive-platform"]) {
  if (existsSync(join(output, forbiddenPath))) {
    throw new Error(`Secure or server-dependent path entered the Pages artifact: ${forbiddenPath}`);
  }
}

const cname = readFileSync(join(output, "CNAME"), "utf8").trim();
if (cname !== "novapharmhealthcare.com") {
  throw new Error(`Unexpected Pages custom domain in artifact: ${cname || "<empty>"}`);
}

// A GitHub Pages upload must never silently publish stale LTR-only markup.
const { validatePublicRtlArtifacts } = await import("./finalize-public-rtl.mjs");
const rtlValidation = validatePublicRtlArtifacts(output);
console.log("Validated RTL bootstrap on " + rtlValidation.valid + " staged public HTML pages.");

// Source HTML stays byte-identical to the approved generators, but the actual
// Pages artifact uses a content-addressed locale bootstrap. Safari must not
// reuse a cached pre-redesign JavaScript file after a successful deployment.
const { publicRtlFiles } = await import("./finalize-public-rtl.mjs");
const localeBytes = readFileSync(join(output, "assets/js/rtl-localization.js"));
const localeVersion = createHash("sha256").update(localeBytes).digest("hex").slice(0, 16);
const unversionedLocaleScript = '<script src="/assets/js/rtl-localization.js"></script>';
const versionedLocaleScript = '<script src="/assets/js/rtl-localization.js?v=' + localeVersion + '"></script>';
let localeVersionedPages = 0;
for (const file of publicRtlFiles(output)) {
  const html = readFileSync(file, "utf8");
  if (html.split(unversionedLocaleScript).length - 1 !== 1) {
    throw new Error("Public Pages locale bootstrap must occur exactly once before versioning: " + file);
  }
  const changed = html.replace(unversionedLocaleScript, versionedLocaleScript);
  if (!changed.includes(versionedLocaleScript) || changed.includes(unversionedLocaleScript)) {
    throw new Error("Stale public locale script URL remains in Pages artifact: " + file);
  }
  writeFileSync(file, changed, "utf8");
  localeVersionedPages += 1;
}
if (localeVersionedPages !== rtlValidation.valid) {
  throw new Error("Not every public RTL page received the versioned Safari bootstrap");
}
console.log("Pinned exact locale JavaScript fingerprint in " + localeVersionedPages + " staged Pages HTML files.");

const stagedFiles = walk(output);
if (!stagedFiles.length) throw new Error("Pages artifact contains no files.");

for (const file of stagedFiles) {
  const stagedPath = relative(output, file).replaceAll("\\", "/");
  const topLevel = stagedPath.split("/")[0];
  const isAllowedRootFile = !stagedPath.includes("/") && allowedRootFiles.has(stagedPath);
  const isAllowedDirectory = allowedTopLevelDirectories.has(topLevel);
  if (!isAllowedRootFile && !isAllowedDirectory && !allowedPublicShoppingFiles.has(stagedPath) && !allowedPublicPortalFiles.has(stagedPath) && !allowedPublicQuantumFiles.has(stagedPath) && !allowedPublicGiftFiles.has(stagedPath) && stagedPath !== ".nojekyll") {
    throw new Error(`Unexpected path entered the Pages artifact: ${stagedPath}`);
  }
  if (/\.(?:env|pem|key|sqlite|db|bak)$/i.test(stagedPath)) {
    throw new Error(`Sensitive file type entered the Pages artifact: ${stagedPath}`);
  }
  if (/\.html?$/i.test(stagedPath)) {
    const html = readFileSync(file, "utf8");
    for (const marker of forbiddenPublicMarkers) {
      if (html.includes(marker)) throw new Error(`Server-dependent control entered ${stagedPath}: ${marker}`);
    }
  }
}

// Require immutable source identity in every canonical page in the staged
// artifact. A visually correct build from a different commit is not an
// auditable production release.
const releaseSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const canonicalPages = JSON.parse(readFileSync(join(root, "seo/generated/page-metadata-register.json"), "utf8"));
if (canonicalPages.length < 60) throw new Error("Missing canonical pages in release provenance register");
for (const page of canonicalPages) {
  const target = join(output, page.file);
  if (!existsSync(target)) throw new Error(`Canonical release page not staged: ${page.file}`);
  const html = readFileSync(target, "utf8");
  const markers = [...html.matchAll(/<meta name="novapharm-source-sha" content="([0-9a-f]{40})">/g)];
  if (markers.length !== 1 || markers[0][1] !== releaseSha) {
    throw new Error(`Canonical release provenance mismatch: ${page.file}`);
  }
}

// Check the actual staged canonical HTML, not just source templates or screenshots.
// This is still source-only: it never asserts that live customer pages were deployed.
const { officialPublicBrandPalette, assertOfficialPublicBrandMetadata } =
  await import("./normalise-official-public-brand-metadata.mjs");
const officialPalette = officialPublicBrandPalette(root);
for (const page of canonicalPages) {
  assertOfficialPublicBrandMetadata(readFileSync(join(output, page.file), "utf8"), officialPalette);
}

// Keep non-indexable quantum reference traceable to the exact released source.
const quantumCandidate = readFileSync(join(output, "quantum-research/index.html"), "utf8");
if (!quantumCandidate.includes('name="robots" content="noindex, nofollow"') ||
    /<form\b|data-login-form|data-contact-form|data-account-application/i.test(quantumCandidate) ||
    (quantumCandidate.match(/<meta name="novapharm-source-sha" content="([0-9a-f]{40})">/g) ?? []).length !== 1 ||
    !quantumCandidate.includes('<meta name="novapharm-source-sha" content="' + releaseSha + '">')) {
  throw new Error("Quantum public candidate provenance mismatch");
}

const totalBytes = stagedFiles.reduce((sum, file) => sum + statSync(file).size, 0);
console.log(`Staged ${stagedFiles.length.toLocaleString("en-GB")} public files (${totalBytes.toLocaleString("en-GB")} bytes) in ${relative(root, output) || output}.`);
