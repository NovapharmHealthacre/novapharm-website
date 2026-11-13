import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { articles } from "../data/articles";
import nutraxinRegister from "../data/nutraxin-product-register.json";
import { corporatePages } from "../data/pages";
import { leadership } from "../data/site";

const origin = process.env.SITEWIDE_BASE_URL ?? "http://127.0.0.1:3178";
const artifactDir = "../../artifacts/corporate-design-system";
const routes = [
  ...corporatePages.map(p => `/${p.slug ? `${p.slug}/` : ""}`),
  ...leadership.map(p => `/leadership/${p.slug}/`),
  ...articles.map(p => `/news-insights/${p.slug}/`),
  ...nutraxinRegister.products.map(p => `/products/nutraxin/${p.slug}/`)
];
const showcase = new Set([
  "/", "/about/", "/about/governance/", "/capabilities/", "/oncology/",
  "/services/", "/regulatory-services/", "/cro/", "/products/",
  "/products/nutraxin/", "/products/strategic-portfolio/", "/technology/",
  "/leadership/", "/news-insights/", "/partner-with-us/", "/contact/",
  "/legal/", "/legal/privacy/", "/account-application/"
]);
const viewports = [
  { name: "compact-320", width: 320, height: 720 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 900 }
];
type Finding = { route: string; viewport: string; detail: string };
const findings: Finding[] = [];
const records: Array<Record<string,unknown>> = [];
const safe = (route:string) => route === "/" ? "home" : route.slice(1,-1).replaceAll("/","--");

async function audit() {
  assert.equal(new Set(routes).size, routes.length, "Duplicate public routes in audit");
  await mkdir(artifactDir,{recursive:true});
  const browser=await chromium.launch({headless:true});
  try {
    for(const vp of viewports) {
      const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},reducedMotion:"reduce"});
      try {
        for(const route of routes) {
          const page=await context.newPage();
          const errors:string[]=[];
          const errorsFromNetwork:string[]=[];
          page.on("pageerror", e=>errors.push(e.message));
          page.on("console", m=>{if(m.type()==="error")errors.push(m.text())});
          page.on("response", r=>{if(r.status()>=400 && !r.request().isNavigationRequest())errorsFromNetwork.push(`${r.status()} ${r.url()}`)});
          try {
            const response=await page.goto(origin+route,{waitUntil:"domcontentloaded",timeout:30000});
            const status=response?.status()??0;
            if(status!==200){findings.push({route,viewport:vp.name,detail:`HTTP ${status}`});continue;}
            await page.locator("main").waitFor({state:"visible",timeout:10000});
            await page.evaluate(()=>document.fonts.ready);
            if(showcase.has(route) && (vp.name==="desktop-1440" || ["/","/contact/","/oncology/"].includes(route))) {
              // A transient Chromium capture-protocol failure is not a design finding.
              // Keep the exact same full-page evidence requirement and fail after 3 attempts.
              for (let attempt=1;attempt<=3;attempt++) {
                try {
                  await page.screenshot({path:`${artifactDir}/${safe(route)}-${vp.name}.png`,fullPage:true,animations:"disabled",timeout:15000});
                  break;
                } catch (error) {
                  if (attempt===3 || !/Page\.captureScreenshot|Unable to capture screenshot/i.test(String(error))) throw error;
                  await page.waitForTimeout(attempt*350);
                }
              }
            }
            const data=await page.evaluate(()=>{
              const root=getComputedStyle(document.documentElement);
              const body=getComputedStyle(document.body);
              const header=document.querySelector(".site-header");
              const footer=document.querySelector(".site-footer");
              const h1s=[...document.querySelectorAll("h1")];
              return {
                title:document.title, h1s:h1s.length,h1Text:h1s[0]?.textContent?.trim()??"",
                header:!!header,footer:!!footer,logo:!!document.querySelector('header img[alt="NovaPharm Healthcare"]'),
                intelligenceNav:!!document.querySelector('header .desktop-nav a[href="/technology/"]'),
                homeNavLabel:(()=>{
                  const link=document.querySelector('.desktop-nav a[href="/technology/"]') as HTMLElement|null;
                  if(!link||!link.getClientRects().length)return null;
                  const contact=document.querySelector('.desktop-nav a[href="/contact/"]') as HTMLElement|null;
                  return {before:getComputedStyle(link,"::before").content,
                    after:getComputedStyle(link,"::after").content,
                    right:link.getBoundingClientRect().right,
                    contactLeft:contact?.getBoundingClientRect().left??0};
                })(),
                managedContactBorders:(()=>{
                  const field=document.querySelector(".np-contact-reference .np-contact-reference-field");
                  const input=field?.querySelector('input:not([type="hidden"]), select, textarea');
                  if(!field||!input)return null;
                  return {field:getComputedStyle(field).borderTopWidth,input:getComputedStyle(input).borderTopWidth};
                })(),
                navHeight:header?Math.round(header.getBoundingClientRect().height):0,
                font:body.fontFamily,inkToken:root.getPropertyValue("--nph-ink").trim(),
                surfaceToken:root.getPropertyValue("--nph-silver").trim(),
                width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,
                legal:document.body.textContent?.includes("Regulated wholesale supply has not commenced")??false,
                mainLength:document.querySelector("main")?.textContent?.trim().length??0,
                brokenImages:[...document.images].filter(x=>x.complete&&x.naturalWidth===0).map(x=>x.currentSrc),
                clippedControls:[...document.querySelectorAll("main form input:not([type=hidden]), main form select, main form textarea, main form button")]
                  .filter(el=>{if(el.closest('[aria-hidden="true"], .honeypot'))return false;const css=getComputedStyle(el);if(css.display==="none"||css.visibility==="hidden"||Number(css.opacity)===0)return false;
                    const b=el.getBoundingClientRect();return b.width>0&&b.height>0&&(b.left< -2||b.right>document.documentElement.clientWidth+2);})
                  .map(el=>({tag:el.tagName.toLowerCase(),name:el.getAttribute("name")||el.getAttribute("aria-label")||""})).slice(0,8),
                // Inspect the rendered heading and actual controls, not only the
                // document scroll width (which can hide clipped content).
                headlineBounds: (() => {
                  const heading = document.querySelector("main h1");
                  if (!heading) return null;
                  const box = heading.getBoundingClientRect();
                  const css = getComputedStyle(heading);
                  return { left:box.left,right:box.right,top:box.top,width:box.width,
                    fontSize:parseFloat(css.fontSize),lineHeight:parseFloat(css.lineHeight) };
                })(),
                compactControls:[...document.querySelectorAll('main :is(a.button, a.npd-button, button[type="submit"], input[type="submit"])')]
                  .filter(el=>{const css=getComputedStyle(el);return css.display!=="none"&&css.visibility!=="hidden"})
                  .map(el=>{const box=el.getBoundingClientRect();return {label:(el.textContent||el.getAttribute("aria-label")||"").trim().slice(0,70),width:box.width,height:box.height}})
                  .filter(item=>item.width>0&&item.height>0&&(item.width<40||item.height<40))
              };
            });
            const faults:string[]=[];
            if(data.h1s!==1)faults.push(`H1 count: ${data.h1s}`);
            if(!data.header||!data.footer||!data.logo)faults.push("Missing shared header/footer/brand");
            if(!data.intelligenceNav)faults.push("Primary navigation missing NovaPharm Intelligence");
            if(data.scrollWidth>data.width+1)faults.push(`Horizontal overflow: ${data.scrollWidth}px`);
            if(data.headlineBounds && (data.headlineBounds.left < -1 || data.headlineBounds.right > data.width+2)) {
              faults.push(`Primary heading extends outside viewport: ${JSON.stringify(data.headlineBounds)}`);
            }
            if(vp.width<=390 && data.headlineBounds && data.headlineBounds.fontSize<28) {
              faults.push(`Mobile H1 is unexpectedly small: ${data.headlineBounds.fontSize}px`);
            }
            if(vp.width<=390 && data.compactControls.length) {
              faults.push(`Primary interactive controls have undersized hit areas: ${JSON.stringify(data.compactControls.slice(0,5))}`);
            }
            if(!data.font.includes("apple-system"))faults.push(`Unexpected font: ${data.font}`);
            if(!data.inkToken||!data.surfaceToken)faults.push("Missing shared design tokens");
            if(data.navHeight<58||data.navHeight>80)faults.push(`Inconsistent header: ${data.navHeight}`);
            if(!data.legal)faults.push("Regulated-supply disclosure missing");
            if(data.mainLength<70)faults.push("Insufficient public page content");
            if(data.brokenImages.length)faults.push(`Broken images: ${data.brokenImages.slice(0,5).join(" / ")}`);
            if(data.clippedControls.length)faults.push(`Form controls clipped by viewport: ${JSON.stringify(data.clippedControls)}`);
            if(errors.length)faults.push(`JavaScript console: ${errors.slice(0,4).join(" / ")}`);
            if(errorsFromNetwork.length)faults.push(`Failed requests: ${errorsFromNetwork.slice(0,4).join(" / ")}`);
            if(route==="/"&&!data.h1Text.includes("Where it needs to be"))faults.push("Homepage proposition missing");
            if(route==="/"&&vp.width>=1440){
              const nav=data.homeNavLabel;
              if(!nav||nav.before!=='"Intelligence"'||nav.after!=='""')
                faults.push(`Homepage Intelligence label uses incorrect pseudo-element: ${JSON.stringify(nav)}`);
              if(nav&&nav.contactLeft<nav.right-1)
                faults.push(`Homepage Intelligence and Contact links overlap: ${JSON.stringify(nav)}`);
            }
            if(route==="/contact/"&&data.managedContactBorders&&data.managedContactBorders.input!=="0px")
              faults.push(`Contact form renders nested input outlines: ${JSON.stringify(data.managedContactBorders)}`);
            records.push({route,viewport:vp.name,status,...data,issues:faults});
            for(const detail of faults)findings.push({route,viewport:vp.name,detail});
          } catch(e) {
            findings.push({route,viewport:vp.name,detail:`Browser error: ${String(e)}`});
          } finally {await page.close();}
        }
      } finally {await context.close();}
    }
  } finally {await browser.close();}
  await writeFile(`${artifactDir}/sitewide-audit.json`,`${JSON.stringify({routeCount:routes.length,viewports:viewports.map(x=>x.name),findings,records},null,2)}\n`);
  const md=[
    "# NovaPharm public corporate design-system acceptance",
    `All ${routes.length} unique routes checked across compact mobile, mobile, tablet and desktop widths.`,
    `Findings: ${findings.length}`,
    "",
    "| Route | Viewport | Finding |",
    "|---|---|---|",
    ...findings.map(x=>`| ${x.route} | ${x.viewport} | ${x.detail.replaceAll("|","/").slice(0,200)} |`),
    "",
    "The existing cross-engine axe acceptance remains a separate gate."
  ];
  await writeFile(`${artifactDir}/summary.md`,`${md.join("\n")}\n`);
  console.log(JSON.stringify({routes:routes.length,checks:routes.length*viewports.length,findings:findings.length,first:findings.slice(0,24)},null,2));
  if(findings.length)process.exitCode=1;
}
audit().catch(e=>{console.error(e);process.exitCode=1});
