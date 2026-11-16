import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium, webkit } from "playwright";
import AxeBuilder from "@axe-core/playwright";

/**
 * All-route geometry and serious/critical WCAG 2.2 Axe census (Chromium).
 * Detailed business-flow and cross-engine accessibility acceptance remain in
 * test-public-pages-browser.mjs and test-intelligence-accessibility-browser.mjs.
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
  // 320px reflow models 400% desktop zoom; 390px mobile, 1440px desktop.
  // Detailed spot tests also cover tablet and curated keyboard interactions.
  { engine: "chromium", browser: chromium, width: 320, height: 720, scale: 2 },
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
          // The marketplace inserts its first 24 catalogue cards only after a
          // validated asynchronous fetch. Waiting for DOMContentLoaded alone can
          // mark their subsequently inserted lazy images as stalled, even when
          // the catalogue and assets are healthy. Keep fail-closed: if the cards
          // do not materialise, this route's browser check must fail.
          if (route === "/products/marketplace/") {
            await page.waitForFunction(() =>
              document.querySelectorAll("[data-commerce-marketplace] .mp-card").length === 24,
              undefined, { timeout: 15000 }
            );
          }
          // Materialise native lazy assets for the actual image audit, including
          // pictures whose preferred AVIF/WebP source is chosen by the browser.
          await page.evaluate(() => {
            for (const img of document.images) {
              if (img.getAttribute("src")?.startsWith("/assets/")) img.loading = "eager";
            }
          });
          // The 392-item marketplace can issue many local catalogue previews at
          // once after we intentionally promote lazy assets to eager. Allow that
          // one large generated route a longer bounded settle period, but keep
          // the exact same broken-image and still-loading-image failures below.
          const imageReadinessMs = route === "/products/marketplace/" ? 30000 : 10000;
          await page.waitForFunction(() =>
            [...document.images].filter(img => img.getAttribute("src")?.startsWith("/assets/"))
              .every(img => img.complete),
            undefined, {timeout:imageReadinessMs}
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
              // naturalWidth is density-corrected for responsive srcset picks.
              // Compare CSS pixels with the selected resource's *declared* pixel
              // width instead, retaining naturalWidth as the no-srcset fallback.
              // This is an advisory; exact encoded dimensions need asset checks.
              const srcsets = [
                img.getAttribute("srcset"),
                ...[...(img.closest("picture")?.querySelectorAll("source[srcset]") ?? [])]
                  .map((source) => source.getAttribute("srcset"))
              ].filter(Boolean);
              let selectedDescriptor = null;
              for (const srcset of srcsets) {
                for (const candidate of srcset.split(",")) {
                  const match = candidate.trim().match(/^(\S+)\s+(\d+(?:\.\d+)?)(w|x)$/i);
                  if (!match) continue;
                  try {
                    if (new URL(match[1], location.href).href === src) {
                      selectedDescriptor = {value:Number(match[2]),unit:match[3].toLowerCase()};
                      break;
                    }
                  } catch { /* Ignore malformed optional responsive candidates. */ }
                }
                if (selectedDescriptor) break;
              }
              const estimatedSourcePixelWidth = selectedDescriptor?.unit === "w"
                ? selectedDescriptor.value
                : selectedDescriptor?.unit === "x"
                  ? img.naturalWidth * selectedDescriptor.value
                  : img.naturalWidth;
              const local = src.startsWith(location.origin + "/assets/");
              const productPhoto = Boolean(img.closest(
                ".nx-product-visual, .nx-featured-image, .esco-product-visual"
              ));
              return {
                src:src.slice(0,220),
                local, visible:visibleMedia, complete:img.complete,
                naturalWidth:img.naturalWidth, naturalHeight:img.naturalHeight,
                estimatedSourcePixelWidth,
                sourcePixelWidthBasis:selectedDescriptor ? "srcset-descriptor" : "naturalWidth",
                width:Math.round(box.width), height:Math.round(box.height),
                objectFit:style.objectFit, productPhoto,
                missingAlt:!img.hasAttribute("alt"),
                stretched:visibleMedia && naturalRatio > 0 && renderedRatio > 0 &&
                  style.objectFit === "fill" && Math.abs(Math.log(naturalRatio / renderedRatio)) > .12,
                lowDensity:local && visibleMedia && estimatedSourcePixelWidth > 0 &&
                  estimatedSourcePixelWidth < box.width * Math.min(window.devicePixelRatio, 3) * .75
              };
            });
            return {
              viewport, documentWidth:document.documentElement.scrollWidth, mainLength:mainText.length,
              h1Count:headings.length, hasHeader:!!header, hasFooter:!!footer, offscreen, images
            };
          });
          // Check every sitemap route in Chromium; curated pages receive
          // separate cross-engine tests. Automated Axe is not a substitute for AT.
          const axe = engine === "chromium" && width === 390
            ? await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
            : null;
          const severeAxeFindings = (axe?.violations ?? [])
            .filter((violation) => ["serious", "critical"].includes(violation.impact))
            .flatMap((violation) => violation.nodes.map((node) =>
              `${violation.id}: ${violation.help} at ${node.target.join(", ")}`));
          const accessibility = {
            audited: Boolean(axe),
            axeViolations: axe?.violations.length ?? null,
            seriousCriticalFindings: severeAxeFindings
          };
          // Human review evidence for WCAG 2.2 2.5.8 and 2.4.11. Small inline
          // text links can satisfy exceptions, so raw dimensions are advisories.
          // Focus occlusion checks use real browser geometry after focus and
          // preserve a bounded set of examples for review instead of guessing.
          const inputAudit = engine === "chromium" && width === 390
            ? await page.evaluate(() => {
              const candidates = [...document.querySelectorAll(
                'a[href],button:not([disabled]),input:not([type=hidden]):not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex="0"]'
              )].filter((node) => {
                if (node.closest('[aria-hidden="true"],[hidden],.honeypot')) return false;
                const st = getComputedStyle(node);
                const r = node.getBoundingClientRect();
                return st.display !== "none" && st.visibility !== "hidden" && Number(st.opacity) > 0 && r.width > 0 && r.height > 0;
              });
              const smallTargets = candidates.filter((node) => {
                const box = node.getBoundingClientRect();
                return box.width < 24 || box.height < 24;
              }).slice(0, 20).map((node) => {
                const r = node.getBoundingClientRect();
                return {
                  tag: node.tagName.toLowerCase(),
                  text: (node.getAttribute("aria-label") || node.textContent || "").trim().slice(0, 70),
                  width: Math.round(r.width), height: Math.round(r.height),
                  inlineText: node.tagName === "A" && getComputedStyle(node).display === "inline"
                };
              });
              const occludedFocus = [];
              // Bounded representative keyboard-focus inspection. A desktop
              // screen reader still needs a separate manual release sign-off.
              for (const node of candidates.slice(0, 35)) {
                node.focus();
                if (document.activeElement !== node) continue;
                const r = node.getBoundingClientRect();
                const left = Math.max(r.left, 0), top = Math.max(r.top, 0);
                const right = Math.min(r.right, innerWidth), bottom = Math.min(r.bottom, innerHeight);
                if (left >= right || top >= bottom) {
                  occludedFocus.push({tag:node.tagName, text:(node.textContent||"").trim().slice(0,40), reason:"outside viewport"});
                  continue;
                }
                const points = [
                  [left+(right-left)*.5, top+(bottom-top)*.5],
                  [left+(right-left)*.2, top+(bottom-top)*.2],
                  [left+(right-left)*.8, top+(bottom-top)*.8]
                ];
                const visible = points.some(([x,y]) => {
                  const hit = document.elementFromPoint(x,y);
                  return hit && (node === hit || node.contains(hit));
                });
                if (!visible) occludedFocus.push({
                  tag:node.tagName, text:(node.getAttribute("aria-label")||node.textContent||"").trim().slice(0,50),
                  reason:"entirely covered by another rendered element"
                });
              }
              return {
                focusCandidates: candidates.length,
                smallTargetAdvisories: smallTargets,
                focusOcclusionCandidates: occludedFocus.slice(0,20)
              };
            })
            : null;
          const issues=[];
          if(response?.status()!==200) issues.push("HTTP "+(response?.status()??0));
          if(severeAxeFindings.length) issues.push(...severeAxeFindings.map((finding) => "WCAG Axe: " + finding));
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
            status:response?.status()??0,...result,lowDensity,accessibility,inputAudit,issues});
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
  auditedRoutes:records.filter(x=>x.accessibility.audited).length,
  targetAdvisories:records.reduce((sum,x)=>sum+(x.inputAudit?.smallTargetAdvisories.length??0),0),
  focusOcclusionAdvisories:records.reduce((sum,x)=>sum+(x.inputAudit?.focusOcclusionCandidates.length??0),0),
  highDensityAdvisories:records.reduce((sum,x)=>sum+x.lowDensity.length,0),
  findings:failures.length,first:failures.slice(0,20)},null,2));
if(failures.length)process.exitCode=1;
