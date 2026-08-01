import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";
import { chromium } from "playwright";
import { assertBrowserValidationRoot } from "./browser-validation-runtime.mjs";

const repositoryRoot = resolve(process.cwd());
const runtimeRoot = assertBrowserValidationRoot(join(tmpdir(), "novapharm-unified-portal-lighthouse-runtime"));
const credentialsPath = join(runtimeRoot, "credentials.json");
const portalRoot = join(repositoryRoot, "apps", "portal", ".next", "standalone", "apps", "portal");
const artifactRoot = join(repositoryRoot, "artifacts", "portal-lighthouse");
const apiOrigin = "http://127.0.0.1:4178";
const portalOrigin = "http://127.0.0.1:4303";
let portalProcess;
let portalOutput = "";
let chrome;

function run(command, argumentsList, label, environment = process.env, capture = false) {
  const result = spawnSync(command, argumentsList, {
    cwd: repositoryRoot,
    env: environment,
    encoding: capture ? "utf8" : undefined,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  if (result.status !== 0) {
    const detail = capture ? String(result.stderr || result.stdout || "").trim() : "";
    throw new Error(`${label} failed.${detail ? ` ${detail}` : ""}`);
  }
}

function stopValidationRuntime() {
  run(process.execPath, [join(repositoryRoot, "scripts", "stop-browser-validation.mjs"), runtimeRoot], "Validation runtime shutdown", process.env, true);
}

async function waitFor(url) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(1_000) });
      if (response.status === 200) return;
    } catch {
      // The isolated validation process is still starting.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));
  }
  throw new Error(`Timed out waiting for ${url}. ${portalOutput}`);
}

function startPortal() {
  portalProcess = spawn(process.execPath, ["server.js"], {
    cwd: portalRoot,
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
}

async function authenticatedCookieHeader(credentials) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ baseURL: portalOrigin, locale: "en-GB" });
    await page.goto(portalOrigin, { waitUntil: "domcontentloaded" });
    await page.getByLabel("Username or business email").fill(credentials.username);
    await page.getByLabel("Password", { exact: true }).fill(credentials.password);
    await Promise.all([
      page.waitForURL((url) => url.pathname === "/portal/dashboard/", { timeout: 20_000 }),
      page.getByRole("button", { name: "Sign in securely" }).click(),
    ]);
    await page.locator(".data-context").waitFor();
    const cookies = await page.context().cookies(portalOrigin);
    assert.ok(cookies.some((cookie) => cookie.name === "np_session"), "Authenticated Lighthouse session cookie was not issued.");
    return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
  } finally {
    await browser.close();
  }
}

function score(category) {
  return Math.round((category?.score ?? 0) * 100);
}

function metric(lhr, id) {
  const audit = lhr.audits[id];
  return { numericValue: audit?.numericValue ?? null, displayValue: audit?.displayValue ?? null };
}

async function auditPage(name, pathName, formFactor, cookieHeader = "") {
  const flags = {
    port: chrome.port,
    output: "json",
    logLevel: "error",
    onlyCategories: ["performance", "accessibility", "best-practices"],
    formFactor,
    extraHeaders: cookieHeader ? { Cookie: cookieHeader } : undefined,
  };
  const result = await lighthouse(`${portalOrigin}${pathName}`, flags, formFactor === "desktop" ? desktopConfig : undefined);
  if (!result) throw new Error(`Lighthouse returned no result for ${name}.`);
  const lhr = result.lhr;
  if (lhr.runtimeError) throw new Error(`${name}: ${lhr.runtimeError.message}`);
  const summary = {
    name,
    path: pathName,
    formFactor,
    scores: {
      performance: score(lhr.categories.performance),
      accessibility: score(lhr.categories.accessibility),
      bestPractices: score(lhr.categories["best-practices"]),
    },
    metrics: {
      firstContentfulPaint: metric(lhr, "first-contentful-paint"),
      largestContentfulPaint: metric(lhr, "largest-contentful-paint"),
      cumulativeLayoutShift: metric(lhr, "cumulative-layout-shift"),
      totalBlockingTime: metric(lhr, "total-blocking-time"),
      totalByteWeight: metric(lhr, "total-byte-weight"),
    },
  };
  assert.ok(summary.scores.performance >= 90, `${name}: performance score ${summary.scores.performance} is below 90.`);
  assert.ok(summary.scores.accessibility >= 95, `${name}: accessibility score ${summary.scores.accessibility} is below 95.`);
  assert.ok(summary.scores.bestPractices >= 95, `${name}: best-practices score ${summary.scores.bestPractices} is below 95.`);
  return summary;
}

stopValidationRuntime();
if (existsSync(runtimeRoot)) rmSync(runtimeRoot, { recursive: true, force: true });
rmSync(artifactRoot, { recursive: true, force: true });
mkdirSync(artifactRoot, { recursive: true });

try {
  run("npm", ["run", "build", "--workspace=@novapharm/portal"], "Portal production build");
  run(
    process.execPath,
    [join(repositoryRoot, "scripts", "start-browser-validation.mjs"), runtimeRoot],
    "Synthetic API startup",
    { ...process.env, PORTAL_VALIDATION_ORIGIN: portalOrigin },
  );
  startPortal();
  await waitFor(portalOrigin);

  const credentials = JSON.parse(readFileSync(credentialsPath, "utf8"));
  assert.equal(typeof credentials.username, "string");
  assert.equal(typeof credentials.password, "string");
  const cookieHeader = await authenticatedCookieHeader(credentials);

  chrome = await launch({ chromePath: chromium.executablePath(), chromeFlags: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage"] });
  const results = [];
  for (const formFactor of ["desktop", "mobile"]) {
    results.push(await auditPage(`Portal sign-in (${formFactor})`, "/", formFactor));
    results.push(await auditPage(`Customer dashboard (${formFactor})`, "/portal/dashboard/", formFactor, cookieHeader));
  }
  const report = { generatedAt: new Date().toISOString(), candidate: "local production standalone portal with isolated synthetic API", results };
  writeFileSync(join(artifactRoot, "summary.json"), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(
    join(artifactRoot, "summary.md"),
    `# Portal Lighthouse acceptance\n\n${results.map((entry) => `- ${entry.name}: performance ${entry.scores.performance}, accessibility ${entry.scores.accessibility}, best practices ${entry.scores.bestPractices}; LCP ${entry.metrics.largestContentfulPaint.displayValue}; CLS ${entry.metrics.cumulativeLayoutShift.displayValue}; TBT ${entry.metrics.totalBlockingTime.displayValue}.`).join("\n")}\n\nSEO is intentionally excluded because every portal route is private and noindex. Raw Lighthouse reports and temporary authentication material are not persisted.\n`,
  );
  console.log(`Portal Lighthouse acceptance passed for ${results.length} authenticated and anonymous profiles.`);
} finally {
  if (chrome) await chrome.kill();
  if (portalProcess && portalProcess.exitCode === null) {
    portalProcess.kill("SIGTERM");
    await Promise.race([
      new Promise((resolvePromise) => portalProcess.once("exit", resolvePromise)),
      new Promise((resolvePromise) => setTimeout(resolvePromise, 5_000)),
    ]);
  }
  stopValidationRuntime();
  if (existsSync(runtimeRoot)) rmSync(runtimeRoot, { recursive: true, force: true });
}

console.log("Portal Lighthouse runtime and protected synthetic identity were removed.");
