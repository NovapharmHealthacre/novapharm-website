import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { safePageRoute, publicPageRoutes, screenImgAltAttributes } from "./audit-public-image-alt-presence.mjs";

test("explicit alt presence is required; data-alt and aria labels cannot impersonate alt", () => {
  const html = '<img src="/a.jpg" alt="Scientific diagram">' +
    "<img alt='' src='/decorative.svg'>" +
    '<img src="/unlabelled.png" data-alt="false positive">' +
    '<img src="/other.png" aria-label="not an alt attribute">' +
    '<img alt="Product bottle" src="/bottle.webp">';
  const result = screenImgAltAttributes(html);
  assert.equal(result.images, 5);
  assert.equal(result.withExplicitAlt, 3);
  assert.equal(result.missingAlt, 2);
  assert.equal(result.emptyAltDecorativeCandidates, 1);
  assert.deepEqual(result.missingTagIndexes, [2,3]);
  assert.deepEqual(result.decorativeCandidates, [1]);
  assert.match(result.meaning,/human must review/);
});

test("empty alt is a decorative-intent review target, not automatically an error", () => {
  const x=screenImgAltAttributes('<img src="/decorative.svg" alt="">');
  assert.equal(x.missingAlt,0);
  assert.equal(x.emptyAltDecorativeCandidates,1);
  assert.equal("independentlyAccepted" in x,false);
});

test("path, source and sitemap gate reject unauthorised public scope", () => {
  for (const route of ["/", "/distribution/","/products/nutraxin/product-1/"])
    assert.equal(safePageRoute(route), route);
  for(const bad of ["https://untrusted.example/","/../","/x//y/","/admin?foo=x"])
    assert.throws(()=>safePageRoute(bad),/Unsafe/);
  const source=readFileSync("source-tree/apps/corporate/data/pages.ts","utf8");
  assert.throws(()=>publicPageRoutes({sitemap:"<urlset/>",corporateSource:source}),/unexpectedly reduced/);
  assert.throws(()=>publicPageRoutes({
    sitemap:"<loc>https://evil.example/</loc>",corporateSource:source}),/Unexpected sitemap/);
  assert.throws(()=>publicPageRoutes({
    sitemap:"<loc>https://novapharmhealthcare.com/</loc><loc>https://novapharmhealthcare.com/</loc>",
    corporateSource:source}),/Duplicate sitemap/);
});

test("the parser is a nonexecuting source check, not WCAG or Apple HIG certification",()=>{
  assert.throws(()=>screenImgAltAttributes({tag:"img"}),TypeError);
  const x=screenImgAltAttributes("<img src='/a.jpg' alt='Accurate, meaningful alt requires human review'>");
  assert.equal(x.missingAlt,0);
  for(const k of ["wcagCertified","higCertified","legalImageRights","humanReviewerApproved"])
    assert.equal(Object.hasOwn(x,k),false);
});
