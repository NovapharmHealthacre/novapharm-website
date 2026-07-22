import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium, webkit } from "playwright";
import { adminModules, customerModules, employeeModules } from "../src/core/portal-module-catalog.mjs";

const baseUrl = new URL(process.env.VISUAL_BASE_URL || "http://127.0.0.1:4178").origin;
const credentialsPath = resolve(process.env.VISUAL_CREDENTIALS_PATH || "");
const outputRoot = resolve(process.env.VISUAL_OUTPUT_ROOT || `artifacts/visual-acceptance/${new Date().toISOString().replace(/[:.]/g, "-")}`);
const screenshotRoot = resolve(outputRoot, "screenshots");
const shardId = process.env.VISUAL_SHARD_ID || "local-full-matrix";
const viewportGroup = process.env.VISUAL_VIEWPORT_GROUP || "all";

if (!process.env.VISUAL_CREDENTIALS_PATH) throw new Error("VISUAL_CREDENTIALS_PATH is required.");
if ((statSync(credentialsPath).mode & 0o077) !== 0) throw new Error("Visual credentials must not be readable by group or other users.");

const credentials = JSON.parse(readFileSync(credentialsPath, "utf8"));
if (!credentials.username || !credentials.password) throw new Error("Synthetic visual credentials are incomplete.");

let engines = [
  ["chromium", chromium],
  ["webkit", webkit]
];
let viewports = [
  ["desktop-1440x900", { width: 1440, height: 900 }],
  ["desktop-1920x1080", { width: 1920, height: 1080 }],
  ["desktop-1366x768", { width: 1366, height: 768 }],
  ["desktop-1280x800", { width: 1280, height: 800 }],
  ["desktop-1280x720", { width: 1280, height: 720 }],
  ["tablet-1024x1366", { width: 1024, height: 1366 }],
  ["tablet-768x1024", { width: 768, height: 1024 }],
  ["mobile-390x844", { width: 390, height: 844 }],
  ["mobile-430x932", { width: 430, height: 932 }],
  ["mobile-375x667", { width: 375, height: 667 }],
  ["mobile-360x800", { width: 360, height: 800 }],
  ["mobile-320x568", { width: 320, height: 568 }]
];

let publicRoutes = [
  ["home", "/"],
  ["about", "/about/"],
  ["company", "/about/company/"],
  ["governance", "/about/governance/"],
  ["leadership", "/leadership/"],
  ["leadership-vishal-chakravarty", "/leadership/vishal-chakravarty/"],
  ["leadership-prabhakar-lahare", "/leadership/prabhakar-lahare/"],
  ["leadership-girish-achliya", "/leadership/girish-achliya/"],
  ["leadership-helly-panchal", "/leadership/helly-panchal/"],
  ["leadership-nishita-trivedi", "/leadership/nishita-trivedi/"],
  ["services", "/services/"],
  ["regulatory", "/regulatory-services/"],
  ["cro", "/cro/"],
  ["oncology", "/oncology/"],
  ["products", "/product-portfolio/"],
  ["nutraxin-catalogue", "/product-portfolio/nutraxin/"],
  ["partners", "/partner-with-us/"],
  ["technology", "/technology/"],
  ["insights", "/news-insights/"],
  ["insight-traceability", "/news-insights/batch-to-buyer-pharmaceutical-traceability/"],
  ["insight-compliance-distribution", "/news-insights/compliance-first-pharmaceutical-distribution-uk/"],
  ["insight-gdp-qms", "/news-insights/gdp-qms-pharmaceutical-distribution-foundations/"],
  ["insight-oncology-forecasting", "/news-insights/oncology-supply-chain-demand-forecasting/"],
  ["insight-plpi-resilience", "/news-insights/plpi-pharmaceutical-supply-resilience/"],
  ["insight-sourcing-model", "/news-insights/three-pillar-pharmaceutical-sourcing-model/"],
  ["contact", "/contact/"],
  ["account-application", "/account-application/"],
  ["investor-information", "/investor-information/"],
  ["careers", "/careers/"],
  ["legal-index", "/legal/"],
  ["privacy", "/legal/privacy/"],
  ["cookies", "/legal/cookies/"],
  ["terms", "/legal/terms/"],
  ["accessibility", "/legal/accessibility/"],
  ["modern-slavery", "/legal/modern-slavery/"],
  ["environment-carbon", "/legal/environment-carbon/"],
  ["portal-login", "/portal/"],
  ["not-found", "/404.html"],
  ["server-error", "/500.html"],
  ["service-unavailable", "/service-unavailable/"]
];

const executiveRoutes = [
  ["command-centre", "NP_Hub.html"],
  ["ceo-dashboard", "NP_CEO.html"],
  ["sales-intelligence", "NP_Sales.html"],
  ["customer-analytics", "NP_Customers.html"],
  ["product-master", "NP_Products.html"],
  ["nhs-data", "NP_NHS_Data.html"],
  ["plpi", "NP_PLPI.html"],
  ["pharmacovigilance", "NP_PV.html"],
  ["sourcing", "NP_Sourcing.html"],
  ["tenders", "NP_Tenders.html"],
  ["warehouse", "NP_Warehouse.html"],
  ["service-levels", "NP_SLA.html"],
  ["finance", "NP_Finance.html"],
  ["capital", "NP_Capital.html"],
  ["microsoft-365", "NP_M365.html"],
  ["documents", "NP_Documents.html"],
  ["ai-technology", "NP_AI_Tech.html"],
  ["traceability", "NP_Blockchain.html"]
];

let protectedRoutes = [
  ...customerModules.map((module) => [`customer-${module.slug}`, module.route, "customer"]),
  ["customer-password-change", "/portal/change-password/", "customer"],
  ...employeeModules.map((module) => [`employee-${module.slug}`, module.route, "employee"]),
  ["board-executive-platform", "/portal/executive-platform/", "board"],
  ...executiveRoutes.map(([slug, file]) => [`board-${slug}`, `/portal/executive-platform/${file}`, "board"]),
  ...adminModules.map((module) => [`admin-${module.slug}`, module.route, "admin"])
];

function filterNamed(collection, environmentName) {
  const requested = (process.env[environmentName] || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!requested.length) return collection;
  const selected = collection.filter(([name]) => requested.includes(name));
  if (selected.length !== requested.length) {
    const available = collection.map(([name]) => name).join(", ");
    throw new Error(`${environmentName} contains an unknown value. Available values: ${available}`);
  }
  return selected;
}

engines = filterNamed(engines, "VISUAL_ENGINES");
viewports = filterNamed(viewports, "VISUAL_VIEWPORTS");
publicRoutes = filterNamed(publicRoutes, "VISUAL_PUBLIC_ROUTES");
protectedRoutes = process.env.VISUAL_INCLUDE_PROTECTED === "false"
  ? []
  : filterNamed(protectedRoutes, "VISUAL_PROTECTED_ROUTES");

const screenshotPublicRoutes = new Set([
  "home",
  "cro",
  "oncology",
  "services",
  "regulatory",
  "products",
  "partners",
  "technology",
  "contact"
]);
const screenshotProtectedRoutes = new Set([
  "customer-dashboard",
  "employee-dashboard",
  "board-executive-platform",
  "admin-dashboard"
]);

mkdirSync(outputRoot, { recursive: true });

const startedAt = new Date().toISOString();
const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const worktreeDirty = Boolean(execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim());
const issues = [];
const screenshots = [];
let pagesInspected = 0;
let axeScans = 0;

function addIssue(issue) {
  issues.push(issue);
}

function screenshotMetadata(path) {
  const bytes = readFileSync(path);
  return {
    path: relative(outputRoot, path),
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex")
  };
}

async function captureEvidence(page, path, { fullPage = true } = {}) {
  mkdirSync(dirname(path), { recursive: true });
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight
  }));
  const canCaptureFullPage = fullPage && dimensions.width <= 32_000 && dimensions.height <= 32_000;
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path,
    type: "jpeg",
    quality: 82,
    fullPage: canCaptureFullPage,
    animations: "disabled"
  });
  return { ...screenshotMetadata(path), capture: canCaptureFullPage ? "full-page" : "viewport", document: dimensions };
}

async function waitForStablePage(page) {
  await page.locator("body").waitFor({ state: "visible", timeout: 15000 });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    for (const image of document.images) image.loading = "eager";
  });
  await page.waitForFunction(() => [...document.images].every((image) => image.complete), null, { timeout: 8000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(120);
}

async function inspectPage({ page, engineName, viewportName, routeName, expectedPath, area }) {
  const context = { engine: engineName, viewport: viewportName, route: routeName, area };
  const browserErrors = [];
  const onConsole = (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  };
  const onPageError = (error) => browserErrors.push(error.message);
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  const response = await page.goto(`${baseUrl}${expectedPath}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitForStablePage(page);
  page.off("console", onConsole);
  page.off("pageerror", onPageError);
  pagesInspected += 1;

  const actualPath = new URL(page.url()).pathname;
  const diagnostics = await page.evaluate(() => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const selector = (element) => {
      if (element.id) return `#${element.id}`;
      const classes = [...element.classList].slice(0, 2).join(".");
      return `${element.tagName.toLowerCase()}${classes ? `.${classes}` : ""}`;
    };
    const overflowingText = [...document.querySelectorAll("body *")]
      .filter((element) => {
        if (!visible(element) || element.matches(".sr-only, [aria-hidden='true'], table, tbody, thead, tr")) return false;
        if (![...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim())) return false;
        const style = getComputedStyle(element);
        return element.scrollWidth > element.clientWidth + 2 && !["auto", "scroll", "hidden", "clip"].includes(style.overflowX);
      })
      .slice(0, 20)
      .map(selector);
    const incompleteImages = [...document.images]
      .filter((image) => !image.complete)
      .map((image) => image.currentSrc || image.src);
    const brokenImages = [...document.images]
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src);
    const logos = [...document.querySelectorAll("img[alt='NovaPharm Healthcare']")].filter(visible);
    const bodyText = document.body.innerText;
    return {
      title: document.title,
      h1Count: document.querySelectorAll("h1").length,
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      overflowingText,
      incompleteImages,
      brokenImages,
      visibleLogoCount: logos.length,
      bodyText,
      containsInternalReferences: /localhost|127\.0\.0\.1|\/Users\//.test(bodyText)
    };
  });

  const status = response?.status() || 0;
  if (status !== 200) addIssue({ ...context, type: "http-status", detail: status });
  if (actualPath !== expectedPath) addIssue({ ...context, type: "route-mismatch", detail: { expected: expectedPath, actual: actualPath } });
  if (diagnostics.h1Count !== 1) addIssue({ ...context, type: "h1-count", detail: diagnostics.h1Count });
  if (diagnostics.documentWidth > diagnostics.viewportWidth + 2) addIssue({ ...context, type: "horizontal-overflow", detail: { documentWidth: diagnostics.documentWidth, viewportWidth: diagnostics.viewportWidth } });
  if (diagnostics.overflowingText.length) addIssue({ ...context, type: "text-overflow", detail: diagnostics.overflowingText });
  if (diagnostics.incompleteImages.length) addIssue({ ...context, type: "incomplete-images", detail: diagnostics.incompleteImages });
  if (diagnostics.brokenImages.length) addIssue({ ...context, type: "broken-images", detail: diagnostics.brokenImages });
  if (diagnostics.visibleLogoCount < 1) addIssue({ ...context, type: "official-logo-not-visible" });
  if (diagnostics.containsInternalReferences) addIssue({ ...context, type: "internal-reference-visible" });
  for (const error of browserErrors) addIssue({ ...context, type: "browser-console", detail: error });

  const axe = await new AxeBuilder({ page }).analyze();
  axeScans += 1;
  if (axe.violations.length) {
    addIssue({
      ...context,
      type: "axe-violations",
      detail: axe.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.length
      }))
    });
  }

  const shouldCapture = area === "public" ? screenshotPublicRoutes.has(routeName) : screenshotProtectedRoutes.has(routeName);
  if (shouldCapture) {
    const path = resolve(screenshotRoot, engineName, viewportName, area, `${routeName}.jpg`);
    screenshots.push({ engine: engineName, viewport: viewportName, route: routeName, area, ...await captureEvidence(page, path) });
  }
}

async function login(page, accessType) {
  await page.goto(`${baseUrl}/portal/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.fill("#portal-username", credentials.username);
  await page.fill("#portal-password", credentials.password);
  await page.selectOption("#portal-access-type", accessType);
  await Promise.all([
    page.waitForURL((url) => url.pathname.startsWith(accessType === "employee" ? "/employee/" : accessType === "admin" ? "/admin/" : accessType === "board" ? "/portal/executive-platform/" : "/portal/dashboard/"), { timeout: 15000 }),
    page.click("#portal-login-form button[type='submit']")
  ]);
}

async function runInteractionEvidence(page, engineName, viewportName) {
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitForStablePage(page);
  const banner = page.locator("[data-consent-banner]");
  if (await banner.count() && await banner.isVisible()) {
    screenshots.push({
      engine: engineName,
      viewport: viewportName,
      route: "cookie-banner",
      area: "interactions",
      ...await captureEvidence(page, resolve(screenshotRoot, engineName, viewportName, "interactions", "cookie-banner.jpg"), { fullPage: false })
    });
    await page.click("[data-consent-manage]");
    screenshots.push({
      engine: engineName,
      viewport: viewportName,
      route: "cookie-preferences",
      area: "interactions",
      ...await captureEvidence(page, resolve(screenshotRoot, engineName, viewportName, "interactions", "cookie-preferences.jpg"), { fullPage: false })
    });
    await page.click("[data-consent-action='reject']");
  }
  if ((await page.viewportSize())?.width <= 980) {
    await page.click("[data-nav-toggle]");
    screenshots.push({
      engine: engineName,
      viewport: viewportName,
      route: "mobile-navigation",
      area: "interactions",
      ...await captureEvidence(page, resolve(screenshotRoot, engineName, viewportName, "interactions", "mobile-navigation.jpg"), { fullPage: false })
    });
  }
}

for (const [engineName, browserType] of engines) {
  const browser = await browserType.launch({ headless: true });
  try {
    for (const [viewportName, viewport] of viewports) {
      const context = await browser.newContext({ baseURL: baseUrl, viewport, locale: "en-GB", reducedMotion: "reduce" });
      const page = await context.newPage();
      await runInteractionEvidence(page, engineName, viewportName);
      for (const [routeName, path] of publicRoutes) {
        await inspectPage({ page, engineName, viewportName, routeName, expectedPath: path, area: "public" });
      }
      for (const accessType of ["customer", "employee", "board", "admin"]) {
        await context.clearCookies();
        await login(page, accessType);
        for (const [routeName, path, role] of protectedRoutes.filter((route) => route[2] === accessType)) {
          await inspectPage({ page, engineName, viewportName, routeName, expectedPath: path, area: `protected-${role}` });
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

const finishedAt = new Date().toISOString();
const expectedPages = engines.length * viewports.length * (publicRoutes.length + protectedRoutes.length);
const evidence = {
  status: issues.length ? "failed" : "passed",
  shardId,
  viewportGroup,
  commit,
  worktreeDirty,
  baseUrl,
  startedAt,
  finishedAt,
  engines: engines.map(([name]) => name),
  viewports: viewports.map(([name, viewport]) => ({ name, ...viewport })),
  publicRouteCount: publicRoutes.length,
  protectedRouteCount: protectedRoutes.length,
  expectedPages,
  pagesInspected,
  axeScans,
  screenshotCount: screenshots.length,
  screenshots,
  issues,
  issueSummary: issues.reduce((summary, issue) => {
    summary[issue.type] = (summary[issue.type] || 0) + 1;
    return summary;
  }, {})
};

writeFileSync(resolve(outputRoot, "visual-acceptance.json"), `${JSON.stringify(evidence, null, 2)}\n`);
writeFileSync(resolve(outputRoot, "visual-acceptance.md"), `# Browser Acceptance Evidence\n\n- Status: **${evidence.status.toUpperCase()}**\n- Shard: \`${shardId}\`\n- Commit: \`${commit}\`\n- Engine: ${evidence.engines.join(", ")}\n- Viewports: ${evidence.viewports.map((viewport) => viewport.name).join(", ")}\n- Pages inspected: ${pagesInspected} of ${expectedPages} expected\n- Axe scans: ${axeScans}\n- Curated screenshots: ${screenshots.length}\n- Issues: ${issues.length}\n- Started: ${startedAt}\n- Finished: ${finishedAt}\n\nSynthetic credentials are not included in this report.\n`);

if (worktreeDirty) {
  addIssue({ type: "dirty-worktree", detail: "The candidate changed while browser acceptance was running." });
}
if (pagesInspected !== expectedPages) {
  addIssue({ type: "coverage-gap", detail: { pagesInspected, expectedPages } });
}
if (axeScans !== expectedPages) {
  addIssue({ type: "axe-coverage-gap", detail: { axeScans, expectedPages } });
}
if (issues.length) {
  evidence.status = "failed";
  evidence.issues = issues;
  evidence.issueSummary = issues.reduce((summary, issue) => {
    summary[issue.type] = (summary[issue.type] || 0) + 1;
    return summary;
  }, {});
  writeFileSync(resolve(outputRoot, "visual-acceptance.json"), `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(resolve(outputRoot, "visual-acceptance.md"), `# Browser Acceptance Evidence\n\n- Status: **FAILED**\n- Shard: \`${shardId}\`\n- Commit: \`${commit}\`\n- Engine: ${evidence.engines.join(", ")}\n- Viewports: ${evidence.viewports.map((viewport) => viewport.name).join(", ")}\n- Pages inspected: ${pagesInspected} of ${expectedPages} expected\n- Axe scans: ${axeScans}\n- Curated screenshots: ${screenshots.length}\n- Issues: ${issues.length}\n- Started: ${startedAt}\n- Finished: ${finishedAt}\n\nSynthetic credentials are not included in this report.\n`);
  console.error(`Browser acceptance failed with ${issues.length} issue(s).`);
  process.exit(1);
}

console.log(`Browser acceptance passed: ${pagesInspected} pages, ${axeScans} Axe scans, ${screenshots.length} screenshots, zero issues.`);
