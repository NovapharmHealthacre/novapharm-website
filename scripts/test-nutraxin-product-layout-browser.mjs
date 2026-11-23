/**
 * Nutraxin 19-SKU responsive geometry and Safari/Chromium print-contract audit.
 * Static public candidate only: no payment creation, checkout or external writes.
 * Both Chromium and WebKit inspect every product at desktop, tablet and mobile.
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, webkit } from "playwright";

const origin = new URL(process.env.PUBLIC_PAGES_BASE_URL || "http://127.0.0.1:4310").origin;
const output = resolve(process.env.PUBLIC_PAGES_BROWSER_ARTIFACT_ROOT || "artifacts/public-pages-browser", "nutraxin-layout");
mkdirSync(output, { recursive: true });
const catalogue = JSON.parse(readFileSync("assets/data/nutraxin-retail-catalogue.json", "utf8"));
assert.equal(catalogue.products.length, 19, "Full governed Nutraxin range is required");

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 }
];
const results = [];
const failures = [];
const snapshots = new Set(["magnesium-daily-60-tablets", "collagen-gold-30-sachets"]);
const check = (condition, message) => { if (!condition) throw new Error(message); };

function observe() {
  const main = document.querySelector("main.npd-product-detail");
  if (!main) return { error: "Nutraxin product detail missing" };
  const hero = main.querySelector(".npd-product-hero-grid");
  const visual = main.querySelector(".npd-product-visual");
  const image = main.querySelector(".npd-product-visual picture img");
  const copy = main.querySelector(".npd-product-copy");
  const heading = copy?.querySelector("h1");
  const composition = main.querySelector(".npd-composition");
  const amounts = [...(composition?.querySelectorAll("dd") || [])];
  const rows = [...(composition?.querySelectorAll("div") || [])];
  if (!hero || !visual || !copy || !heading || !image || !composition || !rows.length) {
    return { error: "Product hero, pack or composition absent" };
  }
  const rect = el => {
    const box = el.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height,
      right: box.right, bottom: box.bottom };
  };
  return {
    viewport: innerWidth,
    hero: rect(hero), visual: rect(visual), image: rect(image),
    copy: rect(copy), heading: rect(heading),
    heroOverflow: hero.scrollWidth > hero.clientWidth + 3,
    imageLoaded: image.complete && image.naturalWidth > 0,
    imageFit: getComputedStyle(image).objectFit,
    headlineFont: Number.parseFloat(getComputedStyle(heading).fontSize),
    headlineLeading: Number.parseFloat(getComputedStyle(heading).lineHeight),
    systemFace: getComputedStyle(main).fontFamily,
    composition: rect(composition),
    rows: rows.map(row => ({ width: rect(row).width,
      overflow: row.scrollWidth > row.clientWidth + 3 })),
    amounts: amounts.map(dd => {
      const style = getComputedStyle(dd);
      const box = rect(dd);
      const lineHeight = Number.parseFloat(style.lineHeight);
      return { text: dd.textContent.trim(), height: box.height,
        width: box.width, scrollWidth: dd.scrollWidth, whiteSpace: style.whiteSpace,
        lineHeight };
    })
  };
}
function verify(m, route, mode, viewport) {
  const id = `${route} [${mode}/${viewport}]`;
  check(!m.error, `${id}: ${m.error}`);
  check(!m.heroOverflow, `${id}: horizontal hero overflow`);
  check(m.imageLoaded && m.imageFit === "contain", `${id}: pack image missing/cropped`);
  check(m.image.width > (mode === "print" ? 90 : 180) && m.image.height > 90,
    `${id}: pack image collapsed (${m.image.width}x${m.image.height})`);
  check(m.heading.width > 160 && m.headlineFont >= 27 && m.headlineLeading > m.headlineFont,
    `${id}: unreadable title`);
  check(m.rows.length === m.amounts.length && m.rows.length > 0,
    `${id}: missing composition values`);
  check(m.rows.every(row => !row.overflow), `${id}: composition table horizontal clipping`);
  check(m.amounts.every(a => a.whiteSpace === "nowrap" &&
    a.height <= a.lineHeight * 1.45 && a.scrollWidth <= a.width + 3),
    `${id}: ingredient amount wrapped or overflowed`);
  if (mode === "print" || viewport === "desktop") {
    check(m.visual.right <= m.copy.x + 5, `${id}: pack overlaps price/title`);
  } else {
    check(m.visual.bottom <= m.copy.y + 5, `${id}: pack should stack above product copy`);
  }
}

for (const [engineName, engine] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await engine.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 },
      colorScheme: "light", reducedMotion: "reduce" });
    const page = await context.newPage();
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.emulateMedia({ media: "screen" });
      for (const product of catalogue.products) {
        const route = `/products/nutraxin/${product.slug}/`;
        try {
          const response = await page.goto(origin + route, { waitUntil: "load", timeout: 20000 });
          check(response?.status() === 200, `${route}: HTTP ${response?.status()}`);
          await page.evaluate(() => document.fonts.ready);
          const metrics = await page.evaluate(observe);
          verify(metrics, route, "screen", viewport.name);
          results.push({ route, engine: engineName, viewport: viewport.name, pass: true });
          if (snapshots.has(product.slug) && viewport.name !== "tablet") {
            await page.screenshot({ path: resolve(output,
              `${product.slug}-${engineName}-${viewport.name}.png`), fullPage: true });
          }
          if (viewport.name === "desktop") {
            await page.emulateMedia({ media: "print" });
            const printable = await page.evaluate(observe);
            verify(printable, route, "print", viewport.name);
            results.push({ route, engine: engineName, viewport: "print", pass: true });
            if (engineName === "chromium" && snapshots.has(product.slug)) {
              await page.pdf({ path: resolve(output, `${product.slug}-chromium.pdf`),
                format: "A4", printBackground: true });
            }
            await page.emulateMedia({ media: "screen" });
          }
        } catch (error) {
          failures.push({ route, engine: engineName, viewport: viewport.name,
            error: String(error?.message || error) });
          if (failures.length < 5) {
            try { await page.screenshot({ path: resolve(output,
              `failure-${failures.length}-${engineName}.png`), fullPage: true }); } catch {}
          }
          await page.emulateMedia({ media: "screen" });
        }
      }
    }
    await context.close();
  } finally {
    await browser.close();
  }
}
const audit = { scope: "Nutraxin UK 19-product layout", engines: ["chromium", "webkit"],
  viewports: viewports.map(v => v.name).concat("print"), checksPassed: results.length,
  expectedChecks: 19 * 2 * 4, failures, results };
writeFileSync(resolve(output, "audit.json"), JSON.stringify(audit, null, 2) + "\n");
console.log(JSON.stringify({ products: 19, passed: results.length, expected: audit.expectedChecks,
  failures }, null, 2));
if (failures.length || results.length !== audit.expectedChecks) process.exitCode = 1;
