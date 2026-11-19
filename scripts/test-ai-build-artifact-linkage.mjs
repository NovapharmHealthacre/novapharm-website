import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const site = readFileSync(new URL("../scripts/build-site.mjs", import.meta.url), "utf8");
const builder = readFileSync(new URL("../scripts/build-ai-knowledge-index.mjs", import.meta.url), "utf8");
const publicPages = readFileSync(new URL("../scripts/build-public-pages.mjs", import.meta.url), "utf8");

test("public site build materializes approved AI index and source-controlled browser runtime after page finalization", () => {
  const published = site.indexOf('await import("./stamp-public-release-provenance.mjs")');
  const aiBuilder = site.indexOf('await import("./build-ai-knowledge-index.mjs")');
  assert.ok(published >= 0 && aiBuilder > published, "AI index must inspect final public HTML and copy final runtime");
  assert.match(builder, /copyFileSync\(join\(root, "src", "ai", file\), join\(root, "assets", "ai", "runtime", file\)\)/);
  assert.match(builder, /"search-controller.mjs"/);
  assert.match(builder, /"semantic-worker.mjs"/);
});

test("source index excludes sensitive pages and enforces public-only source rules", () => {
  assert.match(builder, /excludedRoutes = new Set/);
  for (const name of ["contact", "legal/privacy", "legal/cookies", "legal/terms"]) assert.ok(builder.includes('"' + name + '"'));
  assert.match(builder, /if \(\/noindex\/i\.test\(/);
  assert.match(builder, /readFileSync\(join\(root, source\.file\), "utf8"\)/);
  for (const boundary of ["portal and private routes", "customer and supplier records", "uploaded documents", "supplier pricing"]) {
    assert.ok(builder.includes(boundary));
  }
  assert.match(publicPages, /data-ai-cache-clear/);
});


test("staged Pages release rejects stale AI source or mismatched model/index artifacts", () => {
  const staged = readFileSync(new URL("../scripts/stage-pages-artifact.mjs", import.meta.url), "utf8");
  for (const required of [
    "assets/ai/runtime/search-controller.mjs",
    "assets/ai/company-source-manifest.json",
    "assets/ai/company-knowledge-index.json",
    "assets/ai/company-embeddings.json",
    "assets/ai/novapharm-evidence-vector-v1.json"
  ]) assert.ok(staged.includes('"' + required + '"'), "Missing required artifact: " + required);
  assert.match(staged, /readFileSync\(sourceFile\)\.equals\(readFileSync\(stagedFile\)\)/);
  assert.match(staged, /aiManifest\.corpusHash !== aiKnowledge\.corpusHash/);
  assert.match(staged, /aiManifest\.corpusHash !== aiEmbeddings\.corpusHash/);
  assert.match(staged, /digest !== asset\.sha256 \|\| bytes\.length !== asset\.bytes/);
  assert.match(staged, /AI source\/model manifest consistency gate failed/);
  assert.match(staged, /Unapproved private or form-data source included in AI release/);
});
