import assert from "node:assert/strict";
import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { type BrowserType, chromium, type Page, webkit } from "playwright";
import { articles } from "../data/articles";
import { corporatePages } from "../data/pages";
import { leadership } from "../data/site";

const productionOrigin = "https://novapharmhealthcare.com";
const artifactRoot = path.resolve(process.cwd(), "../../artifacts/corporate-browser");
const standaloneRoot = path.resolve(process.cwd(), ".next/standalone/apps/corporate");
const viewports = Object.freeze([
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1920", width: 1920, height: 1080 },
  { name: "tablet-1024", width: 1024, height: 1366 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "mobile-375", width: 375, height: 667 },
]);

const canonicalRoutes = Object.freeze([
  ...corporatePages.map((page) => page.slug ? `/${page.slug}/` : "/"),
  ...leadership.map((person) => `/leadership/${person.slug}/`),
  ...articles.map((article) => `/news-insights/${article.slug}/`),
]);
const routes = Object.freeze([...canonicalRoutes, "/acceptance-not-found/"]);

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
let serverProcess: ChildProcess | undefined;
let serverOutput = "";
let baseUrl = process.env.CORPORATE_BASE_URL ?? "";

function routeName(route: string): string {
  return route === "/" ? "home" : route.replace(/^\//, "").replace(/\/$/, "").replaceAll("/", "--");
}

async function reservePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Unable to reserve an acceptance-test port"));
        return;
      }
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

async function waitForServer(url: string): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (serverProcess?.exitCode !== null && serverProcess?.exitCode !== undefined) {
      throw new Error(`Corporate acceptance server exited early.\n${serverOutput}`);
    }
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status === 200) return;
    } catch {
      // The standalone server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Corporate acceptance server did not become ready.\n${serverOutput}`);
}

async function startServer(): Promise<void> {
  if (baseUrl) {
    await waitForServer(`${baseUrl}/`);
    return;
  }
  await fs.access(path.join(standaloneRoot, "server.js"));
  const port = await reservePort();
  baseUrl = `http://127.0.0.1:${port}`;
  serverProcess = spawn(process.execPath, ["server.js"], {
    cwd: standaloneRoot,
    env: {
      ...process.env,
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
      PUBLIC_INDEXABLE: "false",
      PORTAL_ORIGIN: "https://portal.example.invalid",
      NEXT_PUBLIC_API_ORIGIN: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  serverProcess.stdout?.on("data", (chunk) => { serverOutput += String(chunk); });
  serverProcess.stderr?.on("data", (chunk) => { serverOutput += String(chunk); });
  await waitForServer(`${baseUrl}/`);
}

async function scrollThroughPage(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    height: document.documentElement.scrollHeight,
    step: Math.max(400, Math.floor(window.innerHeight * 0.8)),
  }));
  for (let position = 0; position < dimensions.height; position += dimensions.step) {
    await page.evaluate((nextPosition) => window.scrollTo(0, nextPosition), position);
    await page.waitForTimeout(20);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(30);
}

async function waitForImages(page: Page): Promise<void> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const complete = await page.evaluate(() => {
      for (const image of document.images) if (!image.complete) return false;
      return true;
    });
    if (complete) return;
    await page.waitForTimeout(100);
  }
  throw new Error("Responsive images did not settle within the acceptance window");
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

  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  assert.ok(response, `${engine} ${route}: no navigation response`);
  const expectedStatus = route === "/acceptance-not-found/" ? 404 : 200;
  assert.equal(response.status(), expectedStatus, `${engine} ${route}: unexpected response status`);
  assert.match(response.headers()["content-security-policy"] ?? "", /frame-ancestors 'none'/, `${engine} ${route}: missing CSP`);
  assert.equal(response.headers()["x-content-type-options"], "nosniff", `${engine} ${route}: missing nosniff`);
  assert.match(response.headers()["x-robots-tag"] ?? "", /noindex/, `${engine} ${route}: validation response is indexable`);

  await page.locator("main").waitFor({ state: "visible" });
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator("h1").count(), 1, `${engine} ${route}: expected exactly one H1`);
  const logo = page.locator('header img[alt="NovaPharm Healthcare"]');
  assert.equal(await logo.count(), 1, `${engine} ${route}: official header logo missing`);
  assert.match(await logo.getAttribute("src") ?? "", /novapharm-healthcare-logo\.svg$/, `${engine} ${route}: unofficial header logo`);

  const keyViewport = viewport.name === "desktop-1440" || viewport.name === "mobile-390";
  if (keyViewport) {
    await scrollThroughPage(page);
    await waitForImages(page);
  }
  const layout = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    blankMain: !(document.querySelector("main")?.textContent ?? "").trim(),
    brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.currentSrc || image.src),
    passwordFields: document.querySelectorAll('input[type="password"]').length,
    rawTechnicalError: document.body.innerText.includes("The string did not match the expected pattern") || document.body.innerText.includes("Secure portal backend is not active on this static host yet"),
  }));
  assert.equal(layout.blankMain, false, `${engine} ${route}: main content is blank`);
  assert.ok(layout.documentWidth <= layout.viewportWidth + 1, `${engine} ${route}: horizontal overflow (${layout.documentWidth}px > ${layout.viewportWidth}px)`);
  assert.deepEqual(layout.brokenImages, [], `${engine} ${route}: broken image detected`);
  assert.equal(layout.passwordFields, 0, `${engine} ${route}: authentication field exposed by public app`);
  assert.equal(layout.rawTechnicalError, false, `${engine} ${route}: raw technical message exposed`);
  assert.deepEqual(failedResources, [], `${engine} ${route}: failed subresources`);
  const unexpectedErrors = expectedStatus === 404 ? consoleErrors.filter((message) => !message.includes("status of 404")) : consoleErrors;
  assert.deepEqual(unexpectedErrors, [], `${engine} ${route}: browser console errors`);

  if (expectedStatus === 200) {
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    assert.equal(canonical, `${productionOrigin}${route}`, `${engine} ${route}: canonical mismatch`);
    assert.ok(await page.locator('script[type="application/ld+json"]').count() >= 3, `${engine} ${route}: connected JSON-LD graph missing`);
  }

  const screenshotDirectory = path.join(artifactRoot, "screenshots", engine, viewport.name);
  await fs.mkdir(screenshotDirectory, { recursive: true });
  await page.screenshot({
    path: path.join(screenshotDirectory, `${routeName(route)}.png`),
    animations: "disabled",
    fullPage: keyViewport,
  });
  screenshots += 1;

  if (keyViewport) {
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    accessibilityRuns += 1;
    for (const violation of result.violations.filter((item) => item.impact === "serious" || item.impact === "critical")) {
      findings.push({ engine, viewport: viewport.name, route, type: `axe:${violation.id}`, detail: violation.help });
    }
  }
}

async function verifyInteractions(page: Page, engine: string): Promise<void> {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });

  const banner = page.locator(".cookie-banner");
  await banner.waitFor({ state: "visible" });
  await banner.getByRole("button", { name: "Manage preferences" }).click();
  const dialog = page.getByRole("dialog", { name: "Cookie settings" });
  await dialog.waitFor({ state: "visible" });
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Close cookie settings", `${engine}: cookie dialog did not receive focus`);
  await page.keyboard.press("Escape");
  await banner.waitFor({ state: "visible" });
  await page.locator("[data-cookie-manage]:focus").waitFor({ state: "attached", timeout: 5_000 });
  await banner.getByRole("button", { name: "Reject non-essential" }).click();
  await banner.waitFor({ state: "hidden" });
  const storedConsent = await page.evaluate(() => JSON.parse(localStorage.getItem("np_cookie_consent") ?? "null"));
  assert.deepEqual(storedConsent.categories, { preferences: false, analytics: false, marketing: false }, `${engine}: rejection was not preserved`);
  assert.deepEqual(await page.context().cookies(), [], `${engine}: non-essential cookies were set after rejection`);
  await page.getByRole("button", { name: "Cookie settings" }).click();
  await dialog.waitFor({ state: "visible" });
  await dialog.getByRole("button", { name: "Close cookie settings" }).click();
  await dialog.waitFor({ state: "hidden" });
  await expectHidden(banner, `${engine}: saved consent incorrectly reopened the banner`);

  const menu = page.locator("details.mobile-menu summary");
  assert.equal(await menu.getAttribute("aria-label"), "Open navigation", `${engine}: mobile menu is not labelled`);
  await menu.click();
  assert.equal(await page.locator("details.mobile-menu").getAttribute("open"), "", `${engine}: mobile menu did not open`);
  await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "About" }).click();
  await page.waitForURL(/\/about\/$/);
  assert.equal(await page.locator("details.mobile-menu").getAttribute("open"), null, `${engine}: mobile menu did not close after navigation`);

  await page.goto(`${baseUrl}/contact/`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Full name").fill("Validation User");
  await page.getByLabel("Business email").fill("validation@example.com");
  await page.getByLabel("Company", { exact: true }).fill("Synthetic Validation Ltd");
  await page.getByLabel("Role or job title").fill("Validation Lead");
  await page.getByLabel("Country").fill("United Kingdom");
  await page.getByLabel("Enquiry type").selectOption({ label: "General enquiry" });
  await page.getByLabel("Message", { exact: true }).fill("Synthetic, non-confidential browser acceptance message for the corporate workflow.");
  await page.getByLabel(/I confirm that this message/).check();
  await page.getByLabel(/I have read the business-enquiry privacy information/).check();
  await page.getByRole("button", { name: "Submit enquiry" }).click();
  const failureMessage = page.getByText("The secure enquiry service cannot be reached right now. No information was submitted. Please try again later or use the verified email route.");
  await failureMessage.waitFor({ state: "visible" });
  assert.equal(await page.getByText("The string did not match the expected pattern.").count(), 0, `${engine}: raw browser error exposed`);
  assert.equal(await page.getByRole("link", { name: "Use the verified corporate email route" }).count(), 1, `${engine}: verified fallback missing`);
}

async function expectHidden(locator: ReturnType<Page["locator"]>, message: string): Promise<void> {
  assert.equal(await locator.isVisible(), false, message);
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
      await context.addInitScript(() => {
        localStorage.setItem("np_cookie_consent", JSON.stringify({
          version: "2026-07-v2",
          categories: { preferences: false, analytics: false, marketing: false },
          timestamp: "2026-07-30T00:00:00.000Z",
          preferenceId: "browser-acceptance",
        }));
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
  } finally {
    await browser.close();
  }
}

async function runInteractionPreflight(name: string, browserType: BrowserType): Promise<void> {
  const browser = await browserType.launch({ headless: true });
  try {
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

function markdownReport(generatedAt: string): string {
  return `# Corporate browser acceptance\n\n- Generated: ${generatedAt}\n- Candidate: local standalone Node production artifact\n- Engines: Chromium and WebKit\n- Canonical routes: ${canonicalRoutes.length}\n- Viewports: ${viewports.length}\n- Screenshots: ${screenshots}\n- Axe runs: ${accessibilityRuns}\n- Serious or critical findings: ${findings.length}\n- Search indexing: disabled with meta robots and X-Robots-Tag during validation\n- Data: synthetic and non-confidential only\n`;
}

await fs.rm(artifactRoot, { recursive: true, force: true });
await fs.mkdir(artifactRoot, { recursive: true });
try {
  await startServer();
  await runInteractionPreflight("chromium", chromium);
  await runInteractionPreflight("webkit", webkit);
  await runEngine("chromium", chromium);
  await runEngine("webkit", webkit);
  const generatedAt = new Date().toISOString();
  const report = { generatedAt, baseUrl, canonicalRoutes, viewports, routes, screenshots, accessibilityRuns, findings };
  await fs.writeFile(path.join(artifactRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await fs.writeFile(path.join(artifactRoot, "report.md"), markdownReport(generatedAt), "utf8");
  assert.deepEqual(findings, [], `Serious or critical accessibility findings:\n${JSON.stringify(findings, null, 2)}`);
  console.log(`Corporate browser acceptance passed: ${screenshots} screenshots, ${accessibilityRuns} Axe runs, 2 engines.`);
} finally {
  if (serverProcess && serverProcess.exitCode === null) {
    serverProcess.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      serverProcess?.once("exit", () => resolve());
      setTimeout(resolve, 5_000).unref();
    });
  }
}
