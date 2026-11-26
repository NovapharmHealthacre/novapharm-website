#!/usr/bin/env node
// Reviewed owner-pack handoff installer. No production publication or API calls.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname, sep } from "node:path";
const root = process.cwd();
if (!process.argv[2]) {
  console.error("Usage: node scripts/programme/install-three-brand-release.mjs <extracted-release-directory> [--check]");
  process.exit(2);
}
const supplied = resolve(process.argv[2]);
const payloadRoot = resolve(supplied, "deploy");
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const manifest = JSON.parse(await readFile(resolve(supplied, "brand-integration-register.json"), "utf8"));
const identities = JSON.parse(await readFile(resolve(root, "config/brand-identities.json"), "utf8"));
assert.equal(manifest.release, "2026-11-22");
assert.equal(manifest.repo, "NovapharmHealthacre/novapharm-website");
assert.equal(manifest.inputArchiveTotalFiles, 695);
assert.equal(manifest.mapping.length, manifest.deployFileCount);
assert.ok(manifest.mapping.length >= 44, "Incomplete owner delivery");
for (const [brand, pack] of Object.entries(manifest.packages)) {
  assert.ok(identities.brands[brand], "Unexpected source brand");
  assert.equal(pack.originalSha256, identities.brands[brand].sourceZipSha256, "Unapproved source archive: " + brand);
  assert.equal(pack.sourceFiles, identities.brands[brand].sourceZipFiles);
}
const brandRoot = resolve(root, "assets/brand") + sep;
const staged = [];
for (const item of manifest.mapping) {
  assert.ok(identities.brands[item.brand]);
  assert.match(item.repoPath, /^assets\/brand\/[A-Za-z0-9_.\/-]+$/);
  const dest = resolve(root, item.repoPath);
  const origin = resolve(payloadRoot, item.repoPath);
  assert.ok(dest.startsWith(brandRoot), "Unexpected destination");
  assert.ok(origin.startsWith(payloadRoot + sep), "Untrusted payload path");
  const bytes = await readFile(origin);
  assert.ok(bytes.length > 0);
  assert.equal(bytes.length, item.sizeBytes, "Incorrect delivery file size: " + item.repoPath);
  assert.equal(digest(bytes), item.sha256, "Incorrect delivery checksum: " + item.repoPath);
  if (item.repoPath.endsWith(".svg")) {
    const svg = bytes.toString("utf8");
    assert.match(svg, /<svg\b/);
    assert.doesNotMatch(svg, /<script\b|<foreignObject\b|javascript:/i, "Unsafe SVG");
  }
  staged.push({ item, dest, bytes });
}
for (const [path, key, name] of [
  ["assets/brand/novapharm-healthcare-logo.svg", "healthcare", "primaryVectorZipSha256"],
  ["assets/brand/novapharm-distribution-logo.svg", "distribution", "primaryVectorZipSha256"],
  ["assets/brand/novapharm-intelligence-logo.svg", "intelligence", "primaryVectorZipSha256"],
  ["assets/brand/favicon.svg", "healthcare", "browserIconZipSha256"],
  ["assets/brand/novapharm-distribution-favicon.svg", "distribution", "browserIconZipSha256"],
  ["assets/brand/novapharm-intelligence-favicon.svg", "intelligence", "browserIconZipSha256"],
]) {
  const match = staged.find((record) => record.item.repoPath === path);
  assert.ok(match, "Missing canonical identity: " + path);
  assert.equal(digest(match.bytes), identities.brands[key][name], "Non-authoritative brand identity: " + path);
}
if (process.argv.includes("--check")) {
  console.log("PASS: verified " + staged.length + " owner-kit assets without modifying repository.");
  process.exit(0);
}
for (const file of staged) {
  await mkdir(dirname(file.dest), { recursive: true });
  await writeFile(file.dest, file.bytes);
}
const governed = new Map([
  ["novapharm-healthcare-logo.svg", "02_web/primary_transparent/novapharm-logo.svg"],
  ["novapharm-healthcare-logo.png", "02_web/primary_transparent/novapharm-logo-red-2048w.png"],
  ["novapharm-healthcare-logo-reverse.svg", "02_web/reverse_white/novapharm-logo-white.svg"],
  ["novapharm-healthcare-logo-monochrome.svg", "02_web/monochrome_black/novapharm-logo-black.svg"],
  ["favicon.svg", "03_favicon_pwa/favicon.svg"],
  ["favicon.ico", "03_favicon_pwa/favicon.ico"],
  ["apple-touch-icon.png", "03_favicon_pwa/apple-touch-icon.png"],
  ["pwa-icon-192.png", "03_favicon_pwa/pwa-icon-192.png"],
  ["pwa-icon-512.png", "03_favicon_pwa/pwa-icon-512.png"],
  ["pwa-maskable-512.png", "03_favicon_pwa/pwa-maskable-512.png"],
  ["safari-pinned-tab.svg", "03_favicon_pwa/safari-pinned-tab.svg"],
  ["novapharm-open-graph-1200x630-white.jpg", "05_social_profile/novapharm-open-graph-1200x630-white.jpg"],
  ["novapharm-open-graph-1200x630-red.jpg", "05_social_profile/novapharm-open-graph-1200x630-red.jpg"]
]);
for (const n of [16,32,48,64]) governed.set("favicon-" + n + "x" + n + ".png", "03_favicon_pwa/favicon-" + n + "x" + n + ".png");
const packRoot = resolve(root, "creative-assets/brand/novapharm-logo-asset-pack");
const changed = new Map();
for (const [current, canonical] of governed) {
  const data = await readFile(resolve(root, "assets/brand", current));
  await writeFile(resolve(packRoot, canonical), data);
  changed.set(canonical, digest(data));
}
const primary = await readFile(resolve(root,"assets/brand/novapharm-healthcare-logo.svg"));
await writeFile(resolve(packRoot,"01_master_vector/novapharm-healthcare-primary-red.svg"), primary);
changed.set("01_master_vector/novapharm-healthcare-primary-red.svg", digest(primary));
const sumsPath = resolve(packRoot,"SHA256SUMS.txt");
const sums = await readFile(sumsPath,"utf8");
const touched = new Set();
const replacement = sums.split("\n").map((line) => {
  const hit = /^([a-f0-9]{64})  (.+)$/.exec(line);
  if (!hit || !changed.has(hit[2])) return line;
  touched.add(hit[2]);
  return changed.get(hit[2]) + "  " + hit[2];
}).join("\n");
assert.equal(touched.size, changed.size, "Governed checksum register is incomplete");
await writeFile(sumsPath, replacement);
console.log("Installed " + staged.length + " delivered files and updated " + changed.size + " governed logo-pack checksum entries.");
console.log("Next: npm run images:inventory && npm run brand:validate && npm run images:inventory:validate");
console.log("Keep PR draft; run CI, browser, mobile, and release acceptance before publishing.");
