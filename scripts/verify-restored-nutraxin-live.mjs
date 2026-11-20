import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
const origin = "https://novapharmhealthcare.com";
const products = JSON.parse(readFileSync("assets/data/nutraxin-gtin-uk.json", "utf8")).products;
const expectedRelease = "268d5bd7641cd4117924aef00432fc2afca4b43a";
const nonce = expectedRelease.slice(0, 12) + "-" + Date.now();
const checks = [];
function assert(condition, errors, message) { if (!condition) errors.push(message); }
async function get(path, contentType="text/html") {
  const url = origin + path + (path.includes("?") ? "&" : "?") + "restore-test=" + encodeURIComponent(nonce);
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    redirect: "follow",
    headers: { "Cache-Control": "no-cache, no-store, max-age=0", "Pragma": "no-cache", "User-Agent": "NovaPharm-Post-Release-ReadOnly-Verification/1.0" }
  });
  if (!response.ok) throw new Error("HTTP " + response.status);
  const mime = response.headers.get("content-type") || "";
  if (!mime.includes(contentType)) throw new Error("unexpected content type " + mime);
  return response.text();
}
function ean13(value) {
  if (!/^\d{13}$/.test(value)) return false;
  let sum = 0;
  for (let i=0;i<12;i++) sum += Number(value[i])*(i%2===0?1:3);
  return (10-(sum%10))%10===Number(value[12]);
}
async function validate(path, predicate) {
  const row = { path, passed: false, issues: [] };
  try { const html = await get(path); predicate(html, row.issues); row.passed = row.issues.length===0; }
  catch(error) { row.issues.push(String(error).slice(0,200)); }
  checks.push(row);
}
await validate("/", (html, errors) => {
  assert(html.includes("Better access begins with better decisions."),errors,"Approved homepage not present");
  assert(html.includes("Built for trust."),errors,"Approved editorial section missing");
});
await validate("/products/nutraxin/", (html,errors) => {
  assert(html.includes("Nutraxin"),errors,"Nutraxin collection absent");
  assert(html.includes("nutraxin-retail-store.js"),errors,"Latest storefront script missing");
  for (const product of products) assert(html.includes(product.slug),errors,"Missing SKU link " + product.slug);
});
await Promise.all(products.map(async p => validate("/products/nutraxin/"+p.slug+"/", (html,errors) => {
  assert(ean13(p.gtin13),errors,"Source GTIN invalid");
  assert(html.includes('"gtin13":"'+p.gtin13+'"'),errors,"Latest GTIN JSON-LD missing/mismatch");
  assert(html.includes('"@type":"Product"'),errors,"Product schema missing");
  assert(html.includes('data-nutraxin-answers="true"'),errors,"Visible AEO product Q&A missing");
  assert(html.includes('href="'+origin+"/products/nutraxin/"+p.slug+'/"'),errors,"Canonical missing");
  assert(html.includes("/assets/js/nutraxin-retail-store.js"),errors,"Storefront JS not linked");
  assert(!html.includes("B2B evaluation only · Availability not asserted"),errors,"Old B2B-only template is still published");
})));
await validate("/products/nutraxin/bag/", (html,errors) => {
  assert(html.includes("data-nx-public-bag"),errors,"Bag view missing");
  assert(html.includes("nutraxin-retail-store.js"),errors,"Storefront script missing");
});
await validate("/products/nutraxin/account/", (html,errors) => {
  assert(html.includes("nutraxin-consumer-account.js"),errors,"Account script missing");
});
for (const [path,mime] of [
  ["/assets/js/nutraxin-retail-store.js","javascript"],
  ["/assets/js/nutraxin-consumer-account.js","javascript"],
  ["/assets/css/nutraxin-retail-store.css","text/css"],
  ["/assets/css/nutraxin-lineup.css","text/css"],
  ["/assets/data/nutraxin-retail-catalogue.json","application/json"] ]) {
  const row={path,passed:false,issues:[]};
  try { const content=await get(path,mime); row.passed=content.length>150; if(!row.passed)row.issues.push("Asset empty");}
  catch(error) {row.issues.push(String(error).slice(0,200));}
  checks.push(row);
}
const report = {timestamp:new Date().toISOString(), expectedRelease, origin,
  note:"Production content verification only. No checkout transaction, private account login, data-source licence or payment activation is asserted.",
  expectedSkuCount:products.length, checks,
  checked:checks.length, passed:checks.filter(x=>x.passed).length, failed:checks.filter(x=>!x.passed).length};
mkdirSync("artifacts/site-restoration",{recursive:true});
writeFileSync("artifacts/site-restoration/nutraxin-post-release.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({checked:report.checked,passed:report.passed,failed:report.failed,failedPaths:checks.filter(x=>!x.passed).map(x=>({path:x.path,issues:x.issues})).slice(0,30)}));
if(report.failed)process.exitCode=1;
