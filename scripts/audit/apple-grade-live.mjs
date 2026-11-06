import { mkdir, writeFile } from "node:fs/promises";

/* Read-only: never submit a contact form, authenticate, or request private data. */
const origin = "https://novapharmhealthcare.com";
const paths = [
  "/", "/about/", "/about/company/", "/about/governance/", "/services/",
  "/capabilities/", "/regulatory-services/", "/cro/", "/oncology/",
  "/products/", "/products/nutraxin/", "/products/strategic-portfolio/",
  "/partner-with-us/", "/technology/", "/trust-centre/", "/leadership/",
  "/news-insights/", "/contact/", "/account-application/", "/portal/",
  "/legal/privacy/", "/legal/accessibility/", "/careers/"
];
const endpoints = [
  ["portal", "https://portal.novapharmhealthcare.com/portal/"],
  ["api", "https://api.novapharmhealthcare.com/api/health"],
  ["aws-staging", "https://y2sa7gga5i.execute-api.eu-north-1.amazonaws.com/health"]
];

async function request(url) {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(16000),
      headers: { "Accept": "text/html,application/json;q=0.9,*/*;q=0.8", "User-Agent": "NovaPharm-readonly-website-audit/1.0" }
    });
    const type = res.headers.get("content-type") || "";
    const body = /(html|json)/.test(type) ? (await res.text()).slice(0,1200000) : "";
    return { http: res.status, url: res.url, type, body, headers: {
      hsts: res.headers.get("strict-transport-security") || "",
      csp: res.headers.get("content-security-policy") || "",
      nosniff: res.headers.get("x-content-type-options") || ""
    }};
  } catch (e) {
    return { http: 0, url, type: "", body: "", error: String(e) };
  }
}
async function pool(items, limit, cb) {
  const results = new Array(items.length); let next = 0;
  await Promise.all(Array.from({length: limit}, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await cb(items[i]);
    }
  }));
  return results;
}
function attr(tag,name) {
  const m = String(tag).match(new RegExp("\\b" + name + "\\s*=\\s*([\"'])(.*?)\\1", "i"));
  return m ? m[2] : "";
}
function clean(value) {
  return String(value||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
}
function inspect(path, response) {
  const h = response.body;
  const head = (h.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)||[])[1]||"";
  const title = clean((head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)||[])[1]);
  const meta = [...head.matchAll(/<meta\b[^>]*>/gi)].map(m=>m[0]);
  const desc = attr(meta.find(m=>attr(m,"name").toLowerCase()==="description")||"","content");
  const canonical = [...head.matchAll(/<link\b[^>]*>/gi)].map(m=>m[0]).find(m=>attr(m,"rel").toLowerCase()==="canonical");
  const heading = [...h.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(m=>clean(m[1]));
  const images = [...h.matchAll(/<img\b[^>]*>/gi)].map(m=>m[0]);
  const missingAlt = images.filter(m=>!/\balt\s*=/.test(m)).length;
  const missingDimensions = images.filter(m=>!attr(m,"width")||!attr(m,"height")).length;
  const issues = [];
  if(response.http !== 200) issues.push("HTTP_NOT_200");
  if(!title) issues.push("MISSING_TITLE");
  if(desc.length<50) issues.push("MISSING_OR_SHORT_META");
  if(heading.length!==1) issues.push("H1_COUNT="+heading.length);
  if(!/<main\b/i.test(h)) issues.push("MISSING_MAIN");
  if(!/<nav\b/i.test(h)) issues.push("MISSING_NAV");
  if(!/href=["']#main["']/i.test(h)) issues.push("MISSING_SKIP_LINK");
  if(!attr(canonical||"","href")) issues.push("MISSING_CANONICAL");
  if(!/\<html\b[^>]*lang=/i.test(h)) issues.push("MISSING_LANG");
  if(missingAlt) issues.push("MISSING_IMAGE_ALT="+missingAlt);
  if(missingDimensions) issues.push("MISSING_IMAGE_DIMENSIONS="+missingDimensions);
  const skipCandidates = [...h.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)].map(x=>x[0]).filter(x=>/skip-link|Skip to content|#main/i.test(x)).slice(0,3).map(x=>x.slice(0,320));
  const missingDimensionSources = images.filter(x=>!attr(x,"width")||!attr(x,"height")).map(x=>({src:attr(x,"src"),tag:x.slice(0,260)}));
  const privacyCloudMentions = path==="/legal/privacy/" ? (h.match(/.{0,80}(?:Azure|AWS|Amazon Web Services).{0,160}/gi)||[]).slice(0,7) : [];
  const flags=[];
  if(path==="/contact/" && !/data-contact-form/i.test(h)) flags.push("PUBLIC_FORM_NOT_ACTIVE");
  if(path==="/legal/privacy/" && /Microsoft Azure is the approved target/i.test(h)) flags.push("PRIVACY_STILL_SAYS_AZURE");
  if(path==="/portal/" && /portal\.novapharmhealthcare\.com/i.test(h)) flags.push("PORTAL_IS_LINK_TO_SEPARATE_HOST_NOT_WORKING_SERVICE");
  return {path,http:response.http,url:response.url,title,h1:heading,descLength:desc.length,canonical:attr(canonical||"","href"),imageCount:images.length,missingAlt,missingDimensions,missingDimensionSources,skipCandidates,privacyCloudMentions,usesPicture:/(<picture\b|srcset\s*=)/i.test(h),htmlBytes:Buffer.byteLength(h),issues,flags,headers:response.headers};
}
const observedAt = new Date().toISOString();
const pages = await pool(paths,5,async path => inspect(path,await request(origin+path)));
const services = await pool(endpoints,3,async item => {
  const r=await request(item[1]);
  return {name:item[0],http:r.http,url:item[1],error:r.error||null,stagingNotLive:item[0]==="aws-staging"?/"live"\s*:\s*false/.test(r.body):null};
});
const summary = {
  pageCount:pages.length,http200:pages.filter(p=>p.http===200).length,
  pagesWithStructuralFindings:pages.filter(p=>p.issues.length).length,
  pagesWithMissingAlt:pages.filter(p=>p.missingAlt).length,
  pagesWithImageLayoutShiftRisk:pages.filter(p=>p.missingDimensions).length,
  realContactFormActive:!pages.find(p=>p.path==="/contact/")?.flags.includes("PUBLIC_FORM_NOT_ACTIVE"),
  managedPortalResponds200:services.find(s=>s.name==="portal")?.http===200,
  managedApiHealth200:services.find(s=>s.name==="api")?.http===200,
  awsStagingExplicitlyNotLive:services.find(s=>s.name==="aws-staging")?.stagingNotLive===true,
  privacyStillReferencesAzure:pages.find(p=>p.path==="/legal/privacy/")?.flags.includes("PRIVACY_STILL_SAYS_AZURE")
};
const payload={observedAt,source:"public read-only GitHub runner, not a credentials test",summary,pages,services,
 limitations:["Does not measure LCP, INP or CLS.","Does not certify WCAG accessibility; only structural signals.","Cannot verify Entra MFA or real email receipt without a production transaction.","Does not copy Apple fonts or copyrighted assets."]};
await mkdir("audit/live",{recursive:true});
await writeFile("audit/live/apple-grade-readonly.json",JSON.stringify(payload,null,2)+"\n");
const table=pages.map(p=>"| "+p.path+" | "+p.http+" | "+p.h1.length+" | "+p.imageCount+" | "+p.issues.concat(p.flags).join(", ")+" |").join("\n");
const report=[
  "# NovaPharm live website forensic audit", "Observed "+observedAt,
  "Public read-only crawl; Apple HIG is a design comparator, not a template to copy.",
  "## Summary", ...Object.entries(summary).map(pair=>"- "+pair[0]+": "+pair[1]),
  "## Pages", "| Path | HTTP | H1 count | Images | Findings |", "| --- | ---: | ---: | ---: | --- |",table,
  "## Managed service endpoints",...services.map(s=>"- "+s.name+": HTTP "+s.http+(s.error?" ("+s.error+")":"")),
  "## Limits",...payload.limitations.map(s=>"- "+s),
  "## Acceptance criteria","- Single primary CTA, clear hierarchy, original NovaPharm branding, responsive original imagery.",
  "- Keyboard focus, contrast, reduced-motion, responsive type and image dimension checks.",
  "- Production contact is only accepted after receipt, notifications, privacy and abuse tests.",
  "- Production portal only after tenant-locked, issuer/audience-verified Entra P1 OIDC MFA and role-denial tests."
].join("\n")+"\n";
await writeFile("audit/live/apple-grade-readonly.md",report);
console.log("NOVAPHARM_AUDIT_JSON_START");
console.log(JSON.stringify({observedAt,summary,services,critical:pages.filter(p=>p.issues.length||p.flags.length).map(p=>({path:p.path,http:p.http,issues:p.issues,flags:p.flags,skipCandidates:p.skipCandidates,missingDimSources:p.missingDimensionSources.slice(0,3),privacyCloudMentions:p.privacyCloudMentions}))},null,2));
console.log("NOVAPHARM_AUDIT_JSON_END");
