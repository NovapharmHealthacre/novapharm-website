import { createServer } from "node:https";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
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
assert(contactHtml.includes('disabled aria-describedby="contact-submission-status"'), "Static submit must fail closed before managed client loads");
assert(script.includes('if (submit) submit.disabled = false;'), "Managed client must explicitly activate submit after origin validation");
assert(script.lastIndexOf('if (submit) submit.disabled = false;') > script.indexOf('form.addEventListener("submit"'), "Submit may activate only after the handler has been registered");
assert(script.includes("response.status !== 201"), "HTTP 201 required");
assert(privacy.includes("Secure business enquiry intake"), "Live data-processing disclosure missing");
assert(privacy.includes("automatic expiry") || privacy.includes("Automatic expiry"), "Retention disclosure missing");
assert(privacy.includes("30 days"), "30-day TTL text missing");
const types={".html":"text/html",".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml"};
const certFolder=mkdtempSync(join(tmpdir(),"novapharm-contact-synthetic-"));
const keyPath=join(certFolder,"key.pem"),certPath=join(certFolder,"cert.pem");
execFileSync("openssl",["req","-x509","-newkey","rsa:2048","-nodes","-keyout",keyPath,"-out",certPath,"-days","1","-subj","/CN=localhost","-addext","subjectAltName=DNS:localhost,IP:127.0.0.1"],{stdio:"ignore"});
const server=createServer({key:readFileSync(keyPath),cert:readFileSync(certPath)},(req,res)=>{
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
const local="https://127.0.0.1:"+server.address().port;
const results=[];
try {
  for(const [label,engine] of [["Chromium",chromium],["WebKit",webkit]]){
    const browser=await engine.launch({headless:true});
    const context=await browser.newContext({acceptDownloads:false,ignoreHTTPSErrors:true});
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
      const consoleProblems=[];
      page.on("pageerror",err=>consoleProblems.push("PAGEERROR "+String(err).slice(0,160)));
      page.on("console",msg=>{ if(msg.type()==="error")consoleProblems.push("CONSOLE "+msg.text().slice(0,160)); });
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
      try { await page.waitForFunction(id=>document.querySelector("[data-live-contact-status]")?.textContent?.includes("Reference: "+id),receipt,{timeout:10000}); }
      catch(error) {
        const state=await page.locator("[data-live-contact-status]").textContent().catch(()=>"<missing>");
        throw new Error(label+" receipt timeout; status="+JSON.stringify(state)+"; fakePostCount="+result.attempts+"; blockedExternal="+result.realExternalRequests+"; browserErrors="+JSON.stringify(consoleProblems)+"; underlying="+String(error));
      }
      result.valid=true;
      failMode=true;
      await fill();
      await form.locator('button[type=submit]').click();
      await page.waitForFunction(()=>document.querySelector("[data-live-contact-status]")?.textContent?.includes("We could not confirm"),null,{timeout:10000});
      result.invalid=true;
      // The previous click leaves the cursor hovering over Submit; deliberately
      // exit hover and allow its 150ms colour transition to settle first.
      await page.mouse.move(1,1);
      await page.waitForTimeout(220);
      // Test real computed presentation in both browser engines, including
      // a narrow mobile viewport and a 200%-zoom-equivalent 640px reflow.
      result.viewports=[];
      for(const width of [1280,640,390,320]){
        await page.setViewportSize({width,height:900});
        const view=await page.evaluate(()=>{
          const field=document.querySelector(".ref-field");
          const caption=field?.querySelector("span");
          const input=field?.querySelector("input");
          const submit=document.querySelector(".ref-button");
          const first=document.querySelector('[name="name"]')?.getBoundingClientRect();
          const second=document.querySelector('[name="email"]')?.getBoundingClientRect();
          return {
            width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
            captionPx:parseFloat(getComputedStyle(caption).fontSize),
            inputPx:parseFloat(getComputedStyle(input).fontSize),
            submitHeight:submit.getBoundingClientRect().height,
            submitBg:getComputedStyle(submit).backgroundColor,
            submitColor:getComputedStyle(submit).color,
            bodyInk:getComputedStyle(document.body).color,
            headingInk:getComputedStyle(document.querySelector(".ref-hero h1")).color,
            inputInk:getComputedStyle(input).color,
            fieldLabelInk:getComputedStyle(caption).color,
            navInk:getComputedStyle(document.querySelector(".nav a")).color,
            firstTop:first?.top,firstBottom:first?.bottom,secondTop:second?.top
          };
        });
        assert(view.scrollWidth<=view.width+3,label+" contact horizontal overflow at "+width+"px: "+JSON.stringify(view));
        assert(view.captionPx>=14,label+" unreadable input label at "+width);
        assert(view.inputPx>=16,label+" input smaller than 16px at "+width);
        assert(view.submitHeight>=48,label+" undersized submit button at "+width);
        assert(view.submitBg==="rgb(157, 27, 50)",label+" Sovereign Crimson CTA absent at "+width);
        assert(view.submitColor==="rgb(255, 255, 255)",label+" submit label contrast colour incorrect");
        for(const key of ["bodyInk","headingInk","inputInk","navInk","fieldLabelInk"]){
          assert(view[key]==="rgb(11, 11, 14)",label+" Sovereign Black default ink missing for "+key+" at "+width+"px: "+view[key]);
        }
        if(width<=640)assert(view.secondTop>=view.firstBottom-2,label+" columns did not stack at "+width);
        result.viewports.push({width:width,overflow:false,fieldsReadable:true,buttonSize:true,brand:true});
      }
      // Hover is a desktop pointer affordance, not a touch/mobile acceptance
      // requirement. Return to the desktop viewport and use Playwright's
      // non-forced actionable hover (which detects overlap/obstruction).
      await page.setViewportSize({width:1280,height:900});
      await page.mouse.move(1,1);
      await page.waitForTimeout(220);
      await page.locator(".ref-button").hover();
      await page.waitForTimeout(420);
      const hoverInfo=await page.locator(".ref-button").evaluate(el=>({
        background:getComputedStyle(el).backgroundColor,
        hover:el.matches(":hover"),
        disabled:el.disabled,
        opacity:getComputedStyle(el).opacity,
        transition:getComputedStyle(el).transitionDuration,
        viewport:innerWidth
      }));
      assert(hoverInfo.viewport===1280,label+" hover tested on non-desktop viewport");
      assert(hoverInfo.hover&&!hoverInfo.disabled,label+" button cannot hover or stayed disabled: "+JSON.stringify(hoverInfo));
      assert(hoverInfo.background==="rgb(104, 16, 31)",label+" dark Crimson hover contrast failed: "+JSON.stringify(hoverInfo));
      await page.mouse.move(1,1);
      await page.locator('[name="name"]').focus();
      const focus=await page.evaluate(()=>({
        focused:document.activeElement?.getAttribute("name"),
        outline:getComputedStyle(document.querySelector(".ref-field")).outlineStyle
      }));
      assert(focus.focused==="name"&&focus.outline!=="none",label+" keyboard input focus outline missing");
      assert(result.attempts===2,"Expected two intercepted fake submissions");
      assert(result.realExternalRequests===0,"Blocked unexpected external requests");
      // With JavaScript disabled, the static Pages form must not appear usable:
      // its local POST target is deliberately prohibited by CSP form-action none.
      const noJsContext=await browser.newContext({acceptDownloads:false,ignoreHTTPSErrors:true,javaScriptEnabled:false});
      try {
        await noJsContext.route("**/*",async route=>{
          if(new URL(route.request().url()).origin===local) return route.continue();
          return route.abort("blockedbyclient");
        });
        const noJsPage=await noJsContext.newPage();
        await noJsPage.goto(local+"/contact/",{waitUntil:"domcontentloaded"});
        assert(!(await noJsPage.locator("form[data-live-b2b-enquiry-form]").isVisible()),label+" nonfunctional no-JS POST form must be hidden");
        assert(await noJsPage.locator("noscript a[href^='mailto:']").isVisible(),label+" no-JS email fallback must be visible");
        result.noJsFallback=true;
      } finally {await noJsContext.close();}
      // A blocked/unavailable JS asset must never expose a working-looking
      // POST button. The visible fallback explains how to contact the team.
      const missingScriptContext=await browser.newContext({acceptDownloads:false,ignoreHTTPSErrors:true});
      try {
        await missingScriptContext.route("**/*",async route=>{
          const url=new URL(route.request().url());
          if(url.origin!==local) return route.abort("blockedbyclient");
          if(url.pathname==="/assets/js/contact-production.js") return route.abort("blockedbyclient");
          return route.continue();
        });
        const missingScriptPage=await missingScriptContext.newPage();
        await missingScriptPage.goto(local+"/contact/",{waitUntil:"domcontentloaded"});
        assert(await missingScriptPage.locator(".ref-button").isDisabled(),label+" missing client may not leave an enabled submit button");
        assert(await missingScriptPage.locator("#contact-submission-status").isVisible(),label+" missing client must leave a visible fallback status");
        result.clientFailureSafe=true;
      } finally {await missingScriptContext.close();}
      await page.close();
    } finally {await context.close();await browser.close();}
    results.push(result);
    assert(result.valid && result.invalid,label+" valid and error mock flows");
  }
} finally {await new Promise(r=>server.close(r));rmSync(certFolder,{recursive:true,force:true});}
console.log(JSON.stringify({staticContract:true,syntheticOnly:true,results}));
