import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const sourceOnly = process.argv.includes("--source-only");
const origin = "https://novapharmhealthcare.com";
const palette = JSON.parse(readFileSync("config/brand-identities.json", "utf8"));
const raster = JSON.parse(readFileSync("audit/generated/three-brand-raster-provenance.json", "utf8"));

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function bytesAt(path) {
  assert.match(path, /^assets\/brand\/[a-z0-9.-]+$|^assets\/css\/novapharm\.bundle\.css$|^manifest\.webmanifest$/i);
  if (sourceOnly) return readFileSync(path);
  const uri = new URL("/" + path, origin);
  uri.searchParams.set("brand-source", process.env.GITHUB_SHA || "verified");
  const response = await fetch(uri, {
    redirect: "error",
    headers: { "cache-control": "no-cache, no-store", pragma: "no-cache" },
    signal: AbortSignal.timeout(20000)
  });
  assert.ok(response.ok, "Missing live brand asset: " + path + " (HTTP " + response.status + ")");
  assert.equal(new URL(response.url).origin, origin, "Brand asset redirect changed origin: " + path);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.ok(bytes.length > 0 && bytes.length < 5_000_000, "Invalid live brand asset size: " + path);
  return bytes;
}

function requireCssTokens(css) {
  for (const [token, value] of [
    ["--np-brand-white-primary", palette.neutralPalette.primaryWhite.hex],
    ["--np-brand-white-secondary", palette.neutralPalette.secondaryWhite.hex],
    ["--np-brand-divider", palette.neutralPalette.subtleDivider.hex]
  ]) {
    const expression = new RegExp(token + "\\s*:\\s*" + value + "\\b", "i");
    assert.match(css, expression, "Missing approved CSS token " + token);
  }
  assert.match(css, /--np-color-label:\s*#0B0B0E/i, "Default Sovereign Black ink missing");
}

async function verify() {
  const svgNames = {
    healthcare: "assets/brand/novapharm-healthcare-logo.svg",
    distribution: "assets/brand/novapharm-distribution-logo.svg",
    intelligence: "assets/brand/novapharm-intelligence-logo.svg"
  };
  for (const [name, path] of Object.entries(svgNames)) {
    const bytes = await bytesAt(path);
    const svg = bytes.toString("utf8");
    assert.match(svg, /<svg\b/i, "Not an SVG: " + path);
    assert.ok(svg.includes(palette.brands[name].hex), "Wrong official colour in " + path);
    assert.doesNotMatch(svg, /#E3120B|#B30E09|<script\b|<foreignObject\b|javascript:/i);
    assert.equal(digest(bytes), palette.brands[name].primaryVectorZipSha256,
      "Deployed vector differs from approved original package: " + path);
  }

  assert.equal(raster.files.length, 31, "Unexpected audited web derivative inventory");
  const paths = new Set();
  for (const item of raster.files) {
    assert.match(item.path, /^assets\/brand\/[a-z0-9.-]+$/i);
    assert.ok(!paths.has(item.path), "Duplicate raster provenance path");
    paths.add(item.path);
    const actual = await bytesAt(item.path);
    assert.equal(actual.length, item.bytes, "Asset length mismatch: " + item.path);
    assert.equal(digest(actual), item.sha256, "Asset checksum mismatch: " + item.path);
  }

  const manifest = JSON.parse((await bytesAt("manifest.webmanifest")).toString("utf8"));
  assert.equal(manifest.theme_color, palette.brands.healthcare.hex, "Old browser theme colour");
  assert.equal(manifest.background_color, palette.neutralPalette.primaryWhite.hex,
    "Old manifest background colour");
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2, "Missing PWA icons");

  requireCssTokens((await bytesAt("assets/css/novapharm.bundle.css")).toString("utf8"));
  console.log(
    (sourceOnly ? "Source" : "LIVE") +
    " official branding verified: 3 exact SVG masters, " + raster.files.length +
    " raster checksums, PWA manifest and royal-neutral CSS tokens."
  );
}

await verify();
