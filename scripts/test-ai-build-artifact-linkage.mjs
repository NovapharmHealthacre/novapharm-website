import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const site = read("../scripts/build-site.mjs");
const builder = read("../scripts/build-ai-knowledge-index.mjs");
const owner = read("../scripts/apply-owner-corrections.mjs");
const ownerTest = read("../scripts/test-owner-corrections.mjs");
const bootstrap = read("../src/ai/search-bootstrap.mjs");

test("public website retains the owner-approved public-AI hold", () => {
  assert.match(site, /await import\("\.\/apply-owner-corrections\.mjs"\)/);
  assert.doesNotMatch(site, /await import\("\.\/build-ai-knowledge-index\.mjs"\)/);
  assert.match(owner, /public AI\/search removed/);
  assert.match(owner, /retiredPublicRoutes = \["\/search\/", "\/technology\/ai-governance\/"\]/);
  assert.match(owner, /rmSync\(join\(root, relative\)/);
  assert.match(ownerTest, /Removed public AI\/search path still exists/);
});

test("offline AI index has a strict public-only and source-identity contract", () => {
  assert.match(builder, /const excludedPublicRoute/);
  for (const path of ["contact", "account-application", "investor-information", "careers"]) {
    assert.ok(builder.includes('"' + path + '"'));
  }
  assert.ok(builder.includes('slug.startsWith("legal/")'));
  assert.ok(builder.includes("html.matchAll(/<meta"));
  assert.ok(builder.includes("excludedNoindexPublicPages.push(source.file)"));
  assert.match(builder, /source\.file\), "utf8"/);
  assert.match(builder, /"search-controller\.mjs"/);
  assert.match(builder, /"semantic-worker\.mjs"/);
  assert.match(builder, /"search-bootstrap\.mjs"/);
  for (const boundary of ["portal and private routes", "customer and supplier records", "uploaded documents"]) {
    assert.ok(builder.includes(boundary));
  }
});

test("research bootstrap stays user-initiated and is not part of released public website", () => {
  assert.ok(Buffer.byteLength(bootstrap) < 2500);
  assert.match(bootstrap, /import\("\/assets\/ai\/runtime\/search-controller\.mjs"\)/);
  assert.match(bootstrap, /window\.location\.assign\("\/search\/"\)/);
  assert.doesNotMatch(bootstrap, /fetch\(|sendBeacon|gtag\(|localStorage|sessionStorage|WebSocket/);
});
