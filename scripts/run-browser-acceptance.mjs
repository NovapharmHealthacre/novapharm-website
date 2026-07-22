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
      rawBrowserErrorVisible: bodyText.includes("The string did not match the expected pattern."),
      staticBackendMessageVisible: bodyText.includes("Secure portal backend is not active on this static host yet.")
    };
  });

  if (!response || response.status() >= 400) addIssue({ ...context, type: "http-status", detail: response?.status() ?? "no response" });
  if (actualPath !== expectedPath) addIssue({ ...context, type: "unexpected-redirect", detail: `${expectedPath} -> ${actualPath}` });
  if (!diagnostics.title) addIssue({ ...context, type: "missing-title" });
  if (diagnostics.h1Count !== 1) addIssue({ ...context, type: "heading-count", detail: diagnostics.h1Count });
  if (diagnostics.documentWidth > diagnostics.viewportWidth + 2) {
    addIssue({ ...context, type: "horizontal-overflow", detail: `${diagnostics.documentWidth}px > ${diagnostics.viewportWidth}px` });
  }
  if (diagnostics.overflowingText.length) addIssue({ ...context, type: "text-overflow", detail: diagnostics.overflowingText });
  if (diagnostics.incompleteImages.length) addIssue({ ...context, type: "incomplete-images", detail: diagnostics.incompleteImages });
  if (diagnostics.brokenImages.length) addIssue({ ...context, type: "broken-images", detail: diagnostics.brokenImages });
  if (!diagnostics.visibleLogoCount) addIssue({ ...context, type: "missing-visible-official-logo" });
  if (diagnostics.rawBrowserErrorVisible || diagnostics.staticBackendMessageVisible) {
    addIssue({ ...context, type: "prohibited-browser-message" });
  }
  for (const detail of [...new Set(browserErrors)]) addIssue({ ...context, type: "browser-console", detail });

  const shouldCapture = area === "public"
    ? screenshotPublicRoutes.has(routeName)
    : screenshotProtectedRoutes.has(routeName);
  if (shouldCapture) {
    const imagePath = resolve(screenshotRoot, engineName, viewportName, area, `${routeName}.jpg`);
    screenshots.push(await captureEvidence(page, imagePath));
  }

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  axeScans += 1;
  for (const violation of accessibility.violations) {
    addIssue({
      ...context,
      type: "axe-violation",
      detail: {
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        nodes: violation.nodes.length,
        targets: violation.nodes.slice(0, 5).map((node) => node.target)
      }
    });
  }

}

async function dismissCookieBanner(page) {
  const dialogReject = page.locator("dialog [data-consent-action='reject']");
  if (await dialogReject.isVisible().catch(() => false)) {
    await dialogReject.click();
    return;
  }
  const rejects = page.locator("[data-consent-action='reject']");
  for (let index = 0; index < await rejects.count(); index += 1) {
    const reject = rejects.nth(index);
    if (await reject.isVisible().catch(() => false)) {
      await reject.click();
      return;
    }
  }
}

for (const [engineName, engine] of engines) {
  console.log(`Starting ${engineName} browser acceptance.`);
  const browser = await engine.launch({ headless: true });
  try {
    const storageStates = new Map();
    const redirectByAccessType = {
      customer: "/portal/dashboard/",
      employee: "/employee/dashboard/",
      board: "/portal/executive-platform/",
      admin: "/admin/dashboard/"
    };
    for (const accessType of new Set(protectedRoutes.map(([, , routeAccessType]) => routeAccessType))) {
      const authenticationContext = await browser.newContext({
        baseURL: baseUrl,
        viewport: viewports[0][1],
        locale: "en-GB",
        reducedMotion: "reduce"
      });
      const authenticationPage = await authenticationContext.newPage();
      await authenticationPage.goto(`${baseUrl}/portal/`, { waitUntil: "domcontentloaded" });
      await waitForStablePage(authenticationPage);
      await dismissCookieBanner(authenticationPage);
      await authenticationPage.locator(`input[name='accessType'][value='${accessType}']`).check();
      await authenticationPage.locator("#username").fill(credentials.username);
      await authenticationPage.locator("#password").fill(credentials.password);
      await Promise.all([
        authenticationPage.waitForURL((url) => url.pathname === redirectByAccessType[accessType], { timeout: 15000 }),
        authenticationPage.locator("button[type='submit']").click()
      ]);
      storageStates.set(accessType, await authenticationContext.storageState());
      await authenticationContext.close();
    }

    for (const [viewportName, viewport] of viewports) {
      const publicContext = await browser.newContext({
        baseURL: baseUrl,
        viewport,
        locale: "en-GB",
        reducedMotion: "reduce"
      });
      const publicPage = await publicContext.newPage();

      await publicPage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
      await waitForStablePage(publicPage);
      const bannerPath = resolve(screenshotRoot, engineName, viewportName, "interactions", "cookie-banner.jpg");
      screenshots.push(await captureEvidence(publicPage, bannerPath, { fullPage: false }));
      const manage = publicPage.locator("[data-consent-action='manage']");
      if (await manage.isVisible().catch(() => false)) {
        await manage.click();
        const preferencePath = resolve(screenshotRoot, engineName, viewportName, "interactions", "cookie-preferences.jpg");
        screenshots.push(await captureEvidence(publicPage, preferencePath, { fullPage: false }));
        await dismissCookieBanner(publicPage);
      } else {
        addIssue({ engine: engineName, viewport: viewportName, route: "home", area: "interaction", type: "cookie-controls-missing" });
      }

      if (viewport.width <= 768) {
        await publicPage.locator("[data-nav-toggle]").click();
        const mobileMenuPath = resolve(screenshotRoot, engineName, viewportName, "interactions", "mobile-navigation.jpg");
        screenshots.push(await captureEvidence(publicPage, mobileMenuPath, { fullPage: false }));
      }

      for (const [routeName, routePath] of publicRoutes) {
        await inspectPage({ page: publicPage, engineName, viewportName, routeName, expectedPath: routePath, area: "public" });
      }
      await publicContext.close();

      for (const accessType of storageStates.keys()) {
        const protectedContext = await browser.newContext({
          baseURL: baseUrl,
          viewport,
          locale: "en-GB",
          reducedMotion: "reduce",
          storageState: storageStates.get(accessType)
        });
        const protectedPage = await protectedContext.newPage();
        for (const [routeName, routePath, routeAccessType] of protectedRoutes.filter(([, , value]) => value === accessType)) {
          await inspectPage({ page: protectedPage, engineName, viewportName, routeName, expectedPath: routePath, area: `protected-${routeAccessType}` });
        }
        await protectedContext.close();
      }
      console.log(`Completed ${engineName} ${viewportName}.`);
    }
  } finally {
    await browser.close();
  }
}

const finishedAt = new Date().toISOString();
const expectedPages = engines.length * viewports.length * (publicRoutes.length + protectedRoutes.length);
if (pagesInspected !== expectedPages) {
  addIssue({ type: "inspection-count", detail: `${pagesInspected} inspected; ${expectedPages} expected` });
}
const report = {
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
  issues
};

const issueSummary = Object.fromEntries(
  [...issues.reduce((counts, issue) => counts.set(issue.type, (counts.get(issue.type) || 0) + 1), new Map())]
    .sort((left, right) => right[1] - left[1])
);
report.issueSummary = issueSummary;

writeFileSync(resolve(outputRoot, "visual-acceptance.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(resolve(outputRoot, "visual-acceptance.md"), `# Browser Acceptance Evidence\n\n- Status: **${report.status.toUpperCase()}**\n- Shard: \`${shardId}\`\n- Commit: \`${commit}\`\n- Engine: ${report.engines.join(", ")}\n- Viewports: ${report.viewports.map(({ name }) => name).join(", ")}\n- Pages inspected: ${pagesInspected} of ${expectedPages} expected\n- Axe scans: ${axeScans}\n- Curated screenshots: ${screenshots.length}\n- Issues: ${issues.length}\n- Started: ${startedAt}\n- Finished: ${finishedAt}\n\nSynthetic credentials are not included in this report.\n`);

console.log(`Browser acceptance ${report.status}: ${pagesInspected} pages, ${axeScans} axe scans, ${screenshots.length} screenshots, ${issues.length} issues.`);
if (issues.length) {
  console.log(`Issue summary: ${JSON.stringify(issueSummary)}`);
  console.log(`First issues: ${JSON.stringify(issues.slice(0, 12))}`);
}
if (issues.length) process.exitCode = 1;
