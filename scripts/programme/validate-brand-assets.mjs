import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const packRoot = path.join(root, "creative-assets/brand/novapharm-logo-asset-pack");
const failures = [];

const deployedAssets = Object.freeze([
  ["02_web/primary_transparent/novapharm-logo.svg", "assets/brand/novapharm-healthcare-logo.svg"],
  ["02_web/primary_transparent/novapharm-logo-red-2048w.png", "assets/brand/novapharm-healthcare-logo.png"],
  ["02_web/reverse_white/novapharm-logo-white.svg", "assets/brand/novapharm-healthcare-logo-reverse.svg"],
  ["02_web/monochrome_black/novapharm-logo-black.svg", "assets/brand/novapharm-healthcare-logo-monochrome.svg"],
  ["03_favicon_pwa/favicon.svg", "assets/brand/favicon.svg"],
  ["03_favicon_pwa/favicon.ico", "assets/brand/favicon.ico"],
  ["03_favicon_pwa/favicon-16x16.png", "assets/brand/favicon-16x16.png"],
  ["03_favicon_pwa/favicon-32x32.png", "assets/brand/favicon-32x32.png"],
  ["03_favicon_pwa/favicon-48x48.png", "assets/brand/favicon-48x48.png"],
  ["03_favicon_pwa/favicon-64x64.png", "assets/brand/favicon-64x64.png"],
  ["03_favicon_pwa/apple-touch-icon.png", "assets/brand/apple-touch-icon.png"],
  ["03_favicon_pwa/pwa-icon-192.png", "assets/brand/pwa-icon-192.png"],
  ["03_favicon_pwa/pwa-icon-512.png", "assets/brand/pwa-icon-512.png"],
  ["03_favicon_pwa/pwa-maskable-512.png", "assets/brand/pwa-maskable-512.png"],
  ["03_favicon_pwa/safari-pinned-tab.svg", "assets/brand/safari-pinned-tab.svg"],
  ["05_social_profile/novapharm-open-graph-1200x630-white.jpg", "assets/brand/novapharm-open-graph-1200x630-white.jpg"],
  ["05_social_profile/novapharm-open-graph-1200x630-red.jpg", "assets/brand/novapharm-open-graph-1200x630-red.jpg"],
]);

const expectedRasterDimensions = Object.freeze({
  "assets/brand/novapharm-healthcare-logo.png": [2048, 258],
  "assets/brand/favicon-16x16.png": [16, 16],
  "assets/brand/favicon-32x32.png": [32, 32],
  "assets/brand/favicon-48x48.png": [48, 48],
  "assets/brand/favicon-64x64.png": [64, 64],
  "assets/brand/apple-touch-icon.png": [180, 180],
  "assets/brand/pwa-icon-192.png": [192, 192],
  "assets/brand/pwa-icon-512.png": [512, 512],
  "assets/brand/pwa-maskable-512.png": [512, 512],
  "assets/brand/novapharm-open-graph-1200x630-white.jpg": [1200, 630],
  "assets/brand/novapharm-open-graph-1200x630-red.jpg": [1200, 630],
});

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(absolute));
    else files.push(absolute);
  }
  return files;
}

function digest(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

const packFiles = await filesUnder(packRoot);
if (packFiles.length !== 93) failures.push(`Governed logo pack must contain exactly 93 files; found ${packFiles.length}`);
if (packFiles.some((file) => path.basename(file) === ".DS_Store")) failures.push("Governed logo pack must not contain .DS_Store metadata");

const checksums = await readFile(path.join(packRoot, "SHA256SUMS.txt"), "utf8");
const checksumEntries = checksums.trim().split("\n").map((line) => {
  const match = line.match(/^([a-f0-9]{64})  (.+)$/u);
  if (!match) {
    failures.push(`Malformed checksum entry: ${line}`);
    return null;
  }
  return { expected: match[1], relativePath: match[2] };
}).filter(Boolean);
if (checksumEntries.length !== 92) failures.push(`Logo checksum register must contain 92 governed entries; found ${checksumEntries.length}`);

for (const entry of checksumEntries) {
  const content = await readFile(path.join(packRoot, entry.relativePath));
  const actual = digest(content);
  if (actual !== entry.expected) failures.push(`Logo-pack checksum mismatch: ${entry.relativePath}`);
}

for (const [sourcePath, deployedPath] of deployedAssets) {
  const [source, deployed] = await Promise.all([
    readFile(path.join(packRoot, sourcePath)),
    readFile(path.join(root, deployedPath)),
  ]);
  if (!source.equals(deployed)) failures.push(`${deployedPath} is not byte-identical to its approved logo-pack source ${sourcePath}`);
}

const primarySvg = await readFile(path.join(root, "assets/brand/novapharm-healthcare-logo.svg"), "utf8");
for (const forbidden of [/<text\b/iu, /<script\b/iu, /(?:href|src)=["']https?:/iu]) {
  if (forbidden.test(primarySvg)) failures.push(`Primary web logo contains forbidden SVG content matching ${forbidden}`);
}
if (!/#E3120B/iu.test(primarySvg)) failures.push("Primary web logo does not contain the approved Economist Red #E3120B");

const tokenSource = await readFile(path.join(packRoot, "06_brand_tokens/novapharm-brand-tokens.json"), "utf8");
const tokens = JSON.parse(tokenSource);
if (tokens?.primary?.hex !== "#E3120B") failures.push("Approved brand-token register must define #E3120B");

for (const [relativePath, [expectedWidth, expectedHeight]] of Object.entries(expectedRasterDimensions)) {
  const metadata = await sharp(path.join(root, relativePath)).metadata();
  if (metadata.width !== expectedWidth || metadata.height !== expectedHeight) {
    failures.push(`${relativePath} must be ${expectedWidth}x${expectedHeight}; found ${metadata.width}x${metadata.height}`);
  }
}

if (failures.length) {
  console.error("Brand-asset validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Brand-asset validation passed: ${packFiles.length} governed files, ${checksumEntries.length} registered checksums and ${deployedAssets.length} byte-identical web assets.`);
