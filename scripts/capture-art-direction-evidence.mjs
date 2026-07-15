import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { chromium, webkit } from "playwright";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  const name = process.argv[index];
  const value = process.argv[index + 1];
  if (!name?.startsWith("--") || !value) throw new Error(`Invalid argument near ${name || "end of command"}.`);
  args.set(name.slice(2), value);
}

const baseUrl = new URL(args.get("base-url") || process.env.VISUAL_BASE_URL || "http://127.0.0.1:4178").origin;
const label = args.get("label") || "candidate";
const outputRoot = resolve(args.get("output") || `audit/evidence/art-direction/${label}`);
const requestedEngines = (args.get("engines") || "chromium").split(",").map((value) => value.trim()).filter(Boolean);
const engineRegistry = { chromium, webkit };
const viewports = [
  ["desktop-1440x900", { width: 1440, height: 900 }],
  ["mobile-390x844", { width: 390, height: 844 }]
];

const captures = [
  ["homepage-hero", "/", ".hero-flagship"],
  ["three-pillar-sourcing", "/", ".sourcing-story, .sourcing-portfolio"],
  ["partner-ecosystem", "/", ".partner-ecosystem-section"],
  ["about", "/about/", ".page-hero"],
  ["services", "/services/", ".page-hero"],
  ["regulatory", "/regulatory-services/", ".page-hero"],
  ["products", "/product-portfolio/", ".page-hero"],
  ["partners", "/partner-with-us/", ".page-hero"],
  ["technology", "/technology/", ".page-hero"],
  ["technology-architecture", "/technology/", ".technology-architecture-story"],
  ["insights", "/news-insights/", ".page-hero"],
  ["contact", "/contact/", ".page-hero"]
];

const consent = JSON.stringify({
  version: "2026-07-14-v1.1",
  id: "00000000-0000-4000-8000-000000000000",
  timestamp: new Date().toISOString(),
  categories: { necessary: true, preferences: false, analytics: false, marketing: false }
});

function fileMetadata(path) {
  const bytes = readFileSync(path);
  return {
    path: relative(resolve(process.cwd()), path),
    byteSize: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex")
  };
}

mkdirSync(outputRoot, { recursive: true });
const evidence = [];

for (const engineName of requestedEngines) {
  const engine = engineRegistry[engineName];
  if (!engine) throw new Error(`Unsupported browser engine: ${engineName}`);
  const browser = await engine.launch({ headless: true });
  try {
    for (const [viewportName, viewport] of viewports) {
      const context = await browser.newContext({ viewport, locale: "en-GB", reducedMotion: "reduce" });
      await context.addInitScript(({ value }) => localStorage.setItem("np_cookie_consent", value), { value: consent });
      const page = await context.newPage();
      for (const [captureId, route, selector] of captures) {
        const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
        if (!response || response.status() >= 400) throw new Error(`${route} returned ${response?.status() || "no response"}.`);
        await page.locator("body").waitFor({ state: "visible" });
        await page.evaluate(async () => {
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
          for (const element of document.querySelectorAll(".skip-link, [data-site-header], .site-header")) element.hidden = true;
          if (document.fonts?.ready) await document.fonts.ready;
          for (const image of document.images) image.loading = "eager";
        });
        await page.waitForFunction(() => [...document.images].every((image) => image.complete), null, { timeout: 10000 }).catch(() => {});
        const target = page.locator(selector);
        if (await target.count() !== 1) throw new Error(`${captureId} selector ${selector} is not unique.`);
        await target.scrollIntoViewIfNeeded();
        const path = resolve(outputRoot, engineName, viewportName, `${captureId}.jpg`);
        mkdirSync(dirname(path), { recursive: true });
        await target.screenshot({ path, type: "jpeg", quality: 82, animations: "disabled" });
        evidence.push({ label, engine: engineName, viewport: viewportName, captureId, route, selector, ...fileMetadata(path) });
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

const manifestPath = resolve(outputRoot, "manifest.json");
writeFileSync(manifestPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, label, captures: evidence }, null, 2)}\n`);
console.log(`Captured ${evidence.length} ${label} art-direction screenshots in ${outputRoot}.`);
