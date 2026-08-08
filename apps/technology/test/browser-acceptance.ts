import assert from "node:assert/strict";
import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { type BrowserType, chromium, type Page, webkit } from "playwright";

const standaloneRoot = path.resolve(process.cwd(), ".next/standalone/apps/technology");
const artifactRoot = path.join(process.cwd(), "..", "..", "artifacts", "technology-browser");
const viewports = Object.freeze([
  { name: "desktop-1280", width: 1280, height: 800 },
  { name: "desktop-1366", width: 1366, height: 768 },
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1920", width: 1920, height: 1080 },
  { name: "tablet-1024", width: 1024, height: 1366 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "mobile-375", width: 375, height: 667 },
  { name: "mobile-320", width: 320, height: 568 },
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
const expectedScriptlessNavigationLinks = 5;

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
let noJavaScriptRuns = 0;
let serverProcess: ChildProcess | undefined;
let serverOutput = "";
let baseUrl = process.env["TECHNOLOGY_BASE_URL"] ?? "";

async function reservePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Unable to reserve a technology acceptance-test port"));
        return;
      }
      server.close((error) => (error ? reject(error) : resolve(address.port)));
    });
  });
}

async function waitForServer(url: string): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (serverProcess?.exitCode !== null && serverProcess?.exitCode !== undefined) {
      throw new Error(`Technology acceptance server exited early.\n${serverOutput}`);
    }
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status === 200) return;
    } catch {
      // The standalone server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Technology acceptance server did not become ready.\n${serverOutput}`);
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
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  serverProcess.stdout?.on("data", (chunk) => {
    serverOutput += String(chunk);
  });
  serverProcess.stderr?.on("data", (chunk) => {
    serverOutput += String(chunk);
  });
  await waitForServer(`${baseUrl}/`);
}

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

async function verifyNoJavaScript(browserType: BrowserType, engine: string): Promise<void> {
  const browser = await browserType.launch({ headless: true });
  try {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    try {
      const page = await context.newPage();
      const response = await page.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 30_000 });
      assert.equal(response?.status(), 200, `${engine}: scriptless homepage did not return 200`);
      assert.equal(await page.locator("h1").count(), 1, `${engine}: scriptless homepage lacks one H1`);
      assert.equal(
        await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link").count(),
        expectedScriptlessNavigationLinks,
        `${engine}: scriptless primary navigation is incomplete`,
      );
      assert.equal(await page.locator("button.menu-toggle:visible").count(), 0, `${engine}: inert scriptless menu button is visible`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 1, `${engine}: scriptless homepage has horizontal overflow`);
      noJavaScriptRuns += 1;
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
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
try {
  await startServer();
  await runEngine("chromium", chromium);
  await runEngine("webkit", webkit);
  await verifyNoJavaScript(chromium, "chromium");
  await verifyNoJavaScript(webkit, "webkit");
  const report = { generatedAt: new Date().toISOString(), baseUrl, viewports, routes, screenshots, accessibilityRuns, noJavaScriptRuns, findings };
  await fs.writeFile(path.join(artifactRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  assert.deepEqual(findings, [], `Serious or critical accessibility findings:\n${JSON.stringify(findings, null, 2)}`);
  console.log(`Technology browser acceptance passed: ${screenshots} screenshots, ${accessibilityRuns} Axe runs, ${noJavaScriptRuns} scriptless runs, 2 engines.`);
} finally {
  if (serverProcess && serverProcess.exitCode === null) {
    serverProcess.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      serverProcess?.once("exit", () => resolve());
      setTimeout(resolve, 5_000).unref();
    });
  }
}
