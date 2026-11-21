import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const origin="https://novapharmhealthcare.com";
const slugs=["distribution","market-access","markets"];
const checkedInSource="src/content/site-content.mjs";

test("the three owner-approved commercial pages remain in canonical source metadata",()=>{
  const siteContent=readFileSync(checkedInSource,"utf8");
  const corporate=readFileSync("apps/corporate/data/pages.ts","utf8");
  for(const slug of slugs){
    assert.ok(siteContent.includes('"'+slug+'": {'),"Missing public metadata for "+slug);
    assert.ok(corporate.includes('page("'+slug+'", "narrative"'),"Missing route implementation for "+slug);
  }
});

test("the PUBLIC_ONLY build materialises all three pages with safe public semantics",()=>{
  for(const slug of slugs){
    const path=slug+"/index.html";
    assert.ok(existsSync(path),"Generated public page absent: "+path);
    const html=readFileSync(path,"utf8");
    const canonical=origin+"/"+slug+"/";
    assert.ok(html.includes('<link rel="canonical" href="'+canonical+'">'),
      "Canonical mismatched: "+slug);
    assert.match(html,/<meta\s+name=["']viewport["']/i,"Missing responsive viewport for "+slug);
    assert.match(html,/<html\b[^>]*lang=["'][^"']+["']/i,"Missing HTML language for "+slug);
    assert.equal((html.match(/<h1\b/gi)||[]).length,1,"Expected one heading "+slug);
    assert.ok(html.includes('<meta name="novapharm-source-sha" content="'),
      "Final source revision not stamped: "+slug);
    const robots=html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i)?.[1]||"";
    assert.ok(!/\bnoindex\b/i.test(robots),"Canonical commercial page noindexed "+slug);
    assert.ok(!html.includes('data-live-b2b-enquiry-form'),
      "Commercial informational page must not expose an unapproved contact handler");
  }
});

test("final generated sitemap includes all three correct routes exactly once",()=>{
  const xml=readFileSync("sitemap.xml","utf8");
  for(const slug of slugs){
    const href='<loc>'+origin+'/'+slug+'/</loc>';
    assert.equal(xml.split(href).length-1,1,"Missing or duplicate sitemap canonical: "+slug);
    const pos=xml.indexOf(href),start=xml.lastIndexOf("<url>",pos),end=xml.indexOf("</url>",pos);
    assert.ok(start>=0&&end>pos,"Malformed sitemap entry for "+slug);
    assert.match(xml.slice(start,end),/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/,
      "Significant-update date missing for "+slug);
  }
  for(const forbidden of ["/portal/dashboard/","/employee/dashboard/","/admin/dashboard/",
    "/products/esco/bag/","/quantum-research/"]){
    assert.ok(!xml.includes("<loc>"+origin+forbidden+"</loc>"),
      "Protected/noindex URL included in sitemap "+forbidden);
  }
});

test("final SEO register and generated files agree on canonical discovery",()=>{
  const register=JSON.parse(readFileSync("seo/generated/page-metadata-register.json","utf8"));
  for(const slug of slugs){
    const route="/"+slug+"/";
    const rows=register.filter(x=>x.route===route);
    assert.equal(rows.length,1,"Missing or duplicate SEO register row: "+slug);
    assert.equal(rows[0].canonical,origin+route);
    assert.equal(rows[0].indexable,true);
    assert.equal(rows[0].file,slug+"/index.html");
    assert.ok(rows[0].title.length>15,"Missing page title "+slug);
  }
});

test("reviewed Marketplace and Nutraxin preservation survives build",()=>{
  const xml=readFileSync("sitemap.xml","utf8");
  for(const route of ["/products/","/products/marketplace/","/products/esco/",
    "/products/nutraxin/"])
    assert.ok(xml.includes("<loc>"+origin+route+"</loc>"),
      "Commercial three-page release would delete existing catalogue "+route);
  const nutraxin=JSON.parse(readFileSync("apps/corporate/data/nutraxin-product-register.json","utf8"));
  assert.equal(nutraxin.products.length,19);
  for(const product of nutraxin.products)
    assert.ok(xml.includes("<loc>"+origin+"/products/nutraxin/"+product.slug+"/</loc>"),
      "Nutraxin product disappeared from final build "+product.slug);
});

test("every final sitemap page exposes the same exact build revision", () => {
  const marker = /<meta name="novapharm-source-sha" content="([0-9a-f]{40})">/g;
  const homeStamps = [...readFileSync("index.html", "utf8").matchAll(marker)];
  assert.equal(homeStamps.length, 1, "Missing or duplicate root revision stamp");
  const xml = readFileSync("sitemap.xml", "utf8");
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(match[1]));
  assert.ok(urls.length >= 60, "Release sitemap scope unexpectedly limited");
  assert.equal(new Set(urls.map(url => url.href)).size, urls.length, "Duplicate release sitemap URL");
  for (const url of urls) {
    assert.equal(url.origin, origin, "Sitemap must reference only the corporate origin");
    assert.match(url.pathname, /^\/(?:[a-z0-9-]+\/)*$/);
    const file = url.pathname.slice(1) + "index.html";
    const stamps = [...readFileSync(file, "utf8").matchAll(marker)];
    assert.deepEqual(stamps.map(match => match[1]), [homeStamps[0][1]],
      "Missing, duplicate or incorrect build revision on " + url.pathname);
  }
});
