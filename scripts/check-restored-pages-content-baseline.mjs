/**
 * Recovery invariant: protect the 21 November 2026 independently observed
 * public Pages checkpoint from silent regression when gh-pages and live bytes
 * change TOGETHER. This is a read-only release-triage gate, not production approval.
 *
 * Changing any pinned published file requires an explicit new reviewed
 * baseline. Do NOT auto-update these digests after deployment or from HEAD.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const checkpoint = Object.freeze({
  publisherCommit: "f15807c37a31ba70eece1405ed4889cf9d73581d",
  label: "2026-11-21-f158-restored-contact-esco-verified-source-checkpoint",
  // Git's blob object IDs from the exact public gh-pages checkpoint (SHA-1
  // identities, not the separate live/source SHA-256 comparison).
  files: Object.freeze({
    "index.html": "011c8d00ff8d7beb838f55ce7fe04eae30c77ea8",
    "contact/index.html": "82944633738242d1200686bca055b276566f3ea1",
    "products/index.html": "8a4b659106a97cfb2317ff86519ec44d47244a18",
    "products/nutraxin/index.html": "786ab9c1f1cca28d48cc63c8c98b8b3d70bd4c9a",
    "products/esco/index.html": "b35c3f823bfc181f4ca2b9704da7f038ecfd60f1",
    "products/marketplace/index.html": "2c7dfb696211327968233014e71f6e650dd42b7d",
    "products/track/index.html": "6f1f69c4e4c170747c65bc700c70c61ee8283cbb",
    "assets/js/contact-production.js": "f7f14aed9c2c77bf24c7536421ec10cbe804e246",
    "assets/js/nutraxin-retail-store.js": "8d32454bc53cb81766bd53ce59e514334ebd6063",
    "assets/js/commerce-marketplace.js": "8cf2a262e7c068efc7d3d0cdde168991d8340bbe",
    "assets/js/esco-bag.js": "fa9e65123cda28ca09db2ea2ef699dc9a6c506ef",
    "assets/media/home/earth-reference-1400.jpg": "1c9378c128a1761873b5f21a178d820e42f26a07"
  })
});

export function gitBlobIdentity(bytes) {
  assert.ok(Buffer.isBuffer(bytes), "Read source bytes as Buffer; do not decode and re-encode binary files");
  return createHash("sha1").update(Buffer.from("blob " + bytes.length + "\0")).update(bytes).digest("hex");
}

export function checkRecoverySnapshot({ files = checkpoint.files, read = readFileSync, tree }) {
  assert.equal(typeof tree, "string");
  const rows = [];
  for (const [path, expectedBlobSha] of Object.entries(files)) {
    if (!/^(?:(?:assets\/(?:js|media\/home)\/)?[a-z0-9][a-z0-9._/-]*\.(?:html|js|jpg))$/.test(path) ||
       path.includes("..") || path.includes("//") || path.startsWith("/"))
      throw new Error("Unsafe checkpoint file path: " + path);
    assert.match(expectedBlobSha, /^[a-f0-9]{40}$/, "Invalid expected Git blob identity");
    let observedBlobSha = null, error = null;
    try {
      const bytes = read(join(tree, path));
      observedBlobSha = gitBlobIdentity(bytes);
    } catch (e) { error = "Missing/unreadable checkpoint file: " + String(e).slice(0, 170); }
    if (observedBlobSha && observedBlobSha !== expectedBlobSha)
      error = "Changed restored checkpoint file; obtain authorized review before rebaselining";
    rows.push({ path, expectedBlobSha, observedBlobSha,
      exactCheckpointBlob: observedBlobSha === expectedBlobSha && !error, error });
  }
  return { baselinePublisherCommit:checkpoint.publisherCommit,
    label:checkpoint.label, protectedFiles:rows.length,
    exactCheckpointMatches: rows.filter(r=>r.exactCheckpointBlob).length,
    changedOrMissing:rows.filter(r=>!r.exactCheckpointBlob).length,
    meaning:"Content snapshot guard, not proof of Git ancestry, owner release approval or Apple HIG acceptance",
    rows };
}

export function validatePublishedCheckpointTree(tree) {
  const sha = execFileSync("git", ["-C",tree,"rev-parse","HEAD"], {encoding:"utf8", timeout:5000}).trim();
  assert.match(sha, /^[a-f0-9]{40}$/, "Unknown publishing source revision");
  return sha;
}

if (process.argv[1] && fileURLToPath(import.meta.url)===resolve(process.argv[1])) {
  const tree = resolve(process.env.PUBLISHED_TREE || "published-tree");
  const report = checkRecoverySnapshot({tree});
  report.observedPublisherCommit = validatePublishedCheckpointTree(tree);
  report.checkedAt = new Date().toISOString();
  report.schema = "novapharm.restored-public-content-invariant.v1";
  const output = "artifacts/site-restoration/restored-public-content-baseline.json";
  mkdirSync(dirname(output),{recursive:true});
  writeFileSync(output,JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify({publisher:report.observedPublisherCommit,
    snapshot:report.baselinePublisherCommit, protectedFiles:report.protectedFiles,
    exactMatches:report.exactCheckpointMatches, changedOrMissing:report.changedOrMissing}));
  if (report.changedOrMissing) {
    console.error(JSON.stringify(report.rows.filter(row=>!row.exactCheckpointBlob)));
    process.exitCode=1;
  }
}
