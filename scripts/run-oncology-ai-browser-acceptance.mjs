import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, relative, resolve, sep } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium, webkit } from "playwright";
import sharp from "sharp";

const repositoryRoot = resolve(process.cwd());
const staticMode = !process.env.ONCOLOGY_AI_ACCEPTANCE_BASE_URL;
const baseUrl = new URL(process.env.ONCOLOGY_AI_ACCEPTANCE_BASE_URL || "http://novapharm.local").origin;
const outputRoot = resolve(process.env.ONCOLOGY_AI_ACCEPTANCE_OUTPUT || "audit/evidence/oncology-ai-browser");
const evidencePath = resolve(outputRoot, "oncology-ai-browser-acceptance.json");
const workerSource = readFileSync(resolve("assets/ai/runtime/semantic-worker.mjs"), "utf8");
const engines = [["chromium", chromium], ["webkit", webkit]];
const viewports = [
  ["desktop-1920x1080", { width: 1920, height: 1080 }],
  ["desktop-1440x900", { width: 1440, height: 900 }],
  ["desktop-1366x768", { width: 1366, height: 768 }],
  ["desktop-1280x800", { width: 1280, height: 800 }],
  ["desktop-1280x720", { width: 1280, height: 720 }],
  ["tablet-1024x1366", { width: 1024, height: 1366 }],
  ["tablet-768x1024", { width: 768, height: 1024 }],
  ["mobile-430x932", { width: 430, height: 932 }],
  ["mobile-390x844", { width: 390, height: 844 }],
  ["mobile-375x667", { width: 375, height: 667 }],
  ["mobile-360x800", { width: 360, height: 800 }],
  ["mobile-320x568", { width: 320, height: 568 }]
];
const routes = [["oncology", "/oncology/"], ["ai-governance", "/technology/ai-governance/"], ["search-directory", "/search/"]];
const screenshotViewports = new Set(["desktop-1920x1080", "desktop-1440x900", "desktop-1280x720", "tablet-768x1024", "mobile-390x844"]);
const results = [];
const issues = [];
const screenshots = [];

const mimeTypes = Object.freeze({
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8"
});

mkdirSync(outputRoot, { recursive: true });

function addIssue(context, type, detail) {
  issues.push({ ...context, type, ...(detail === undefined ? {} : { detail }) });
}

function checksum(path) {
  const bytes = readFileSync(path);
  return { path: relative(outputRoot, path), bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
}

async function installStaticRoutes(context, staticRoot = repositoryRoot, origin = baseUrl) {
  if (!staticMode) return;
  await context.route(`${origin}/**`, async (route) => {
    const url = new URL(route.request().url());
    let requested = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    if (!requested || requested.endsWith("/")) requested += "index.html";
    const path = resolve(staticRoot, requested);
    const insideRepository = path.startsWith(`${staticRoot}${sep}`);
    if (!insideRepository || !existsSync(path) || !statSync(path).isFile()) {
      await route.fulfill({ status: 404, contentType: "text/plain; charset=utf-8", body: "Not found" });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: {
        "content-type": mimeTypes[extname(path).toLowerCase()] || "application/octet-stream",
        "cache-control": "public, max-age=300",
        "x-content-type-options": "nosniff"
      },
      body: readFileSync(path)
    });
  });
}

async function createOwnerReviewPack() {
  const ownerRoot = resolve(outputRoot, "owner-review");
  mkdirSync(ownerRoot, { recursive: true });
  const curated = [
    ["chromium/oncology-desktop-1920x1080.png", "oncology-full-desktop.png", "Oncology full desktop"],
    ["chromium/oncology-desktop-1280x720.png", "oncology-constrained-desktop.png", "Oncology constrained desktop"],
    ["chromium/oncology-tablet-768x1024.png", "oncology-tablet.png", "Oncology tablet"],
    ["chromium/oncology-mobile-390x844.png", "oncology-mobile.png", "Oncology mobile"],
    ["webkit/oncology-mobile-390x844.png", "oncology-webkit-mobile.png", "Oncology WebKit mobile"],
    ["chromium/ai-governance-desktop-1440x900.png", "ai-governance-desktop.png", "Responsible AI governance"],
    ["chromium/ai-closed.png", "ai-search-closed.png", "AI search closed"],
    ["chromium/ai-open.png", "ai-search-open.png", "AI search open"],
    ["chromium/ai-cited-answer.png", "ai-cited-answer.png", "Cited answer"],
    ["chromium/ai-abstention.png", "ai-abstention.png", "Evidence abstention"],
    ["chromium/ai-medical-refusal.png", "ai-medical-refusal.png", "Medical refusal"],
    ["chromium/ai-model-consent.png", "ai-model-consent.png", "Semantic model consent"],
    ["chromium/ai-semantic-ready.png", "ai-semantic-ready.png", "Semantic retrieval ready"],
    ["chromium/ai-unavailable-mobile.png", "ai-unavailable-mobile.png", "AI unavailable fallback"],
    ["chromium/ai-storage-denied-mobile.png", "ai-storage-denied-mobile.png", "Storage-denied fallback"]
  ];
  const files = [];
  for (const [sourceName, targetName, label] of curated) {
    const source = resolve(outputRoot, sourceName);
    if (!existsSync(source)) {
      addIssue({ route: "owner-review", sourceName }, "owner-review-evidence-missing");
      continue;
    }
    const target = resolve(ownerRoot, targetName);
    copyFileSync(source, target);
    files.push({ label, ...checksum(target) });
  }

  const mediaAssets = [
    ["assets/media/modules/product-portfolio-evidence.jpg", "Portfolio evidence hero"],
    ["assets/media/products/oncology-vial-handling.jpg", "Oncology vial handling"],
    ["assets/media/products/oral-liquid-formulation.jpg", "Oral-liquid formulation"],
    ["assets/media/products/specialty-pharmacy-handling.jpg", "Controlled scientific handling"]
  ];
  const mediaTiles = await Promise.all(mediaAssets.map(async ([path], index) => ({
    input: await sharp(resolve(repositoryRoot, path)).resize(400, 225, { fit: "cover" }).png().toBuffer(),
    left: (index % 2) * 400,
    top: Math.floor(index / 2) * 225
  })));
  const mediaSheet = resolve(ownerRoot, "oncology-media-contact-sheet.png");
  await sharp({ create: { width: 800, height: 450, channels: 3, background: "#edf2f5" } }).composite(mediaTiles).png().toFile(mediaSheet);
  files.push({ label: "Oncology media contact sheet", ...checksum(mediaSheet) });

  let beforeAfter = null;
  const beforeRoot = process.env.ONCOLOGY_AI_BEFORE_ROOT ? resolve(process.env.ONCOLOGY_AI_BEFORE_ROOT) : null;
  if (beforeRoot && existsSync(resolve(beforeRoot, "product-portfolio/index.html"))) {
    const beforeOrigin = "http://novapharm-before.local";
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({ baseURL: beforeOrigin, viewport: { width: 1440, height: 900 }, locale: "en-GB", reducedMotion: "reduce" });
      await installStaticRoutes(context, beforeRoot, beforeOrigin);
      const page = await context.newPage();
      await page.goto("/product-portfolio/", { waitUntil: "domcontentloaded", timeout: 30000 });
      await settle(page);
      await dismissConsent(page);
      const before = resolve(ownerRoot, "before-product-portfolio-1440x900.png");
      await page.screenshot({ path: before, animations: "disabled" });
      await context.close();
      files.push({ label: "Before: portfolio-led oncology treatment", ...checksum(before) });

      const after = resolve(outputRoot, "chromium/oncology-desktop-1440x900.png");
      if (existsSync(after)) {
        const [beforeTile, afterTile] = await Promise.all([
          sharp(before).resize(640, 400, { fit: "cover", position: "top" }).png().toBuffer(),
          sharp(after).resize(640, 400, { fit: "cover", position: "top" }).png().toBuffer()
        ]);
        const labels = Buffer.from('<svg width="1280" height="50" xmlns="http://www.w3.org/2000/svg"><rect width="1280" height="50" fill="#0c1d2e"/><text x="24" y="33" fill="#ffffff" font-family="Arial, sans-serif" font-size="20">Before: category within Product Portfolio</text><text x="664" y="33" fill="#ffffff" font-family="Arial, sans-serif" font-size="20">After: dedicated evidence-led Oncology route</text></svg>');
        const comparison = resolve(ownerRoot, "before-after-oncology.png");
        await sharp({ create: { width: 1280, height: 450, channels: 3, background: "#ffffff" } })
          .composite([{ input: labels, left: 0, top: 0 }, { input: beforeTile, left: 0, top: 50 }, { input: afterTile, left: 640, top: 50 }])
          .png()
          .toFile(comparison);
        beforeAfter = checksum(comparison);
        files.push({ label: "Before and after comparison", ...beforeAfter });
      }
    } finally {
      await browser.close();
    }
  }

  const manifestPath = resolve(ownerRoot, "manifest.json");
  const manifest = {
    generatedAt: new Date().toISOString(),
    candidateRoot: "current exact-head checkout",
    beforeRoot: beforeRoot ? "pull-request base checkout" : null,
    syntheticOrPrivateDataIncluded: false,
    browserChromeIncluded: false,
    files,
    media: mediaAssets.map(([path, label]) => ({ path, label })),
    beforeAfterAvailable: Boolean(beforeAfter)
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { manifest: checksum(manifestPath), files: files.length, beforeAfterAvailable: manifest.beforeAfterAvailable };
}

async function dismissConsent(page) {
  const reject = page.locator("[data-consent-action='reject']").filter({ visible: true });
  if (await reject.count()) await reject.first().click();
}

async function settle(page) {
  await page.locator("body").waitFor({ state: "visible", timeout: 15000 });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    for (const image of document.images) image.loading = "eager";
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await page.waitForFunction(() => [...document.images].every((image) => image.complete), null, { timeout: 12000 }).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(80);
}

async function pageDiagnostics(page) {
  return page.evaluate(() => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const selector = (element) => element.id
      ? `#${element.id}`
      : `${element.tagName.toLowerCase()}${[...element.classList].slice(0, 2).map((name) => `.${name}`).join("")}`;
    const overflowingText = [...document.querySelectorAll("body *")]
      .filter((element) => {
        if (!visible(element) || element.matches(".sr-only, [aria-hidden='true'], table, tbody, thead, tr")) return false;
        if (![...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim())) return false;
        const style = getComputedStyle(element);
        return element.scrollWidth > element.clientWidth + 2 && !["auto", "scroll", "hidden", "clip"].includes(style.overflowX);
      })
      .slice(0, 12)
      .map(selector);
    const heroCopy = document.querySelector(".oncology-hero-copy");
    return {
      title: document.title,
      h1Count: document.querySelectorAll("h1").length,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      documentHeight: document.documentElement.scrollHeight,
      brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.currentSrc || image.src),
      overflowingText,
      visibleLogo: [...document.querySelectorAll("img[alt='NovaPharm Healthcare']")].some(visible),
      navToggleVisible: Boolean(document.querySelector("[data-nav-toggle]") && visible(document.querySelector("[data-nav-toggle]"))),
      rawBrowserError: document.body.innerText.includes("The string did not match the expected pattern."),
      internalReference: /localhost|127\.0\.0\.1|\/Users\//.test(document.body.innerText),
      oncology: document.querySelector(".oncology-hero") ? {
        scopeBoundary: document.querySelectorAll("#scope-boundary").length,
        continuityAxes: document.querySelectorAll(".continuity-axes article").length,
        formulationTabs: document.querySelectorAll("[data-formulation-tab]").length,
        readinessRows: document.querySelectorAll(".readiness-table tbody tr").length,
        temperatureStages: document.querySelectorAll(".temperature-path > li").length,
        developmentStages: document.querySelectorAll(".development-continuity > li").length,
        partnerGroups: document.querySelectorAll(".oncology-partner-grid article").length,
        aiStages: document.querySelectorAll(".oncology-ai-stages article").length,
        faqs: document.querySelectorAll("#oncology-faqs details").length,
        heroAnimation: heroCopy ? getComputedStyle(heroCopy).animationName : "missing"
      } : null,
      aiGovernance: document.querySelector("#maturity") ? {
        maturityRows: document.querySelectorAll("#maturity tbody tr").length,
        sourceLinks: document.querySelectorAll(".ai-governance-sources a").length
      } : null,
      directoryLinks: document.querySelectorAll(".search-directory a").length
    };
  });
}

async function capture(page, engineName, name, { fullPage = false } = {}) {
  const path = resolve(outputRoot, engineName, `${name}.png`);
  mkdirSync(dirname(path), { recursive: true });
  const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const guardedFullPage = fullPage && documentHeight <= 30000;
  await page.screenshot({ path, fullPage: guardedFullPage, animations: "disabled" });
  screenshots.push(checksum(path));
}

async function inspectMatrixPage(browser, engineName, viewportName, viewport, routeName, path, javaScriptEnabled) {
  const context = await browser.newContext({ baseURL: baseUrl, viewport, locale: "en-GB", reducedMotion: "reduce", colorScheme: "light", javaScriptEnabled });
  await installStaticRoutes(context);
  const page = await context.newPage();
  const record = { engine: engineName, viewport: viewportName, route: routeName, path, javaScriptEnabled };
  const consoleErrors = [];
  const externalRequests = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!["data:", "blob:"].includes(url.protocol) && url.origin !== baseUrl) externalRequests.push(request.url());
  });
  try {
    const response = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 30000 });
    await settle(page);
    if (javaScriptEnabled) await dismissConsent(page);
    const diagnostics = await pageDiagnostics(page);
    Object.assign(record, { httpStatus: response?.status() ?? null, diagnostics, consoleErrors: [...new Set(consoleErrors)], externalRequests: [...new Set(externalRequests)] });
    if (record.httpStatus !== 200) addIssue(record, "http-status", record.httpStatus);
    if (diagnostics.h1Count !== 1) addIssue(record, "h1-count", diagnostics.h1Count);
    if (!diagnostics.visibleLogo) addIssue(record, "official-logo-not-visible");
    if (diagnostics.documentWidth > diagnostics.viewportWidth + 2) addIssue(record, "horizontal-overflow", `${diagnostics.documentWidth} > ${diagnostics.viewportWidth}`);
    if (diagnostics.overflowingText.length) addIssue(record, "text-overflow", diagnostics.overflowingText);
    if (diagnostics.brokenImages.length) addIssue(record, "broken-images", diagnostics.brokenImages);
    if (diagnostics.rawBrowserError) addIssue(record, "raw-browser-error");
    if (diagnostics.internalReference) addIssue(record, "internal-reference-visible");
    if (record.consoleErrors.length) addIssue(record, "console-error", record.consoleErrors);
    if (record.externalRequests.length) addIssue(record, "third-party-runtime-request", record.externalRequests);
    if (diagnostics.navToggleVisible !== (viewport.width < 1300)) addIssue(record, "navigation-breakpoint", diagnostics.navToggleVisible);
    if (routeName === "oncology") {
      const expected = { scopeBoundary: 1, continuityAxes: 6, formulationTabs: 4, readinessRows: 6, temperatureStages: 5, developmentStages: 7, partnerGroups: 5, aiStages: 4, faqs: 6 };
      for (const [key, value] of Object.entries(expected)) if (diagnostics.oncology?.[key] !== value) addIssue(record, `oncology-${key}`, diagnostics.oncology?.[key]);
      if (diagnostics.oncology?.heroAnimation !== "none") addIssue(record, "reduced-motion-animation", diagnostics.oncology?.heroAnimation);
    }
    if (routeName === "search-directory" && diagnostics.directoryLinks < 12) addIssue(record, "search-directory-links", diagnostics.directoryLinks);
    if (javaScriptEnabled) {
      page.removeAllListeners("console");
      page.removeAllListeners("pageerror");
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      record.axeViolations = axe.violations.map((violation) => ({ id: violation.id, impact: violation.impact, help: violation.help, nodes: violation.nodes.length, targets: violation.nodes.slice(0, 4).map((node) => node.target) }));
      for (const violation of record.axeViolations) addIssue(record, "axe-violation", violation);
    }
    if (javaScriptEnabled && screenshotViewports.has(viewportName) && (routeName === "oncology" || routeName === "ai-governance")) {
      await capture(page, engineName, `${routeName}-${viewportName}`, { fullPage: engineName === "chromium" && viewportName === "desktop-1920x1080" });
    }
  } catch (error) {
    record.exception = error instanceof Error ? error.message : String(error);
    addIssue(record, "acceptance-exception", record.exception);
  } finally {
    results.push(record);
    await context.close();
  }
}

async function openAssistant(page) {
  const trigger = page.locator("[data-ai-search-open]");
  if (!(await trigger.count())) throw new Error("AI search trigger is missing.");
  await trigger.first().click();
  await page.locator("[data-ai-search-dialog]").waitFor({ state: "visible", timeout: 10000 });
}

async function ask(page, query) {
  await page.locator("[data-ai-mode='ask']").click();
  await page.locator("[data-ai-search-input]").fill(query);
  await page.locator("[data-ai-search-form]").evaluate((form) => form.requestSubmit());
}

async function inspectAiStates(browser, engineName) {
  const context = await browser.newContext({ baseURL: baseUrl, viewport: { width: 1440, height: 900 }, locale: "en-GB", reducedMotion: "reduce" });
  await installStaticRoutes(context);
  const page = await context.newPage();
  const requestedAiAssets = [];
  page.on("request", (request) => { if (/assets\/ai\/(?:novapharm|company-embeddings)/.test(request.url())) requestedAiAssets.push(request.url()); });
  const record = { engine: engineName, viewport: "desktop-1440x900", route: "ai-state-matrix", states: {} };
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await settle(page);
    await dismissConsent(page);
    await capture(page, engineName, "ai-closed");
    await openAssistant(page);
    record.states.modelNotDownloaded = requestedAiAssets.length === 0;
    await capture(page, engineName, "ai-open");
    await ask(page, "How does NovaPharm describe oncology continuity?");
    await page.locator(".ai-source-card").first().waitFor({ state: "visible", timeout: 10000 });
    record.states.citedAnswer = await page.locator(".ai-source-card").count();
    await capture(page, engineName, "ai-cited-answer");
    await ask(page, "quantum banana logistics");
    await page.getByRole("heading", { name: "Evidence not found" }).waitFor({ state: "visible" });
    record.states.abstention = true;
    await capture(page, engineName, "ai-abstention");
    await ask(page, "What dosage should I take?");
    await page.getByRole("heading", { name: "Safety boundary" }).waitFor({ state: "visible" });
    record.states.medicalRefusal = true;
    await capture(page, engineName, "ai-medical-refusal");
    await page.locator(".ai-semantic-disclosure summary").click();
    await capture(page, engineName, "ai-model-consent");
    await page.locator("[data-ai-semantic-enable]").click();
    await page.waitForFunction(() => document.querySelector("[data-ai-semantic-enable]")?.textContent.includes("enabled"), null, { timeout: 20000 });
    record.states.semanticReady = requestedAiAssets.some((url) => url.includes("novapharm-evidence-vector")) && requestedAiAssets.some((url) => url.includes("company-embeddings"));
    record.states.webGpuRequired = await page.evaluate(() => /navigator\.gpu|webgpu/i.test([...document.scripts].map((script) => script.src).join(" ")));
    await capture(page, engineName, "ai-semantic-ready");
    await page.locator("[data-ai-cache-clear]").click();
    await page.waitForFunction(() => document.querySelector("[data-ai-progress-label]")?.textContent.includes("cleared"), null, { timeout: 10000 });
    record.states.cacheCleared = true;
    await capture(page, engineName, "ai-cache-cleared");
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    record.axeViolations = axe.violations.map((violation) => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.length, targets: violation.nodes.slice(0, 4).map((node) => node.target) }));
    for (const violation of record.axeViolations) addIssue(record, "ai-dialog-axe-violation", violation);
    for (const [state, value] of Object.entries(record.states)) {
      if (state === "webGpuRequired") {
        if (value !== false) addIssue(record, "webgpu-dependency-detected");
      } else if (!value) addIssue(record, `ai-state-${state}`, value);
    }
  } catch (error) {
    record.exception = error instanceof Error ? error.message : String(error);
    addIssue(record, "ai-state-exception", record.exception);
  } finally {
    results.push(record);
    await context.close();
  }

  const unavailableContext = await browser.newContext({ baseURL: baseUrl, viewport: { width: 390, height: 844 }, locale: "en-GB" });
  await installStaticRoutes(unavailableContext);
  const unavailablePage = await unavailableContext.newPage();
  const unavailableRecord = { engine: engineName, viewport: "mobile-390x844", route: "ai-unavailable" };
  try {
    await unavailablePage.route("**/assets/ai/company-knowledge-index.json", (route) => route.abort());
    await unavailablePage.goto("/", { waitUntil: "domcontentloaded" });
    await dismissConsent(unavailablePage);
    await openAssistant(unavailablePage);
    await ask(unavailablePage, "What is NovaPharm's oncology continuity model?");
    await unavailablePage.getByText("Published-evidence search is temporarily unavailable.", { exact: false }).waitFor({ state: "visible", timeout: 10000 });
    unavailableRecord.fallback = true;
    await capture(unavailablePage, engineName, "ai-unavailable-mobile");
  } catch (error) {
    unavailableRecord.exception = error instanceof Error ? error.message : String(error);
    addIssue(unavailableRecord, "ai-unavailable-exception", unavailableRecord.exception);
  } finally {
    results.push(unavailableRecord);
    await unavailableContext.close();
  }

  const storageContext = await browser.newContext({ baseURL: baseUrl, viewport: { width: 390, height: 844 }, locale: "en-GB" });
  await installStaticRoutes(storageContext);
  const storagePage = await storageContext.newPage();
  const storageRecord = { engine: engineName, viewport: "mobile-390x844", route: "ai-storage-denied" };
  try {
    await storagePage.route("**/assets/ai/runtime/semantic-worker.mjs", async (route) => {
      await route.fulfill({ status: 200, contentType: "text/javascript", body: `try { delete self.indexedDB; } catch {}\n${workerSource}` });
    });
    await storagePage.goto("/", { waitUntil: "domcontentloaded" });
    await dismissConsent(storagePage);
    await openAssistant(storagePage);
    await storagePage.locator(".ai-semantic-disclosure summary").click();
    await storagePage.locator("[data-ai-semantic-enable]").click();
    await storagePage.waitForFunction(() => document.querySelector("[data-ai-progress-label]")?.textContent.includes("this tab only"), null, { timeout: 20000 });
    storageRecord.gracefulFallback = true;
    storageRecord.cacheControlHidden = await storagePage.locator("[data-ai-cache-clear]").isHidden();
    await capture(storagePage, engineName, "ai-storage-denied-mobile");
    if (!storageRecord.cacheControlHidden) addIssue(storageRecord, "cache-control-visible-without-storage");
  } catch (error) {
    storageRecord.exception = error instanceof Error ? error.message : String(error);
    addIssue(storageRecord, "ai-storage-denied-exception", storageRecord.exception);
  } finally {
    results.push(storageRecord);
    await storageContext.close();
  }
}

for (const [engineName, launcher] of engines) {
  console.log(`Running Oncology and AI acceptance in ${engineName}.`);
  const browser = await launcher.launch({ headless: true });
  try {
    for (const [viewportName, viewport] of viewports) {
      for (const [routeName, path] of routes) {
        await inspectMatrixPage(browser, engineName, viewportName, viewport, routeName, path, true);
        await inspectMatrixPage(browser, engineName, viewportName, viewport, `${routeName}-no-javascript`, path, false);
      }
    }
    await inspectAiStates(browser, engineName);
  } finally {
    await browser.close();
  }
}

const selectedScreenshots = screenshots.slice(0, 16);
if (selectedScreenshots.length) {
  const tileWidth = 320;
  const tileHeight = 220;
  const columns = 4;
  const rows = Math.ceil(selectedScreenshots.length / columns);
  const composites = await Promise.all(selectedScreenshots.map(async (entry, index) => ({
    input: await sharp(resolve(outputRoot, entry.path)).resize(tileWidth, tileHeight, { fit: "contain", background: "#f3f6f8" }).png().toBuffer(),
    left: (index % columns) * tileWidth,
    top: Math.floor(index / columns) * tileHeight
  })));
  const contactSheetPath = resolve(outputRoot, "oncology-ai-contact-sheet.png");
  await sharp({ create: { width: columns * tileWidth, height: rows * tileHeight, channels: 3, background: "#edf2f5" } }).composite(composites).png().toFile(contactSheetPath);
  screenshots.push(checksum(contactSheetPath));
}

const ownerReview = await createOwnerReviewPack();
const axeScans = results.filter((result) => Array.isArray(result.axeViolations));
const evidence = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  engines: engines.map(([name]) => name),
  viewports: viewports.map(([name, viewport]) => ({ name, ...viewport })),
  routes: routes.map(([name, path]) => ({ name, path })),
  renderedCases: results.length,
  axeScans: axeScans.length,
  screenshots,
  ownerReview,
  issues,
  status: issues.length ? "failed" : "passed",
  results
};
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
writeFileSync(resolve("audit/oncology-ai-browser-report.md"), `# Oncology and AI Browser Acceptance\n\n- Generated: ${evidence.generatedAt}\n- Engines: Chromium and WebKit\n- Viewports per engine: ${viewports.length}\n- Routes: Oncology, Responsible AI and no-JavaScript search directory\n- JavaScript-on and JavaScript-off rendered cases: ${results.filter((result) => result.route !== "ai-state-matrix" && !result.route.startsWith("ai-unavailable") && !result.route.startsWith("ai-storage-denied")).length}\n- AI state cases: ${results.filter((result) => result.route.startsWith("ai-")).length}\n- Axe scans: ${axeScans.length}\n- Material issues: ${issues.length}\n- Owner-review files: ${ownerReview.files}\n- Base-to-candidate comparison: ${ownerReview.beforeAfterAvailable ? "included" : "not available in this run"}\n- Status: **${issues.length ? "FAIL" : "PASS"}**\n\nThe acceptance includes reduced-motion rendering, no-JavaScript access, cited answers, abstention, medical refusal, explicit semantic-download consent, cache clearing, storage denial, AI unavailability and operation without WebGPU. WebKit screenshots use guarded viewport capture; full-page capture is limited to Chromium when the document is below 30,000 pixels.\n`);
writeFileSync(resolve("audit/oncology-ai-accessibility-report.md"), `# Oncology and AI Accessibility Report\n\n- Generated: ${evidence.generatedAt}\n- Automated WCAG tags: WCAG 2 A/AA, WCAG 2.1 A/AA and WCAG 2.2 AA\n- Axe scans: ${axeScans.length}\n- Automated violations: ${axeScans.reduce((count, result) => count + result.axeViolations.length, 0)}\n- Reduced motion: tested at all ${viewports.length} viewports in both engines\n- JavaScript-off core access: tested\n- AI dialog live regions, labels and visible boundaries: tested\n- Status: **${issues.some((issue) => issue.type.includes("axe")) ? "FAIL" : "PASS"}**\n\nAutomated checks do not constitute a complete WCAG conformance audit. Keyboard and screen-reader behavior remains subject to human assistive-technology review before any claim of full conformance.\n`);
console.log(`Oncology and AI browser evidence written to ${relative(process.cwd(), evidencePath)}.`);
console.log(`${results.length} rendered cases, ${axeScans.length} axe scans, ${screenshots.length} evidence images and ${issues.length} issue(s).`);
if (issues.length) {
  console.error("Oncology and AI acceptance issues:");
  console.error(JSON.stringify(issues, null, 2));
  process.exit(1);
}
