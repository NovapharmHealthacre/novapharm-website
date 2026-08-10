import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium, webkit } from "playwright";

const phase = process.argv[2];
if (!new Set(["before", "after"]).has(phase)) {
  throw new Error("Usage: node scripts/programme/capture-products-visual-evidence.mjs <before|after>");
}

const baseUrl = process.env.VISUAL_BASE_URL ?? "http://127.0.0.1:4178";
const evidenceRoot = path.resolve("audit/evidence/final-visual-lock/products", phase);
const viewports = Object.freeze([
  { label: "mobile-390x844", width: 390, height: 844 },
  { label: "tablet-768x1024", width: 768, height: 1024 },
  { label: "desktop-1366x768", width: 1366, height: 768 },
  { label: "desktop-1440x900", width: 1440, height: 900 },
  { label: "desktop-1920x1080", width: 1920, height: 1080 },
]);

const engines = Object.freeze([
  ["chromium", chromium],
  ["webkit", webkit],
]);

const records = [];

for (const [engineName, engine] of engines) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      const response = await page.goto(`${baseUrl}/product-portfolio/`, { waitUntil: "networkidle" });
      if (!response?.ok()) throw new Error(`${engineName} ${viewport.label}: Products returned ${response?.status()}`);
      await page.evaluate(async () => {
        document.documentElement.style.scrollBehavior = "auto";
        await document.fonts.ready;
      });
      const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < scrollHeight; y += viewport.height) {
        await page.evaluate((top) => window.scrollTo(0, top), y);
        await page.waitForTimeout(100);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForFunction(
        () => [...document.querySelectorAll("[data-reveal]")].every((element) => element.classList.contains("is-visible")),
        undefined,
        { timeout: 3_000 },
      );
      await page.waitForTimeout(750);
      await page.waitForFunction(
        () => [...document.images].every((image) => image.complete),
        undefined,
        { timeout: 10_000 },
      ).catch(() => undefined);

      const concealedReveals = await page.locator("[data-reveal]").evaluateAll((elements) =>
        elements.filter((element) => Number.parseFloat(getComputedStyle(element).opacity) < 0.99).length,
      );
      if (concealedReveals > 0) {
        throw new Error(`${engineName} ${viewport.label}: ${concealedReveals} reveal section(s) remained visually concealed`);
      }

      const bodyText = await page.locator("body").innerText();
      const occurrenceCount = (bodyText.match(/Food Supplement Portfolio Review/gi) ?? []).length;
      const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      if (horizontalOverflow) throw new Error(`${engineName} ${viewport.label}: horizontal overflow detected`);

      if (phase === "after") {
        if (occurrenceCount !== 1) throw new Error(`${engineName} ${viewport.label}: expected one Food Supplement Portfolio Review, found ${occurrenceCount}`);
        const order = await page.locator("main > section").evaluateAll((sections) => sections.map((section) => ({
          id: section.id,
          text: section.textContent?.trim().slice(0, 160) ?? "",
        })));
        if (!order[1]?.text.includes("Food Supplement Portfolio Review")) {
          throw new Error(`${engineName} ${viewport.label}: portfolio review is not the first section after the page hero`);
        }
      }

      const directory = path.join(evidenceRoot, engineName);
      await mkdir(directory, { recursive: true });
      const filename = `${viewport.label}.png`;
      await page.screenshot({ path: path.join(directory, filename), fullPage: true, animations: "disabled" });
      records.push({ engine: engineName, viewport, filename: `${engineName}/${filename}`, occurrenceCount, horizontalOverflow });
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

await mkdir(evidenceRoot, { recursive: true });
await writeFile(path.join(evidenceRoot, "manifest.json"), `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  phase,
  sourceUrl: `${baseUrl}/product-portfolio/`,
  renderedEvidence: true,
  generatedMockup: false,
  records,
}, null, 2)}\n`);

console.log(`Captured ${records.length} ${phase} Products screenshots in ${evidenceRoot}`);
