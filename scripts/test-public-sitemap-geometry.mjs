import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium, webkit } from "playwright";

/**
 * Lightweight all-route geometry census. Detailed accessibility, business-flow
 * and image acceptance stay in test-public-pages-browser.mjs.
 * No authentication, payments, emails, or external APIs are exercised.
 */
const baseUrl = process.env.PUBLIC_PAGES_BASE_URL ?? "http://127.0.0.1:4310";
const artifactRoot = path.resolve(process.env.PUBLIC_PAGES_BROWSER_ARTIFACT_ROOT ?? "artifacts/public-pages-browser");
const sitemap = await readFile("sitemap.xml", "utf8");
const siteRoutes = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((match) => new URL(match[1].trim()))
  .filter((url) => url.hostname === "novapharmhealthcare.com")
  .map((url) => url.pathname);
const extras = ["/products/esco/", "/products/marketplace/", "/products/esco/bag/", "/products/nutraxin/bag/"];
const routes = [...new Set([...siteRoutes, ...extras])];
if (siteRoutes.length < 50 || routes.length !== siteRoutes.length + extras.filter(x => !siteRoutes.includes(x)).length) {
  throw new Error("Public sitemap is unexpectedly incomplete or contains conflicting entries.");
}
const matrix = [
  // Two engines and two high-density contexts. Detailed spot tests cover tablet/1x.
  { engine: "chromium", browser: chromium, width: 390, height: 844, scale: 3 },
  { engine: "webkit", browser: webkit, width: 1440, height: 900, scale: 2 }
];
const failures = [];
const records = [];
await mkdir(artifactRoot, { recursive: true });
for (const {engine, browser: browserType, width, height, scale} of matrix) {
  const browser = await browserType.launch({headless:true});
  try {
    const context = await browser.newContext({viewport:{width,height},deviceScaleFactor:scale,reducedMotion:"reduce",colorScheme:"light"});
    try {
      for (const route of routes) {
        const page = await context.newPage();
        try {
          const response = await page.goto(baseUrl + route, {waitUntil:"domcontentloaded",timeout:30000});
          // Materialise native lazy assets for the actual image audit, including
          // pictures whose preferred AVIF/WebP source is chosen by the browser.
          await page.evaluate(() => {
            for (const img of document.images) {
              if (img.getAttribute("src")?.startsWith("/assets/")) img.loading = "eager";
            }
          });
          await page.waitForFunction(() =>
            [...document.images].filter(img => img.getAttribute("src")?.startsWith("/assets/"))
              .every(img => img.complete),
            undefined, {timeout:10000}
          ).catch(() => undefined);
          const result = await page.evaluate(() => {
            const viewport = document.documentElement.clientWidth;
            const main = document.querySelector("main");
            const headings = [...document.querySelectorAll("main h1")];
            const header = document.querySelector("header");
            const footer = document.querySelector("footer");
            const mainText = main?.textContent?.trim() ?? "";
            const visible = (element) => {
              if (element.closest('[aria-hidden="true"], .honeypot')) return false;
              const style = getComputedStyle(element);
              return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0;
            };
            const offscreen = [...document.querySelectorAll("main h1, main form input:not([type=hidden]), main form select, main form textarea, main form button")]
              .filter(visible)
              .filter((element) => {
                const box = element.getBoundingClientRect();
                return box.width > 0 && box.height > 0 && (box.left < -2 || box.right > viewport + 2);
              }).map((element) => element.tagName.toLowerCase() + ":" + (element.getAttribute("name") ?? element.textContent?.trim().slice(0,32) ?? ""));
            const images = [...document.images].map(img => {
              const style = getComputedStyle(img);
              const box = img.getBoundingClientRect();
              const naturalRatio = img.naturalWidth && img.naturalHeight
                ? img.naturalWidth / img.naturalHeight : 0;
              const renderedRatio = box.height ? box.width / box.height : 0;
              const visibleMedia = visible(img) && box.width > 1 && box.height > 1;
              const src = img.currentSrc || img.src;
              const local = src.startsWith(location.origin + "/assets/");
              const productPhoto = Boolean(img.closest(
                ".nx-product-visual, .nx-featured-image, .esco-product-visual"
              ));
              return {
                src:src.slice(0,220),
                local, visible:visibleMedia, complete:img.complete,
                naturalWidth:img.naturalWidth, naturalHeight:img.naturalHeight,
                width:Math.round(box.width), height:Math.round(box.height),
                objectFit:style.objectFit, productPhoto,
                missingAlt:!img.hasAttribute("alt"),
                stretched:visibleMedia && naturalRatio > 0 && renderedRatio > 0 &&
                  style.objectFit === "fill" && Math.abs(Math.log(naturalRatio / renderedRatio)) > .12,
                lowDensity:local && visibleMedia && img.naturalWidth > 0 &&
                  img.naturalWidth < box.width * Math.min(window.devicePixelRatio, 3) * .75
              };
            });
            return {
              viewport, documentWidth:document.documentElement.scrollWidth, mainLength:mainText.length,
              h1Count:headings.length, hasHeader:!!header, hasFooter:!!footer, offscreen, images
            };
          });
          const issues=[];
          if(response?.status()!==200) issues.push("HTTP "+(response?.status()??0));
          if(result.mainLength<50)issues.push("Missing or empty main content");
          if(result.h1Count!==1)issues.push("Expected one main heading; found "+result.h1Count);
          if(!result.hasHeader||!result.hasFooter)issues.push("Missing shared page chrome");
          if(result.documentWidth>result.viewport+2)issues.push("Horizontal document overflow: "+result.documentWidth+" > "+result.viewport);
          if(result.offscreen.length)issues.push("Visible controls/heading outside viewport: "+result.offscreen.join(", "));
          const broken = result.images.filter(img => img.local && img.complete && img.naturalWidth===0);
          const stalled = result.images.filter(img => img.local && !img.complete && img.visible);
          const distorted = result.images.filter(img => img.stretched);
          const croppedProducts = result.images.filter(img => img.productPhoto && img.visible && img.objectFit!=="contain");
          if(broken.length)issues.push("Broken local images: "+broken.map(x=>x.src).slice(0,8).join(", "));
          if(stalled.length)issues.push("Unloaded visible local images: "+stalled.map(x=>x.src).slice(0,8).join(", "));
          if(distorted.length)issues.push("Distorted images: "+distorted.map(x=>x.src).slice(0,8).join(", "));
          if(croppedProducts.length)issues.push("Product photography must use contain: "+croppedProducts.map(x=>x.src).slice(0,8).join(", "));
          if(result.images.some(img=>img.missingAlt))issues.push("Image missing explicit alt attribute");
          const lowDensity=result.images.filter(img=>img.lowDensity).map(img=>img.src).slice(0,12);
          records.push({route,engine,viewport:width,deviceScaleFactor:scale,
            status:response?.status()??0,...result,lowDensity,issues});
          for(const issue of issues) failures.push({route,engine,viewport:width,issue});
        } catch(error) {
          failures.push({route,engine,viewport:width,issue:String(error)});
        } finally {
          await page.close();
        }
      }
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
const summary = {routes:routes.length,checks:routes.length*matrix.length,failures,records};
await writeFile(path.join(artifactRoot,"public-sitemap-geometry.json"),JSON.stringify(summary,null,2)+"\n");
console.log(JSON.stringify({routes:routes.length,checks:summary.checks,
  imagesChecked:records.reduce((sum,x)=>sum+x.images.length,0),
  highDensityAdvisories:records.reduce((sum,x)=>sum+x.lowDensity.length,0),
  findings:failures.length,first:failures.slice(0,20)},null,2));
if(failures.length)process.exitCode=1;
