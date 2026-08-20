import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium, webkit } from "playwright";

const baseUrl = process.env.PUBLIC_PAGES_BASE_URL ?? "http://127.0.0.1:4310";
const artifactRoot = path.resolve(process.env.PUBLIC_PAGES_BROWSER_ARTIFACT_ROOT ?? "artifacts/public-pages-browser");
const routes = [
  { path: "/", name: "home", required: "Medicine. Where it needs to be" },
  { path: "/leadership/", name: "leadership", required: "Chief Scientific Officer" },
  { path: "/leadership/girish-achliya/", name: "leadership-girish", required: "Chief Scientific Officer" },
  { path: "/regulatory-services/", name: "regulatory-dossier", required: "Regulatory readiness before regulated activity." },
  { path: "/services/", name: "services", required: "Services" },
  { path: "/oncology/", name: "oncology", required: "Oncology" },
  { path: "/cro/", name: "cro", required: "Clinical" },
  { path: "/technology/", name: "technology", required: "Technology" }
];
const routeViewports = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 900 }
];
const homeGeometryViewports = [
  { name: "compact-320", width: 320, height: 720 },
  { name: "mobile-360", width: 360, height: 800 },
  { name: "mobile-375", width: 375, height: 812 },
  { name: "mobile-414", width: 414, height: 896 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "tablet-820", width: 820, height: 1180 },
  { name: "tablet-1024", width: 1024, height: 768 },
  { name: "desktop-1280", width: 1280, height: 800 },
  { name: "desktop-1366", width: 1366, height: 768 },
  { name: "desktop-1512", width: 1512, height: 982 },
  { name: "desktop-1728", width: 1728, height: 1117 },
  { name: "desktop-1920", width: 1920, height: 1080 },
  { name: "desktop-2560", width: 2560, height: 1440 }
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
let geometryRuns = 0;

async function dismissConsent(page) {
  const reject = page.locator("[data-consent-action='reject']:visible").first();
  if (await reject.count()) {
    await reject.click();
    await reject.waitFor({ state: "hidden", timeout: 5_000 });
  }
}

async function materialiseLazyMedia(page) {
  const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  for (let y = 0; y < documentHeight; y += Math.max(320, Math.floor(viewportHeight * 0.8))) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
    await page.waitForTimeout(35);
  }
  await page.evaluate(() => {
    for (const image of document.images) {
      if (!image.complete) image.loading = "eager";
    }
  });
  await page.waitForFunction(
    () => [...document.images].every((image) => image.complete),
    undefined,
    { timeout: 15_000 }
  );
  await page.evaluate(async () => {
    await Promise.all([...document.images].map(async (image) => {
      if (typeof image.decode === "function" && image.naturalWidth > 0) {
        await image.decode().catch(() => undefined);
      }
    }));
  });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(100);
}

async function inspectLayout(page) {
  return page.evaluate(() => {
    const midWordBreaks = [];
    for (const heading of document.querySelectorAll("main h1, main h2")) {
      const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        const value = node.textContent ?? "";
        let previousTop;
        for (let index = 0; index < value.length; index += 1) {
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + 1);
          const rect = range.getBoundingClientRect();
          if (
            previousTop !== undefined &&
            Math.abs(rect.top - previousTop) > 2 &&
            /[\p{L}\p{N}]/u.test(value[index - 1] ?? "") &&
            /[\p{L}\p{N}]/u.test(value[index] ?? "")
          ) {
            midWordBreaks.push(heading.textContent?.trim() ?? "");
            break;
          }
          if (rect.width || rect.height) previousTop = rect.top;
        }
        node = walker.nextNode();
      }
    }
    return {
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      mainText: (document.querySelector("main")?.textContent ?? "").trim(),
      brokenImages: [...document.images]
        .filter((image) => image.complete && image.naturalWidth === 0)
        .map((image) => image.currentSrc || image.src),
      unloadedImages: [...document.images]
        .filter((image) => !image.complete)
        .map((image) => image.currentSrc || image.src),
      midWordBreaks: [...new Set(midWordBreaks)]
    };
  });
}

async function assertLayout(page, label) {
  const layout = await inspectLayout(page);
  assert.ok(layout.mainText.length > 80, `${label}: main content is unexpectedly blank`);
  assert.ok(
    layout.documentWidth <= layout.viewportWidth + 2,
    `${label}: horizontal overflow ${layout.documentWidth} > ${layout.viewportWidth}`
  );
  assert.deepEqual(layout.brokenImages, [], `${label}: broken images found`);
  assert.deepEqual(layout.unloadedImages, [], `${label}: images did not finish loading`);
  assert.deepEqual(layout.midWordBreaks, [], `${label}: headings wrap inside a word`);
}

for (const [engineName, browserType] of engines) {
  const browser = await browserType.launch({ headless: true });
  try {
    for (const viewport of routeViewports) {
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
            await dismissConsent(page);
            await materialiseLazyMedia(page);
            const bodyText = (await page.locator("body").innerText()).replace(/\s+/g, " ");
            assert.ok(bodyText.includes(route.required), `${engineName} ${viewport.name} ${route.path}: required page marker missing`);

            await assertLayout(page, `${engineName} ${viewport.name} ${route.path}`);
            assert.deepEqual(failedResources, [], `${engineName} ${viewport.name} ${route.path}: failed subresources`);
            assert.deepEqual(consoleErrors, [], `${engineName} ${viewport.name} ${route.path}: console errors`);

            if (route.name === "leadership" || route.name === "leadership-girish") {
              assert.equal(bodyText.includes("Chief Technical Director"), false, `${engineName} ${viewport.name} ${route.path}: superseded Dr Girish title is visible`);
              const typography = await page.evaluate(() => {
                const h1 = document.querySelector("main h1");
                const h1Style = h1 ? getComputedStyle(h1) : null;
                return {
                  contract: getComputedStyle(document.documentElement).getPropertyValue("--leadership-apple-contract").trim(),
                  bodyFontFamily: getComputedStyle(document.body).fontFamily,
                  h1FontWeight: h1Style?.fontWeight ?? "",
                  h1LineHeight: h1Style?.lineHeight ?? ""
                };
              });
              assert.equal(typography.contract, "1", `${engineName} ${viewport.name} ${route.path}: leadership presentation contract missing`);
              assert.ok(typography.bodyFontFamily.includes("-apple-system"), `${engineName} ${viewport.name} ${route.path}: system-font stack missing`);
              assert.equal(typography.h1FontWeight, "600", `${engineName} ${viewport.name} ${route.path}: heading weight must be semibold 600`);
            }

            if (route.name === "leadership") {
              const expectedPortraits = [
                ["vishal-chakravarty-1200.jpg", /vishal-chakravarty-(?:480|800|1200)\.(?:avif|webp|jpg)$/, 1],
                ["prabhakar-lahare-960.jpg", /prabhakar-lahare-(?:480|768|960)\.(?:avif|webp|jpg)$/, 0.8],
                ["girish-achliya-960.jpg", /girish-achliya-(?:480|768|960)\.(?:avif|webp|jpg)$/, 0.8]
              ];
              assert.equal(await page.locator(".leader-card").count(), 5, `${engineName} ${viewport.name}: leadership profile count changed unexpectedly`);
              for (const [filename, expectedSource, expectedAspectRatio] of expectedPortraits) {
                const portrait = page.locator(`.leader-card-media img[src$="/${filename}"]`);
                assert.equal(await portrait.count(), 1, `${engineName} ${viewport.name}: approved ${filename} leadership portrait missing`);
                const state = await portrait.evaluate((image) => {
                  const rect = image.getBoundingClientRect();
                  const style = getComputedStyle(image);
                  return {
                    naturalWidth: image.naturalWidth,
                    naturalHeight: image.naturalHeight,
                    currentSrc: image.currentSrc,
                    width: rect.width,
                    height: rect.height,
                    display: style.display,
                    visibility: style.visibility,
                    opacity: Number(style.opacity)
                  };
                });
                assert.ok(Math.abs((state.naturalWidth / state.naturalHeight) - expectedAspectRatio) < 0.01, `${engineName} ${viewport.name}: ${filename} aspect ratio changed`);
                assert.match(state.currentSrc, expectedSource, `${engineName} ${viewport.name}: ${filename} did not resolve through the governed responsive portrait set`);
                assert.ok(state.width > 180 && state.height > 220, `${engineName} ${viewport.name}: ${filename} portrait collapsed`);
                assert.notEqual(state.display, "none", `${engineName} ${viewport.name}: ${filename} is display:none`);
                assert.notEqual(state.visibility, "hidden", `${engineName} ${viewport.name}: ${filename} is hidden`);
                assert.ok(state.opacity > 0, `${engineName} ${viewport.name}: ${filename} is transparent`);
              }
            }

            if (route.name === "leadership-girish") {
              const portrait = page.locator('.profile-hero-media img[src$="/assets/media/leadership/girish-achliya-960.jpg"]');
              assert.equal(await portrait.count(), 1, `${engineName} ${viewport.name}: Dr Girish approved profile portrait missing`);
              const portraitState = await portrait.evaluate((image) => ({
                naturalWidth: image.naturalWidth,
                naturalHeight: image.naturalHeight,
                width: image.getBoundingClientRect().width,
                height: image.getBoundingClientRect().height
              }));
              assert.ok(Math.abs((portraitState.naturalWidth / portraitState.naturalHeight) - 0.8) < 0.01, `${engineName} ${viewport.name}: Dr Girish profile portrait aspect ratio changed`);
              assert.ok(portraitState.width > 180 && portraitState.height > 220, `${engineName} ${viewport.name}: Dr Girish profile portrait collapsed`);
              const schemaText = await page.locator('script[type="application/ld+json"]').allTextContents();
              assert.ok(schemaText.some((value) => value.includes('"jobTitle":"Chief Scientific Officer"')), `${engineName} ${viewport.name}: Dr Girish JSON-LD jobTitle is not Chief Scientific Officer`);
            }

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
              fullPage: false,
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

    for (const viewport of homeGeometryViewports) {
      const context = await browser.newContext({
        baseURL: baseUrl,
        viewport: { width: viewport.width, height: viewport.height },
        locale: "en-GB",
        reducedMotion: "reduce",
        colorScheme: "light"
      });
      const page = await context.newPage();
      try {
        const response = await page.goto("/", { waitUntil: "networkidle", timeout: 30_000 });
        assert.equal(response?.status(), 200, `${engineName} ${viewport.name} /: navigation failed`);
        await page.locator("main").waitFor({ state: "visible", timeout: 15_000 });
        await dismissConsent(page);
        await materialiseLazyMedia(page);
        await assertLayout(page, `${engineName} ${viewport.name} /`);
        geometryRuns += 1;
      } finally {
        await page.close();
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}

console.log(`Public Pages rendered acceptance passed: ${screenshots} curated viewport screenshots, ${axeRuns} Axe runs and ${geometryRuns} additional homepage geometry checks across Chromium + WebKit. Lazy media was materialised, consent was dismissed for visual evidence, headings did not split inside words, Leadership portrait/title evidence and Regulatory dossier media remained visible, and no route overflowed horizontally.`);
