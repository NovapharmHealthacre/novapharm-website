import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";

const ORIGIN = "https://novapharmhealthcare.com";
const now = new Date().toISOString();
const expected = JSON.parse(readFileSync("seo/generated/page-metadata-register.json", "utf8"));
const expectedByPath = new Map(expected.map(row => [new URL(row.canonical).pathname, row]));
const skuPaths = [...expectedByPath.keys()].filter(route => route.startsWith("/products/nutraxin/") && !["/products/nutraxin/","/products/nutraxin/bag/","/products/nutraxin/account/","/products/nutraxin/order-request/"].includes(route));
const protectedPaths = path => path.startsWith("/products/") || path.startsWith("/legal/") || ["/contact/","/account-application/","/portal/"].includes(path);
const driftSeverity = path => protectedPaths(path) || !expectedByPath.has(path) ? "informational" : "failure";
const issues = [];
const checked = [];
const extraRoutes = [];
const checkedAssetUrls = [];
const unresolvedLinks = [];

const normalize = value => String(value ?? "")
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
  .replace(/<[^>]*>/g, " ")
  .replace(/&(?:nbsp|#160);/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&#39;|&apos;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/\s+/g, " ").trim();
const capture = (html,pattern) => html.match(pattern)?.[1] ?? "";
const addIssue = (route, type, detail, severity="failure") =>
  issues.push({route,type,severity,detail:String(detail).slice(0,350)});
const timeoutFetch = async (url, tries=2) => {
  let error;
  for (let retry=0; retry<tries; retry++) {
    try {
      const res = await fetch(url,{signal:AbortSignal.timeout(16000),headers:{"Cache-Control":"no-cache, no-store, max-age=0","Pragma":"no-cache","User-Agent":"NovaPharm-Approved-Site-Restoration-Audit/1.0"}});
      return {res,text:await res.text()};
    } catch(e) {error=e;}
  }
  throw error;
};
const taglessH1 = html => normalize(capture(html,/<h1\b[^>]*>([\s\S]*?)<\/h1>/i));
const title = html => normalize(capture(html,/<title\b[^>]*>([\s\S]*?)<\/title>/i));
const bodyContent = html => capture(html,/<body\b[\s\S]*?>[\s\S]*?<\/body>/i) || html;
function anchors(html) {
  const out=[];
  for(const m of html.matchAll(/<a\b([^>]*?)>/gi)){
    const href=m[1].match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if(href)out.push(href);
  }
  return out;
}
function navText(html) {
  const header = capture(html,/<header\b[^>]*>([\s\S]*?)<\/header>/i);
  return normalize(header);
}
const sitemap = await timeoutFetch(ORIGIN+"/sitemap.xml?site-restore="+Date.now());
const publishedPaths = [...sitemap.text.matchAll(/<loc>\s*(https:\/\/novapharmhealthcare\.com\/[^<]*)\s*<\/loc>/g)].map(m=>new URL(m[1]).pathname);
if(!sitemap.res.ok || publishedPaths.length < 50) addIssue("/sitemap.xml","sitemap-missing-or-too-small","Status "+sitemap.res.status+" routes "+publishedPaths.length);
for(const p of publishedPaths) if(!expectedByPath.has(p)) extraRoutes.push(p);
const routes = [...new Set([...expectedByPath.keys(),...publishedPaths,"/technology/experience/","/product-portfolio/"])];
const results=new Array(routes.length);
async function auditRoute(path){
  const key=process.env.GITHUB_SHA?.slice(0,12)||"local";
  const url=ORIGIN+path+(path.includes("?")?"&":"?")+"audit-recovery="+key+"-"+Date.now();
  try{
    const {res,text:html}=await timeoutFetch(url);
    const item={path,httpStatus:res.status,title:title(html),h1:taglessH1(html),contentType:res.headers.get("content-type"),bytes:html.length,hasEarth:html.includes("nph-earth-hero-landscape"),hasNewMegaMenu:html.includes('data-mega-trigger="intelligence"'),hasLiveEnquiry:html.includes("data-live-b2b-enquiry-form"),hasEmailDraft:html.includes("Open email draft"),nav:navText(html).slice(0,250)};
    if(!res.ok) addIssue(path,"http",res.status+" "+res.url,driftSeverity(path));
    if(!item.contentType?.includes("text/html")) addIssue(path,"not-html",item.contentType);
    const reg=expectedByPath.get(path);
    if(reg&&res.ok){
      const builtPath = path==="/" ? "index.html" : path.replace(/^\//,"")+"index.html";
      const builtHtml = existsSync(builtPath) ? readFileSync(builtPath,"utf8") : null;
      const expectedTitle = builtHtml ? title(builtHtml) : reg.title;
      const expectedH1 = builtHtml ? taglessH1(builtHtml) : reg.h1;
      if(normalize(expectedTitle)!==item.title) addIssue(path,"title-drift",JSON.stringify({expected:expectedTitle,live:item.title}),driftSeverity(path));
      const normalizedExpectedH1=normalize(expectedH1).replace(/[.\s]+$/,"");
      const normalizedActualH1=item.h1.replace(/[.\s]+$/,"");
      if(normalizedExpectedH1&&normalizedExpectedH1!==normalizedActualH1)
        addIssue(path,"h1-drift",JSON.stringify({expected:expectedH1,live:item.h1}),driftSeverity(path));
      if(!html.includes('rel="canonical"') && !html.includes("rel='canonical'"))
        addIssue(path,"canonical-missing","Canonical meta not found");
    }
    if(path==="/"){
      if(!html.includes("nph-earth-hero-landscape") || html.includes('class="npd-hero npd-hero-media"'))
        addIssue(path,"homepage-restoration-regression","Root response did not contain the approved Earth hero");
    }
    if(!["/contact/","/portal/"].includes(path) && !html.includes('data-mega-trigger="company"'))
      addIssue(path,"navigation-drift","Approved Company mega-menu trigger missing",driftSeverity(path));
    if(!["/contact/","/portal/"].includes(path) && !html.includes('data-mega-trigger="intelligence"'))
      addIssue(path,"navigation-drift","Approved Intelligence mega-menu trigger missing",driftSeverity(path));
    if(path==="/contact/"){
      if(!html.includes("privacy")||!html.includes("enquiry"))addIssue(path,"contact-copy","Contact boundary missing");
      if(!item.hasLiveEnquiry)addIssue(path,"contact-mode","No verified live backend form: email-only or unknown","informational");
    }
    if(path.startsWith("/products/nutraxin/") && path!=="/products/nutraxin/"){
      if(!/application\/ld\+json/.test(html)||!/Product/.test(html)) addIssue(path,"product-schema","No visible Product structured data");
    }
    const links=anchors(html).filter(href=>href.startsWith("/")&&!href.startsWith("//"));
    const allowed=new Set([...expectedByPath.keys(),...publishedPaths,"/portal/","/account-application/","/technology/workspaces/","/technology/experience/","/product-portfolio/","/products/esco/","/products/marketplace/","/products/track/","/products/nutraxin/bag/"]);
    for (const href of links){
      const pathname=href.split("#")[0].split("?")[0];
      if(pathname&&pathname.endsWith("/")&&!allowed.has(pathname)&&!pathname.startsWith("/assets/"))
        unresolvedLinks.push({source:path,href:pathname});
    }
    return item;
  } catch(err) {
    addIssue(path,"request-error",err.message);
    return {path,error:String(err.message)};
  }
}
let cursor=0;
await Promise.all(Array.from({length:6},async()=>{
  while(cursor<routes.length){const i=cursor++;results[i]=await auditRoute(routes[i]);}
}));
checked.push(...results);
const assetPaths=[
 "/assets/css/novapharm.bundle.css",
 "/assets/media/home/earth-reference-1400.jpg",
 "/assets/brand/novapharm-healthcare-logo.png",
 "/assets/js/novapharm.js",
 "/assets/js/cookie-consent.js",
 "/assets/js/visual-refinement.js",
 "/assets/js/marketing-attribution.js",
 "/assets/css/intelligence-interactive-experience.css",
 "/assets/js/intelligence-interactive-experience.js"
];
for(const path of assetPaths){
 try{
  const {res,text} = await timeoutFetch(ORIGIN+path+"?asset-audit="+Date.now());
  checkedAssetUrls.push({path,status:res.status,bytes:text.length,contentType:res.headers.get("content-type")});
  if(!res.ok||text.length<100)addIssue(path,"asset-failed","HTTP "+res.status+", bytes "+text.length);
 }catch(e){addIssue(path,"asset-request-error",e.message);}
}
for(const path of ["/","/contact/","/products/nutraxin/","/technology/","/technology/experience/","/oncology/","/distribution/","/markets/"]){
 if(!checked.find(x=>x.path===path&&x.httpStatus===200))addIssue(path,"critical-route","Critical public route failed");
}
if(skuPaths.length!==19)addIssue("/products/nutraxin/","source-sku-count","Expected 19, source contains "+skuPaths.length);
for(const origin of ["https://portal.novapharmhealthcare.com/","https://intelligence.novapharmhealthcare.com/"]){
 try {
  const {res}=await timeoutFetch(origin,1);
  checked.push({path:origin,httpStatus:res.status,externalProtectedService:true});
  if(res.status>=500)addIssue(origin,"protected-entry","HTTP "+res.status);
 }catch(e){addIssue(origin,"protected-entry-unreachable",e.message,"informational");}
}
const uniqueUnresolved = [...new Map(unresolvedLinks.map(x=>[x.source+"|"+x.href,x])).values()];
const rootOriginProbes = [];
for(let i=0;i<8;i++){
  try{
    const response=await timeoutFetch(ORIGIN+"/?repeat-origin-audit="+Date.now()+"-"+i,1);
    const html=response.text;
    rootOriginProbes.push({
      status:response.res.status,
      earth:html.includes("nph-earth-hero-landscape"),
      restorationMarker:html.includes("novapharm-scoped-homepage-restore"),
      legacySplit:html.includes("npd-apple-hero-art"),
      etag:response.res.headers.get("etag"),
      age:response.res.headers.get("age"),
      lastModified:response.res.headers.get("last-modified"),
      server:response.res.headers.get("server")
    });
  }catch(e){rootOriginProbes.push({error:e.message});}
}
console.log("REPEATED LIVE HOMEPAGE RESPONSES "+JSON.stringify(rootOriginProbes));
if(rootOriginProbes.some(x=>!x.earth || x.legacySplit || x.status!==200))
  addIssue("/","inconsistent-public-homepage","An old or failed homepage response was served during eight independent requests");
if(rootOriginProbes.some(x=>x.restorationMarker) && rootOriginProbes.some(x=>!x.restorationMarker))
  addIssue("/","restoration-marker-variance","Different release annotations across origin responses","informational");

const report={
 generatedAt:now, gitSha:process.env.GITHUB_SHA||null, deployedBranchAudit:true,
 summary:{registeredCanonicalPaths:expectedByPath.size,publishedSitemapRoutes:publishedPaths.length,totalRoutesChecked:routes.length,nutraxinProductRoutes:skuPaths.length, extraRoutes, failures:issues.filter(x=>x.severity==="failure").length,informational:issues.filter(x=>x.severity==="informational").length,unresolvedInternalLinks:uniqueUnresolved.length},
 issues,assetChecks:checkedAssetUrls,rootOriginProbes,unresolvedInternalLinks:uniqueUnresolved,results:checked
};
mkdirSync("artifacts/site-restoration",{recursive:true});
writeFileSync("artifacts/site-restoration/live-restoration-audit.json",JSON.stringify(report,null,2));
console.log("SITE RESTORATION AUDIT SUMMARY "+JSON.stringify(report.summary));
console.log("FAILURES BY TYPE "+JSON.stringify(Object.entries(Object.groupBy(issues.filter(x=>x.severity==="failure"),x=>x.type)).map(([type,items])=>({type,count:items.length,paths:items.slice(0,12).map(x=>x.route)}))));
console.log("FULL FAILURE DETAIL "+JSON.stringify(issues.filter(x=>x.severity==="failure").slice(0,100)));
console.log("UNRESOLVED LINKS "+JSON.stringify(uniqueUnresolved.slice(0,30)));
if(report.summary.failures)process.exitCode=1;
