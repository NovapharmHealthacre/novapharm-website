import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, relative, resolve, sep } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium, webkit } from "playwright";

const repositoryRoot = resolve(process.cwd());
const staticMode = !process.env.ONCOLOGY_AI_ACCEPTANCE_BASE_URL;
const baseUrl = new URL(process.env.ONCOLOGY_AI_ACCEPTANCE_BASE_URL || "http://novapharm.local").origin;
const outputRoot = resolve(process.env.ONCOLOGY_AI_ACCEPTANCE_OUTPUT || "audit/evidence/oncology-ai-browser");
const evidencePath = resolve(outputRoot, "oncology-cro-browser-acceptance.json");
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
const screenshotViewports = new Set([
  "desktop-1920x1080",
  "desktop-1440x900",
  "desktop-1280x720",
  "tablet-768x1024",
  "mobile-390x844"
]);
const issues = [];
const results = [];
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
  return {
    path: relative(outputRoot, path),
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex")
  };
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

async function dismissConsent(page) {
  const reject = page.locator("[data-consent-action='reject']");
  if (await reject.count()) {
    const first = reject.first();
    if (await first.isVisible()) await first.click();
  }
}

async function diagnostics(page) {
  return page.evaluate(() => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    return {
      h1Count: document.querySelectorAll("h1").length,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.currentSrc || image.src),
      visibleLogo: [...document.querySelectorAll("img[alt='NovaPharm Healthcare']")].some(visible),
      internalReference: /localhost|127\.0\.0\.1|\/Users\//.test(document.body.innerText)
    };
  });
}

async function inspectPage(page, context, expectations) {
  const response = await page.goto(expectations.route, { waitUntil: "domcontentloaded", timeout: 30000 });
  const status = response?.status() ?? 0;
  if (status !== 200) addIssue(context, "unexpected-http-status", { expected: 200, actual: status });
  await settle(page);
  await dismissConsent(page);

  const data = await diagnostics(page);
  if (data.h1Count !== 1) addIssue(context, "invalid-h1-count", data.h1Count);
  if (data.documentWidth > data.viewportWidth + 2) addIssue(context, "horizontal-overflow", { documentWidth: data.documentWidth, viewportWidth: data.viewportWidth });
  if (data.brokenImages.length) addIssue(context, "broken-images", data.brokenImages);
  if (!data.visibleLogo) addIssue(context, "official-logo-not-visible");
  if (data.internalReference) addIssue(context, "internal-reference-visible");

  for (const expectation of expectations.selectors) {
    const count = await page.locator(expectation.selector).count();
    if (count !== expectation.count) addIssue(context, "selector-count", { selector: expectation.selector, expected: expectation.count, actual: count });
  }
  for (const forbidden of expectations.forbidden) {
    const count = await page.locator(forbidden).count();
    if (count !== 0) addIssue(context, "forbidden-selector-present", { selector: forbidden, count });
  }
  for (const requiredText of expectations.text) {
    if (!(await page.getByText(requiredText, { exact: false }).count())) addIssue(context, "required-text-missing", requiredText);
  }

  const axe = await new AxeBuilder({ page }).analyze();
  if (axe.violations.length) {
    addIssue(context, "axe-violations", axe.violations.map((violation) => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.length })));
  }

  const result = {
    ...context,
    status,
    h1Count: data.h1Count,
    brokenImages: data.brokenImages.length,
    horizontalOverflow: data.documentWidth > data.viewportWidth + 2,
    axeViolations: axe.violations.length
  };
  results.push(result);
  return result;
}

async function verifyRemovedRoute(page, context, route) {
  const response = await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30000 });
  const status = response?.status() ?? 0;
  results.push({ ...context, route, status, expectedStatus: 404 });
  if (status !== 404) addIssue({ ...context, route }, "removed-route-still-public", { expected: 404, actual: status });
}

for (const [engineName, browserType] of engines) {
  const browser = await browserType.launch({ headless: true });
  try {
    for (const [viewportName, viewport] of viewports) {
      const context = await browser.newContext({ baseURL: baseUrl, viewport, locale: "en-GB", reducedMotion: "reduce" });
      await installStaticRoutes(context);
      const page = await context.newPage();
      const baseContext = { engine: engineName, viewport: viewportName };

      await inspectPage(page, { ...baseContext, page: "oncology" }, {
        route: "/oncology/",
        selectors: [
          { selector: ".oncology-hero", count: 1 },
          { selector: ".oncology-editorial-gallery", count: 1 },
          { selector: ".oncology-editorial-grid figure", count: 3 }
        ],
        forbidden: ["[data-ai-search-open]", ".ai-search-dialog", ".oncology-ai-roadmap"],
        text: ["Oncology continuity starts before supply.", "Product, formulation and controlled handling must be read together."]
      });

      await inspectPage(page, { ...baseContext, page: "cro" }, {
        route: "/cro/",
        selectors: [
          { selector: ".cro-leadership-grid .cro-leader", count: 3 },
          { selector: '.cro-leader[href="/leadership/prabhakar-lahare/"]', count: 1 }
        ],
        forbidden: ["[data-ai-search-open]", ".ai-search-dialog"],
        text: ["Scientific scrutiny and accountable programme framing.", "Prabhakar Vitthal Lahare"]
      });

      await inspectPage(page, { ...baseContext, page: "home" }, {
        route: "/",
        selectors: [{ selector: "a.nav-portal[href='/portal/']", count: 1 }],
        forbidden: ["[data-ai-search-open]", ".nav-search", ".ai-search-dialog"],
        text: ["Building a more resilient pharmaceutical supply network."]
      });

      if (viewport.width <= 1024) {
        await page.goto("/", { waitUntil: "domcontentloaded", timeout: 30000 });
        const toggle = page.locator("[data-nav-toggle]");
        if (!(await toggle.count())) addIssue(baseContext, "mobile-navigation-toggle-missing");
        else {
          await toggle.click();
          const expanded = await toggle.getAttribute("aria-expanded");
          if (expanded !== "true") addIssue(baseContext, "mobile-navigation-did-not-open", expanded);
        }
      }

      await verifyRemovedRoute(page, baseContext, "/search/");
      await verifyRemovedRoute(page, baseContext, "/technology/ai-governance/");

      if (screenshotViewports.has(viewportName)) {
        for (const route of ["oncology", "cro"]) {
          await page.goto(`/${route}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
          await settle(page);
          await dismissConsent(page);
          const directory = resolve(outputRoot, engineName);
          mkdirSync(directory, { recursive: true });
          const path = resolve(directory, `${route}-${viewportName}.png`);
          await page.screenshot({ path, fullPage: true, animations: "disabled" });
          screenshots.push({ engine: engineName, viewport: viewportName, route, ...checksum(path) });
        }
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }
}

const evidence = {
  generatedAt: new Date().toISOString(),
  commit: process.env.GITHUB_SHA || null,
  scope: "Owner-directed Oncology, CRO and public-search removal acceptance",
  engines: engines.map(([name]) => name),
  viewports: viewports.map(([name, viewport]) => ({ name, ...viewport })),
  cases: results.length,
  screenshots,
  issues
};
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

const report = `# Oncology and CRO Browser Acceptance\n\n- Generated: ${evidence.generatedAt}\n- Engines: Chromium and WebKit\n- Viewports per engine: ${viewports.length}\n- Assertions recorded: ${results.length}\n- Screenshots: ${screenshots.length}\n- Issues: ${issues.length}\n\n## Scope\n\n- Oncology gallery and responsive imagery\n- Three CRO Senior judgement leaders, including Prabhakar Vitthal Lahare\n- Removal of public Search & Ask and Responsible AI controls\n- 404 responses for deleted public search and AI-governance routes\n- Mobile navigation\n- Broken images, overflow, official logo and Axe accessibility\n\n${issues.length ? `## Issues\n\n${issues.map((issue) => `- ${JSON.stringify(issue)}`).join("\n")}\n` : "## Result\n\nPASS — the owner-directed browser acceptance matrix completed without issues.\n"}`;
writeFileSync(resolve("audit/oncology-ai-browser-report.md"), report);

const accessibilityIssues = issues.filter((issue) => issue.type === "axe-violations");
writeFileSync(resolve("audit/oncology-ai-accessibility-report.md"), `# Oncology and CRO Accessibility Report\n\n- Generated: ${evidence.generatedAt}\n- Axe cases: ${results.filter((result) => "axeViolations" in result).length}\n- Violations: ${accessibilityIssues.length}\n\n${accessibilityIssues.length ? accessibilityIssues.map((issue) => `- ${JSON.stringify(issue)}`).join("\n") : "PASS — no Axe violations were reported in the focused matrix."}\n`);

if (issues.length) {
  console.error(`Oncology and CRO browser acceptance failed with ${issues.length} issue(s).`);
  process.exit(1);
}
console.log(`Oncology and CRO browser acceptance passed: ${results.length} assertions, ${screenshots.length} screenshots.`);
