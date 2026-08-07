import assert from "node:assert/strict";
import { type ChildProcess, spawn } from "node:child_process";
import { statSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { type PortalArea, type PortalModule, portalModules, visiblePortalModules } from "@novapharm/portal-contracts";
import { type Browser, type BrowserContext, type BrowserType, chromium, type Page, webkit } from "playwright";

type StoredBrowserState = Awaited<ReturnType<BrowserContext["storageState"]>>;
type AcceptanceViewport = Readonly<{ name: string; width: number; height: number }>;

const apiOrigin = process.env["PORTAL_API_BASE_URL"] ?? "http://127.0.0.1:4178";
const portalOrigin = process.env["PORTAL_BASE_URL"] ?? "http://127.0.0.1:4303";
const credentialPath = path.resolve(
  process.env["PORTAL_VISUAL_CREDENTIALS_PATH"] ?? "../../artifacts/portal-browser-runtime/credentials.json",
);
const artifactRoot = path.resolve(process.cwd(), process.env["PORTAL_BROWSER_ARTIFACT_ROOT"] ?? "../../artifacts/portal-browser");
const standaloneRoot = path.resolve(process.cwd(), ".next/standalone/apps/portal");
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
const primaryViewport = viewports[0];
const accessTypeByArea: Readonly<Record<PortalArea, "customer" | "employee" | "board" | "admin">> = {
  customer: "customer",
  employee: "employee",
  executive: "board",
  admin: "admin",
};
const destinationByArea: Readonly<Record<PortalArea, string>> = {
  customer: "/portal/dashboard/",
  employee: "/employee/dashboard/",
  executive: "/portal/executive-platform/",
  admin: "/admin/dashboard/",
};
const areas = Object.freeze(["customer", "employee", "executive", "admin"] as const satisfies readonly PortalArea[]);
const interactionOnly = process.env["PORTAL_BROWSER_INTERACTIONS_ONLY"] === "true";

interface Finding {
  readonly engine: string;
  readonly viewport: string;
  readonly route: string;
  readonly type: string;
  readonly detail: string;
}

const credentials = JSON.parse(await fs.readFile(credentialPath, "utf8")) as { username?: string; password?: string };
if (!credentials.username || !credentials.password) throw new Error("Protected synthetic portal credentials are incomplete.");
if ((statSync(credentialPath).mode & 0o077) !== 0) throw new Error("Synthetic portal credentials must remain owner-only.");

let portalProcess: ChildProcess | undefined;
let portalOutput = "";
let screenshots = 0;
let axeRuns = 0;
const findings: Finding[] = [];

async function waitForResponse(url: string, expectedStatus = 200): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (portalProcess?.exitCode !== null && portalProcess?.exitCode !== undefined) {
      throw new Error(`The portal server exited before acceptance began.\n${portalOutput}`);
    }
    try {
      const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(1_000) });
      if (response.status === expectedStatus) return;
    } catch {
      // The isolated validation service is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`The validation service did not become ready: ${url}\n${portalOutput}`);
}

async function startPortal(): Promise<void> {
  await waitForResponse(`${apiOrigin}/api/health/live`);
  if (process.env["PORTAL_BASE_URL"]) {
    await waitForResponse(portalOrigin);
    return;
  }
  await fs.access(path.join(standaloneRoot, "server.js"));
  portalProcess = spawn(process.execPath, ["server.js"], {
    cwd: standaloneRoot,
    env: {
      ...process.env,
      HOSTNAME: "127.0.0.1",
      PORT: "4303",
      INTERNAL_API_ORIGIN: apiOrigin,
      PUBLIC_API_ORIGIN: apiOrigin,
      PORTAL_ORIGIN: portalOrigin,
      PORTAL_VALIDATION_MODE: "true",
      NEXT_PUBLIC_ENTRA_LOGIN_ENABLED: "false",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  portalProcess.stdout?.on("data", (chunk) => { portalOutput += String(chunk); });
  portalProcess.stderr?.on("data", (chunk) => { portalOutput += String(chunk); });
  await waitForResponse(portalOrigin);
}

function contextOptions(viewport: AcceptanceViewport = primaryViewport, storageState?: StoredBrowserState) {
  const base = {
    baseURL: portalOrigin,
    viewport: { width: viewport.width, height: viewport.height },
    locale: "en-GB",
    reducedMotion: "reduce" as const,
    colorScheme: "light" as const,
  };
  return storageState ? { ...base, storageState } : base;
}

async function login(browser: Browser, area: PortalArea): Promise<StoredBrowserState> {
  const context = await browser.newContext(contextOptions());
  try {
    const page = await context.newPage();
    await page.goto(portalOrigin, { waitUntil: "domcontentloaded" });
    const accessInput = page.locator(`input[name="accessType"][value="${accessTypeByArea[area]}"]`);
    await page.locator(".access-selector label").filter({ has: accessInput }).click();
    assert.equal(await accessInput.isChecked(), true);
    await page.getByLabel("Username or business email").fill(credentials.username as string);
    await page.getByLabel("Password", { exact: true }).fill(credentials.password as string);
    await Promise.all([
      page.waitForURL((url) => url.pathname === destinationByArea[area], { timeout: 20_000 }),
      page.getByRole("button", { name: "Sign in securely" }).click(),
    ]);
    await page.locator(".data-context").waitFor({ state: "visible" });
    assert.equal(await page.locator(".workflow-status").textContent(), "");
    return await context.storageState();
  } finally {
    await context.close();
  }
}

async function verifyAuthenticationBoundaries(browser: Browser, engine: string): Promise<void> {
  const rejected = await fetch(`${portalOrigin}/admin/dashboard/`, { redirect: "manual" });
  assert.ok([307, 308].includes(rejected.status), `${engine}: protected route was not rejected before authentication`);
  assert.match(rejected.headers.get("location") ?? "", /returnTo=%2Fadmin%2Fdashboard%2F/);

  const context = await browser.newContext(contextOptions());
  try {
    const page = await context.newPage();
    await page.goto(portalOrigin, { waitUntil: "domcontentloaded" });
    await page.getByLabel("Username or business email").fill(credentials.username as string);
    await page.getByLabel("Password", { exact: true }).fill("Synthetic-invalid-password-9!zQ");
    await page.getByRole("button", { name: "Sign in securely" }).click();
    await page.getByText("Invalid username or password.", { exact: true }).waitFor();
    assert.equal(await page.getByText("The string did not match the expected pattern.").count(), 0);
  } finally {
    await context.close();
  }
}

async function capture(page: Page, engine: string, viewport: string, name: string, fullPage: boolean): Promise<void> {
  const directory = path.join(artifactRoot, "screenshots", engine, viewport);
  await fs.mkdir(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, `${name}.png`), animations: "disabled", fullPage });
  screenshots += 1;
}

async function inspectLayout(page: Page, label: string): Promise<void> {
  const layout = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    blankMain: !(document.querySelector("main")?.textContent ?? "").trim(),
    brokenImages: [...document.images]
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src),
    rawError:
      document.body.innerText.includes("The string did not match the expected pattern") ||
      document.body.innerText.includes("Secure portal backend is not active on this static host yet") ||
      document.body.innerText.includes("Internal Server Error"),
  }));
  assert.equal(layout.blankMain, false, `${label}: main content is blank`);
  assert.ok(layout.documentWidth <= layout.viewportWidth + 1, `${label}: horizontal overflow (${layout.documentWidth} > ${layout.viewportWidth})`);
  assert.deepEqual(layout.brokenImages, [], `${label}: broken portal image`);
  assert.equal(layout.rawError, false, `${label}: raw technical error was shown`);
}

async function captureInteractionState(
  page: Page,
  engine: string,
  viewport: AcceptanceViewport,
  name: string,
): Promise<void> {
  await inspectLayout(page, `${engine} ${viewport.name} ${name}`);
  await capture(page, engine, viewport.name, name, true);
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  axeRuns += 1;
  for (const violation of result.violations.filter((item) => item.impact === "serious" || item.impact === "critical")) {
    findings.push({ engine, viewport: viewport.name, route: page.url(), type: `axe:${violation.id}`, detail: violation.help });
  }
}

async function inspectModule(
  context: BrowserContext,
  engine: string,
  viewport: (typeof viewports)[number],
  module: PortalModule,
): Promise<void> {
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const failedResources: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400 && !response.request().isNavigationRequest()) failedResources.push(`${response.status()} ${response.url()}`);
  });
  try {
    const response = await page.goto(`${portalOrigin}${module.route}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    assert.equal(response?.status(), 200, `${engine} ${module.route}: navigation failed`);
    assert.match(response?.headers()["content-security-policy"] ?? "", /frame-ancestors 'none'/);
    assert.match(response?.headers()["x-robots-tag"] ?? "", /noindex/);
    await page.locator(".data-context").waitFor({ state: "visible", timeout: 20_000 });
    await page.locator(".icon-command:not(:disabled)").waitFor({ state: "visible", timeout: 20_000 });
    assert.equal(await page.locator("h1").textContent(), module.title);
    assert.equal(await page.locator(".workflow-status").textContent(), "");
    assert.match(await page.locator('meta[name="robots"]').getAttribute("content") ?? "", /noindex/);
    assert.equal(await page.locator('img[alt="NovaPharm Healthcare"]').count(), 1);
    assert.match(await page.locator('img[alt="NovaPharm Healthcare"]').getAttribute("src") ?? "", /novapharm-healthcare-logo\.svg/);
    assert.equal(await page.getByText("Synthetic validation data", { exact: true }).count(), 1);
    await inspectLayout(page, `${engine} ${viewport.name} ${module.route}`);
    assert.deepEqual(failedResources, [], `${engine} ${module.route}: failed subresources`);
    assert.deepEqual(consoleErrors, [], `${engine} ${module.route}: console errors`);

    const keyViewport = viewport.name === "desktop-1440" || viewport.name === "mobile-390";
    await capture(page, engine, viewport.name, module.code, keyViewport);
    if (keyViewport) {
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      axeRuns += 1;
      for (const violation of result.violations.filter((item) => item.impact === "serious" || item.impact === "critical")) {
        findings.push({ engine, viewport: viewport.name, route: module.route, type: `axe:${violation.id}`, detail: violation.help });
      }
    }
  } finally {
    await page.close();
  }
}

async function inspectSystemPage(
  context: BrowserContext,
  engine: string,
  viewport: (typeof viewports)[number],
  route: string,
  expectedStatus: number,
  expectedH1: string,
  name: string,
): Promise<void> {
  const page = await context.newPage();
  try {
    const response = await page.goto(`${portalOrigin}${route}`, { waitUntil: "domcontentloaded" });
    assert.equal(response?.status(), expectedStatus);
    await page.getByRole("heading", { level: 1, name: expectedH1 }).waitFor();
    assert.match(response?.headers()["x-robots-tag"] ?? "", /noindex/);
    await inspectLayout(page, `${engine} ${viewport.name} ${route}`);
    const keyViewport = viewport.name === "desktop-1440" || viewport.name === "mobile-390";
    await capture(page, engine, viewport.name, name, keyViewport);
    if (keyViewport) {
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      axeRuns += 1;
      for (const violation of result.violations.filter((item) => item.impact === "serious" || item.impact === "critical")) {
        findings.push({ engine, viewport: viewport.name, route, type: `axe:${violation.id}`, detail: violation.help });
      }
    }
  } finally {
    await page.close();
  }
}

async function verifyInteractions(browser: Browser, engine: string, states: ReadonlyMap<PortalArea, StoredBrowserState>): Promise<void> {
  const mobileViewport = { name: "mobile-390", width: 390, height: 844 };
  const employeeContext = await browser.newContext(contextOptions(mobileViewport, states.get("employee")));
  try {
    const page = await employeeContext.newPage();
    await page.goto(`${portalOrigin}/employee/dashboard/`, { waitUntil: "domcontentloaded" });
    await page.locator(".data-context").waitFor();
    await page.getByRole("button", { name: "Open navigation" }).click();
    assert.match(await page.locator(".workspace-sidebar").getAttribute("class") ?? "", /open/);
    await page.getByRole("button", { name: "Close navigation" }).click();
    await page.getByLabel("Search authorised records").fill("Nutraxin");
    await page.locator('.portal-search > button[type="submit"]').click();
    await page.locator(".search-results").waitFor();
    assert.ok(await page.locator(".search-results a").count() > 0, `${engine}: authorised search returned no seeded products`);
    await captureInteractionState(page, engine, mobileViewport, "interaction.search-results");
    await page.getByLabel("Search authorised records").fill("no-authorised-record-matches-this-query");
    await page.locator('.portal-search > button[type="submit"]').click();
    await page.getByText("No authorised records found.", { exact: true }).waitFor();
    await captureInteractionState(page, engine, mobileViewport, "interaction.empty-search");
  } finally {
    await employeeContext.close();
  }

  const desktopViewport = viewports[0];
  const loadingContext = await browser.newContext(contextOptions(desktopViewport, states.get("customer")));
  try {
    const page = await loadingContext.newPage();
    let releaseSession!: () => void;
    const sessionGate = new Promise<void>((resolve) => { releaseSession = resolve; });
    await page.route("**/gateway/portal/session", async (route) => {
      await sessionGate;
      await route.continue();
    });
    await page.goto(`${portalOrigin}/portal/dashboard/`, { waitUntil: "domcontentloaded" });
    await page.locator(".loading-state").waitFor();
    await captureInteractionState(page, engine, desktopViewport, "interaction.loading");
    releaseSession();
    await page.locator(".data-context").waitFor();
  } finally {
    await loadingContext.close();
  }

  const deniedContext = await browser.newContext(contextOptions(desktopViewport, states.get("customer")));
  try {
    const page = await deniedContext.newPage();
    await page.route("**/gateway/portal/session", async (route) => {
      const response = await route.fetch();
      const payload = await response.json() as { user: Readonly<{ accessScopes: readonly string[]; [key: string]: unknown }> };
      await route.fulfill({ response, json: { user: { ...payload.user, accessScopes: ["customer"] } } });
    });
    await page.goto(`${portalOrigin}/admin/dashboard/`, { waitUntil: "domcontentloaded" });
    await page.getByText("This identity is not authorised for the requested workspace.", { exact: true }).waitFor();
    await captureInteractionState(page, engine, desktopViewport, "interaction.access-denied");
  } finally {
    await deniedContext.close();
  }

  const customerContext = await browser.newContext(contextOptions(desktopViewport, states.get("customer")));
  try {
    const page = await customerContext.newPage();
    await page.goto(`${portalOrigin}/portal/support/`, { waitUntil: "domcontentloaded" });
    await page.locator(".data-context").waitFor();
    assert.equal(await page.locator(".available-actions").count(), 0, `${engine}: informational module exposed a write panel`);
    assert.equal(
      await page.locator(".data-context").getByText("Read only", { exact: true }).count(),
      1,
      `${engine}: informational module did not state its read-only boundary`,
    );
    await captureInteractionState(page, engine, desktopViewport, "interaction.read-only");

    await page.goto(`${portalOrigin}/portal/change-password/`, { waitUntil: "domcontentloaded" });
    await page.getByLabel("Current temporary password").fill(credentials.password as string);
    await page.getByLabel("New password", { exact: true }).fill("Synthetic-New-Password-47!Alpha");
    await page.getByLabel("Confirm new password").fill("Synthetic-New-Password-47!Beta");
    await page.getByRole("button", { name: "Update password" }).click();
    await page.getByText("The new password and confirmation do not match.", { exact: true }).waitFor();
    await captureInteractionState(page, engine, desktopViewport, "interaction.password-error");

    await page.goto(`${portalOrigin}/portal/dashboard/`, { waitUntil: "domcontentloaded" });
    await page.locator(".data-context").waitFor();
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    const rejected = await page.goto(`${portalOrigin}/portal/dashboard/`, { waitUntil: "domcontentloaded" });
    assert.equal(new URL(rejected?.url() ?? portalOrigin).pathname, "/", `${engine}: logout did not reject the protected route`);
    await captureInteractionState(page, engine, desktopViewport, "interaction.session-ended");
  } finally {
    await customerContext.close();
  }

  const expiredContext = await browser.newContext(contextOptions(desktopViewport, states.get("employee")));
  try {
    const page = await expiredContext.newPage();
    await page.route("**/gateway/portal/session", async (route) => {
      await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Authentication required." }) });
    });
    await page.goto(`${portalOrigin}/employee/dashboard/`, { waitUntil: "domcontentloaded" });
    await page.waitForURL((url) => url.pathname === "/");
    await captureInteractionState(page, engine, desktopViewport, "interaction.session-expired");
  } finally {
    await expiredContext.close();
  }

  const boardContext = await browser.newContext(contextOptions(desktopViewport, states.get("executive")));
  try {
    const page = await boardContext.newPage();
    const hiddenModules = portalModules.filter((entry) => !entry.visibleInNavigation);
    for (const [index, module] of hiddenModules.entries()) {
      const response = await page.goto(`${portalOrigin}${module.route}`, { waitUntil: "domcontentloaded" });
      assert.equal(response?.status(), 404, `${engine}: dependency-blocked module resolved: ${module.code}`);
      await page.getByRole("heading", { name: "Portal route not found" }).waitFor();
      if (index === 0) await captureInteractionState(page, engine, desktopViewport, "interaction.hidden-module-not-found");
    }
  } finally {
    await boardContext.close();
  }
}

async function runEngine(engine: string, browserType: BrowserType): Promise<void> {
  const browser = await browserType.launch({ headless: true });
  try {
    await verifyAuthenticationBoundaries(browser, engine);
    const states = new Map<PortalArea, StoredBrowserState>();
    for (const area of areas) states.set(area, await login(browser, area));

    for (const viewport of interactionOnly ? [] : viewports) {
      const anonymous = await browser.newContext(contextOptions(viewport));
      await inspectSystemPage(anonymous, engine, viewport, "/", 200, "One governed entry point. Four precise access boundaries.", "login");
      await anonymous.close();

      for (const area of areas) {
        const context = await browser.newContext(contextOptions(viewport, states.get(area)));
        try {
          for (const module of visiblePortalModules.filter((entry) => entry.area === area)) {
            await inspectModule(context, engine, viewport, module);
          }
          if (area === "customer") {
            await inspectSystemPage(context, engine, viewport, "/portal/change-password/", 200, "Replace your temporary password", "password-change");
          }
          if (area === "admin") {
            await inspectSystemPage(context, engine, viewport, "/acceptance-not-found/", 404, "Portal route not found", "not-found");
          }
        } finally {
          await context.close();
        }
      }
      console.log(`${engine}: completed ${viewport.name}`);
    }
    await verifyInteractions(browser, engine, states);
  } finally {
    await browser.close();
  }
}

await fs.rm(artifactRoot, { recursive: true, force: true });
await fs.mkdir(artifactRoot, { recursive: true });
try {
  await startPortal();
  const engineCatalog = { chromium, webkit } as const;
  const selectedEngines = String(process.env["PORTAL_BROWSER_ENGINES"] ?? "chromium,webkit")
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is keyof typeof engineCatalog => value in engineCatalog);
  if (!selectedEngines.length) throw new Error("At least one supported portal browser engine is required.");
  for (const engine of selectedEngines) await runEngine(engine, engineCatalog[engine]);
  const report = {
    generatedAt: new Date().toISOString(),
    candidate: "local standalone portal with isolated synthetic API",
    engines: selectedEngines,
    viewports,
    governedModuleCount: portalModules.length,
    visibleInformationalModuleCount: visiblePortalModules.length,
    screenshots,
    axeRuns,
    seriousOrCriticalAccessibilityFindings: findings,
    data: "synthetic and non-confidential only",
    indexing: "disabled",
  };
  await fs.writeFile(path.join(artifactRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await fs.writeFile(
    path.join(artifactRoot, "report.md"),
    `# Portal browser acceptance\n\n- Mode: ${interactionOnly ? "interactions only" : "full matrix"}\n- Governed modules: ${portalModules.length}\n- Visible informational modules: ${visiblePortalModules.length}\n- Dependency-blocked modules: ${portalModules.length - visiblePortalModules.length}\n- Engines: ${selectedEngines.join(", ")}\n- Viewports: ${interactionOnly ? 0 : viewports.length}\n- Screenshots: ${screenshots}\n- Axe runs: ${axeRuns}\n- Serious or critical findings: ${findings.length}\n- Data: synthetic and non-confidential only\n- Indexing: disabled\n`,
    "utf8",
  );
  assert.deepEqual(findings, [], `Serious or critical accessibility findings:\n${JSON.stringify(findings, null, 2)}`);
  console.log(`Portal browser acceptance passed: ${screenshots} screenshots, ${axeRuns} Axe runs, ${portalModules.length} governed modules (${visiblePortalModules.length} visible), ${selectedEngines.length} engine(s).`);
} finally {
  if (portalProcess && portalProcess.exitCode === null) {
    portalProcess.kill("SIGTERM");
    await Promise.race([
      new Promise<void>((resolve) => { portalProcess?.once("exit", () => resolve()); }),
      new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
    ]);
  }
}
