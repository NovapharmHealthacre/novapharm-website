import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { type BrowserType, chromium, type Page, webkit } from "playwright";

const baseUrl = process.env["TECHNOLOGY_BASE_URL"] ?? "http://127.0.0.1:4302";
const artifactRoot = path.join(process.cwd(), "..", "..", "artifacts", "technology-browser");
const viewports = Object.freeze([
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1920", width: 1920, height: 1080 },
  { name: "tablet-1024", width: 1024, height: 1366 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "mobile-375", width: 375, height: 667 },
]);
const routes = Object.freeze([
  "/",
  "/expertise/",
  "/sectors/",
  "/approach/",
  "/insights/",
  "/insights/approval-is-not-access/",
  "/insights/portfolio-resilience-before-sourcing/",
  "/insights/technology-transfer-is-governance/",
  "/about/",
  "/contact/",
  "/privacy/",
  "/terms/",
  "/acceptance-not-found/",
]);

interface Finding {
  readonly engine: string;
  readonly viewport: string;
  readonly route: string;
  readonly type: string;
  readonly detail: string;
}

const findings: Finding[] = [];
let screenshots = 0;
let accessibilityRuns = 0;

function routeName(route: string): string {
  return route === "/" ? "home" : route.replace(/^\//, "").replace(/\/$/, "").replaceAll("/", "--");
}

async function verifyPage(page: Page, engine: string, viewport: (typeof viewports)[number], route: string): Promise<void> {
  const consoleErrors: string[] = [];
  const failedResources: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400 && !response.request().isNavigationRequest()) failedResources.push(`${response.status()} ${response.url()}`);
  });
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle", timeout: 30_000 });
  assert.ok(response, `${engine} ${route}: no navigation response`);
  const expectedStatus = route === "/acceptance-not-found/" ? 404 : 200;
  assert.equal(response.status(), expectedStatus, `${engine} ${route}: unexpected response status`);
  await page.locator("main").waitFor({ state: "visible" });
  assert.equal(await page.locator("h1").count(), 1, `${engine} ${route}: expected exactly one H1`);
  const layout = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    blankMain: !(document.querySelector("main")?.textContent ?? "").trim(),
    brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.currentSrc || image.src),
  }));
  assert.equal(layout.blankMain, false, `${engine} ${route}: main content is blank`);
  assert.ok(layout.documentWidth <= layout.viewportWidth + 1, `${engine} ${route}: horizontal overflow`);
  assert.deepEqual(layout.brokenImages, [], `${engine} ${route}: broken image detected`);
  assert.deepEqual(failedResources, [], `${engine} ${route}: failed subresources`);
  const unexpectedErrors = expectedStatus === 404 ? consoleErrors.filter((message) => !message.includes("status of 404")) : consoleErrors;
  assert.deepEqual(unexpectedErrors, [], `${engine} ${route}: browser console errors`);
  if (route === "/" && viewport.name === "desktop-1440") {
    const canvasDataLength = await page.locator("canvas").evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL().length);
    assert.ok(canvasDataLength > 1_000, `${engine}: hero canvas is blank`);
  }
  const screenshotDirectory = path.join(artifactRoot, engine, viewport.name);
  await fs.mkdir(screenshotDirectory, { recursive: true });
  await page.screenshot({ path: path.join(screenshotDirectory, `${routeName(route)}.png`), animations: "disabled" });
  screenshots += 1;
  if (viewport.name === "desktop-1440" || viewport.name === "mobile-390") {
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    accessibilityRuns += 1;
    for (const violation of result.violations.filter((item) => item.impact === "serious" || item.impact === "critical")) {
      findings.push({ engine, viewport: viewport.name, route, type: `axe:${violation.id}`, detail: violation.help });
    }
  }
}

async function verifyInteractions(page: Page, engine: string): Promise<void> {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/expertise/`, { waitUntil: "networkidle" });
  const menu = page.locator("button.menu-toggle");
  assert.equal(await menu.getAttribute("aria-label"), "Open navigation", `${engine}: mobile menu is not labelled`);
  await menu.click();
  assert.equal(await menu.getAttribute("aria-expanded"), "true", `${engine}: mobile menu did not open`);
  await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "About" }).click();
  await page.waitForURL(/\/about\/$/);
  const restoredMenu = page.locator("button.menu-toggle");
  await restoredMenu.waitFor({ state: "visible" });
  assert.equal(await restoredMenu.getAttribute("aria-expanded"), "false", `${engine}: mobile menu did not close after navigation`);
  assert.equal(await restoredMenu.getAttribute("aria-label"), "Open navigation", `${engine}: mobile menu label was not restored`);

  await page.goto(`${baseUrl}/contact/`, { waitUntil: "networkidle" });
  await page.getByLabel("Your name").fill("Validation User");
  await page.getByLabel("Organisation").fill("Synthetic Validation Ltd");
  await page.getByLabel("Business email").fill("validation@example.com");
  await page.getByLabel("The decision").fill("Validate a controlled market-entry decision workflow.");
  await page.getByLabel("Context and constraints").fill("Synthetic, non-confidential validation information only.");
  assert.equal(await page.locator("form").evaluate((form) => (form as HTMLFormElement).checkValidity()), true);
  await page.getByText("No form data is uploaded to or stored by this website.").waitFor();
}

async function runEngine(name: string, browserType: BrowserType): Promise<void> {
  const browser = await browserType.launch({ headless: true });
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: "light",
        reducedMotion: "reduce",
      });
      try {
        for (const route of routes) {
          const page = await context.newPage();
          try {
            await verifyPage(page, name, viewport, route);
          } finally {
            await page.close();
          }
        }
      } finally {
        await context.close();
      }
      console.log(`${name}: completed ${viewport.name}`);
    }
    const context = await browser.newContext({ reducedMotion: "reduce" });
    try {
      await verifyInteractions(await context.newPage(), name);
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

await fs.rm(artifactRoot, { recursive: true, force: true });
await runEngine("chromium", chromium);
await runEngine("webkit", webkit);
const report = { generatedAt: new Date().toISOString(), baseUrl, viewports, routes, screenshots, accessibilityRuns, findings };
await fs.writeFile(path.join(artifactRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
assert.deepEqual(findings, [], `Serious or critical accessibility findings:\n${JSON.stringify(findings, null, 2)}`);
console.log(`Technology browser acceptance passed: ${screenshots} screenshots, ${accessibilityRuns} Axe runs, 2 engines.`);
