import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium, webkit } from "playwright";

const baseUrl = new URL(process.env.CRO_ACCEPTANCE_BASE_URL || "http://127.0.0.1:4180").origin;
const outputRoot = resolve(process.env.CRO_ACCEPTANCE_OUTPUT || "audit/evidence/cro-browser");
const evidencePath = resolve(outputRoot, "cro-browser-acceptance.json");

const engines = [
  ["chromium", chromium],
  ["webkit", webkit]
];

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

const routes = [
  ["home", "/"],
  ["cro", "/cro/"],
  ["services", "/services/"],
  ["regulatory", "/regulatory-services/"],
  ["partners", "/partner-with-us/"],
  ["technology", "/technology/"],
  ["contact", "/contact/"]
];

const screenshotViewports = new Set(["desktop-1440x900", "tablet-768x1024", "mobile-390x844"]);
const issues = [];
const results = [];
const screenshots = [];

mkdirSync(outputRoot, { recursive: true });

function addIssue(context, type, detail = undefined) {
  issues.push({ ...context, type, ...(detail === undefined ? {} : { detail }) });
}

function checksum(path) {
  const bytes = readFileSync(path);
  return {
    path: relative(outputRoot, path),
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex")
  };
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
  await page.waitForFunction(() => [...document.images].every((image) => image.complete), null, { timeout: 10000 }).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(120);
}

async function inspect({ browser, engineName, viewportName, viewport, routeName, path }) {
  const context = await browser.newContext({
    baseURL: baseUrl,
    viewport,
    locale: "en-GB",
    reducedMotion: "reduce",
    colorScheme: "light"
  });
  const page = await context.newPage();
  const record = { engine: engineName, viewport: viewportName, route: routeName, path };
  const consoleErrors = [];
  const externalRequests = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (!["data:", "blob:"].includes(requestUrl.protocol) && requestUrl.origin !== baseUrl) externalRequests.push(request.url());
  });

  try {
    const response = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 30000 });
    await settle(page);
    await dismissConsent(page);

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
        .slice(0, 12)
        .map(selector);
      const brokenImages = [...document.images]
        .filter((image) => image.complete && image.naturalWidth === 0)
        .map((image) => image.currentSrc || image.src);
      const bodyText = document.body.innerText;
      const navToggle = document.querySelector("[data-nav-toggle]");
      const hero = document.querySelector(".cro-hero");
      const heroCopy = document.querySelector(".cro-hero-copy");
      return {
        title: document.title,
        h1Count: document.querySelectorAll("h1").length,
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        overflowingText,
        brokenImages,
        visibleLogo: [...document.querySelectorAll("img[alt='NovaPharm Healthcare']")].some(visible),
        navToggleVisible: navToggle ? visible(navToggle) : false,
        rawBrowserError: bodyText.includes("The string did not match the expected pattern."),
        staticBackendMessage: bodyText.includes("Secure portal backend is not active on this static host yet."),
        localhostReference: /localhost|127\.0\.0\.1|\/Users\//.test(bodyText),
        cro: hero ? {
          stages: document.querySelectorAll("[data-cro-stage]").length,
          stageLinks: document.querySelectorAll("[data-cro-stage-link]").length,
          serviceModules: document.querySelectorAll(".cro-service, .cro-service-disclosures details").length,
          responsibilityLanes: document.querySelectorAll(".cro-lane").length,
          decisionOptions: document.querySelectorAll("[data-cro-decision-item]").length,
          faqs: document.querySelectorAll("#cro-faq details").length,
          heroAnimation: heroCopy ? getComputedStyle(heroCopy).animationName : "missing",
          heroImageWidth: hero.querySelector("img")?.naturalWidth || 0
        } : null
      };
    });

    record.httpStatus = response?.status() ?? null;
    record.diagnostics = diagnostics;
    record.consoleErrors = [...new Set(consoleErrors)];
    record.externalRequests = [...new Set(externalRequests)];

    if (!response || response.status() >= 400) addIssue(record, "http-status", response?.status() ?? "no response");
    if (diagnostics.h1Count !== 1) addIssue(record, "h1-count", diagnostics.h1Count);
    if (!diagnostics.title) addIssue(record, "missing-title");
    if (!diagnostics.visibleLogo) addIssue(record, "missing-official-logo");
    if (diagnostics.documentWidth > diagnostics.viewportWidth + 2) addIssue(record, "horizontal-overflow", `${diagnostics.documentWidth} > ${diagnostics.viewportWidth}`);
    if (diagnostics.overflowingText.length) addIssue(record, "text-overflow", diagnostics.overflowingText);
    if (diagnostics.brokenImages.length) addIssue(record, "broken-images", diagnostics.brokenImages);
    if (diagnostics.rawBrowserError || diagnostics.staticBackendMessage) addIssue(record, "prohibited-browser-message");
    if (diagnostics.localhostReference) addIssue(record, "internal-reference-visible");
    if (record.consoleErrors.length) addIssue(record, "console-error", record.consoleErrors);
    if (record.externalRequests.length) addIssue(record, "unexpected-third-party-runtime-request", record.externalRequests);

    const narrow = viewport.width < 1300;
    if (diagnostics.navToggleVisible !== narrow) addIssue(record, "navigation-breakpoint", { expectedToggle: narrow, actualToggle: diagnostics.navToggleVisible });

    if (routeName === "cro") {
      const expected = { stages: 8, stageLinks: 8, serviceModules: 8, responsibilityLanes: 3, decisionOptions: 6, faqs: 10 };
      for (const [key, value] of Object.entries(expected)) {
        if (diagnostics.cro?.[key] !== value) addIssue(record, `cro-${key}`, diagnostics.cro?.[key]);
      }
      if (!diagnostics.cro?.heroImageWidth) addIssue(record, "cro-hero-image");
      if (diagnostics.cro?.heroAnimation !== "none") addIssue(record, "reduced-motion-animation", diagnostics.cro?.heroAnimation);

      if (narrow) {
        const toggle = page.locator("[data-nav-toggle]");
        await toggle.click();
        if (!(await page.locator("#primary-navigation").isVisible())) addIssue(record, "mobile-menu-open");
        await toggle.click();
      }

      const noFitButton = page.locator("[data-cro-decision-item]").filter({ hasText: "Full-service CRO route" });
      if (await noFitButton.count() !== 1) addIssue(record, "decision-no-fit-option");
      else {
        await noFitButton.click();
        const output = await page.locator("[data-cro-decision-title]").textContent();
        if (!output?.includes("may not be the appropriate model")) addIssue(record, "decision-no-fit-output", output);
      }
    }

    if (routeName === "contact") {
      const optionCount = await page.locator("#contact-type option", { hasText: "Clinical development & CRO support" }).count();
      if (optionCount !== 1) addIssue(record, "contact-cro-topic", optionCount);
    }

    page.removeAllListeners("console");
    page.removeAllListeners("pageerror");
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    record.axeViolations = axe.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.length,
      targets: violation.nodes.slice(0, 5).map((node) => node.target)
    }));
    for (const violation of record.axeViolations) addIssue(record, "axe-violation", violation);

    if (routeName === "cro" && screenshotViewports.has(viewportName)) {
      const screenshotPath = resolve(outputRoot, engineName, `${viewportName}.png`);
      mkdirSync(dirname(screenshotPath), { recursive: true });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: screenshotPath, fullPage: false, animations: "disabled" });
      screenshots.push(checksum(screenshotPath));
    }

    results.push(record);
  } catch (error) {
    addIssue(record, "acceptance-exception", error instanceof Error ? error.message : String(error));
    results.push({ ...record, exception: error instanceof Error ? error.message : String(error) });
  } finally {
    await context.close();
  }
}

for (const [engineName, engine] of engines) {
  console.log(`Running CRO acceptance in ${engineName}.`);
  const browser = await engine.launch({ headless: true });
  try {
    for (const [viewportName, viewport] of viewports) {
      for (const [routeName, path] of routes) {
        await inspect({ browser, engineName, viewportName, viewport, routeName, path });
      }
    }

    const noJavaScript = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false, locale: "en-GB" });
    const noJavaScriptPage = await noJavaScript.newPage();
    const noJavaScriptResponse = await noJavaScriptPage.goto(`${baseUrl}/cro/`, { waitUntil: "domcontentloaded" });
    await noJavaScriptPage.waitForLoadState("load", { timeout: 15000 });
    await noJavaScriptPage.locator("body").waitFor({ state: "visible", timeout: 15000 });
    const noJavaScriptResult = await noJavaScriptPage.evaluate(() => ({
      h1Count: document.querySelectorAll("h1").length,
      stages: document.querySelectorAll("[data-cro-stage]").length,
      services: document.querySelectorAll(".cro-service, .cro-service-disclosures details").length,
      faqs: document.querySelectorAll("#cro-faq details").length,
      bodyWidth: document.body.scrollWidth,
      viewportWidth: document.documentElement.clientWidth
    }));
    results.push({ engine: engineName, viewport: "mobile-390x844", route: "cro-no-javascript", httpStatus: noJavaScriptResponse?.status(), diagnostics: noJavaScriptResult });
    if (noJavaScriptResponse?.status() !== 200 || noJavaScriptResult.h1Count !== 1 || noJavaScriptResult.stages !== 8 || noJavaScriptResult.services !== 8 || noJavaScriptResult.faqs !== 10 || noJavaScriptResult.bodyWidth > noJavaScriptResult.viewportWidth + 2) {
      addIssue({ engine: engineName, viewport: "mobile-390x844", route: "cro-no-javascript" }, "progressive-enhancement", noJavaScriptResult);
    }
    await noJavaScript.close();
  } finally {
    await browser.close();
  }
}

const evidence = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  engines: engines.map(([name]) => name),
  viewports: viewports.map(([name, viewport]) => ({ name, ...viewport })),
  routes: routes.map(([name, path]) => ({ name, path })),
  pagesInspected: results.length,
  axeScans: results.filter((result) => Array.isArray(result.axeViolations)).length,
  screenshots,
  issues,
  status: issues.length ? "failed" : "passed",
  results
};

writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`CRO browser evidence written to ${relative(process.cwd(), evidencePath)}.`);
console.log(`${results.length} rendered cases; ${issues.length} issue(s).`);
if (issues.length) process.exit(1);
