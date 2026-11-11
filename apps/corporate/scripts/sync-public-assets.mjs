import assert from "node:assert/strict";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const applicationRoot = process.cwd();
const repositoryRoot = path.resolve(applicationRoot, "../..");
const sourceRoot = path.join(repositoryRoot, "assets");
const publicRoot = path.join(applicationRoot, "public", "assets");
const copyGovernedAsset = (source, destination) => cp(source, destination, {
  recursive: true,
  filter: (entry) => path.basename(entry) !== ".DS_Store",
});

await rm(publicRoot, { recursive: true, force: true });
await mkdir(publicRoot, { recursive: true });
await Promise.all([
  copyGovernedAsset(path.join(sourceRoot, "brand"), path.join(publicRoot, "brand")),
  copyGovernedAsset(path.join(sourceRoot, "media"), path.join(publicRoot, "media")),
]);

// Materialise the two owner-approved Capabilities illustrations from the
// SAME editorial source used by the static GitHub Pages build. Do not serve
// a stale, generic managed-app hero if hosting is moved to Next.js.
const editorial = await readFile(path.join(repositoryRoot, "src/content/capabilities-editorial.html"), "utf8");
const capabilitiesDir = path.join(publicRoot, "media", "capabilities");
await mkdir(capabilitiesDir, { recursive: true });
for (const [className, fileName, width] of [
  ["ncap-vial-illustration", "vial-study.webp", 1200],
  ["ncap-earth-illustration", "earth-horizon.webp", 1600],
]) {
  const start = editorial.indexOf(`<svg class="${className}"`);
  const end = start >= 0 ? editorial.indexOf("</svg>", start) : -1;
  assert.ok(start >= 0 && end > start, `Approved Capabilities artwork missing: ${className}`);
  const svg = editorial.slice(start, end + "</svg>".length);
  const image = await sharp(Buffer.from(svg, "utf8"))
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 77, effort: 5 })
    .toBuffer();
  assert.ok(image.length > 500, `Capabilities artwork is unexpectedly empty: ${className}`);
  await writeFile(path.join(capabilitiesDir, fileName), image);
}

const logo = await readFile(path.join(publicRoot, "brand", "novapharm-healthcare-logo.svg"), "utf8");
assert.match(logo, /#E3120B/i, "Official corporate logo does not use the approved identity red");
assert.doesNotMatch(logo, /<text\b/i, "Official corporate logo must remain path-based");
console.log("Corporate public media synchronised from the approved repository asset register.");
