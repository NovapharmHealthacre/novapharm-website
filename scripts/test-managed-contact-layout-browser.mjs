import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, webkit } from "playwright";
import { composeManagedContactChrome } from "./activate-contact-intake.mjs";

const origin = new URL(process.env.PUBLIC_PAGES_BASE_URL || "http://127.0.0.1:4310");
assert.equal(origin.hostname, "127.0.0.1", "Managed Contact visual test is local-only");
const url = new URL("/contact/", origin).href;
let baseline;
for (let i = 0; i < 60; i++) {
  try { const r = await fetch(url); if (r.ok) { baseline = await r.text(); break; } } catch {}
  await new Promise(r => setTimeout(r, 500));
}
assert.ok(baseline, "Local public-only Contact baseline unavailable");
assert.ok(baseline.includes("data-email-enquiry-form"));
const template = readFileSync("src/content/contact-managed-release.html", "utf8");
const composed = composeManagedContactChrome(template, baseline);
const artifact = resolve(process.env.PUBLIC_PAGES_BROWSER_ARTIFACT_ROOT || "artifacts/public-pages-browser");
await mkdir(artifact, { recursive: true });
for (const [name, engine] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await engine.launch();
  try {
    for (const width of [320, 390, 680, 768, 1024, 1440, 1512]) {
      const context = await browser.newContext({ viewport: {width, height: 1000} });
      try {
        // Only serve the composed fixture locally. No requests to the actual API,
        // no real enquiries, no external network traffic or production mutation.
        await context.route("**/*", async route => {
          const req = route.request();
          if (req.method() !== "GET" || new URL(req.url()).origin !== origin.origin) return route.abort();
          if (req.url() === url) return route.fulfill({status: 200, contentType: "text/html", body: composed});
          return route.continue();
        });
        const page = await context.newPage();
        await page.goto(url, {waitUntil: "load"});
        await page.evaluate(() => document.fonts.ready);
        const reject = page.locator("[data-consent-action='reject']:visible").first();
        if (await reject.count()) await reject.click();
        const result = await page.evaluate(() => {
          const q = s => document.querySelector(s);
          const box = e => { const r = e.getBoundingClientRect(); return { x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom }; };
          const fields = [...document.querySelectorAll(".ref-grid > .ref-field")].map(box);
          const form = q(".ref-form");
          return {
            white: ["#main",".ref-hero",".ref-content",".ref-form",".ref-field",".ref-confirmation",".ref-safety"].map(s => getComputedStyle(q(s)).backgroundColor),
            fields, form:box(form), rows:[...form.querySelectorAll(":scope > .ref-grid")].map(box),
            hidden:getComputedStyle(form.querySelector("[hidden]")).display,
            topic:box(q(".ref-field.ref-full")), message:box(q(".ref-message")), textarea:box(q(".ref-message textarea")),
            confirms:[...form.querySelectorAll(".ref-confirmation")].map(box), explain:box(q(".ref-explain")),
            button:box(q(".ref-button")), actions:box(q(".ref-actions")), scroll:document.documentElement.scrollWidth,
            width:document.documentElement.clientWidth, footer:!!q("footer.site-footer.npd-footer"), header:!!q("header.site-header.npd-header")
          };
        });
        const label = name + " " + width;
        const near = (a,b,what) => assert.ok(Math.abs(a-b)<2,label+" "+what+": "+a+" vs "+b);
        assert.ok(result.white.every(c => c === "rgb(255, 255, 255)"), label+" nonwhite canvas: "+result.white);
        assert.equal(result.fields.length,6);
        assert.equal(result.hidden,"none");
        assert.ok(result.scroll<=result.width+1,label+" horizontal overflow");
        assert.ok(result.header && result.footer,label+" shared chrome missing");
        near(result.rows[1].y-result.rows[0].bottom,16,"third-row spacing");
        near(result.topic.y-result.rows[1].bottom,16,"topic spacing");
        near(result.message.y-result.topic.bottom,16,"message spacing");
        near(result.confirms[0].y-result.message.bottom,16,"consent spacing");
        near(result.confirms[1].y-result.confirms[0].bottom,16,"second consent spacing");
        for (const f of result.fields) { near(f.h,76,"field height"); assert.ok(f.x>=result.form.x && f.right<=result.form.right+1,label+" field overflow"); }
        if (width>680) {
          for (let i=0;i<6;i+=2) {near(result.fields[i].y,result.fields[i+1].y,"row alignment");near(result.fields[i].w,result.fields[i+1].w,"column widths");near(result.fields[i+1].x-result.fields[i].right,16,"column gap");}
          near(result.button.right,result.actions.right,"right aligned submit");
        } else {
          for(let i=1;i<6;i++) { near(result.fields[i].x,result.fields[0].x,"mobile column alignment"); near(result.fields[i].y-result.fields[i-1].bottom,16,"mobile gap"); }
          near(result.button.w,result.actions.w,"full width mobile submit");
        }
        assert.ok(result.message.h>=151 && result.textarea.h>=111,label+" message area too short: "+JSON.stringify({message:result.message,textarea:result.textarea}));
        assert.ok(result.button.y>=result.explain.bottom+15 && result.button.h>=47,label+" submit overlaps explanatory copy or touch target too small");
        await page.screenshot({path:resolve(artifact,"managed-contact-"+name+"-"+width+".png"),fullPage:true});
        console.log(label+": pure white, aligned fields, consistent gaps, responsive button, no overflow");
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
}
