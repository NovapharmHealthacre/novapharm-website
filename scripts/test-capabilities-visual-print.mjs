import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, webkit } from "playwright";
import sharp from "sharp";

const origin = process.env.CAPABILITIES_BASE_URL || "http://127.0.0.1:4310";
const root = resolve("artifacts/capabilities-visual-print");
await mkdir(root, { recursive: true });
const checks = [];

for (const [engine, browserType, width] of [
  ["chromium", chromium, 1440],
  ["chromium", chromium, 1024],
  ["chromium", chromium, 390],
  ["webkit", webkit, 1440],
  ["webkit", webkit, 390]
]) {
  const browser = await browserType.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    const response = await page.goto(origin + "/capabilities/", { waitUntil: "networkidle" });
    assert.equal(response?.status(), 200, engine + " " + width + " returns HTTP 200");
    await page.evaluate(async () => { await document.fonts.ready; });
    const observed = await page.evaluate(() => {
      const earth = document.querySelector(".ncap-earth-illustration");
      const vial = document.querySelector(".ncap-vial-illustration");
      const lines = [...document.querySelectorAll(".ncap-title-line")].map(el => el.getBoundingClientRect());
      return {
        titleLines: lines.length,
        separated: lines.length === 2 && lines[1].y > lines[0].y,
        cards: document.querySelectorAll(".ncap-discipline").length,
        columns: getComputedStyle(document.querySelector(".ncap-grid")).gridTemplateColumns.split(" ").filter(Boolean).length,
        earthLoaded: earth?.tagName === "IMG" && earth.complete && earth.naturalWidth > 0,
        vialLoaded: vial?.tagName === "IMG" && vial.complete && vial.naturalWidth > 0,
        noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2
      };
    });
    const expectedColumns = width > 1200 ? 4 : width > 720 ? 2 : 1;
    assert.equal(observed.columns, expectedColumns, engine + " " + width + " grid columns");
    assert.equal(observed.cards, 4, "Four capability disciplines");
    assert.equal(observed.titleLines, 2, "Two headline lines");
    assert.ok(observed.separated, "Headline is vertically separated");
    assert.ok(observed.earthLoaded && observed.vialLoaded, "Vial and Earth image pixels loaded");
    assert.ok(observed.noHorizontalOverflow, engine + " " + width + " no overflow");
    const prefix = engine + "-" + width;
    await page.screenshot({ path: resolve(root, prefix + ".png"), fullPage: true });
    if (width === 1440) {
      const png = await page.locator(".ncap-earth").screenshot();
      await writeFile(resolve(root, prefix + "-earth.png"), png);
      const resized = await sharp(png).resize({ width: 200 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      const { data, info } = resized;
      function avg(start, end) {
        let n = 0, sum = 0;
        for (let y = start; y < end; y++) for (let x = 0; x < info.width; x++) {
          const offset = (y * info.width + x) * info.channels;
          sum += (data[offset] + data[offset + 1] + data[offset + 2]) / 3; n++;
        }
        return sum / n;
      }
      const top = avg(0, Math.max(1, Math.floor(info.height * .08)));
      const bottom = avg(Math.floor(info.height * .88), info.height);
      assert.ok(top > bottom + 40, "Earth horizon must visibly transition from bright to dark");
      observed.earthContrast = { top, bottom };
    }
    if (engine === "chromium" && width === 1440) {
      await page.emulateMedia({ media: "print" });
      const printColumns = await page.locator(".ncap-grid").evaluate(el =>
        getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length);
      assert.equal(printColumns, 2, "Print grid must have two legible columns");
      const pdf = await page.pdf({
        path: resolve(root, "capabilities-A4.pdf"), format: "A4",
        printBackground: true, preferCSSPageSize: true
      });
      assert.ok(pdf.length > 15000, "A4 PDF must contain full visual content");
    }
    checks.push({ engine, viewportWidth: width, ...observed });
    await page.close();
  } finally {
    await browser.close();
  }
}
const html = await readFile("capabilities/index.html", "utf8");
assert.ok(!html.includes("<svg"), "Published HTML cannot contain inline SVG");
assert.ok((html.match(/data:image\/webp;base64,/g) || []).length >= 2,
  "Both illustrations must be WebP-embedded in the published HTML");
await writeFile(resolve(root, "checks.json"), JSON.stringify(checks, null, 2) + "\n");
console.log("Capabilities desktop, mobile, WebKit, Earth horizon, and A4 print acceptance passed.");
