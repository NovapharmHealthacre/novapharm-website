import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateCommerceSitemap} from "./lib/verified-commerce-sitemap.mjs";
const register=JSON.parse(readFileSync(new URL("../seo/generated/page-metadata-register.json",import.meta.url),"utf8"));
const source=readFileSync(new URL("../sitemap.xml",import.meta.url),"utf8");
const add=(xml,route)=>xml.replace("</urlset>",'<url><loc>https://novapharmhealthcare.com'+route+'</loc><lastmod>2026-11-20</lastmod></url></urlset>');
const full=["/distribution/","/market-access/","/markets/","/products/esco/","/products/marketplace/"].reduce(add,source);
test("sitemap contract is the exact approved canonical set, including generated collections",()=>{
  const result=validateCommerceSitemap(full,register);
  assert.equal(result.count,register.filter(x=>x.indexable===true).length+5);
  for (const route of ["/distribution/","/market-access/","/markets/"]) assert.ok(result.canonicals.includes("https://novapharmhealthcare.com"+route));
  assert.ok(result.canonicals.includes("https://novapharmhealthcare.com/products/esco/"));
  assert.ok(result.canonicals.includes("https://novapharmhealthcare.com/products/marketplace/"));
});
test("reject omission, extra URLs, private trackers, duplicates and wrong host",()=>{
  for(const xml of [
    source,
    add(full,"/products/track/"),
    add(full,"/products/esco/bag/"),
    add(full,"/products/marketplace/"),
    full.replace("https://novapharmhealthcare.com/markets/","https://unreviewed.example/markets/"),
    full.replace("<loc>https://novapharmhealthcare.com/market-access/</loc>",""),
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

test("the approved commercial site remains exactly three generated navigational routes",()=>{
  const legal=structuredClone(register);
  legal.push({route:"/distribution/",canonical:"https://novapharmhealthcare.com/distribution/",indexable:true});
  assert.equal(validateCommerceSitemap(full,legal).count,62);
});
