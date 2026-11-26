// Compare the live sitemap to an exact source-backed canonical allowlist.
// Generated collections and Nutraxin category landing pages are separate from
// the checked-in canonical page register. Never derive approval from live XML.
import { readFileSync } from "node:fs";
const categoryRegister = JSON.parse(readFileSync(new URL("../../assets/data/nutraxin-uk-category-intents.json", import.meta.url), "utf8"));
const categorySlugs = categoryRegister.categories.map(category => category.slug);
if (categoryRegister.market !== "GB" || categorySlugs.length === 0 ||
    new Set(categorySlugs).size !== categorySlugs.length ||
    categorySlugs.some(slug => typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))) {
  throw Error("Invalid Nutraxin UK category canonical source");
}
export const NUTRAXIN_CATEGORY_ROUTES = Object.freeze(categorySlugs.map(slug => `/products/nutraxin/${slug}/`));
const BASE="https://novapharmhealthcare.com";
export const GENERATED_INDEXABLE_ROUTES=Object.freeze([
  "/distribution/","/market-access/","/markets/",
  "/products/esco/","/products/marketplace/",
  ...NUTRAXIN_CATEGORY_ROUTES
]);
function validRoute(route) {
  if(typeof route!=="string" || !route.startsWith("/") || !route.endsWith("/")) return false;
  if(route==="/")return true;
  const parts=route.slice(1,-1).split("/");
  return parts.every(part=>part.length>0 && [...part].every(ch=>
    ch>="a"&&ch<="z" || ch>="0"&&ch<="9" || ch==="-"));
}
function fullDate(date) {
  if(date.length!==10 || date[4]!=="-" || date[7]!=="-")return false;
  return [...date].every((ch,i)=>i===4||i===7||ch>="0"&&ch<="9");
}
function locsFromSitemap(xml) {
  const locs=[];
  let offset=0;
  while(true){
    const start=xml.indexOf("<url>",offset);
    if(start===-1)break;
    const end=xml.indexOf("</url>",start+5);
    if(end===-1)throw Error("Unterminated sitemap URL");
    const body=xml.slice(start+5,end);
    if(body.includes("<url>") || !body.startsWith("<loc>"))throw Error("Nested or malformed sitemap URL");
    const locEnd=body.indexOf("</loc>");
    if(locEnd===-1)throw Error("Missing sitemap canonical close");
    const canonical=body.slice(5,locEnd);
    const lastmod=body.slice(locEnd+6);
    if(!lastmod.startsWith("<lastmod>") || !lastmod.endsWith("</lastmod>"))
      throw Error("Missing sitemap lastmod");
    const date=lastmod.slice(9,-10);
    if(!fullDate(date) || body!=="<loc>"+canonical+"</loc><lastmod>"+date+"</lastmod>")
      throw Error("Malformed sitemap canonical or modification date");
    locs.push(canonical);
    offset=end+6;
  }
  if((xml.split("<url>").length-1)!==locs.length ||
     (xml.split("<loc>").length-1)!==locs.length ||
     (xml.split("</url>").length-1)!==locs.length)
    throw Error("Unexpected unpaired sitemap tags");
  return locs;
}
export function validateCommerceSitemap(xml,register) {
  if(typeof xml!=="string" || xml.length>1000000 ||
     !xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">') ||
     !xml.includes("</urlset>") || !Array.isArray(register) || register.length<50)
    throw Error("Published sitemap or approved canonical register missing");
  const required=register.filter(x=>x?.indexable===true);
  if(required.length<50)throw Error("Approved canonical register incomplete");
  const approved=required.map(x=>{
    if(!validRoute(x.route) || x.canonical!==BASE+x.route)
      throw Error("Invalid approved canonical source");
    return x.canonical;
  });
  for(const route of GENERATED_INDEXABLE_ROUTES){
    const canonical=BASE+route;
    if(!approved.includes(canonical))approved.push(canonical);
  }
  const expected=new Set(approved);
  if(expected.size!==approved.length)throw Error("Duplicate approved canonical source");
  const locs=locsFromSitemap(xml);
  const found=new Set(locs);
  if(found.size!==locs.length || found.size!==expected.size ||
     [...expected].some(x=>!found.has(x)))
    throw Error("Published sitemap canonical set mismatch: expected "+expected.size+
      " actual "+locs.length+"; missing="+[...expected].filter(x=>!found.has(x)).join(",")+
      "; unexpected="+locs.filter(x=>!expected.has(x)).join(","));
  return {count:locs.length,canonicals:locs};
}
