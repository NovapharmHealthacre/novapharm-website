/**
 * NovaPharm read-only published-image integrity audit.
 * Compares actual public CDN bytes to the exact checked-out gh-pages images.
 * This is NOT Apple HIG / WCAG, editorial image suitability, regulatory rights,
 * source-authoring provenance or human production approval.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const origin = "https://novapharmhealthcare.com";
const reportPath = "artifacts/site-restoration/gh-pages-live-image-parity.json";
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const imageExt = /\.(?:png|jpe?g|webp|avif|gif|svg|ico)$/i;
const maxResponseBytes = 2_000_000;
const expectedMinimumImages = 833;

export function safePublishedImagePath(path) {
  if (typeof path !== "string" ||
      !/^assets\/(?:brand|media)\/(?:[a-z0-9][a-z0-9_-]*\/)*[a-z0-9][a-z0-9._-]*\.(?:png|jpe?g|webp|avif|gif|svg|ico)$/i.test(path) ||
      path.includes(".."))
    throw new Error("Unsafe or unapproved image path: " + String(path));
  return path;
}

export function publishedImageManifest(tree, minimumImages = expectedMinimumImages) {
  const images = [];
  for (const folder of ["assets/brand", "assets/media"]) {
    const visit = dir => {
      for (const entry of readdirSync(join(tree, dir), { withFileTypes: true })) {
        const relative = dir + "/" + entry.name;
        if (entry.isDirectory()) visit(relative);
        else if (entry.isFile() && imageExt.test(entry.name))
          images.push(safePublishedImagePath(relative));
        // Do not follow symlinks or unknown file types.
      }
    };
    visit(folder);
  }
  images.sort();
  assert.ok(images.length >= minimumImages,
    "Published image scope unexpectedly shrank; independent release review required");
  assert.equal(new Set(images).size, images.length, "Duplicate image paths");
  return images;
}

export function comparePublishedImage({ path, sourceBytes, fetchedBytes, status, mime }) {
  safePublishedImagePath(path);
  const errors = [];
  if (!sourceBytes?.length) errors.push("Missing or empty image in publishing branch");
  if (status !== 200) errors.push("Public image did not return direct HTTP 200");
  if (!fetchedBytes?.length) errors.push("Empty or missing public image response");
  if (String(mime ?? "").toLowerCase().includes("text/html"))
    errors.push("Public route returned HTML instead of the expected image");
  const exactByteMatch = Boolean(sourceBytes?.length && fetchedBytes?.length &&
    sourceBytes.equals(fetchedBytes));
  if (sourceBytes?.length && fetchedBytes?.length && !exactByteMatch)
    errors.push("Public image bytes differ from exact publishing branch");
  return {
    path, status: status ?? null, contentType: mime ?? null,
    sourceBytes: sourceBytes?.length ?? null,
    fetchedBytes: fetchedBytes?.length ?? null,
    sourceSha256: sourceBytes?.length ? sha256(sourceBytes) : null,
    fetchedSha256: fetchedBytes?.length ? sha256(fetchedBytes) : null,
    exactByteMatch, errors
  };
}

function checkedOutCommit(tree) {
  const sha = execFileSync("git", ["-C", tree, "rev-parse", "HEAD"],
    { encoding: "utf8", timeout: 5000 }).trim();
  assert.match(sha, /^[a-f0-9]{40}$/, "Unknown publisher commit SHA");
  return sha;
}

export async function auditPublishedImages({ publishedTree, fetchImage = fetch, nonce = "readonly",
  minimumImages = expectedMinimumImages, concurrency = 8 }) {
  const paths = publishedImageManifest(publishedTree, minimumImages);
  const publisherGitSha = checkedOutCommit(publishedTree);
  const rows = new Array(paths.length);
  let next = 0;
  async function worker() {
    while (next < paths.length) {
      const index = next++;
      const path = paths[index];
      let sourceBytes = null, fetchedBytes = null, status = null, mime = null;
      const failures = [];
      try {
        sourceBytes = readFileSync(join(publishedTree, safePublishedImagePath(path)));
        if (sourceBytes.length > maxResponseBytes)
          failures.push("Unexpected oversized publishing image");
      } catch (error) {
        failures.push("Publisher read failed: " + String(error).slice(0, 130));
      }
      try {
        const url = new URL("/" + path, origin);
        url.searchParams.set("image_audit", nonce);
        const response = await fetchImage(url, {
          method: "GET", redirect: "manual", signal: AbortSignal.timeout(25_000),
          headers: { "Cache-Control": "no-cache, no-store, max-age=0",
            "Pragma": "no-cache", "User-Agent": "NovaPharm-Image-Parity-Audit/1.0" }
        });
        status = response.status;
        mime = response.headers.get("content-type");
        const announcedSize = Number(response.headers.get("content-length") || 0);
        if (announcedSize > maxResponseBytes) throw new Error("Unexpected oversized live image");
        if (status === 200) {
          fetchedBytes = Buffer.from(await response.arrayBuffer());
          if (fetchedBytes.length > maxResponseBytes)
            throw new Error("Unexpected oversized live image");
        }
      } catch (error) {
        failures.push("HTTPS fetch failed: " + String(error).slice(0, 130));
      }
      const row = comparePublishedImage({ path, sourceBytes, fetchedBytes, status, mime });
      row.errors.push(...failures);
      rows[index] = row;
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return {
    schema: "novapharm.public-gh-pages-image-byte-parity.v1",
    observedAt: new Date().toISOString(),
    publisherGitSha, origin,
    evidenceLevel: "exact public image bytes only; not Apple HIG, visual suitability or rights approval",
    checked: rows.length,
    exactMatches: rows.filter(x => x.exactByteMatch && !x.errors.length).length,
    failures: rows.filter(x => x.errors.length).length,
    imageBytes: rows.reduce((n, x) => n + (x.sourceBytes || 0), 0),
    paths: rows
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const result = await auditPublishedImages({
    publishedTree: resolve(process.env.PUBLISHED_TREE || "published-tree"),
    nonce: (process.env.GITHUB_SHA || "readonly").slice(0, 12)
  });
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify({ publisherGitSha: result.publisherGitSha, checked: result.checked,
    exactMatches: result.exactMatches, failures: result.failures, imageBytes: result.imageBytes }));
  if (result.failures) {
    console.error(JSON.stringify(result.paths.filter(x => x.errors.length)
      .map(x => ({ path: x.path, errors: x.errors })).slice(0, 70)));
    process.exitCode = 1;
  }
}
