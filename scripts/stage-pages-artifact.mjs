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
  "portal",
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

const requiredPublicPaths = [
  "index.html",
  "404.html",
  "CNAME",
  "da125ceca8032e01fc98782c388f894f.txt",
  "feed.xml",
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

const cname = readFileSync(join(output, "CNAME"), "utf8").trim();
if (cname !== "novapharmhealthcare.com") {
  throw new Error(`Unexpected Pages custom domain in artifact: ${cname || "<empty>"}`);
}

const stagedFiles = walk(output);
if (!stagedFiles.length) throw new Error("Pages artifact contains no files.");

for (const file of stagedFiles) {
  const stagedPath = relative(output, file).replaceAll("\\", "/");
  const topLevel = stagedPath.split("/")[0];
  const isAllowedRootFile = !stagedPath.includes("/") && allowedRootFiles.has(stagedPath);
  const isAllowedDirectory = allowedTopLevelDirectories.has(topLevel);
  if (!isAllowedRootFile && !isAllowedDirectory && !allowedPublicShoppingFiles.has(stagedPath) && stagedPath !== ".nojekyll") {
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

const totalBytes = stagedFiles.reduce((sum, file) => sum + statSync(file).size, 0);
console.log(`Staged ${stagedFiles.length.toLocaleString("en-GB")} public files (${totalBytes.toLocaleString("en-GB")} bytes) in ${relative(root, output) || output}.`);
