import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const sourceOnly = process.argv.includes("--source-only");
const origin = "https://novapharmhealthcare.com";
const palette = JSON.parse(readFileSync("config/brand-identities.json", "utf8"));
const raster = JSON.parse(readFileSync("audit/generated/three-brand-raster-provenance.json", "utf8"));

// Every outbound URL is a checked-in literal, never derived from a source manifest.
// Manifest paths may select one of these exact URLs, but cannot select a host,
// query or arbitrary file path for a network request.
const pinnedBrandUrls = new Map([
  ["assets/brand/novapharm-healthcare-logo.svg", "https://novapharmhealthcare.com/assets/brand/novapharm-healthcare-logo.svg"],
  ["assets/brand/novapharm-distribution-logo.svg", "https://novapharmhealthcare.com/assets/brand/novapharm-distribution-logo.svg"],
  ["assets/brand/novapharm-intelligence-logo.svg", "https://novapharmhealthcare.com/assets/brand/novapharm-intelligence-logo.svg"],
  ["assets/brand/novapharm-healthcare-logo.png", "https://novapharmhealthcare.com/assets/brand/novapharm-healthcare-logo.png"],
  ["assets/brand/favicon.ico", "https://novapharmhealthcare.com/assets/brand/favicon.ico"],
  ["assets/brand/apple-touch-icon.png", "https://novapharmhealthcare.com/assets/brand/apple-touch-icon.png"],
  ["assets/brand/pwa-icon-192.png", "https://novapharmhealthcare.com/assets/brand/pwa-icon-192.png"],
  ["assets/brand/pwa-icon-512.png", "https://novapharmhealthcare.com/assets/brand/pwa-icon-512.png"],
  ["assets/brand/novapharm-healthcare-app-icon-1024.png", "https://novapharmhealthcare.com/assets/brand/novapharm-healthcare-app-icon-1024.png"],
  ["assets/brand/pwa-maskable-512.png", "https://novapharmhealthcare.com/assets/brand/pwa-maskable-512.png"],
  ["assets/brand/favicon-16x16.png", "https://novapharmhealthcare.com/assets/brand/favicon-16x16.png"],
  ["assets/brand/favicon-32x32.png", "https://novapharmhealthcare.com/assets/brand/favicon-32x32.png"],
  ["assets/brand/favicon-48x48.png", "https://novapharmhealthcare.com/assets/brand/favicon-48x48.png"],
  ["assets/brand/favicon-64x64.png", "https://novapharmhealthcare.com/assets/brand/favicon-64x64.png"],
  ["assets/brand/novapharm-open-graph-1200x630-white.jpg", "https://novapharmhealthcare.com/assets/brand/novapharm-open-graph-1200x630-white.jpg"],
  ["assets/brand/novapharm-open-graph-1200x630-red.jpg", "https://novapharmhealthcare.com/assets/brand/novapharm-open-graph-1200x630-red.jpg"],
  ["assets/brand/novapharm-distribution-logo.png", "https://novapharmhealthcare.com/assets/brand/novapharm-distribution-logo.png"],
  ["assets/brand/novapharm-distribution-favicon.ico", "https://novapharmhealthcare.com/assets/brand/novapharm-distribution-favicon.ico"],
  ["assets/brand/novapharm-distribution-apple-touch-icon.png", "https://novapharmhealthcare.com/assets/brand/novapharm-distribution-apple-touch-icon.png"],
  ["assets/brand/novapharm-distribution-pwa-icon-192.png", "https://novapharmhealthcare.com/assets/brand/novapharm-distribution-pwa-icon-192.png"],
  ["assets/brand/novapharm-distribution-pwa-icon-512.png", "https://novapharmhealthcare.com/assets/brand/novapharm-distribution-pwa-icon-512.png"],
  ["assets/brand/novapharm-distribution-app-icon-1024.png", "https://novapharmhealthcare.com/assets/brand/novapharm-distribution-app-icon-1024.png"],
  ["assets/brand/novapharm-distribution-pwa-maskable-512.png", "https://novapharmhealthcare.com/assets/brand/novapharm-distribution-pwa-maskable-512.png"],
  ["assets/brand/novapharm-distribution-open-graph-1200x630-white.jpg", "https://novapharmhealthcare.com/assets/brand/novapharm-distribution-open-graph-1200x630-white.jpg"],
  ["assets/brand/novapharm-distribution-open-graph-1200x630-garnet.jpg", "https://novapharmhealthcare.com/assets/brand/novapharm-distribution-open-graph-1200x630-garnet.jpg"],
  ["assets/brand/novapharm-intelligence-logo.png", "https://novapharmhealthcare.com/assets/brand/novapharm-intelligence-logo.png"],
  ["assets/brand/novapharm-intelligence-favicon.ico", "https://novapharmhealthcare.com/assets/brand/novapharm-intelligence-favicon.ico"],
  ["assets/brand/novapharm-intelligence-apple-touch-icon.png", "https://novapharmhealthcare.com/assets/brand/novapharm-intelligence-apple-touch-icon.png"],
  ["assets/brand/novapharm-intelligence-pwa-icon-192.png", "https://novapharmhealthcare.com/assets/brand/novapharm-intelligence-pwa-icon-192.png"],
  ["assets/brand/novapharm-intelligence-pwa-icon-512.png", "https://novapharmhealthcare.com/assets/brand/novapharm-intelligence-pwa-icon-512.png"],
  ["assets/brand/novapharm-intelligence-app-icon-1024.png", "https://novapharmhealthcare.com/assets/brand/novapharm-intelligence-app-icon-1024.png"],
  ["assets/brand/novapharm-intelligence-pwa-maskable-512.png", "https://novapharmhealthcare.com/assets/brand/novapharm-intelligence-pwa-maskable-512.png"],
  ["assets/brand/novapharm-intelligence-open-graph-1200x630-light.jpg", "https://novapharmhealthcare.com/assets/brand/novapharm-intelligence-open-graph-1200x630-light.jpg"],
  ["assets/brand/novapharm-intelligence-open-graph-1200x630-night.jpg", "https://novapharmhealthcare.com/assets/brand/novapharm-intelligence-open-graph-1200x630-night.jpg"],
  ["manifest.webmanifest", "https://novapharmhealthcare.com/manifest.webmanifest"],
  ["assets/css/novapharm.bundle.css", "https://novapharmhealthcare.com/assets/css/novapharm.bundle.css"],
]);

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function bytesAt(path) {
  const pinnedUrl = pinnedBrandUrls.get(path);
  assert.ok(pinnedUrl, "Brand asset is outside approved URL allowlist: " + String(path));
  // Even local mode resolves through the static trusted URL mapping. The
  // provenance JSON never becomes a file-system pathname or outbound URL.
  if (sourceOnly) return readFileSync(new URL(pinnedUrl).pathname.slice(1));
  const uri = new URL(pinnedUrl);
  const sha = String(process.env.GITHUB_SHA || "");
  uri.searchParams.set("brand-source", /^[a-f0-9]{40}$/.test(sha) ? sha : "verified");
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
