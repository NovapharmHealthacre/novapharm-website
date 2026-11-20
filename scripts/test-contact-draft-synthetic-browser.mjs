import { createServer } from "node:http";
import { readFileSync, statSync } from "node:fs";
import { resolve, join, sep, extname } from "node:path";
import { chromium, webkit } from "playwright";

const candidate = resolve("contact-draft");
const contactHtml = readFileSync(join(candidate, "contact/index.html"), "utf8");
const script = readFileSync(join(candidate, "assets/js/contact-production.js"), "utf8");
const privacy = readFileSync(join(candidate, "legal/privacy/index.html"), "utf8");
const origin = "https://h4dc1e4u57.execute-api.eu-north-1.amazonaws.com";
const receipt = "123e4567-e89b-12d3-a456-426614174000";
function assert(ok, label) { if (!ok) throw new Error("Contact candidate acceptance failed: " + label); }
for (const marker of [
  'data-live-b2b-enquiry-form', 'data-live-contact-status',
  'name="privacyAcknowledgement"', 'name="safetyConfirmation"',
  'name="website"', 'name="role"', 'name="message"',
  'src="/assets/js/contact-production.js"'
]) assert(contactHtml.includes(marker), marker);
assert(!contactHtml.includes('data-email-enquiry-form'), "Email-only form still present");
assert(!contactHtml.includes('>Open email draft</button>'), "Obsolete email-only button");
assert(contactHtml.includes("connect-src 'self' " + origin), "Contact CSP origin allowlist");
assert(contactHtml.includes("form-action 'none'"), "No non-JS post or form-action escape");
assert(script.includes("result?.persisted !== true"), "Server durable receipt required");
assert(script.includes("response.status !== 201"), "HTTP 201 required");
assert(privacy.includes("Secure business enquiry intake"), "Live data-processing disclosure missing");
assert(privacy.includes("automatic expiry") || privacy.includes("Automatic expiry"), "Retention disclosure missing");
assert(privacy.includes("30 days"), "30-day TTL text missing");
const types={".html":"text/html",".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml"};
const server=createServer((req,res)=>{
  let u;
  try { u=new URL(req.url,"http://localhost"); } catch { res.writeHead(400).end();return; }
  const relative=decodeURIComponent(u.pathname).replace(/^\/+/,"");
  let file=resolve(candidate,relative||"index.html");
  if(!file.startsWith(candidate+sep)){res.writeHead(403).end();return;}
  try {if(statSync(file).isDirectory())file=join(file,"index.html");}
  catch {if(u.pathname.endsWith("/"))file=join(file,"index.html");}
  try { const body=readFileSync(file); res.writeHead(200,{"content-type":types[extname(file)]||"application/octet-stream","cache-control":"no-store"});res.end(body);}
  catch {res.writeHead(404,{"content-type":"text/plain"}).end("not found");}
});
await new Promise((r,j)=>{server.once("error",j);server.listen(0,"127.0.0.1",r);});
const local="http://127.0.0.1:"+server.address().port;
const results=[];
try {
  for(const [label,engine] of [["Chromium",chromium],["WebKit",webkit]]){
    const browser=await engine.launch({headless:true});
    const context=await browser.newContext({acceptDownloads:false});
    const result={browser:label,valid:false,invalid:false,realExternalRequests:0,attempts:0};
    try {
      let failMode=false;
      await context.route("**/*",async route=>{
        const u=new URL(route.request().url());
        if(u.origin===local){await route.continue();return;}
        if(u.origin===origin && u.pathname==="/contact") {
          if(route.request().method()==="OPTIONS"){
            await route.fulfill({status:204,headers:{"access-control-allow-origin":local,"access-control-allow-methods":"POST, OPTIONS","access-control-allow-headers":"content-type,x-novapharm-intake"}});return;
          }
          if(route.request().method()==="POST"){
            result.attempts++;
            await route.fulfill({
              status:failMode?503:201,contentType:"application/json",
              headers:{"access-control-allow-origin":local},
              body:JSON.stringify(failMode?{error:"synthetic_unavailable"}:{persisted:true,receiptId:receipt})
            });return;
          }
        }
        result.realExternalRequests++;
        await route.abort("blockedbyclient");
      });
      const page=await context.newPage();
      await page.goto(local+"/contact/",{waitUntil:"domcontentloaded"});
      await page.locator('[data-live-b2b-enquiry-form]').waitFor({timeout:10000});
      const form=page.locator('[data-live-b2b-enquiry-form]');
      async function fill(){
        await form.locator('[name=name]').fill("Synthetic Test Person");
        await form.locator('[name=email]').fill("synthetic@example.invalid");
        await form.locator('[name=company]').fill("Synthetic Review Limited");
        await form.locator('[name=role]').fill("Procurement reviewer");
        await form.locator('[name=country]').fill("United Kingdom");
        await form.locator('[name=enquiryType]').selectOption({label:"Product opportunity"});
        await form.locator('[name=message]').fill("Synthetic non-clinical business acceptance test. No real enquiry.");
        await form.locator('[name=safetyConfirmation]').check();
        await form.locator('[name=privacyAcknowledgement]').check();
      }
      await fill();
      await form.locator('button[type=submit]').click();
      await page.waitForFunction(id=>document.querySelector("[data-live-contact-status]")?.textContent?.includes("Reference: "+id),receipt,{timeout:10000});
      result.valid=true;
      failMode=true;
      await fill();
      await form.locator('button[type=submit]').click();
      await page.waitForFunction(()=>document.querySelector("[data-live-contact-status]")?.textContent?.includes("We could not confirm"),null,{timeout:10000});
      result.invalid=true;
      assert(result.attempts===2,"Expected two intercepted fake submissions");
      assert(result.realExternalRequests===0,"Blocked unexpected external requests");
      await page.close();
    } finally {await context.close();await browser.close();}
    results.push(result);
    assert(result.valid && result.invalid,label+" valid and error mock flows");
  }
} finally {await new Promise(r=>server.close(r));}
console.log(JSON.stringify({staticContract:true,syntheticOnly:true,results}));
