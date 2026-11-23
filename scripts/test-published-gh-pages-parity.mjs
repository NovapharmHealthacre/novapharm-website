import assert from "node:assert/strict";
import test from "node:test";
import { sitemapRoutes, publicHtmlPath, comparePublicHtml, origin } from "./audit-published-gh-pages-parity.mjs";

const sitemap = routes => '<urlset>' + routes.map(path =>
  '<url><loc>' + origin + path + '</loc></url>').join("") + '</urlset>';
const bytes = text => Buffer.from(text, "utf8");

test("sitemap paths stay within the actual public domain, with no duplicates or query aliases", () => {
  assert.deepEqual(sitemapRoutes(sitemap(["/", "/distribution/", "/markets/"])),
    ["/", "/distribution/", "/markets/"]);
  assert.throws(() => sitemapRoutes(sitemap(["/", "/"])), /Duplicate/);
  assert.throws(() => sitemapRoutes("<urlset/>"), /no URLs/);
  assert.throws(() => sitemapRoutes('<loc>https://imposter.example/</loc>'), /external/);
  assert.throws(() => sitemapRoutes('<loc>' + origin + '/contact/?private=x</loc>'), /parameterized/);
  assert.throws(() => sitemapRoutes('<loc>' + origin + '/bad%2Fescape/</loc>'), /Unsafe public/);
});

test("canonical public routes map only to matching static HTML files", () => {
  assert.deepEqual(publicHtmlPath("/"), {route:"/",relative:"index.html"});
  assert.deepEqual(publicHtmlPath("/market-access/"),
    {route:"/market-access/",relative:"market-access/index.html"});
  for (const invalid of ["/../", "//", "/contact/?x=1", "/employee/profile.html", "https://evil.example/"])
    assert.throws(() => publicHtmlPath(invalid), /Unsafe/);
});

test("only exact byte equality and successful HTTP HTML response qualify", () => {
  const local = bytes("<html><h1>NovaPharm</h1></html>");
  const same = comparePublicHtml({route:"/distribution/",checkedInBytes:local,liveBytes:bytes(local.toString()),
    status:200,mime:"text/html; charset=utf-8"});
  assert.equal(same.exactByteMatch,true);
  assert.deepEqual(same.errors,[]);
  assert.equal(same.sourceFileSha256,same.liveHtmlSha256);
  const changed = comparePublicHtml({route:"/distribution/",checkedInBytes:local,
    liveBytes:bytes(local.toString()+"\n"),status:200,mime:"text/html"});
  assert.equal(changed.exactByteMatch,false);
  assert.ok(changed.errors.some(e=>/differ/.test(e)));
  const blocked = comparePublicHtml({route:"/distribution/",checkedInBytes:local,
    liveBytes:bytes(local.toString()),status:302,mime:"text/html"});
  assert.equal(blocked.exactByteMatch,true);
  assert.ok(blocked.errors.includes("Expected direct HTTP 200"));
  const missing = comparePublicHtml({route:"/distribution/",checkedInBytes:null,
    liveBytes:null,status:404,mime:"text/plain"});
  assert.ok(missing.errors.length>=4);
});

test("the contract cannot claim manual accessibility, clinical or HIG production approval", () => {
  const output = comparePublicHtml({route:"/",checkedInBytes:bytes("<html/>"),
    liveBytes:bytes("<html/>"),status:200,mime:"text/html"});
  assert.equal("independentHigAcceptance" in output,false);
  assert.equal("wcagCertified" in output,false);
  assert.equal("customerTenantAccepted" in output,false);
});
