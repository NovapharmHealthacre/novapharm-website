import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium, webkit } from "playwright";

const baseUrl = process.env.PUBLIC_PAGES_BASE_URL ?? "http://127.0.0.1:4310";
const artifactRoot = path.resolve(process.env.PUBLIC_PAGES_BROWSER_ARTIFACT_ROOT ?? "artifacts/public-pages-browser");
const routes = [
  { path: "/", name: "home", required: "Pharmaceutical supply, built around evidence." },
  { path: "/regulatory-services/", name: "regulatory-dossier", required: "Regulatory readiness before regulated activity." },
  { path: "/services/", name: "services", required: "Services" },
  { path: "/oncology/", name: "oncology", required: "Oncology" },
  { path: "/cro/", name: "cro", required: "Clinical" },
  { path: "/technology/", name: "technology", required: "Technology" }
];
const viewports = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "mobile-390", width: 390, height: 844 }
];
const engines = [
  ["chromium", chromium],
  ["webkit", webkit]
];

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/`, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
    } catch {
      // static server is still starting
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Static public server did not become ready at ${baseUrl}`);
}

await waitForServer();
let screenshots = 0;
let axeRuns = 0;

for (const [engineName, browserType] of engines) {
  const browser = await browserType.launch({ headless: true });
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        baseURL: baseUrl,
        viewport: { width: viewport.width, height: viewport.height },
        locale: "en-GB",
        reducedMotion: "reduce",
        colorScheme: "light"
      });
      try {
        for (const route of routes) {
          const page = await context.newPage();
          const consoleErrors = [];
          const failedResources = [];
          page.on("console", (message) => {
            if (message.type() === "error") consoleErrors.push(message.text());
          });
          page.on("pageerror", (error) => consoleErrors.push(error.message));
          page.on("response", (response) => {
            if (response.status() >= 400 && !response.request().isNavigationRequest()) {
              failedResources.push(`${response.status()} ${response.url()}`);
            }
          });
          try {
            const response = await page.goto(route.path, { waitUntil: "networkidle", timeout: 30_000 });
            assert.equal(response?.status(), 200, `${engineName} ${viewport.name} ${route.path}: navigation failed`);
            await page.locator("main").waitFor({ state: "visible", timeout: 15_000 });
            const bodyText = (await page.locator("body").innerText()).replace(/\s+/g, " ");
            assert.ok(bodyText.includes(route.required), `${engineName} ${viewport.name} ${route.path}: required page marker missing`);

            const layout = await page.evaluate(() => ({
              viewportWidth: document.documentElement.clientWidth,
              documentWidth: document.documentElement.scrollWidth,
              mainText: (document.querySelector("main")?.textContent ?? "").trim(),
              brokenImages: [...document.images]
                .filter((image) => image.complete && image.naturalWidth === 0)
                .map((image) => image.currentSrc || image.src)
            }));
            assert.ok(layout.mainText.length > 80, `${engineName} ${viewport.name} ${route.path}: main content is unexpectedly blank`);
            assert.ok(
              layout.documentWidth <= layout.viewportWidth + 2,
              `${engineName} ${viewport.name} ${route.path}: horizontal overflow ${layout.documentWidth} > ${layout.viewportWidth}`
            );
            assert.deepEqual(layout.brokenImages, [], `${engineName} ${viewport.name} ${route.path}: broken images found`);
            assert.deepEqual(failedResources, [], `${engineName} ${viewport.name} ${route.path}: failed subresources`);
            assert.deepEqual(consoleErrors, [], `${engineName} ${viewport.name} ${route.path}: console errors`);

            if (route.name === "regulatory-dossier") {
              const dossier = page.locator('img[src*="regulatory-dossier-control"]');
              assert.equal(await dossier.count(), 1, `${engineName} ${viewport.name}: dossier hero image missing`);
              const dossierState = await dossier.evaluate((image) => {
                const style = getComputedStyle(image);
                const rect = image.getBoundingClientRect();
                return {
                  display: style.display,
                  visibility: style.visibility,
                  opacity: Number(style.opacity),
                  width: rect.width,
                  height: rect.height,
                  naturalWidth: image.naturalWidth,
                  naturalHeight: image.naturalHeight
                };
              });
              assert.notEqual(dossierState.display, "none", `${engineName} ${viewport.name}: dossier image is display:none`);
              assert.notEqual(dossierState.visibility, "hidden", `${engineName} ${viewport.name}: dossier image is hidden`);
              assert.ok(dossierState.opacity > 0, `${engineName} ${viewport.name}: dossier image is transparent`);
              assert.ok(dossierState.width > 100 && dossierState.height > 100, `${engineName} ${viewport.name}: dossier image collapsed`);
              assert.ok(dossierState.naturalWidth > 0 && dossierState.naturalHeight > 0, `${engineName} ${viewport.name}: dossier image did not decode`);
              assert.equal(await page.locator(".regulatory-stage-grid").count(), 1, `${engineName} ${viewport.name}: regulatory stage grid missing`);
              assert.equal(await page.locator(".regulatory-control-stage").count() > 0, true, `${engineName} ${viewport.name}: regulatory control stages missing`);
            }

            const axe = await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
              .analyze();
            axeRuns += 1;
            const serious = axe.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
            assert.deepEqual(
              serious.map((item) => `${item.id}: ${item.help}`),
              [],
              `${engineName} ${viewport.name} ${route.path}: serious/critical accessibility violations`
            );

            const directory = path.join(artifactRoot, engineName, viewport.name);
            await mkdir(directory, { recursive: true });
            await page.screenshot({
              path: path.join(directory, `${route.name}.png`),
              fullPage: true,
              animations: "disabled"
            });
            screenshots += 1;
          } finally {
            await page.close();
          }
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}

console.log(`Public Pages rendered acceptance passed: ${screenshots} screenshots, ${axeRuns} Axe runs, Chromium + WebKit, desktop + mobile, including visible Regulatory dossier media and no horizontal overflow.`);
