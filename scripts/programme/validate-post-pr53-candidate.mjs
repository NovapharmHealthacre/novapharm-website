import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!existsSync(absolutePath)) {
    failures.push(`Missing required candidate evidence: ${relativePath}`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function json(relativePath) {
  const content = read(relativePath);
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch (error) {
    failures.push(`${relativePath} is not valid JSON: ${error.message}`);
    return null;
  }
}

function requireText(content, marker, label) {
  if (!content.includes(marker)) failures.push(`${label}: missing ${JSON.stringify(marker)}`);
}

function requireValue(condition, message) {
  if (!condition) failures.push(message);
}

const currentTruth = read("docs/programme/post-pr53-current-truth.md");
for (const marker of [
  "CURRENT_MAIN_SHA",
  "CURRENT_RELEASE_STATE",
  "OPEN_PRS",
  "OPEN_ISSUES",
  "PORTAL_MODULE_COUNT",
  "GOVERNED_SECTION_COUNT",
  "KNOWN_BLOCKERS",
  "Managed Portal/API/Azure production is not evidenced or claimed"
]) {
  requireText(currentTruth, marker, "Post-PR53 current-truth ledger");
}

const technologyMatrix = read("docs/architecture/technology-fit-matrix.md");
const technologyMarkers = [
  "HTML5",
  "CSS / CSS3",
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "SVG",
  "XML",
  "WebKit compatibility",
  "WebAssembly",
  "Swift",
  "SwiftUI",
  "UIKit",
  "AppKit",
  "Foundation",
  "RealityKit",
  "ARKit",
  "Core ML",
  "MapKit",
  "CloudKit",
  "WidgetKit",
  "StoreKit",
  "Objective-C",
  "C",
  "C++",
  "Metal",
  "Metal Shading Language (MSL)",
  "Python",
  "Perl",
  "Ruby",
  "LLVM",
  "LLVM IR"
];
for (const marker of technologyMarkers) {
  requireText(technologyMatrix, marker, "Technology-fit matrix");
}
for (const decision of [
  "CURRENTLY_USED",
  "RETAIN",
  "ADD_LATER",
  "NATIVE_ONLY",
  "OPTIONAL",
  "NOT_JUSTIFIED",
  "NOT_APPLICABLE"
]) {
  requireText(technologyMatrix, decision, "Technology-fit decision vocabulary");
}
requireText(technologyMatrix, "No benchmark means no Wasm", "Measured WebAssembly admission boundary");
requireText(technologyMatrix, "single business-data authority", "CloudKit authority boundary");

const visualMatrix = read("docs/visual/apple-parity-matrix.md");
for (const marker of [
  "Apple is an internal craftsmanship benchmark",
  "Officially documented",
  "Publicly observable",
  "Inferred",
  "Unknown",
  "Corporate homepage",
  "Secure Portal",
  "320",
  "360",
  "375",
  "390",
  "414",
  "430",
  "768",
  "820",
  "1024",
  "1280",
  "1366x768",
  "1440",
  "1512",
  "1728",
  "1920",
  "2560"
]) {
  requireText(visualMatrix, marker, "Apple-parity evidence matrix");
}

const brandGovernance = read("docs/programme/brand-governance.md");
for (const marker of [
  "authoritative 93-file owner pack",
  "#E3120B",
  "creative-assets/brand/novapharm-logo-asset-pack/",
  "npm run brand:validate"
]) {
  requireText(brandGovernance, marker, "Brand-governance evidence");
}

const moduleCatalog = json("packages/portal-contracts/src/module-catalog.json") ?? [];
requireValue(Array.isArray(moduleCatalog), "Portal module catalogue must be an array");
if (Array.isArray(moduleCatalog)) {
  const moduleCodes = new Set(moduleCatalog.map((module) => module.code));
  const counts = Object.fromEntries(
    ["customer", "employee", "executive", "admin"].map((area) => [
      area,
      moduleCatalog.filter((module) => module.area === area).length
    ])
  );
  const hidden = moduleCatalog.filter((module) => module.visibleInNavigation === false);
  requireValue(moduleCatalog.length === 54, `Portal module catalogue must contain exactly 54 modules, found ${moduleCatalog.length}`);
  requireValue(moduleCodes.size === 54, `Portal module codes must be unique, found ${moduleCodes.size}`);
  requireValue(
    counts.customer === 18 && counts.employee === 13 && counts.executive === 18 && counts.admin === 5,
    `Portal area counts must be customer 18, employee 13, executive 18 and admin 5; found ${JSON.stringify(counts)}`
  );
  requireValue(hidden.length === 7, `Exactly seven governed modules must remain hidden for safety, found ${hidden.length}`);
  requireValue(
    hidden.every((module) => module.area === "executive" && module.releaseClassification === "hidden_until_dependency_exists"),
    "All seven hidden modules must be Executive modules classified hidden_until_dependency_exists"
  );
}

const mandate = json("docs/programme/absolute-mandate-register.json");
const mandateSections = mandate?.sections ?? [];
requireValue(mandate?.metadata?.governed_section_count === 122, "Mandate metadata must declare 122 governed sections");
requireValue(mandateSections.length === 122, `Mandate register must contain 122 sections, found ${mandateSections.length}`);
requireValue(
  mandateSections.every((section, index) => section.section === index),
  "Mandate register sections must be consecutive from 0 through 121"
);

const imageInventory = json("audit/generated/image-inventory.json");
const trackedMedia = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" })
  .split("\0")
  .filter((file) => /\.(?:avif|eps|jpe?g|pdf|png|svg|webp)$/iu.test(file));
const inventoryAssets = imageInventory?.assets ?? [];
requireValue(imageInventory?.summary?.trackedAssetCount === trackedMedia.length, `Image inventory summary must match ${trackedMedia.length} tracked assets`);
requireValue(inventoryAssets.length === trackedMedia.length, `Image inventory must contain one record for every tracked asset; found ${inventoryAssets.length} of ${trackedMedia.length}`);
requireValue(
  inventoryAssets.every((asset) => asset.provenanceStatus !== "unregistered-physical-asset"),
  "No tracked image may remain an unregistered physical asset"
);
requireValue(
  inventoryAssets.every((asset) => asset.classification !== "NEEDS_PROVENANCE"),
  "No tracked image may remain classified NEEDS_PROVENANCE"
);
requireValue(
  inventoryAssets.every((asset) => asset.budgetReview !== "REVIEW_OVER_800_KB"),
  "No public-delivery image may exceed the 800 KB physical-file ceiling"
);

const homepageSource = read("apps/corporate/components/concise-home.tsx");
const homepageArtifact = read("index.html");
for (const [marker, label] of [
  ["pharma-home-shade", "directional hero contrast layer"],
  ["Conceptual supply-chain visual. No NovaPharm facility, vehicle, inventory or current distribution activity is depicted.", "conceptual hero truth boundary"],
  ["Evidence travels with the batch.", "Batch Integrity editorial heading"],
  ["Representative traceability composition. It is not a NovaPharm facility, product or active batch record.", "Batch Integrity media boundary"],
  ["Regulated wholesale supply has not commenced.", "regulated-wholesale status boundary"]
]) {
  requireText(homepageSource, marker, `Corporate React homepage ${label}`);
  requireText(homepageArtifact, marker, `PUBLIC_ONLY homepage ${label}`);
}

const publicCss = read("assets/css/apple-pharma-public.css");
const bundleCss = read("assets/css/novapharm.bundle.css");
const privatePageGenerator = read("scripts/build-pages.mjs");
requireText(publicCss, "--apple-pharma-public-contract: 3", "Scoped public visual contract");
requireText(bundleCss, "--apple-pharma-public-contract: 3", "Bundled public visual contract");
requireText(publicCss, "@media (prefers-reduced-motion: reduce)", "Reduced-motion design");
requireText(publicCss, ".login-panel-authentication { max-width: 900px; }", "Portal authentication composition");
requireText(privatePageGenerator, "login-panel login-panel-authentication", "Portal authentication markup");

const browserAcceptance = read("scripts/test-public-pages-browser.mjs");
const browserWidths = new Set(
  [...browserAcceptance.matchAll(/\bwidth:\s*(\d+)/gu)].map((match) => Number(match[1]))
);
for (const width of [320, 360, 375, 390, 414, 430, 768, 820, 1024, 1280, 1366, 1440, 1512, 1728, 1920, 2560]) {
  requireValue(browserWidths.has(width), `Public browser acceptance is missing required viewport width ${width}`);
}
requireText(browserAcceptance, "unloadedImages", "Browser image-completion contract");
requireText(browserAcceptance, "midWordBreaks", "Browser heading-wrap contract");
requireText(browserAcceptance, "reducedMotion: \"reduce\"", "Browser reduced-motion contract");

if (failures.length) {
  console.error("Post-PR53 candidate validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Post-PR53 candidate validation passed: ${mandateSections.length} governed sections, ${moduleCatalog.length} portal modules, ${trackedMedia.length} governed assets, ${technologyMarkers.length} technology decisions and ${browserWidths.size} rendered viewport widths are enforced.`
);
