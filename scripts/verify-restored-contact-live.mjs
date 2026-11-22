import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const website="https://novapharmhealthcare.com";
const receiver="https://h4dc1e4u57.execute-api.eu-north-1.amazonaws.com";
const nonce=Date.now();
const rows=[];
function insist(condition,message){if(!condition)throw Error(message);}

const reviewedBlobs=Object.freeze({
  html:"fa0c3c4b28cd5397afac1deffc3a9548c2b74e23",
  javascript:"d405d459e089c3a696bd0ed6b2fb84bf529787bc",
  stylesheet:"9631537b380551b5dd3f8dbee81d93c3098bab54"
});
function reviewedGitBlob(text){
  const bytes=Buffer.from(text,"utf8");
  return createHash("sha1").update("blob "+bytes.length).update(Uint8Array.of(0)).update(bytes).digest("hex");
}

async function read(origin,path,expectedMime){
  const url=new URL(path,origin);
  url.searchParams.set("contact_release_probe",String(nonce));
  const response=await fetch(url,{
    redirect:"error",signal:AbortSignal.timeout(20000),
    headers:{"Cache-Control":"no-cache, no-store, max-age=0","Pragma":"no-cache","User-Agent":"NovaPharm-Contact-ReadOnly-Live-Release-Check/1.0"}
  });
  insist(response.ok,path+" HTTP "+response.status);
  insist((response.headers.get("content-type")||"").toLowerCase().includes(expectedMime),path+" unexpected content-type");
  return response.text();
}
async function check(name,action){
  const row={name,passed:false,issue:null};
  try{await action();row.passed=true;}catch(error){row.issue=String(error).slice(0,240);}
  rows.push(row);
}

const page=await (async()=>{try{return await read(website,"/contact/","text/html");}catch{return null;}})();
const requireReviewedDesign = process.env.NOVAPHARM_CONTACT_EXPECT_REVIEWED_DESIGN === "yes"
  || !!page && (
    page.includes('--ink:#0B0B0E')
    || page.includes('type="submit" disabled aria-describedby="contact-submission-status"')
  );
await check("Public Contact form and exact API origin",async()=>{
  insist(!!page,"Live Contact HTML unavailable");
  insist(page.includes('data-live-b2b-enquiry-form'),"Actual API form missing; email draft still live");
  insist(!page.includes('data-email-enquiry-form')&&!page.includes("Open email draft"),"Email-only fallback was not replaced");
  insist(page.includes('data-api-origin="'+receiver+'"'),"Approved API origin not bound to form");
  insist(page.includes('src="/assets/js/contact-production.js"'),"Production Contact client is not linked");
  insist(page.includes('data-live-contact-status')&&page.includes("Submit enquiry securely"),"Accessible submit confirmation UI missing");
  insist(page.includes("privacyAcknowledgement")&&page.includes("safetyConfirmation"),"Required privacy and safety controls missing");
});
if (requireReviewedDesign) await check("Approved Contact visual identity and fail-closed controls",async()=>{
  insist(!!page,"Live Contact HTML unavailable");
  for(const marker of [
    '--ink:#0B0B0E', '--ref-ink:#0B0B0E', '#9D1B32',
    'class="ref-hero"', 'class="ref-form"',
    'type="submit" disabled aria-describedby="contact-submission-status"',
    '<noscript><style>.ref-form{display:none}</style>'
  ]) insist(page.includes(marker),"Reviewed Contact design/safety marker missing: "+marker);
  const link='href="/assets/css/novapharm-unified-20261107.css"';
  insist(page.includes(link) && page.indexOf(link)<page.indexOf("<style>"),"Shared CSS not present ahead of scoped Contact styles");
  insist(reviewedGitBlob(page)===reviewedBlobs.html,"Live Contact HTML differs from reviewed release");
  const css=await read(website,"/assets/css/novapharm-unified-20261107.css","text/css");
  insist(css.includes(".site-header") || css.includes(".nav"),"Reviewed Contact shared CSS missing expected layout rules");
  insist(reviewedGitBlob(css)===reviewedBlobs.stylesheet,"Live Contact CSS differs from reviewed release");
});
await check("Contact CSP and public-only safety",async()=>{
  insist(!!page,"Live Contact HTML unavailable");
  const csp=page.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i)?.[1]||"";
  insist(csp.includes("script-src 'self'")&&csp.includes("connect-src 'self' "+receiver),"Production script/API CSP not pinned");
  insist(csp.includes("form-action 'none'")&&csp.includes("object-src 'none'"),"Unsafe form/object CSP");
  insist(!page.includes('type="file"')&&!page.includes('data-order-payment-card'),"Contact page exposes upload/payment controls");
});
await check("Production Contact client enforces durable receipt",async()=>{
  const js=await read(website,"/assets/js/contact-production.js","javascript");
  insist(reviewedGitBlob(js)===reviewedBlobs.javascript,"Live Contact submission client differs from reviewed release");
  insist(js.includes('fetch(origin + "/contact"'),"Production POST client unavailable");
  insist(js.includes('result?.persisted !== true')&&js.includes('response.status !== 201'),"Durable server receipt enforcement missing");
  insist(js.includes('credentials: "omit"')&&js.includes('redirect: "error"'),"Unsafe API request credentials/redirect policy");
  insist(js.includes('new AbortController()')&&js.includes('status.replaceChildren()'),"Safe cancellation and status handling missing");
  insist(js.includes('"X-Novapharm-Intake": "v1"'),"Approved intake header not present");
  if (requireReviewedDesign) insist(
    js.lastIndexOf('if (submit) submit.disabled = false;')>js.indexOf('form.addEventListener("submit"'),
    "Contact submission enabled before its managed handler was registered"
  );
  insist(!/localStorage\s*\.\s*setItem|sessionStorage\s*\.\s*setItem/.test(js),"Contact client must not persist enquiry data in browser storage");
});
await check("Public privacy disclosures for actual intake",async()=>{
  const html=await read(website,"/legal/privacy/","text/html");
  insist(html.includes('id="business-enquiries"'),"Business enquiry privacy anchor missing");
  insist(html.includes("encrypted AWS DynamoDB inbox")&&html.includes("30 days after receipt"),"Storage and 30-day expiry disclosure absent");
});
await check("Public Contact receiver health and origin CORS",async()=>{
  const u=new URL("/health",receiver);u.searchParams.set("contact_release_probe",String(nonce));
  const r=await fetch(u,{method:"GET",redirect:"error",signal:AbortSignal.timeout(15000),
    headers:{"Origin":website,"Cache-Control":"no-cache","Accept":"application/json"}});
  insist(r.status===200,"Contact health HTTP "+r.status);
  insist(r.headers.get("access-control-allow-origin")===website,"Receiver health CORS origin mismatch");
  const j=await r.json();
  insist(j.service==="novapharm-contact-intake"&&j.ready===true&&j.environment==="production"&&j.acceptingPublicSubmissions===true,
    "Contact backend not accepting production enquiries");
});
await check("Contact POST CORS preflight only — no user submission",async()=>{
  const r=await fetch(receiver+"/contact",{method:"OPTIONS",redirect:"error",signal:AbortSignal.timeout(15000),
    headers:{"Origin":website,"Access-Control-Request-Method":"POST","Access-Control-Request-Headers":"content-type,x-novapharm-intake"}});
  insist(r.ok,"Contact OPTIONS preflight HTTP "+r.status);
  insist(r.headers.get("access-control-allow-origin")===website,"Contact preflight origin mismatch");
  insist((r.headers.get("access-control-allow-methods")||"").toUpperCase().includes("POST"),"POST not allowed by preflight");
  const headers=(r.headers.get("access-control-allow-headers")||"").toLowerCase();
  insist(headers.includes("content-type")&&headers.includes("x-novapharm-intake"),"Contact preflight custom header missing");
});
const report={time:new Date().toISOString(),scope:"READ_ONLY live GET/OPTIONS and static Contact metadata. No POST, users, orders, enquiry content or emails.",designMode:requireReviewedDesign?"reviewed-exact-assets":"existing-managed-contact",strictReviewRequested:process.env.NOVAPHARM_CONTACT_EXPECT_REVIEWED_DESIGN==="yes",checked:rows.length,passed:rows.filter(x=>x.passed).length,failed:rows.filter(x=>!x.passed).length,rows};
mkdirSync("artifacts/site-restoration",{recursive:true});
writeFileSync("artifacts/site-restoration/live-contact-acceptance.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({checked:report.checked,passed:report.passed,failed:report.failed,failures:rows.filter(x=>!x.passed)}));
if(report.failed)process.exitCode=1;
