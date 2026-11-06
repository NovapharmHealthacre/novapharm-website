/**
 * Browser-level read-only forensic inspection of the deployed website.
 * No POSTs, login, upload, or personal/customer data.
 * Collects evidence, never represents success as production acceptance.
 */
import { chromium, webkit } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const origin = "https://novapharmhealthcare.com";
const targets = [
  {id:"home",url:"/"},
  {id:"products",url:"/products/"},
  {id:"contact",url:"/contact/"},
  {id:"trust",url:"/trust-centre/"},
  {id:"privacy",url:"/legal/privacy/"}
];
const contexts = [
  {id:"desktop-1440",width:1440,height:900,isMobile:false,deviceScaleFactor:1},
  {id:"mobile-390",width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1}
];
const browsers=[["chromium",chromium],["webkit",webkit]];
const destination="audit/live-browser";
await mkdir(destination,{recursive:true});
const findings=[];
for(const [browserName,browserType] of browsers) {
  let browser;
  try {
    browser=await browserType.launch({headless:true});
    for(const vp of contexts) {
      const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:1,isMobile:vp.isMobile===true,hasTouch:vp.hasTouch===true,colorScheme:"light",reducedMotion:"reduce"});
      const page=await context.newPage();
      for(const target of targets) {
        const errors=[];
        page.on("pageerror",e=>errors.push(String(e.message).slice(0,280)));
        const url=origin+target.url;
        let status=0,loadError=null;
        try {
          const response=await page.goto(url,{waitUntil:"domcontentloaded",timeout:25000});
          status=response?.status()||0;
          await page.waitForTimeout(350);
        }catch(e){loadError=String(e).slice(0,240)}
        const metrics=await page.evaluate(()=>{
          const h1=Array.from(document.querySelectorAll("h1")).map(x=>x.innerText||x.textContent);
          const skip=Array.from(document.querySelectorAll('a[href^="#"]')).find(x=>(x.textContent||"").toLowerCase().includes("skip"));
          const missingImageAlt=Array.from(document.images).filter(x=>!x.hasAttribute("alt")).map(x=>x.src.slice(0,130));
          const focusable=Array.from(document.querySelectorAll("button, a[href], input, select, textarea")).length;
          const meta=document.querySelector('meta[name="description"]')?.getAttribute("content")||"";
          const mobileNavButton=Array.from(document.querySelectorAll("button")).find(x=>/menu/i.test((x.textContent||"")+" "+(x.getAttribute("aria-label")||"")));
          const main=document.querySelector("main");
          const header=document.querySelector("header");
          const primary=document.querySelector("main h1")?.getBoundingClientRect();
          return {
            title:document.title,h1,skipLinkPresent:!!skip,skipLinkTargetExists:!!skip&&!!document.querySelector(skip.getAttribute("href")),
            missingImageAlt,focusable,metaDescriptionLength:meta.length,
            bodyWidth:document.body.scrollWidth,documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,
            overflowPixels:Math.max(0,document.documentElement.scrollWidth-innerWidth),
            mobileNavButtonPresent:!!mobileNavButton,
            mainPresent:!!main,headerPresent:!!header,
            heroH1BoundingRect:primary?{x:Math.round(primary.x),y:Math.round(primary.y),width:Math.round(primary.width),height:Math.round(primary.height)}:null,
            imageCount:document.images.length,
            brokenVisibleImages:Array.from(document.images).filter(x=>{const rect=x.getBoundingClientRect();return rect.top<innerHeight&&rect.bottom>0&&x.complete&&x.naturalWidth===0}).map(x=>x.src.slice(0,150))
          };
        }).catch(e=>({evaluateError:String(e)}));
        let axe={violations:[],incomplete:[],error:null};
        if(status===200) {
          try {
            const scan=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();
            axe={violations:scan.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length,help:v.help,examples:v.nodes.slice(0,15).map(n=>({target:n.target,html:n.html.slice(0,220),summary:n.failureSummary?.slice(0,450),data:n.any?.[0]?.data??null}))})),incomplete:scan.incomplete.map(v=>({id:v.id,nodes:v.nodes.length})),error:null};
          }catch(e){axe.error=String(e).slice(0,400)}
        }
        const name=browserName+"-"+vp.id+"-"+target.id;
        let screenshot=null;
        try {
          screenshot=path.join(destination,name+".png");
          await page.screenshot({path:screenshot,fullPage:target.id==="home"||target.id==="contact",animations:"disabled",timeout:25000});
        }catch(e){errors.push("screenshot: "+String(e).slice(0,180))}
        const record={name,url,status,loadError,metrics,axe,errors,screenshot};
        findings.push(record);
        console.log("BROWSER_AUDIT "+JSON.stringify({
          name,status,overflow:metrics.overflowPixels,skip:metrics.skipLinkTargetExists,
          axeViolations:axe.violations.map(v=>({id:v.id,targets:v.examples?.map(e=>e.target).slice(0,10)})),errors:errors.slice(0,3),loadError
        }));
      }
      await page.close();await context.close();
    }
  }catch(e) {
    findings.push({browser:browserName,fatal:String(e).slice(0,1000)});
  }finally{if(browser)await browser.close();}
}
const result={
  observedAt:new Date().toISOString(),scope:"public deployed Next.js site, two browser engines and viewport classes; no credentials",
  combinations:findings.length,
  findings,
  limitations:["Visual review is a human editorial step; screenshots are evidence, not Apple-equivalence.","axe is automated partial WCAG testing; manual accessibility review is still required.","No form submit, password sign-in, API authorization or patient data tested.","Synthetic audit does not certify LCP, INP or production release."]
};
await writeFile(path.join(destination,"browser-forensics.json"),JSON.stringify(result,null,2)+"\n");
const violations=findings.flatMap(x=>(x.axe?.violations||[]).map(v=>({name:x.name,...v})));
const overflows=findings.filter(x=>x.metrics?.overflowPixels>2).map(x=>({name:x.name,pixels:x.metrics.overflowPixels}));
const broken=findings.filter(x=>x.metrics?.brokenVisibleImages?.length).map(x=>({name:x.name,images:x.metrics.brokenVisibleImages}));
const report=[
  "# NovaPharm browser forensics", "Observed "+result.observedAt,
  "Browser/viewport combinations recorded: "+findings.length,
  "## Horizontal overflow",JSON.stringify(overflows,null,2),
  "## Broken images",JSON.stringify(broken,null,2),
  "## Axe automated WCAG finding nodes",JSON.stringify(violations,null,2),
  "## Caveats",...result.limitations.map(x=>"- "+x)
].join("\n")+"\n";
await writeFile(path.join(destination,"browser-forensics.md"),report);
console.log("BROWSER_AUDIT_SUMMARY "+JSON.stringify({combinations:findings.length,overflows,broken,violations,failures:findings.filter(x=>x.fatal||x.loadError||x.status!==200).map(x=>({name:x.name,status:x.status,error:x.loadError||x.fatal}))}));
