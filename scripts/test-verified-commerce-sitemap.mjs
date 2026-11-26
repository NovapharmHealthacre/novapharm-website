import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateCommerceSitemap,NUTRAXIN_CATEGORY_ROUTES,GENERATED_INDEXABLE_ROUTES} from "./lib/verified-commerce-sitemap.mjs";
const register=JSON.parse(readFileSync(new URL("../seo/generated/page-metadata-register.json",import.meta.url),"utf8"));
const source=readFileSync(new URL("../sitemap.xml",import.meta.url),"utf8");
const add=(xml,route)=>xml.replace("</urlset>",'<url><loc>https://novapharmhealthcare.com'+route+'</loc><lastmod>2026-11-20</lastmod></url></urlset>');
const full=GENERATED_INDEXABLE_ROUTES.reduce((xml,route)=>xml.includes("<loc>https://novapharmhealthcare.com"+route+"</loc>")?xml:add(xml,route),source);
const expectedCategories=["magnesium","vitamin-c","vitamin-d","multivitamins","collagen"].map(slug=>"/products/nutraxin/"+slug+"/");
const expectedCount=new Set([...register.filter(x=>x.indexable===true).map(x=>x.canonical),...GENERATED_INDEXABLE_ROUTES.map(route=>"https://novapharmhealthcare.com"+route)]).size;
test("sitemap contract is the exact approved canonical set, including generated collections",()=>{
  const result=validateCommerceSitemap(full,register);
  const canonicals=new Set(result.canonicals);
  assert.equal(result.count,expectedCount);
  assert.deepEqual(NUTRAXIN_CATEGORY_ROUTES,expectedCategories);
  for (const route of expectedCategories) assert.ok(canonicals.has("https://novapharmhealthcare.com"+route));
  for (const route of ["/distribution/","/market-access/","/markets/"]) assert.ok(canonicals.has("https://novapharmhealthcare.com"+route));
  assert.ok(canonicals.has("https://novapharmhealthcare.com/products/esco/"));
  assert.ok(canonicals.has("https://novapharmhealthcare.com/products/marketplace/"));
});
test("reject omission, extra URLs, private trackers, duplicates and wrong host",()=>{
  for(const xml of [
    source,
    add(full,"/products/track/"),
    add(full,"/products/nutraxin/unreviewed-category/"),
    full.replace(/<url><loc>https:\/\/novapharmhealthcare\.com\/products\/nutraxin\/magnesium\/<\/loc><lastmod>[^<]+<\/lastmod><\/url>/,""),
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

test("already registered generated routes are not double counted",()=>{
  const legal=structuredClone(register);
  legal.push({route:"/distribution/",canonical:"https://novapharmhealthcare.com/distribution/",indexable:true});
  assert.equal(validateCommerceSitemap(full,legal).count,expectedCount);
});
