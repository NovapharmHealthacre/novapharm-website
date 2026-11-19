import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
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

const allowedPublicShoppingFiles = new Set(["shopping/nutraxin-uk.tsv"]);
const allowedPublicPortalFiles = new Set(["portal/index.html"]);

const requiredPublicPaths = [
  "index.html",
  "404.html",
  "CNAME",
  "da125ceca8032e01fc98782c388f894f.txt",
  "feed.xml",
  "assets",
  "assets/js/ai-search.js",
  "assets/ai/runtime/search-controller.mjs",
  "assets/ai/runtime/semantic-worker.mjs",
  "assets/ai/company-source-manifest.json",
  "assets/ai/company-knowledge-index.json",
  "assets/ai/company-embeddings.json",
  "assets/ai/novapharm-evidence-vector-v1.json",
  "capabilities/index.html",
  "cro/index.html",
  "distribution/index.html",
  "market-access/index.html",
  "markets/index.html",
  "oncology/index.html",
  "contact/index.html",
  "portal/index.html",
  "products/index.html",
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

for (const forbiddenPath of ["admin", "employee", "entra-complete", "_secure", "portal/change-password", "portal/dashboard", "portal/executive-platform"]) {
  if (existsSync(join(output, forbiddenPath))) {
    throw new Error(`Secure or server-dependent path entered the Pages artifact: ${forbiddenPath}`);
  }
}

// Keep every deployed public-AI runtime byte tied to its reviewed source file.
// The built artefact must not publish a stale controller or a model index from a
// different corpus, even when the rest of the public site passes visual checks.
const aiRuntimePaths = [
  "keyword-index.mjs",
  "model-registry.mjs",
  "citation-resolver.mjs",
  "policy-engine.mjs",
  "privacy-guard.mjs",
  "semantic-worker.mjs",
  "search-controller.mjs"
];
for (const runtime of aiRuntimePaths) {
  const sourceFile = join(root, "src", "ai", runtime);
  const stagedFile = join(output, "assets", "ai", "runtime", runtime);
  if (!existsSync(stagedFile)) throw new Error("Missing staged AI runtime: " + runtime);
  if (!readFileSync(sourceFile).equals(readFileSync(stagedFile))) {
    throw new Error("Stale/mismatched AI browser runtime: " + runtime);
  }
}
if (!readFileSync(join(root, "src/ai/search-bootstrap.mjs"))
    .equals(readFileSync(join(output, "assets/js/ai-search.js")))) {
  throw new Error("Public AI entrypoint differs from reviewed source");
}
const aiManifest = JSON.parse(readFileSync(join(output, "assets/ai/company-source-manifest.json"), "utf8"));
const aiKnowledge = JSON.parse(readFileSync(join(output, "assets/ai/company-knowledge-index.json"), "utf8"));
const aiEmbeddings = JSON.parse(readFileSync(join(output, "assets/ai/company-embeddings.json"), "utf8"));
const aiModel = JSON.parse(readFileSync(join(output, "assets/ai/novapharm-evidence-vector-v1.json"), "utf8"));
if (aiManifest.corpusHash !== aiKnowledge.corpusHash ||
    aiManifest.corpusHash !== aiEmbeddings.corpusHash ||
    aiManifest.chunkCount !== aiKnowledge.chunks.length ||
    aiManifest.approvedSourceCount !== aiManifest.sources.length ||
    aiModel.generation !== false || aiModel.remoteModelLoading !== false) {
  throw new Error("AI source/model manifest consistency gate failed");
}
for (const asset of Object.values(aiManifest.assets || {})) {
  if (!asset.path?.startsWith("/assets/ai/") || !/^[a-f0-9]{64}$/.test(asset.sha256)) {
    throw new Error("AI manifest contains an unapproved asset reference");
  }
  const bytes = readFileSync(join(output, asset.path.slice(1)));
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== asset.sha256 || bytes.length !== asset.bytes) {
    throw new Error("AI asset manifest digest or size mismatch: " + asset.path);
  }
}
for (const source of aiManifest.sources) {
  if (!source.url?.startsWith("https://novapharmhealthcare.com/") ||
      new RegExp("(?:^|/)(?:_secure|portal|admin|employee|contact|account-application|legal)(?:/|$)", "i").test(source.file)) {
    throw new Error("Unapproved private or form-data source included in AI release");
  }
}
console.log("Verified generated public AI model/index digests, approved corpus and exact source/runtime parity.");

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
  if (!isAllowedRootFile && !isAllowedDirectory && !allowedPublicShoppingFiles.has(stagedPath) && !allowedPublicPortalFiles.has(stagedPath) && stagedPath !== ".nojekyll") {
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

const totalBytes = stagedFiles.reduce((sum, file) => sum + statSync(file).size, 0);
console.log(`Staged ${stagedFiles.length.toLocaleString("en-GB")} public files (${totalBytes.toLocaleString("en-GB")} bytes) in ${relative(root, output) || output}.`);
