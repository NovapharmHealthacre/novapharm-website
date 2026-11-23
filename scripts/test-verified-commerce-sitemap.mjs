import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateCommerceSitemap} from "./lib/verified-commerce-sitemap.mjs";
const register=JSON.parse(readFileSync(new URL("../seo/generated/page-metadata-register.json",import.meta.url),"utf8"));
const source=readFileSync(new URL("../sitemap.xml",import.meta.url),"utf8");
const add=(xml,route)=>xml.replace("</urlset>",'<url><loc>https://novapharmhealthcare.com'+route+'</loc><lastmod>2026-11-20</lastmod></url></urlset>');
const full=add(add(source,"/products/esco/"),"/products/marketplace/");
test("sitemap contract is the exact approved canonical set, including generated collections",()=>{
  const result=validateCommerceSitemap(full,register);
  assert.equal(result.count,register.filter(x=>x.indexable===true).length+2);
  assert.ok(result.canonicals.includes("https://novapharmhealthcare.com/products/esco/"));
  assert.ok(result.canonicals.includes("https://novapharmhealthcare.com/products/marketplace/"));
});
test("reject omission, extra URLs, private trackers, duplicates and wrong host",()=>{
  for(const xml of [
    source,
    add(full,"/products/track/"),
    add(full,"/products/esco/bag/"),
    add(full,"/products/marketplace/"),
    full.replace("https://novapharmhealthcare.com/products/esco/","https://unreviewed.example/products/esco/"),
    full.replace("<lastmod>2026-11-20</lastmod>","<lastmod>bogus</lastmod>")
  ]) assert.throws(()=>validateCommerceSitemap(xml,register));
});
test("reject an altered or expanded canonical register",()=>{
  const corrupt=structuredClone(register);
  corrupt[0].canonical="https://unreviewed.example/";
  assert.throws(()=>validateCommerceSitemap(full,corrupt));
  assert.throws(()=>validateCommerceSitemap(full,register.slice(0,30)));
});
