import { mkdirSync, writeFileSync } from "node:fs";

const origin="https://novapharmhealthcare.com";
const stamp=Date.now();
const failures=[];
const checks=[];
async function read(path,mime){
  const url=new URL(path,origin);
  url.searchParams.set("restoration_probe",String(stamp));
  for(let attempt=0;attempt<3;attempt++){
    const res=await fetch(url,{redirect:"follow",signal:AbortSignal.timeout(20000),
      headers:{"Cache-Control":"no-cache,no-store,max-age=0","Pragma":"no-cache",
        "User-Agent":"NovaPharm-392-Commerce-ReadOnly-Acceptance/1.0"}});
    if(new URL(res.url).origin!==origin)throw Error("unexpected cross-origin redirect");
    if(res.ok) {
      const type=res.headers.get("content-type")||"";
      if(mime&&!type.toLowerCase().includes(mime))throw Error("unexpected content-type "+type);
      return res.text();
    }
    if(![429,500,502,503,504].includes(res.status)||attempt===2)throw Error("HTTP "+res.status);
    await new Promise(r=>setTimeout(r,300*(attempt+1)));
  }
}
async function check(path,mime,validate){
  const row={path,passed:false,issue:null};
  try {const body=await read(path,mime);validate(body);row.passed=true;}
  catch(error){row.issue=String(error).slice(0,250);failures.push(row);}
  checks.push(row);
}
function assert(ok,why){if(!ok)throw Error(why);}

function isExactCorporateUrl(value,path){
  try {
    const u=new URL(value);
    return u.protocol==="https:" && u.hostname==="novapharmhealthcare.com" &&
      u.host==="novapharmhealthcare.com" && u.username==="" && u.password==="" &&
      u.pathname===path && u.search==="" && u.hash==="";
  } catch { return false; }
}
function canonicalTagMatches(html,path){
  for(const tag of html.match(/<link\b[^>]*>/gi)||[]){
    const rel=tag.match(/\srel\s*=\s*(["'])(.*?)\1/i)?.[2];
    const href=tag.match(/\shref\s*=\s*(["'])(.*?)\1/i)?.[2];
    if(rel?.toLowerCase().split(/\s+/).includes("canonical") &&
      href && isExactCorporateUrl(href,path)) return true;
  }
  return false;
}
function openGraphTagMatches(html,path){
  for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){
    const property=tag.match(/\sproperty\s*=\s*(["'])(.*?)\1/i)?.[2];
    const content=tag.match(/\scontent\s*=\s*(["'])(.*?)\1/i)?.[2];
    if(property?.toLowerCase()==="og:url" &&
      content && isExactCorporateUrl(content,path)) return true;
  }
  return false;
}
// Guard against subdomains, injected prefixes, query strings and unrelated
// occurrences of a URL elsewhere in the HTML.
if(!canonicalTagMatches('<link rel="canonical" href="https://novapharmhealthcare.com/products/marketplace/">',"/products/marketplace/") ||
   canonicalTagMatches('<a href="https://novapharmhealthcare.com/products/marketplace/">',"/products/marketplace/") ||
   canonicalTagMatches('<link rel="canonical" href="https://attacker.example/https://novapharmhealthcare.com/products/marketplace/">',"/products/marketplace/") ||
   canonicalTagMatches('<link data-rel="canonical" data-href="https://novapharmhealthcare.com/products/marketplace/">',"/products/marketplace/") ||
   openGraphTagMatches('<meta data-property="og:url" data-content="https://novapharmhealthcare.com/products/track/">',"/products/track/") ||
   openGraphTagMatches('<meta property="og:url" content="https://novapharmhealthcare.com/products/track/?ref=private">',"/products/track/") ||
   !openGraphTagMatches('<meta property="og:url" content="https://novapharmhealthcare.com/products/track/">',"/products/track/")){
  throw Error("Public canonical/social URL validation regression");
}

await Promise.all([
  check("/", "text/html", html=>{
    assert(html.includes("Medicine. Where it needs to be.")&&html.includes("Better access begins with better decisions."),"Approved Earth homepage rolled back");
  }),
  check("/products/","text/html",html=>{
    assert(html.includes('data-products-editorial="approved-2026-11"')&&html.includes("Different products."),"Approved Products overview rolled back");
    assert(html.includes('class="npd-commerce-link"')&&html.includes('/products/marketplace/')&&html.includes('/products/track/'),"Marketplace and order tracker links missing on Products overview");
  }),
  check("/products/nutraxin/","text/html",html=>{
    assert(html.includes("nutraxin-retail-store.js")&&html.includes("19 Nutraxin"),"Approved Nutraxin collection missing");
  }),
  check("/products/esco/","text/html",html=>{
    assert(html.includes("data-esco-catalogue")&&(html.match(/data-esco-entry/g)||[]).length===373,"373-product ESCO missing");
  }),
  check("/products/esco/bag/","text/html",html=>{
    assert(html.includes("data-esco-bag-items")&&html.includes("Your ESCO Bag"),"ESCO Bag markup missing");
    assert(canonicalTagMatches(html,"/products/esco/bag/"),"ESCO Bag canonical missing or wrong");
    assert(openGraphTagMatches(html,"/products/esco/bag/"),"ESCO Bag social URL inherited from Products");
    const robots=html.match(/<meta\b[^>]*\sname=["']robots["'][^>]*>/gi)||[];
    assert(robots.length===1,"ESCO Bag must have exactly one robots directive");
    assert(/\scontent=["']noindex,\s*follow["']/.test(robots[0]),"ESCO Bag must be noindex, follow");
    assert(!/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/i.test(html),"ESCO Bag inherited Products WebPage structured data");
    assert(html.includes('<meta property="og:title" content="Your ESCO Bag | NovaPharm">'),"ESCO Bag inherited public Products social title");
    assert(!html.includes('data-order-payment-card')&&!html.includes('data-customer-address'),"ESCO Bag must not embed private customer details");
  }),
  check("/products/marketplace/","text/html",html=>{
    assert(html.includes('data-commerce-marketplace')&&html.includes("Everything, together."),"New marketplace template missing");
    assert((html.match(/class="mp-source-index-link"/g)||[]).length===392,"392 product search links not published");
    assert(canonicalTagMatches(html,"/products/marketplace/"),"Marketplace canonical missing");
    assert(html.includes("/assets/js/commerce-marketplace.js"),"Marketplace JS missing");
    assert(html.includes("/products/esco/")&&html.includes("/products/nutraxin/"),"Portfolio routes missing");
    assert(!html.includes('"@type":"Product"'),"Public marketplace must not invent Product/Offer authorities");
  }),
  check("/products/track/","text/html",html=>{
    assert(html.includes("Follow your order.")&&html.includes("data-np-order-lookup"),"New status-only tracker missing");
    assert(canonicalTagMatches(html,"/products/track/"),"Tracking canonical missing");
    assert(html.includes("/assets/js/commerce-order-track.js"),"Tracking script missing");
    assert(html.includes('<meta name="robots" content="noindex, follow">'),"Order lookup must remain noindex after release");
    assert(openGraphTagMatches(html,"/products/track/"),"Order lookup inherited wrong social URL");
    assert(!html.includes("data-order-payment-card")&&!html.includes("data-customer-address"),"Customer data must not be embedded");
  }),
  check("/sitemap.xml","xml",xml=>{
    assert((xml.match(/<loc>/g)||[]).length===61,"Published sitemap must contain 61 indexable routes");
    assert(xml.includes('<loc>https://novapharmhealthcare.com/products/marketplace/</loc>'),"392-product Marketplace missing from sitemap");
    assert(xml.includes('<loc>https://novapharmhealthcare.com/products/esco/</loc>'),"373-reference ESCO collection missing from sitemap");
    assert(!xml.includes('<loc>https://novapharmhealthcare.com/products/track/</loc>'),"Private-reference tracking must not be in sitemap");
    assert(!xml.includes('<loc>https://novapharmhealthcare.com/products/esco/bag/</loc>'),"Customer bag must not be in sitemap");
  }),
  check("/assets/data/commerce-marketplace.json","application/json",body=>{
    const j=JSON.parse(body);
    assert(j.schema==="novapharm-public-merchant-discovery-v1"&&j.notPaymentAuthority===true&&j.products?.length===392,"Source index/count/status mismatch");
    assert(j.products.filter(x=>x.brand==="Nutraxin").length===19&&j.products.filter(x=>x.brand==="ESCO").length===373,"19/373 brand split mismatch");
    assert(new Set(j.products.map(x=>x.id)).size===392,"Duplicate identity");
    assert(j.products.every(x=>x.cardCheckoutAuthority===false&&x.availabilityQuantity===null),"Browser may not authorise checkout or stock");
    assert(!/grossMargin|unitEconomics|targetGrossMargin|supplierCost|maximumFullyLandedCost/i.test(body),"Private commerce economics leaked");
  }),
  check("/assets/js/commerce-order-track.js","javascript",body=>{
    assert(body.includes("Object.hasOwn(labels,data.status)")&&body.includes("data.orderId!==ref"),"Server response status allowlist missing");
    assert(!body.includes('method:"POST"')&&!body.includes('method: "POST"'),"Tracking must not initiate transactions");
  }),
  check("/assets/js/commerce-marketplace.js","javascript",body=>{
    assert(body.includes("cardCheckoutAuthority")||body.includes("notPaymentAuthority")||body.includes("stockApi"),"Marketplace evidence context missing");
  }),
  check("/assets/css/commerce-marketplace.css","text/css",body=>assert(body.length>1000,"Marketplace CSS empty")),
  check("/assets/css/commerce-order-track.css","text/css",body=>assert(body.length>1000,"Order tracking CSS empty"))
]);
const summary={timestamp:new Date().toISOString(),site:origin,
  scope:"Read-only cache-bypassed GET of public Pages, 392-product index and static assets. NO order-status query, checkout, payment, account or customer records requested.",
  checked:checks.length,passed:checks.filter(x=>x.passed).length,failed:failures.length,checks};
mkdirSync("artifacts/site-restoration",{recursive:true});
writeFileSync("artifacts/site-restoration/live-commerce-392.json",JSON.stringify(summary,null,2)+"\n");
console.log(JSON.stringify({checked:summary.checked,passed:summary.passed,failed:summary.failed,failures:failures.slice(0,15)}));
if(failures.length)process.exitCode=1;
