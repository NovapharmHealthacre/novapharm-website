import { mkdirSync, writeFileSync } from "node:fs";
const origin = "https://novapharmhealthcare.com";
const evidencePath = "artifacts/site-restoration/live-navigation-assets.json";
const token = "nav-assets-" + Date.now();
const failures = [];
function clean(input, basePath="/") {
  if (!input || /^(?:#|mailto:|tel:|javascript:|data:|blob:)/i.test(input)) return null;
  let link;
  try { link = new URL(input.replace(/&amp;/g,"&"), origin + basePath); } catch { return null; }
  if (link.origin !== origin) return null;
  if (!["http:", "https:"].includes(link.protocol)) return null;
  return link.pathname;
}
function hasExactCanonical(html, expectedPath) {
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    const rel = tag.match(/\brel\s*=\s*(["'])(.*?)\1/i)?.[2];
    const href = tag.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2];
    if (!rel?.toLowerCase().split(/\s+/).includes("canonical") || !href) continue;
    try {
      const u = new URL(href);
      if (u.protocol === "https:" &&
          u.hostname === "novapharmhealthcare.com" &&
          !u.port && !u.username && !u.password &&
          u.pathname === expectedPath && !u.search && !u.hash) return true;
    } catch { /* Refuse malformed canonical URLs. */ }
  }
  return false;
}
// Fail immediately if a future edit breaks canonical parsing. The previous
// double-escaped regex caused a false failure on a correctly canonical ESCO page.
const canonicalFixture = '<link rel="canonical" href="https://novapharmhealthcare.com/products/esco/">';
if (!hasExactCanonical(canonicalFixture, "/products/esco/") ||
    hasExactCanonical(canonicalFixture, "/products/") ||
    hasExactCanonical('<link rel="canonical" href="https://example.com/products/esco/">', "/products/esco/")) {
  throw new Error("Canonical parser positive/negative self-test failed");
}
function pathsFromHTML(html, basePath) {
  const result = new Set();
  for (const tag of html.match(/<(?:a|link|script|img|source)\b[^>]*>/gi) || []) {
    for (const attr of ["href","src"]) {
      const m = tag.match(new RegExp("(?:^|\\s)" + attr + "\\s*=\\s*([\"'])(.*?)\\1", "i"));
      if (m) { const p = clean(m[2], basePath); if(p) result.add(p); }
    }
    const set = tag.match(/(?:^|\s)srcset\s*=\s*(["'])(.*?)\1/i);
    if(set) for(const part of set[2].split(",")) {
      const p = clean(part.trim().split(/\s+/)[0], basePath);
      if (p) result.add(p);
    }
  }
  return result;
}
// Regression check: source link/asset extraction must never drop navigation.
const parserFixture = '<a href="/about/">About</a><img src="/assets/site.png"><link href="/assets/site.css">';
const parserTargets = pathsFromHTML(parserFixture, "/");
if (!parserTargets.has("/about/") || !parserTargets.has("/assets/site.png") ||
    !parserTargets.has("/assets/site.css")) {
  throw new Error("Public navigation/asset parser is incorrectly escaped or incomplete");
}

async function get(url, method="GET") {
  const reqUrl = new URL(url,origin);
  reqUrl.searchParams.set("restoration_audit",token);
  // CDN/transient HEAD failures are not necessarily a broken asset; retry
  // with bounded backoff, but never hide permanent 404 or unsafe redirects.
  for (let attempt=0;attempt<3;attempt++) {
    const response = await fetch(reqUrl,{
      method, redirect:"follow", signal:AbortSignal.timeout(18000),
      headers:{ "Cache-Control":"no-cache,no-store,max-age=0", "Pragma":"no-cache",
        "User-Agent":"NovaPharm-Public-ReadOnly-Asset-Integrity/1.0" }
    });
    if(response.url && new URL(response.url).origin!==origin) throw Error("Cross-origin redirect");
    if(response.ok) return method==="HEAD" ? response : response.text();
    if(![429,500,502,503,504].includes(response.status) || attempt===2)
      throw Error("HTTP "+response.status);
    await new Promise(resolve=>setTimeout(resolve,200*(attempt+1)));
  }
  throw Error("Resource retry exhausted");
}
function sitemapPaths(xml) {
  const paths = new Set();
  for(const match of xml.matchAll(/<loc>\s*(https:\/\/novapharmhealthcare\.com\/[^<]*)<\/loc>/g)) {
    const link = clean(match[1]);
    if(link) paths.add(link);
  }
  return paths;
}
async function boundedMap(items, workers, check) {
  let index=0;
  await Promise.all(Array.from({length:workers},async()=>{
    while(index<items.length) {
      const next=items[index++];
      await check(next);
    }
  }));
}
const pagePaths = new Set(["/","/quantum-research/","/products/nutraxin/bag/","/products/nutraxin/account/","/products/esco/","/products/esco/bag/","/products/marketplace/","/products/track/"]);
const outbound = new Map();
const checkedPages = [];
try {
  const xml = await get("/sitemap.xml");
  const indexable = sitemapPaths(xml);
  for (const p of indexable) pagePaths.add(p);
  if (!indexable.has("/products/marketplace/")) failures.push({path:"/sitemap.xml",issue:"392-product Marketplace must be indexable"});
  if (indexable.has("/products/track/")) failures.push({path:"/sitemap.xml",issue:"Private-reference order tracking must not be indexable"});
  if (indexable.has("/products/esco/bag/") || indexable.has("/quantum-research/")) failures.push({path:"/sitemap.xml",issue:"Private bag/research included in public sitemap"});
} catch(error){failures.push({path:"/sitemap.xml",issue:String(error).slice(0,150)});}
if(pagePaths.size<66) failures.push({path:"/sitemap.xml",issue:"Missing restored Marketplace, order tracking or public sitemap route coverage: "+pagePaths.size});
await boundedMap([...pagePaths],6,async path=>{
  try {
    const html=await get(path);
    if(!/<html\b/i.test(html))throw Error("HTML document missing");
    if(path==="/products/"){
      if(!html.includes('data-products-editorial="approved-2026-11"') ||
         !html.includes("Different products.") ||
         !html.includes("One purpose.") ||
         !html.includes("/products/esco/") ||
         !html.includes("/products/nutraxin/") ||
         !html.includes("/assets/css/products-editorial.css"))
        throw Error("Outdated pre-restoration Products overview is still published");
    }
    if(path==="/products/marketplace/"){
      if(!html.includes('data-commerce-marketplace') ||
         (html.match(/class="mp-source-index-link"/g)||[]).length!==392 ||
         !html.includes('/assets/js/commerce-marketplace.js') ||
         !hasExactCanonical(html, "/products/marketplace/"))
        throw Error("Governed 392-product Marketplace or canonical is absent");
      if(/<meta\s+name=["']robots["']\s+content=["']noindex/i.test(html))
        throw Error("Public Marketplace should be indexable");
    }
    if(path==="/products/track/"){
      if(!html.includes('data-np-order-lookup') ||
         !html.includes('/assets/js/commerce-order-track.js') ||
         !html.includes('name="order_ref"') ||
         !hasExactCanonical(html, "/products/track/"))
        throw Error("Secure-reference order tracking UI or canonical missing");
      if(!/<meta\s+name=["']robots["']\s+content=["']noindex,\s*follow["']/i.test(html))
        throw Error("Customer order references must remain noindex");
    }
    if(path==="/products/esco/"){
      if(!html.includes("data-esco-catalogue") || (html.match(/data-esco-entry/g)||[]).length<373)
        throw Error("ESCO 373-product catalogue body is missing or incomplete");
      if (!hasExactCanonical(html, "/products/esco/"))
        throw Error("ESCO canonical route mismatch");
      if(!html.includes("/assets/js/esco-catalogue.js"))
        throw Error("ESCO public catalogue script is not loaded");
    }
    if(path==="/products/esco/bag/"){
      if(!html.includes("data-esco-bag-items") || !html.includes("esco-bag.js"))
        throw Error("ESCO 373-reference bag experience missing");
      if(!/<meta\s+name=["']robots["']\s+content=["']noindex,\s*follow["']/i.test(html))
        throw Error("ESCO customer bag must not be indexed by search engines");
    }
    const references=pathsFromHTML(html,path);
    for(const target of references) {
      if(!outbound.has(target))outbound.set(target,new Set());
      outbound.get(target).add(path);
    }
    checkedPages.push({path,links:references.size});
  } catch(error) {failures.push({path,issue:"Page source "+String(error).slice(0,150)});}
});
try {
  const commerce = JSON.parse(await get("/assets/data/commerce-marketplace.json"));
  if(commerce.schema !== "novapharm-public-merchant-discovery-v1" ||
     commerce.sourceProductCount !== 392 || commerce.notPaymentAuthority !== true ||
     !Array.isArray(commerce.products) || commerce.products.length !== 392 ||
     commerce.products.filter(x=>x.brand==="Nutraxin").length !== 19 ||
     commerce.products.filter(x=>x.brand==="ESCO").length !== 373 ||
     commerce.products.some(x=>x.cardCheckoutAuthority!==false || x.availabilityQuantity!==null))
    throw Error("392-SKU public Commerce data contract violated");
} catch(error) { failures.push({path:"/assets/data/commerce-marketplace.json",issue:String(error).slice(0,150)}); }
const targets=[...outbound.keys()].filter(x=>x!=='/');
if(targets.length>800) failures.push({path:"/",issue:"Unexpected internal link/asset expansion: "+targets.length});
const inspected=targets.slice(0,800);
let assets=0,links=0;
await boundedMap(inspected,8,async target=>{
  try {
    const response=await get(target,"HEAD");
    const type=response.headers.get("content-type")||"";
    if(/\.(?:js|mjs|css|png|svg|webp|avif|jpg|jpeg|gif|ico|json|webmanifest)$/i.test(target)) {
      assets++;
      if(type.startsWith("text/html")) throw Error("Resource incorrectly serves HTML");
    } else links++;
  } catch(error) {
    const parent=[...(outbound.get(target)||[])].slice(0,4);
    failures.push({path:target,linkedFrom:parent,issue:String(error).slice(0,140)});
  }
});
const summary={timestamp:new Date().toISOString(),origin,
  scope:"Read-only cache-bypassed GET/HEAD of public sitemap, Nutraxin/ESCO bags, 392-item Marketplace and noindex order-status page; no authentication, order lookup, form submission or payment",
  pagesExpected:pagePaths.size,pagesLoaded:checkedPages.length,
  uniqueInternalTargets:targets.length,assetsChecked:assets,linksChecked:links,
  failures:failures.length,errors:failures.slice(0,100)};
mkdirSync("artifacts/site-restoration",{recursive:true});
writeFileSync(evidencePath,JSON.stringify(summary,null,2)+"\n");
console.log(JSON.stringify({pagesExpected:summary.pagesExpected,pagesLoaded:summary.pagesLoaded,uniqueTargets:summary.uniqueInternalTargets,assets:summary.assetsChecked,links:summary.linksChecked,failures:summary.failures,firstErrors:summary.errors.slice(0,15)}));
if(failures.length) process.exitCode=1;
