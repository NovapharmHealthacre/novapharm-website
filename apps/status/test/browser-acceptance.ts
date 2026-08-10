import assert from "node:assert/strict";
import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs/promises";
import { createServer, type Server } from "node:http";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { type BrowserType, chromium, webkit } from "playwright";

const origin = "http://127.0.0.1:4304";
const fixtureOrigin = "http://127.0.0.1:4305";
const standaloneRoot = path.resolve(process.cwd(), ".next/standalone/apps/status");
const artifactRoot = path.resolve(process.cwd(), "../../artifacts/status-browser");
const viewports = [
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
] as const;
const reviewViewports = viewports.filter(({ name }) => ["desktop-1440", "mobile-390"].includes(name));

interface Scenario {
  readonly name: "normal" | "activation" | "maintenance" | "incident";
  readonly viewports: readonly (typeof viewports)[number][];
  readonly environment: Readonly<Record<string, string>>;
  readonly headline: string;
  readonly overallLabel: string;
  readonly serviceLabel: string;
  readonly serviceLabelCount: number;
  readonly notice?: string;
}

const healthyOrigins = Object.freeze({
  STATUS_VALIDATION_MODE: "loopback-browser-acceptance",
  CORPORATE_ORIGIN: fixtureOrigin,
  TECHNOLOGY_ORIGIN: fixtureOrigin,
  FOUNDER_ORIGIN: fixtureOrigin,
  PORTAL_ORIGIN: fixtureOrigin,
  PUBLIC_API_ORIGIN: fixtureOrigin,
});

const scenarios: readonly Scenario[] = Object.freeze([
  {
    name: "normal",
    viewports,
    environment: healthyOrigins,
    headline: "All configured services are responding normally.",
    overallLabel: "Operational",
    serviceLabel: "Operational",
    serviceLabelCount: 6,
  },
  {
    name: "activation",
    viewports: reviewViewports,
    environment: {},
    headline: "Managed service activation is still in progress.",
    overallLabel: "Activation in progress",
    serviceLabel: "Activation pending",
    serviceLabelCount: 5,
  },
  {
    name: "maintenance",
    viewports: reviewViewports,
    environment: {
      ...healthyOrigins,
      STATUS_MODE: "maintenance",
      STATUS_MAINTENANCE_MESSAGE: "Planned validation maintenance is in progress. No confidential service information is exposed.",
    },
    headline: "Planned maintenance is in progress.",
    overallLabel: "Planned maintenance",
    serviceLabel: "Operational",
    serviceLabelCount: 6,
    notice: "Planned validation maintenance is in progress. No confidential service information is exposed.",
  },
  {
    name: "incident",
    viewports: reviewViewports,
    environment: { ...healthyOrigins, PUBLIC_API_ORIGIN: "http://127.0.0.1:4306" },
    headline: "A configured service is currently unavailable.",
    overallLabel: "Service disruption",
    serviceLabel: "Unavailable",
    serviceLabelCount: 1,
  },
]);

let server: ChildProcess | undefined;
let fixture: Server | undefined;
let output = "";
let screenshots = 0;
let axeRuns = 0;

async function ready() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try { if ((await fetch(`${origin}/api/health/live`)).status === 200) return; } catch {}
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 150));
  }
  throw new Error(`Status standalone server did not start. ${output}`);
}

async function runEngine(name: string, browserType: BrowserType, scenario: Scenario) {
  const browser = await browserType.launch({ headless: true });
  try {
    for (const viewport of scenario.viewports) {
      const context = await browser.newContext({ viewport, locale: "en-GB", reducedMotion: "reduce" });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
      page.on("pageerror", (error) => errors.push(error.message));
      const response = await page.goto(origin, { waitUntil: "networkidle" });
      assert.equal(response?.status(), 200);
      assert.match(response?.headers()["x-robots-tag"] ?? "", /noindex/);
      assert.equal(await page.getByRole("heading", { level: 1, name: scenario.headline, exact: true }).count(), 1);
      assert.equal(await page.locator(".service-row").count(), 6);
      assert.equal((await page.locator(".overall").textContent())?.trim(), scenario.overallLabel);
      assert.equal(
        await page.locator(".service-list").getByText(scenario.serviceLabel, { exact: true }).count(),
        scenario.serviceLabelCount,
      );
      if (scenario.notice) assert.equal(await page.getByText(scenario.notice, { exact: true }).count(), 1);
      assert.equal(await page.getByText("Private boundary", { exact: true }).count(), 2);
      assert.equal(await page.getByText("Current page", { exact: true }).count(), 1);
      assert.equal(await page.locator('img[alt="NovaPharm Healthcare"]').count(), 1);
      const layout = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, broken: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).length }));
      assert.ok(layout.document <= layout.viewport + 1, `${name} ${viewport.name}: horizontal overflow`);
      assert.equal(layout.broken, 0);
      assert.deepEqual(errors, []);
      const directory = path.join(artifactRoot, "screenshots", scenario.name, name, viewport.name);
      await fs.mkdir(directory, { recursive: true });
      await page.screenshot({ path: path.join(directory, "status.png"), fullPage: true, animations: "disabled" });
      screenshots += 1;
      if (["desktop-1440", "mobile-390"].includes(viewport.name)) {
        const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
        assert.deepEqual(result.violations.filter((item) => item.impact === "serious" || item.impact === "critical"), []);
        axeRuns += 1;
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

await fs.rm(artifactRoot, { recursive: true, force: true });
fixture = createServer((request, response) => {
  response.setHeader("X-Robots-Tag", "noindex, nofollow");
  if (request.url === "/api/health/live") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ status: "live", service: "novapharm-api" }));
    return;
  }
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end("<!doctype html><title>Healthy validation origin</title><p>Healthy</p>");
});

await new Promise<void>((resolvePromise, reject) => {
  fixture?.once("error", reject);
  fixture?.listen(4305, "127.0.0.1", resolvePromise);
});

try {
  for (const scenario of scenarios) {
    output = "";
    server = spawn(process.execPath, ["server.js"], {
      cwd: standaloneRoot,
      env: { ...process.env, HOSTNAME: "127.0.0.1", PORT: "4304", NODE_ENV: "production", ...scenario.environment },
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout?.on("data", (chunk) => { output += String(chunk); });
    server.stderr?.on("data", (chunk) => { output += String(chunk); });
    try {
      await ready();
      await runEngine("chromium", chromium, scenario);
      await runEngine("webkit", webkit, scenario);
    } finally {
      if (server.exitCode === null) {
        const exited = new Promise<void>((resolvePromise) => server?.once("exit", () => resolvePromise()));
        server.kill("SIGTERM");
        await Promise.race([exited, new Promise<void>((resolvePromise) => setTimeout(resolvePromise, 5_000))]);
        if (server.exitCode === null) server.kill("SIGKILL");
      }
    }
  }
  const report = {
    generatedAt: new Date().toISOString(),
    engines: ["chromium", "webkit"],
    scenarios: scenarios.map(({ name, viewports: scenarioViewports }) => ({ name, viewports: scenarioViewports })),
    screenshots,
    axeRuns,
    seriousOrCriticalFindings: 0,
    indexing: "disabled",
    data: "sanitised availability only",
  };
  await fs.writeFile(path.join(artifactRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Status browser acceptance passed across normal, activation, maintenance and incident states: ${screenshots} screenshots and ${axeRuns} Axe runs.`);
} finally {
  if (fixture) await new Promise<void>((resolvePromise) => fixture?.close(() => resolvePromise()));
}
