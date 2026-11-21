/**
 * Read-only critical-asset companion to the 65-route HTML byte-parity audit.
 * Compares actual GitHub Pages bytes to the checked-out publishing branch.
 * Does not submit forms, use identities, change DNS, or deploy any site files.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const origin = "https://novapharmhealthcare.com";
const output = "artifacts/site-restoration/gh-pages-live-critical-asset-parity.json";
const fixedAssets = Object.freeze([
  "assets/media/home/earth-reference-1400.jpg",
  "shopping/nutraxin-uk.tsv",
  "sitemap.xml"
]);
const requiredAssets = Object.freeze([
  "assets/js/novapharm.js",
  "assets/js/contact-production.js",
  "assets/js/nutraxin-retail-store.js",
  "assets/js/commerce-marketplace.js",
  "assets/js/commerce-order-track.js",
  "assets/js/esco-catalogue.js",
  "assets/js/esco-bag.js",
  "assets/js/cookie-consent.js",
  "assets/css/novapharm.bundle.css",
  "assets/css/nutraxin-retail-store.css",
  "assets/css/commerce-marketplace.css",
  "assets/css/commerce-order-track.css",
  "assets/css/esco-catalogue.css",
  "assets/css/quantum-research.css",
  ...fixedAssets
]);
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");

export function safeAssetPath(path) {
  assert.equal(typeof path, "string", "Public asset path must be a string");
  if (!/^(?:assets\/(?:js\/[a-z0-9][a-z0-9._-]*\.js|css\/[a-z0-9][a-z0-9._-]*\.css)|assets\/media\/home\/earth-reference-1400\.jpg|shopping\/nutraxin-uk\.tsv|sitemap\.xml)$/.test(path))
    throw new Error("Unsafe or unapproved public asset path: " + path);
  return path;
}

export function assetManifest(publishedTree) {
  const js = readdirSync(join(publishedTree, "assets/js"))
    .filter(name => name.endsWith(".js")).map(name => safeAssetPath("assets/js/" + name));
  const css = readdirSync(join(publishedTree, "assets/css"))
    .filter(name => name.endsWith(".css")).map(name => safeAssetPath("assets/css/" + name));
  // Baseline at the protected 21 November publisher commit: 22 JS and 23 CSS.
  // A removed file is a reviewable release change, not an invisible reduction
  // of the audit scope. New assets are picked up automatically.
  assert.ok(js.length >= 22, "Published JavaScript scope unexpectedly shrank");
  assert.ok(css.length >= 23, "Published CSS scope unexpectedly shrank");
  const paths = [...new Set([...js, ...css, ...fixedAssets])].sort();
  for (const asset of requiredAssets)
    assert.ok(paths.includes(asset), "Critical published asset missing from manifest: " + asset);
  return paths;
}

export function comparePublicAsset({ path, checkedInBytes, liveBytes, status, mime }) {
  safeAssetPath(path);
  const row = {
    path, checkedInSha256: checkedInBytes ? sha256(checkedInBytes) : null,
    liveSha256: liveBytes ? sha256(liveBytes) : null,
    checkedInBytes: checkedInBytes?.length ?? null,
    liveBytes: liveBytes?.length ?? null,
    status: status ?? null, mime: mime ?? null, exactByteMatch: false, errors: []
  };
  if (!checkedInBytes) row.errors.push("No matching gh-pages asset file");
  if (status !== 200) row.errors.push("Expected direct HTTP 200");
  if (!liveBytes?.length) row.errors.push("Empty or unavailable public asset response");
  if (String(mime || "").toLowerCase().includes("text/html"))
    row.errors.push("HTML returned for asset (possible fallback)");
  if (checkedInBytes && liveBytes) {
    row.exactByteMatch = checkedInBytes.equals(liveBytes);
    if (!row.exactByteMatch) row.errors.push("Published asset bytes differ from exact gh-pages file");
  }
  return row;
}

const exactGitSha = tree => {
  const sha = execFileSync("git", ["-C", tree, "rev-parse", "HEAD"],
    { encoding: "utf8", timeout: 5000 }).trim();
  assert.match(sha, /^[a-f0-9]{40}$/, "Unknown checked-out publisher SHA");
  return sha;
};

export async function auditAssets({ publishedTree, fetchAsset = fetch, nonce = "read-only" }) {
  const paths = assetManifest(publishedTree);
  const publisherGitSha = exactGitSha(publishedTree);
  const rows = new Array(paths.length);
  let position = 0;
  async function visit() {
    while (position < paths.length) {
      const index = position++;
      const path = paths[index];
      let checkedInBytes = null, liveBytes = null, status = null, mime = null, readError = null;
      try { checkedInBytes = readFileSync(join(publishedTree, safeAssetPath(path))); }
      catch (err) { readError = "Publisher file read: " + String(err).slice(0, 150); }
      try {
        const url = new URL("/" + path, origin);
        url.searchParams.set("asset_parity", nonce);
        const response = await fetchAsset(url.toString(), {
          method: "GET", redirect: "manual", signal: AbortSignal.timeout(20000),
          headers: { "Cache-Control": "no-cache, no-store, max-age=0",
            "Pragma": "no-cache", "User-Agent": "NovaPharm-Asset-Parity-Audit/1.0" }
        });
        status = response.status;
        mime = response.headers.get("content-type");
        if (status === 200) {
          const size = Number(response.headers.get("content-length") || 0);
          if (size > 12_000_000) throw new Error("Unexpected oversized public asset");
          liveBytes = Buffer.from(await response.arrayBuffer());
          if (liveBytes.length > 12_000_000) throw new Error("Unexpected oversized public asset");
        }
      } catch (err) {
        readError = (readError ? readError + "; " : "") + "HTTPS read: " + String(err).slice(0, 150);
      }
      const row = comparePublicAsset({ path, checkedInBytes, liveBytes, status, mime });
      if (readError) row.errors.push(readError);
      rows[index] = row;
    }
  }
  await Promise.all(Array.from({ length: 5 }, visit));
  return {
    schema: "novapharm.public-gh-pages-critical-asset-byte-parity.v1",
    inspectedAt: new Date().toISOString(), origin, publisherGitSha,
    purpose: "Read-only exact deployed asset bytes, not HIG/AT/clinical/auth or release approval",
    javascriptFiles: paths.filter(p => p.startsWith("assets/js/")).length,
    stylesheetFiles: paths.filter(p => p.startsWith("assets/css/")).length,
    checked: rows.length,
    exactMatches: rows.filter(row => row.exactByteMatch && !row.errors.length).length,
    failures: rows.filter(row => row.errors.length).length,
    assets: rows
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const report = await auditAssets({
    publishedTree: resolve(process.env.PUBLISHED_TREE || "published-tree"),
    nonce: (process.env.GITHUB_SHA || "read-only").slice(0, 12)
  });
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ publisherGitSha: report.publisherGitSha,
    javascript: report.javascriptFiles, css: report.stylesheetFiles,
    checked: report.checked, exactMatches: report.exactMatches, failures: report.failures }));
  if (report.failures) {
    console.error(JSON.stringify(report.assets.filter(x => x.errors.length)
      .map(x => ({ path: x.path, errors: x.errors })).slice(0, 70)));
    process.exitCode = 1;
  }
}
