import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(path), "utf8");
const knowledgeRaw = read("assets/ai/company-knowledge-index.json");
const manifest = JSON.parse(read("assets/ai/company-source-manifest.json"));
const knowledge = JSON.parse(knowledgeRaw);

// The approved corpus grows with published articles and page migrations.
// Validate provenance and a meaningful minimum instead of a stale fixed 2026 count.
assert.equal(manifest.approvedSourceCount, manifest.sources.length);
assert.ok(manifest.approvedSourceCount >= 20, "Expected meaningful public evidence coverage");
assert.equal(manifest.chunkCount, knowledge.chunks.length);
assert.equal(manifest.corpusHash, knowledge.corpusHash);
assert.ok(knowledge.chunks.length >= 300);
assert.ok(Object.keys(knowledge.keywordIndex.postings).length > 500);
for (const required of ["page-home", "page-cro", "page-oncology", "page-products", "leader-vishal-chakravarty"]) {
  assert.ok(manifest.sources.some((source) => source.id === required), required);
}
for (const retired of ["page-technology-ai-governance", "page-search"]) {
  assert.ok(!manifest.sources.some((source) => source.id === retired), `Retired public AI route must not enter research: ${retired}`);
}
const blockedSegments = new Set(["portal", "employee", "admin", "board", "docs", "api", "contact", "account-application", "legal"]);
for (const source of manifest.sources) {
  assert.match(source.url, /^https:\/\/novapharmhealthcare\.com\//);
  assert.ok(source.sourceHash);
  assert.ok(source.blockCount > 0);
  assert.ok(new URL(source.url).pathname.split("/").every((part) => !blockedSegments.has(part)), source.url);
  assert.ok(source.file.split("/").every((part) => !blockedSegments.has(part)), source.file);
}
for (const chunk of knowledge.chunks) {
  assert.ok(chunk.contentHash && chunk.sourceUrl && chunk.sourceTitle && chunk.heading && chunk.text);
  assert.doesNotMatch(chunk.sourceUrl, /\/(?:portal|employee|admin|board|docs|api)\//);
}
for (const [name, asset] of Object.entries(manifest.assets)) {
  const raw = read(asset.path.replace(/^\//, ""));
  assert.equal(Buffer.byteLength(raw), asset.bytes, `${name} byte count`);
  assert.equal(createHash("sha256").update(raw).digest("hex"), asset.sha256, `${name} checksum`);
}
assert.equal(createHash("sha256").update(knowledgeRaw).digest("hex"), manifest.assets.knowledgeIndex.sha256);
console.log(`AI index passed for ${manifest.approvedSourceCount} allowlisted sources and ${manifest.chunkCount} deterministic chunks.`);
