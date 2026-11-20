import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { stampMarketplaceSourceRevision } from "./marketplace-release-provenance.mjs";

const SHA = "a".repeat(40), OTHER = "b".repeat(40);
const canonical = "https://novapharmhealthcare.com/products/marketplace/";
const fixture = '<!doctype html><html lang="en-GB"><head><title>NovaPharm Marketplace</title>' +
  '<link rel="canonical" href="' + canonical + '">' +
  '<meta name="robots" content="index, follow"></head><body><h1>Explore 392 products</h1></body></html>';

test("the post-build Marketplace receives one exact full source revision", () => {
  const html = stampMarketplaceSourceRevision(fixture,SHA);
  assert.ok(html.includes('<meta name="novapharm-source-sha" content="' + SHA + '">'));
  assert.equal((html.match(/name="novapharm-source-sha"/g) ?? []).length,1);
  assert.ok(html.includes("<h1>Explore 392 products</h1>"));
  assert.ok(html.includes('<link rel="canonical" href="' + canonical + '">'));
});

test("rebuilding and restamping do not retain a stale source revision", () => {
  const first=stampMarketplaceSourceRevision(fixture,SHA);
  const repeated=stampMarketplaceSourceRevision(first,SHA);
  const newer=stampMarketplaceSourceRevision(first,OTHER);
  assert.equal(repeated,first);
  assert.equal((newer.match(/name="novapharm-source-sha"/g)??[]).length,1);
  assert.ok(newer.includes('content="'+OTHER+'"'));
  assert.ok(!newer.includes('content="'+SHA+'"'));
});

test("an unsafe canonical, noindex page or missing head cannot get public release provenance", () => {
  assert.throws(()=>stampMarketplaceSourceRevision(fixture.replace(canonical,"https://example.com/"),SHA),
    /canonical/);
  assert.throws(()=>stampMarketplaceSourceRevision(fixture.replace("index, follow","noindex, nofollow"),SHA),
    /noindex/);
  assert.throws(()=>stampMarketplaceSourceRevision(fixture.replace("</head>",""),SHA),
    /complete head/);
});

test("short or fake commit identifiers cannot be published",()=>{
  for(const value of ["a".repeat(39),"HEAD","",123]) {
    assert.throws(()=>stampMarketplaceSourceRevision(fixture,value));
  }
});

test("the actual full-site release calls the fallback after the Marketplace generator",()=>{
  const pipeline=readFileSync("scripts/build-site.mjs","utf8");
  const stamper=readFileSync("scripts/stamp-public-release-provenance.mjs","utf8");
  assert.ok(pipeline.indexOf('import("./generate-commerce-marketplace.mjs")')>=0);
  assert.ok(pipeline.indexOf('import("./stamp-public-release-provenance.mjs")') >
    pipeline.indexOf('import("./generate-commerce-marketplace.mjs")'));
  assert.ok(stamper.includes("stampMarketplaceSourceRevision(currentMarketplaceHtml, sha)"));
  assert.ok(stamper.includes('register.some(record => record.file === marketplaceFile)'));
});
