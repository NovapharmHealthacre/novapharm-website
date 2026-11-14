import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium, webkit } from "playwright";

const baseUrl = process.env.PUBLIC_PAGES_BASE_URL ?? "http://127.0.0.1:4310";
const artifactRoot = path.resolve(process.env.PUBLIC_PAGES_BROWSER_ARTIFACT_ROOT ?? "artifacts/public-pages-browser");
const routes = [
  { path: "/", name: "home", required: "Medicine. Where it needs to be" },
  { path: "/capabilities/", name: "capabilities", required: "From evidence to access." },
  { path: "/contact/", name: "contact", required: "How can we help?" },
  { path: "/leadership/", name: "leadership", required: "Chief Scientific Officer" },
  { path: "/leadership/girish-achliya/", name: "leadership-girish", required: "Chief Scientific Officer" },
  { path: "/regulatory-services/", name: "regulatory-roadmap", required: "No regulated supply before the required permissions." },
  { path: "/services/", name: "services", required: "Services" },
  { path: "/distribution/", name: "distribution", required: "Global distribution" },
  { path: "/oncology/", name: "oncology", required: "Oncology" },
  { path: "/cro/", name: "cro", required: "Clinical" },
  { path: "/technology/", name: "technology", required: "Technology" },
  { path: "/products/", name: "products-overview", required: "Different products. One purpose." },
  { path: "/products/nutraxin/", name: "nutraxin-collection", required: "Nutraxin" },
  { path: "/products/nutraxin/vitamin-d3-120-tablets/", name: "nutraxin-detail", required: "Nutraxin Vitamin D3" },
  { path: "/products/nutraxin/bag/", name: "nutraxin-bag", required: "Your Bag." },
  { path: "/products/esco/", name: "esco-collection", required: "ESCO" },
  { path: "/products/marketplace/", name: "marketplace", required: "Everything, together." },
  { path: "/account-application/", name: "business-account", required: "An account is approved through evidence" },
  { path: "/legal/privacy/", name: "privacy", required: "Privacy" }
];
const routeViewports = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 900 }
];
const homeGeometryViewports = [
  { name: "compact-320", width: 320, height: 720 },
  { name: "mobile-360", width: 360, height: 800 },
  { name: "mobile-375", width: 375, height: 812 },
  { name: "mobile-414", width: 414, height: 896 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "tablet-820", width: 820, height: 1180 },
  { name: "tablet-1024", width: 1024, height: 768 },
  { name: "desktop-1280", width: 1280, height: 800 },
  { name: "desktop-1366", width: 1366, height: 768 },
  { name: "desktop-1512", width: 1512, height: 982 },
  { name: "desktop-1728", width: 1728, height: 1117 },
  { name: "desktop-1920", width: 1920, height: 1080 },
  { name: "desktop-2560", width: 2560, height: 1440 }
];
const engines = [
  ["chromium", chromium],
  ["webkit", webkit]
];

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/`, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
    } catch {
      // static server is still starting
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Static public server did not become ready at ${baseUrl}`);
}

await waitForServer();
let screenshots = 0;
let axeRuns = 0;
let geometryRuns = 0;

// Only localhost UI acceptance uses fail-closed read-only readiness fixtures.
// Production APIs intentionally reject this test origin; never mock payment,
// account, customer data, or authenticated business endpoints here.
async function mockLocalReadiness(page, pathname) {
  if (pathname === "/products/marketplace/") {
    // Public stock API rejects the CI localhost origin. Simulate an
    // unverifiable read-only result, never trusted warehouse evidence.
    await page.route(/^https:\/\/eyoj5e64zb\.execute-api\.eu-north-1\.amazonaws\.com\/stock\?skus=/, async request => {
      await request.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({schema:"novapharm-commerce-stock-public-v1",notPaymentAuthority:true,items:[]})
      });
    });
  }
  const checkoutApi = pathname === "/products/nutraxin/bag/"
    ? "https://7cs8kxkj5d.execute-api.eu-north-1.amazonaws.com/readiness"
    : pathname.startsWith("/products/esco/")
      ? "https://vflz5z5jfc.execute-api.eu-north-1.amazonaws.com/readiness"
      : null;
  if (!checkoutApi) return;
  await page.route(checkoutApi, async request => {
    await request.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        checkout_ready: false,
        payment_collection_active: false,
        approved_catalogue_ids: [],
        origin: "localhost"
      })
    });
  });
}

async function dismissConsent(page) {
  const reject = page.locator("[data-consent-action='reject']:visible").first();
  if (await reject.count()) {
    await reject.click();
    await reject.waitFor({ state: "hidden", timeout: 5_000 });
  }
}

async function materialiseLazyMedia(page) {
  const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  for (let y = 0; y < documentHeight; y += Math.max(320, Math.floor(viewportHeight * 0.8))) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
    await page.waitForTimeout(35);
  }
  await page.evaluate(() => {
    for (const image of document.images) {
      if (!image.complete) image.loading = "eager";
    }
  });
  await page.waitForFunction(
    () => [...document.images].every((image) => image.complete),
    undefined,
    { timeout: 15_000 }
  );
  await page.evaluate(async () => {
    await Promise.all([...document.images].map(async (image) => {
      if (typeof image.decode === "function" && image.naturalWidth > 0) {
        await image.decode().catch(() => undefined);
      }
    }));
  });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(100);
}

async function inspectLayout(page) {
  return page.evaluate(() => {
    const midWordBreaks = [];
    for (const heading of document.querySelectorAll("main h1, main h2")) {
      const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        const value = node.textContent ?? "";
        let previousTop;
        for (let index = 0; index < value.length; index += 1) {
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + 1);
          const rect = range.getBoundingClientRect();
          if (
            previousTop !== undefined &&
            Math.abs(rect.top - previousTop) > 2 &&
            /[\p{L}\p{N}]/u.test(value[index - 1] ?? "") &&
            /[\p{L}\p{N}]/u.test(value[index] ?? "")
          ) {
            midWordBreaks.push(heading.textContent?.trim() ?? "");
            break;
          }
          if (rect.width || rect.height) previousTop = rect.top;
        }
        node = walker.nextNode();
      }
    }
    return {
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      mainText: (document.querySelector("main")?.textContent ?? "").trim(),
      brokenImages: [...document.images]
        .filter((image) => image.complete && image.naturalWidth === 0)
        .map((image) => image.currentSrc || image.src),
      unloadedImages: [...document.images]
        .filter((image) => !image.complete)
        .map((image) => image.currentSrc || image.src),
      midWordBreaks: [...new Set(midWordBreaks)],
      // A clipped main heading or form field may be hidden by overflow:clip
      // without increasing document.scrollWidth. Inspect rendered geometry.
      clippedContent: [...document.querySelectorAll(
        "main h1, main form input:not([type='hidden']), main form select, main form textarea, main form button"
      )].filter((element) => {
        // Intentionally offscreen honeypot inputs must remain hidden for abuse protection.
        if (element.closest('[aria-hidden="true"], .honeypot')) return false;
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 &&
          (rect.left < -2 || rect.right > document.documentElement.clientWidth + 2);
      }).slice(0, 12).map((element) => ({
        node: element.tagName.toLowerCase(),
        label: (element.textContent || element.getAttribute("aria-label") || element.getAttribute("name") || "").trim().slice(0, 60),
        left: Math.round(element.getBoundingClientRect().left),
        right: Math.round(element.getBoundingClientRect().right)
      }))
    };
  });
}

async function assertLayout(page, label) {
  const layout = await inspectLayout(page);
  assert.ok(layout.mainText.length > 80, `${label}: main content is unexpectedly blank`);
  assert.ok(
    layout.documentWidth <= layout.viewportWidth + 2,
    `${label}: horizontal overflow ${layout.documentWidth} > ${layout.viewportWidth}`
  );
  assert.deepEqual(layout.brokenImages, [], `${label}: broken images found`);
  assert.deepEqual(layout.unloadedImages, [], `${label}: images did not finish loading`);
  assert.deepEqual(layout.midWordBreaks, [], `${label}: headings wrap inside a word`);
  assert.deepEqual(layout.clippedContent, [], `${label}: primary heading or form controls extend beyond the viewport`);
}

async function assertFooterHeadings(page, label) {
  const footer = await page.evaluate(() => {
    const root = document.querySelector("footer.npd-footer.site-footer");
    if (!root || getComputedStyle(root).display === "none") return null;
    const headings = [...root.querySelectorAll(".npd-footer-top h2")];
    const sizes = headings.map((node) => Number.parseFloat(getComputedStyle(node).fontSize));
    const overflow = headings.filter((node) => {
      const parent = node.parentElement.getBoundingClientRect();
      const box = node.getBoundingClientRect();
      return box.left < parent.left - 1 || box.right > parent.right + 1;
    }).map((node) => node.textContent.trim());
    const overlaps = [];
    for (let i = 0; i < headings.length; i += 1) {
      for (let j = i + 1; j < headings.length; j += 1) {
        const a = headings[i].getBoundingClientRect();
        const b = headings[j].getBoundingClientRect();
        if (a.right > b.left + 1 && b.right > a.left + 1 &&
            a.bottom > b.top + 1 && b.bottom > a.top + 1) {
          overlaps.push([headings[i].textContent.trim(), headings[j].textContent.trim()]);
        }
      }
    }
    return { count: headings.length, sizes, overflow, overlaps };
  });
  if (!footer) return; // Contact has a separate, intentionally compact footer.
  assert.equal(footer.count, 4, `${label}: expected four corporate footer headings`);
  assert.ok(footer.sizes.every((size) => size >= 12 && size <= 16),
    `${label}: footer headings must use compact typography, got ${footer.sizes}`);
  assert.deepEqual(footer.overflow, [], `${label}: footer heading escaped its column`);
  assert.deepEqual(footer.overlaps, [], `${label}: corporate footer headings overlap`);
}

for (const [engineName, browserType] of engines) {
  const browser = await browserType.launch({ headless: true });
  try {
    for (const viewport of routeViewports) {
      const context = await browser.newContext({
        baseURL: baseUrl,
        viewport: { width: viewport.width, height: viewport.height },
        locale: "en-GB",
        reducedMotion: "reduce",
        colorScheme: "light"
      });
      try {
        for (const route of routes) {
          const page = await context.newPage();
          const consoleErrors = [];
          const failedResources = [];
          page.on("console", (message) => {
            if (message.type() === "error") consoleErrors.push(message.text());
          });
          page.on("pageerror", (error) => consoleErrors.push(error.message));
          page.on("response", (response) => {
            if (response.status() >= 400 && !response.request().isNavigationRequest()) {
              failedResources.push(`${response.status()} ${response.url()}`);
            }
          });
          try {
            await mockLocalReadiness(page, route.path);
            const response = await page.goto(route.path, { waitUntil: "networkidle", timeout: 30_000 });
            assert.equal(response?.status(), 200, `${engineName} ${viewport.name} ${route.path}: navigation failed`);
            await page.locator("main").waitFor({ state: "visible", timeout: 15_000 });
            await dismissConsent(page);
            await materialiseLazyMedia(page);
            // Forensic Safari regression: a supplied PNG in source is not enough.
            // The real computed header must render the logo instead of pseudo-text.
            if (["home", "oncology", "products-overview", "capabilities"].includes(route.name)) {
              const identity = await page.evaluate(() => {
                const brand = document.querySelector("header.site-header a.brand");
                const image = brand?.querySelector('img[src*="novapharm-healthcare-logo.png"]');
                if (!brand || !image) return null;
                const imgStyle = getComputedStyle(image);
                const box = image.getBoundingClientRect();
                return {
                  loaded: image.complete && image.naturalWidth > 0,
                  displayed: imgStyle.display !== "none" && imgStyle.visibility !== "hidden" && Number(imgStyle.opacity) > 0,
                  width: box.width,
                  height: box.height,
                  pseudoContent: getComputedStyle(brand, "::after").content
                };
              });
              const label = `${engineName} ${viewport.name} ${route.path}`;
              assert.ok(identity?.loaded, `${label}: approved red corporate logo failed to load`);
              assert.ok(identity.displayed && identity.width > 80 && identity.height > 8,
                `${label}: official logo is hidden or collapsed`);
              assert.ok(!/NOVAPHARM/i.test(identity.pseudoContent || ""),
                `${label}: legacy black pseudo-wordmark replaced the corporate logo`);
            }
            const bodyText = (await page.locator("body").innerText()).replace(/\s+/g, " ");
            assert.ok(bodyText.includes(route.required), `${engineName} ${viewport.name} ${route.path}: required page marker missing`);

            if (route.name === "capabilities") {
              const state = await page.evaluate(() => {
                const hero = document.querySelector(".ncap-hero h1");
                const grid = document.querySelector(".ncap-grid");
                const vial = document.querySelector(".ncap-vial-illustration");
                const earth = document.querySelector(".ncap-earth-illustration");
                const earthPanel = document.querySelector(".ncap-earth");
                const styleLink = document.querySelector('link[href*="capabilities-editorial.css"]');
                const headingStyle = hero && getComputedStyle(hero);
                const gridStyle = grid && getComputedStyle(grid);
                const illustrationOk = (image, expectedHeight) => image && image.complete &&
                  image.naturalWidth === 800 && image.naturalHeight === expectedHeight &&
                  image.getBoundingClientRect().width > 100 &&
                  image.getBoundingClientRect().height > (expectedHeight === 53 ? 15 : 30);
                return {
                  heading: hero?.innerText.replace(/\s+/g, " ").trim() ?? "",
                  headlineSize: Number.parseFloat(headingStyle?.fontSize ?? "0"),
                  headlineLineCount: document.querySelectorAll(".ncap-title-line").length,
                  disciplineCount: document.querySelectorAll(".ncap-discipline").length,
                  gridDisplay: gridStyle?.display,
                  gridColumns: gridStyle?.gridTemplateColumns.trim().split(/\s+/).length ?? 0,
                  vialVisible: Boolean(illustrationOk(vial, 224)),
                  earthVisible: Boolean(illustrationOk(earth, 53)),
                  earthBackground: earthPanel && getComputedStyle(earthPanel).backgroundColor,
                  cssVersion: styleLink?.getAttribute("href") ?? "",
                  ctaCount: document.querySelectorAll('.ncap-earth a[href^="/contact/"]').length
                };
              });
              const label = `${engineName} ${viewport.name} Capabilities`;
              assert.equal(state.heading, "From evidence to access.", `${label}: approved headline missing`);
              assert.ok(state.headlineSize > 30, `${label}: editorial typography not rendered`);
              assert.equal(state.headlineLineCount, 2, `${label}: approved two-line hero not rendered`);
              assert.equal(state.disciplineCount, 4, `${label}: four capability disciplines missing`);
              assert.equal(state.gridDisplay, "grid", `${label}: CSS failed to apply to capability layout`);
              const columns = viewport.name === "desktop-1440" ? 4 : viewport.name === "tablet-768" ? 2 : 1;
              assert.equal(state.gridColumns, columns, `${label}: responsive capability columns incorrect`);
              assert.ok(state.vialVisible && state.earthVisible, `${label}: approved artwork absent or not visible`);
              assert.equal(state.earthBackground, "rgb(7, 22, 37)", `${label}: cinematic Earth stage absent`);
              assert.ok(state.cssVersion.includes("20261111-capabilities-approved-photo-v5"),
                `${label}: browser still uses stale Capabilities stylesheet`);
              assert.equal(state.ctaCount, 1, `${label}: capability enquiry CTA missing`);
            }

            if (route.name === "distribution") {
              const hero = page.locator(".ndist-hero h1");
              assert.equal(await hero.count(), 1, engineName + " " + viewport.name + ": premium Distribution H1 missing");
              assert.equal(await page.locator('nav[aria-label="Primary navigation"] a[href="/distribution/"]').count(), 1,
                engineName + " " + viewport.name + ": dedicated Distribution navigation missing");
              assert.equal(await page.locator(".ndist-partner-entry").count(), 2,
                engineName + " " + viewport.name + ": provider explanation must cover UPS Healthcare and Marken UK");
              for (const selector of [".ndist-hero-warehouse", ".ndist-facility-media img", ".ndist-network-hero > img"]) {
                const element = page.locator(selector);
                assert.equal(await element.count(), 1, engineName + " " + viewport.name + ": image missing " + selector);
                const state = await element.evaluate((image) => ({
                  loaded: image.complete && image.naturalWidth > 0 && image.naturalHeight > 0,
                  visible: getComputedStyle(image).display !== "none" && getComputedStyle(image).visibility !== "hidden",
                  box: image.getBoundingClientRect().toJSON()
                }));
                assert.equal(state.loaded && state.visible && state.box.width > 100 && state.box.height > 100, true,
                  engineName + " " + viewport.name + ": image failed or collapsed " + selector);
              }
              assert.ok(bodyText.includes("Regulated pharmaceutical wholesale supply has not commenced"),
                engineName + " " + viewport.name + ": regulatory boundary missing");
              assert.ok(bodyText.includes("Former Polar Speed") || bodyText.includes("former Polar Speed"),
                engineName + " " + viewport.name + ": Marken UK branding history missing");
              assert.equal(await page.locator('.ndist-partners img').count(), 0,
                engineName + " " + viewport.name + ": unlicensed third-party provider imagery must not appear");
            }

            if (route.name === "products-overview") {
              assert.equal(await page.locator(".np-products-hero h1").count(), 1,
                `${engineName} ${viewport.name}: approved Products headline missing`);
              for (const routeHref of ["/products/nutraxin/", "/products/esco/", "/products/strategic-portfolio/"]) {
                assert.ok(await page.locator(`.np-products-collections a[href="${routeHref}"]`).count() >= 1,
                  `${engineName} ${viewport.name}: approved collection navigation missing: ${routeHref}`);
              }
              assert.equal(await page.locator(".np-products-stage-item").count(), 3,
                `${engineName} ${viewport.name}: three-source product hero incomplete`);
              const productsLayout = await page.evaluate(() => {
                const heroActions = document.querySelector(".np-products-hero-actions");
                const cta = document.querySelector(".npd-commerce-link");
                const ctaStyle = cta ? getComputedStyle(cta) : null;
                const photos = [...document.querySelectorAll(".np-products-stage-item img, .np-products-panel-art img")];
                return {
                  heroActionsDisplay: heroActions ? getComputedStyle(heroActions).display : "",
                  heroActionLinks: heroActions?.querySelectorAll("a").length ?? 0,
                  catalogueLink: Boolean(heroActions?.querySelector('a[href="/products/marketplace/"]')),
                  ctaActions: cta?.querySelectorAll("a").length ?? 0,
                  ctaPaddingTop: ctaStyle ? Number.parseFloat(ctaStyle.paddingTop) : 0,
                  ctaWidth: cta?.getBoundingClientRect().width ?? 0,
                  viewportWidth: document.documentElement.clientWidth,
                  photosLoaded: photos.length >= 7 && photos.every((img) => img.complete && img.naturalWidth > 0)
                };
              });
              assert.equal(productsLayout.heroActionsDisplay, "flex",
                `${engineName} ${viewport.name}: Products hero actions are misaligned`);
              assert.equal(productsLayout.heroActionLinks, 2,
                `${engineName} ${viewport.name}: two Products hero actions required`);
              assert.ok(productsLayout.catalogueLink,
                `${engineName} ${viewport.name}: unified catalogue not discoverable from hero`);
              assert.equal(productsLayout.ctaActions, 2,
                `${engineName} ${viewport.name}: unified search and order tracking missing`);
              assert.ok(productsLayout.ctaPaddingTop >= 32,
                `${engineName} ${viewport.name}: commerce CTA styling not loaded`);
              assert.ok(productsLayout.ctaWidth > 200 && productsLayout.ctaWidth <= productsLayout.viewportWidth + 1,
                `${engineName} ${viewport.name}: commerce CTA extends beyond viewport`);
              assert.ok(productsLayout.photosLoaded,
                `${engineName} ${viewport.name}: Products photography did not load`);
            }

            await assertLayout(page, `${engineName} ${viewport.name} ${route.path}`);
            await assertFooterHeadings(page, `${engineName} ${viewport.name} ${route.path}`);
            if (route.name === "home" && viewport.name !== "tablet-768") {
              await page.emulateMedia({ contrast: "more" });
              const contrastState = await page.evaluate(() => ({
                requested: matchMedia("(prefers-contrast: more)").matches,
                divider: getComputedStyle(document.documentElement).getPropertyValue("--npd-line").trim()
              }));
              assert.ok(contrastState.requested, `${engineName} ${viewport.name}: high-contrast preference not emulated`);
              assert.equal(contrastState.divider.toLowerCase(), "#858c93",
                `${engineName} ${viewport.name}: increased-contrast divider token was not applied`);
              await page.emulateMedia({ contrast: "no-preference" });
            }

            assert.deepEqual(failedResources, [], `${engineName} ${viewport.name} ${route.path}: failed subresources`);
            assert.deepEqual(consoleErrors, [], `${engineName} ${viewport.name} ${route.path}: console errors`);

            if (route.name === "technology") {
              // Four-plan comparison: verify real layout and non-binding access
              // actions in Chromium/WebKit, rather than the removed trial banner
              // and obsolete annual-price toggle.
              const pricing = page.locator("#intelligence-pricing");
              const grid = pricing.locator("[data-npi-pricing-grid]");
              const plans = ["trial", "starter", "professional", "enterprise"];
              assert.equal(await grid.locator(".npi-plan").count(), 4,
                engineName + " " + viewport.name + ": four pricing plans must be visible");
              for (const plan of plans) {
                const card = grid.locator('[data-npi-plan="' + plan + '"]');
                assert.equal(await card.count(), 1, plan + ": precisely one plan card");
                assert.equal(await card.isVisible(), true, plan + ": plan must be visible");
                assert.equal(await card.locator(".npi-plan-cta:visible").count(), 1,
                  plan + ": exactly one clear customer action");
                const action = card.locator(".npi-plan-cta");
                const href = await action.getAttribute("href");
                assert.ok(href?.startsWith("/contact/?"), plan + ": action must lead to the governed enquiry experience");
                assert.ok(href?.includes("intelligencePlan="), plan + ": action must include the requested plan");
                assert.ok(!href?.includes("checkout") && !href?.includes("/auth/customer/register"),
                  plan + ": no unverified paid checkout or registration");
              }
              const freeTrial = grid.locator('[data-npi-plan="trial"][data-npi-starter-trial="approved"]');
              assert.match(await freeTrial.innerText(), /Free Trial/);
              assert.match(await freeTrial.innerText(), /for 30 days/);
              assert.match(await freeTrial.innerText(), /25 total/);
              assert.match(await freeTrial.innerText(), /No credit card required/);
              assert.match(await freeTrial.innerText(), /No automatic subscription or charges/);
              assert.equal(await pricing.locator(".npi-trial-offer").count(), 0,
                "The trial must not have its own banner above the four plans");
              assert.equal(await pricing.locator("[data-npi-billing]").count(), 0,
                "No unapproved annual-price comparison should be displayed");
              const style = await grid.evaluate((element) => ({
                columns: getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length,
                gap: getComputedStyle(element).columnGap,
              }));
              const expectedColumns = viewport.width > 1120 ? 4 : viewport.width > 640 ? 2 : 1;
              assert.equal(style.columns, expectedColumns,
                engineName + " " + viewport.name + ": responsive pricing columns must match viewport");
              assert.equal(await pricing.getByText("No payment will be collected here", { exact: false }).count(), 1,
                "Pricing section must disclose non-binding enquiries");

              const medicineField = page.locator("[data-npi-query]");
              const marketField = page.locator("[data-npi-market]");
              const focusField = page.locator("[data-npi-focus]");
              const resultsPanel = page.locator("[data-npi-results]");
              const sourceRows = page.locator("[data-npi-results-list] li");
              const findSources = page.getByRole("button", { name: "Find official sources" });
              assert.equal(await medicineField.count(), 1, "The medicine research field must exist");
              await medicineField.fill("apixaban");
              await marketField.selectOption("GB");
              await focusField.selectOption("regulatory");
              await findSources.click();
              assert.equal(await resultsPanel.isVisible(), true, "Submitting a valid query must reveal research sources");
              assert.equal(await sourceRows.count(), 2, "UK regulatory research must show approved MHRA and NICE sources");
              assert.equal(await page.locator('[data-npi-results-list] a[href^="https://products.mhra.gov.uk/"]').count(), 1, "Official MHRA link must be prepared");
              await marketField.selectOption("US");
              assert.equal(await resultsPanel.isVisible(), false, "Switching markets must hide stale results");
              assert.equal(await sourceRows.count(), 0, "Switching markets must clear previous links");
              await focusField.selectOption("evidence");
              await findSources.click();
              assert.equal(await sourceRows.count(), 1, "US evidence research must show one PubMed link");
              const pubmed = page.locator('[data-npi-results-list] a[href^="https://pubmed.ncbi.nlm.nih.gov/"]');
              assert.ok((await pubmed.getAttribute("href"))?.includes("term=apixaban"), "Search terms must be URL encoded for official providers");
              assert.equal(await pubmed.getAttribute("rel"), "noopener noreferrer", "External source links must be isolated");
              assert.equal(new URL(page.url()).pathname, "/technology/", "Research submission must remain on the NovaPharm page");
              assert.equal(await page.locator('#intelligence-research a[href="https://portal.novapharmhealthcare.com/"]').count(), 0, "Intelligence research must not link to the Nutraxin portal");
              await assertLayout(page, `${engineName} ${viewport.name} research results`);
            }

            if (route.name === "oncology") {
              // Assert the approved visual geometry, not merely the page text.
              // This caught the earlier cached dark hero and vertical card stack.
              const geometry = await page.evaluate(() => {
                const hero = document.querySelector(".npoc-hope-hero");
                const portrait = hero?.querySelector(".npoc-hero-visual img");
                const heroVisual = hero?.querySelector(".npoc-hero-visual");
                const heading = hero?.querySelector("h1");
                const button = hero?.querySelector(".npoc-button-primary");
                const cardsContainer = document.querySelector(".npoc-focus-cards");
                const cards = [...document.querySelectorAll(".npoc-focus-cards .npoc-focus-card")];
                const getRect = (element) => {
                  const rect = element.getBoundingClientRect();
                  return { x:rect.x, y:rect.y, width:rect.width, height:rect.height, bottom:rect.bottom };
                };
                return {
                  portrait: portrait ? {
                    fit:getComputedStyle(portrait).objectFit,
                    naturalWidth:portrait.naturalWidth,
                    naturalHeight:portrait.naturalHeight,
                    box:getRect(portrait)
                  } : null,
                  heroImageBlend: heroVisual ? [getComputedStyle(heroVisual).maskImage, getComputedStyle(heroVisual).webkitMaskImage].some((mask) => typeof mask === "string" && mask.includes("gradient")) : false,
                  heroMediaRatio: heroVisual && hero ? getRect(heroVisual).width / getRect(hero).width : 0,
                  headingColor: heading ? getComputedStyle(heading).color : null,
                  buttonColor: button ? getComputedStyle(button).backgroundColor : null,
                  cardGrid: cardsContainer ? getComputedStyle(cardsContainer).display : null,
                  cardRects:cards.map(getRect),
                  labelPositions:cards.map((card) => {
                    const label = card.querySelector("span");
                    return label ? getComputedStyle(label).position : "missing";
                  })
                };
              });
              const label = `${engineName} ${viewport.name}: Oncology approved composition`;
              assert.ok(geometry.portrait?.naturalWidth > 0 && geometry.portrait?.naturalHeight > 0,
                `${label}: portrait asset must load`);
              assert.equal(geometry.portrait.fit, viewport.width >= 1101 ? "cover" : "contain", `${label}: desktop must cover seamlessly while mobile and tablet preserve the portrait without exposing embedded JPEG edge lettering`);
              assert.ok(geometry.portrait.box.width > 250 && geometry.portrait.box.height > 200,
                `${label}: portrait must not collapse`);
              if (viewport.width > 760) {
                assert.ok(geometry.heroMediaRatio >= (viewport.width >= 1101 ? 0.55 : 0.7), `${label}: photograph must extend across the hero, not sit in a hard-edged box`);
                assert.equal(geometry.heroImageBlend, true, `${label}: photograph must fade seamlessly into the light hero`);
              } else {
                assert.equal(geometry.heroImageBlend, false, `${label}: mobile portrait should not be partially masked`);
              }
              assert.equal(geometry.headingColor, "rgb(19, 19, 22)", `${label}: white hero uses dark heading, never the previous dark-overlay white heading`);
              assert.equal(geometry.buttonColor, "rgb(22, 22, 25)", `${label}: hero call-to-action must use the approved black, not old red`);
              assert.equal(geometry.cardGrid, "grid", `${label}: cards must use an aligned CSS grid`);
              assert.equal(geometry.cardRects.length, 3, `${label}: exactly three oncology art cards`);
              assert.ok(geometry.cardRects.every((rect) => rect.width >= 170 && rect.height >= 250),
                `${label}: cards must retain useful, balanced dimensions`);
              assert.ok(geometry.cardRects.every((rect) => Math.abs(rect.y - geometry.cardRects[0].y) < 2),
                `${label}: cards must start on the same row`);
              assert.ok(geometry.cardRects.every((rect) => Math.abs(rect.height - geometry.cardRects[0].height) < 2),
                `${label}: cards must share identical height`);
              assert.ok(geometry.labelPositions.every((position) => position === "absolute"),
                `${label}: labels must overlay each image, not appear underneath`);
            }

            if (route.name === "contact") {
              const draft = page.locator("form[data-email-enquiry-form]");
              assert.equal(await draft.count(), 1, engineName + " " + viewport.name + ": public contact must have exactly one local email draft");
              assert.equal(await draft.getAttribute("action"), "mailto:vishal@novapharmhealthcare.com");
              assert.equal(await page.locator("form[data-contact-form]").count(), 0, "public page must not expose managed intake");
              assert.equal(await draft.locator('input[name="name"]').count(), 1);
              assert.equal(await draft.locator('input[name="country"]').count(), 1);
              assert.equal(await draft.locator('select[name="enquiryType"]').count(), 1);
              assert.equal(await draft.locator('textarea[name="message"]').count(), 1);
              assert.ok(await page.locator(".np-contact-reference-footer").isVisible(), "contact's compact footer must be visible");
            }

            if (route.name === "leadership" || route.name === "leadership-girish") {
              assert.equal(bodyText.includes("Chief Technical Director"), false, `${engineName} ${viewport.name} ${route.path}: superseded Dr Girish title is visible`);
              const typography = await page.evaluate(() => {
                const h1 = document.querySelector("main h1");
                const h1Style = h1 ? getComputedStyle(h1) : null;
                return {
                  contract: getComputedStyle(document.documentElement).getPropertyValue("--leadership-apple-contract").trim(),
                  bodyFontFamily: getComputedStyle(document.body).fontFamily,
                  h1FontWeight: h1Style?.fontWeight ?? "",
                  h1LineHeight: h1Style?.lineHeight ?? ""
                };
              });
              assert.equal(typography.contract, "1", `${engineName} ${viewport.name} ${route.path}: leadership presentation contract missing`);
              assert.ok(typography.bodyFontFamily.includes("-apple-system"), `${engineName} ${viewport.name} ${route.path}: system-font stack missing`);
              assert.equal(typography.h1FontWeight, "600", `${engineName} ${viewport.name} ${route.path}: heading weight must be semibold 600`);
            }

            if (route.name === "leadership") {
              const expectedPortraits = [
                ["vishal-chakravarty-1200.jpg", /vishal-chakravarty-(?:480|800|1200)\.(?:avif|webp|jpg)$/, 1],
                ["prabhakar-lahare-960.jpg", /prabhakar-lahare-(?:480|768|960)\.(?:avif|webp|jpg)$/, 0.8],
                ["girish-achliya-960.jpg", /girish-achliya-(?:480|768|960)\.(?:avif|webp|jpg)$/, 0.8]
              ];
              assert.equal(await page.locator(".leader-card").count(), 5, `${engineName} ${viewport.name}: leadership profile count changed unexpectedly`);
              for (const [filename, expectedSource, expectedAspectRatio] of expectedPortraits) {
                const portrait = page.locator(`.leader-card-media img[src$="/${filename}"]`);
                assert.equal(await portrait.count(), 1, `${engineName} ${viewport.name}: approved ${filename} leadership portrait missing`);
                const state = await portrait.evaluate((image) => {
                  const rect = image.getBoundingClientRect();
                  const style = getComputedStyle(image);
                  return {
                    naturalWidth: image.naturalWidth,
                    naturalHeight: image.naturalHeight,
                    currentSrc: image.currentSrc,
                    width: rect.width,
                    height: rect.height,
                    display: style.display,
                    visibility: style.visibility,
                    opacity: Number(style.opacity)
                  };
                });
                assert.ok(Math.abs((state.naturalWidth / state.naturalHeight) - expectedAspectRatio) < 0.01, `${engineName} ${viewport.name}: ${filename} aspect ratio changed`);
                assert.match(state.currentSrc, expectedSource, `${engineName} ${viewport.name}: ${filename} did not resolve through the governed responsive portrait set`);
                assert.ok(state.width > 180 && state.height > 220, `${engineName} ${viewport.name}: ${filename} portrait collapsed`);
                assert.notEqual(state.display, "none", `${engineName} ${viewport.name}: ${filename} is display:none`);
                assert.notEqual(state.visibility, "hidden", `${engineName} ${viewport.name}: ${filename} is hidden`);
                assert.ok(state.opacity > 0, `${engineName} ${viewport.name}: ${filename} is transparent`);
              }
            }

            if (route.name === "leadership-girish") {
              const portrait = page.locator('.profile-hero-media img[src$="/assets/media/leadership/girish-achliya-960.jpg"]');
              assert.equal(await portrait.count(), 1, `${engineName} ${viewport.name}: Dr Girish approved profile portrait missing`);
              const portraitState = await portrait.evaluate((image) => ({
                naturalWidth: image.naturalWidth,
                naturalHeight: image.naturalHeight,
                width: image.getBoundingClientRect().width,
                height: image.getBoundingClientRect().height
              }));
              assert.ok(Math.abs((portraitState.naturalWidth / portraitState.naturalHeight) - 0.8) < 0.01, `${engineName} ${viewport.name}: Dr Girish profile portrait aspect ratio changed`);
              assert.ok(portraitState.width > 180 && portraitState.height > 220, `${engineName} ${viewport.name}: Dr Girish profile portrait collapsed`);
              const schemaText = await page.locator('script[type="application/ld+json"]').allTextContents();
              assert.ok(schemaText.some((value) => value.includes('"jobTitle":"Chief Scientific Officer"')), `${engineName} ${viewport.name}: Dr Girish JSON-LD jobTitle is not Chief Scientific Officer`);
            }

            if (route.name === "regulatory-roadmap") {
              const batchIntegrity = page.locator('img[src*="regulatory-batch-integrity"]');
              assert.equal(await batchIntegrity.count(), 1, `${engineName} ${viewport.name}: Batch Integrity image missing`);
              const batchIntegrityState = await batchIntegrity.evaluate((image) => {
                const style = getComputedStyle(image);
                const rect = image.getBoundingClientRect();
                return {
                  display: style.display,
                  visibility: style.visibility,
                  opacity: Number(style.opacity),
                  width: rect.width,
                  height: rect.height,
                  naturalWidth: image.naturalWidth,
                  naturalHeight: image.naturalHeight
                };
              });
              assert.notEqual(batchIntegrityState.display, "none", `${engineName} ${viewport.name}: Batch Integrity image is display:none`);
              assert.notEqual(batchIntegrityState.visibility, "hidden", `${engineName} ${viewport.name}: Batch Integrity image is hidden`);
              assert.ok(batchIntegrityState.opacity > 0, `${engineName} ${viewport.name}: Batch Integrity image is transparent`);
              assert.ok(batchIntegrityState.width > 100 && batchIntegrityState.height > 100, `${engineName} ${viewport.name}: Batch Integrity image collapsed`);
              assert.ok(batchIntegrityState.naturalWidth > 0 && batchIntegrityState.naturalHeight > 0, `${engineName} ${viewport.name}: Batch Integrity image did not decode`);
              assert.equal(await page.locator(".npd-roadmap > li").count(), 7, `${engineName} ${viewport.name}: regulatory roadmap must contain seven governed gates`);
            }

            const axe = await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
              .analyze();
            axeRuns += 1;
            const serious = axe.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
            assert.deepEqual(
              serious.flatMap((item) => item.nodes.map((node) =>
                `${item.id}: ${item.help} | target: ${node.target.join(", ")} | ${String(node.failureSummary ?? "").replace(/\s+/g, " ").slice(0, 300)}`
              )),
              [],
              `${engineName} ${viewport.name} ${route.path}: serious/critical accessibility violations`
            );

            const directory = path.join(artifactRoot, engineName, viewport.name);
            await mkdir(directory, { recursive: true });
            await page.screenshot({
              path: path.join(directory, `${route.name}.png`),
              fullPage: false,
              animations: "disabled"
            });
            screenshots += 1;
          } finally {
            await page.close();
          }
        }
      } finally {
        await context.close();
      }
    }

    for (const viewport of homeGeometryViewports) {
      const context = await browser.newContext({
        baseURL: baseUrl,
        viewport: { width: viewport.width, height: viewport.height },
        locale: "en-GB",
        reducedMotion: "reduce",
        colorScheme: "light"
      });
      const page = await context.newPage();
      try {
        const response = await page.goto("/", { waitUntil: "networkidle", timeout: 30_000 });
        assert.equal(response?.status(), 200, `${engineName} ${viewport.name} /: navigation failed`);
        await page.locator("main").waitFor({ state: "visible", timeout: 15_000 });
        await dismissConsent(page);
        await materialiseLazyMedia(page);
        await assertLayout(page, `${engineName} ${viewport.name} /`);
        geometryRuns += 1;
      } finally {
        await page.close();
        await context.close();
      }
    }

    // Screenshot-reported ESCO regressions: hero photos/caption and details
    // must never physically intersect, including in Safari/WebKit.
    for (const viewport of [
      { name:"esco-mobile-390", width:390, height:844 },
      { name:"esco-tablet-768", width:768, height:1024 },
      { name:"esco-desktop-1440", width:1440, height:900 }
    ]) {
      const context = await browser.newContext({
        baseURL:baseUrl,
        viewport:{width:viewport.width,height:viewport.height},
        locale:"en-GB",
        reducedMotion:"reduce",
        colorScheme:"light"
      });
      const page = await context.newPage();
      try {
        await mockLocalReadiness(page, "/products/esco/");
        const response = await page.goto("/products/esco/", { waitUntil:"networkidle", timeout:30_000 });
        assert.equal(response?.status(), 200, `${engineName} ${viewport.name}: ESCO page unavailable`);
        await dismissConsent(page);
        await page.locator(".esco-hero-gallery-item").first().waitFor({state:"visible"});
        assert.equal(await page.locator("[data-esco-quote-tray]").isVisible(),false,
          `${engineName} ${viewport.name}: duplicate oversized Bag panel is still visible`);
        assert.equal(await page.locator(".esco-localbar-bag").isVisible(),true,
          `${engineName} ${viewport.name}: customer Bag is missing from the product header`);
        await page.waitForFunction(() => {
          const image = document.querySelector('[data-esco-gallery-item="ESCO-CAT-0003"] img');
          return image?.dataset.escoPhotoCleanup === "cleaned";
        }, null, {timeout:15000});
        const cleanedCornerAlphas = await page.evaluate(async () => {
          const image = document.querySelector('[data-esco-gallery-item="ESCO-CAT-0003"] img');
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const context = canvas.getContext("2d");
          context.drawImage(image, 0, 0);
          const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
          const w = canvas.width, h = canvas.height;
          return [0, w - 1, (h - 1) * w, h * w - 1].map(index => data[index * 4 + 3]);
        });
        assert.ok(cleanedCornerAlphas.every(alpha => alpha < 16),
          `${engineName} ${viewport.name}: supplier-image black backdrop remains opaque`);
        const heroLayout = await page.evaluate(() => {
          const rect = node => node?.getBoundingClientRect();
          const intersection = (a,b) => a && b &&
            a.right > b.left + 1 && b.right > a.left + 1 &&
            a.bottom > b.top + 1 && b.bottom > a.top + 1;
          const gallery = document.querySelector(".esco-hero-gallery");
          const items = [...gallery.querySelectorAll(".esco-hero-gallery-item")];
          const note = document.querySelector(".esco-hero-gallery-note");
          const overlappingItems = items.some((one,index) =>
            items.slice(index+1).some(two => intersection(rect(one),rect(two))));
          return {
            count:items.length,
            overlappingItems,
            noteOverlapsGallery:intersection(rect(note),rect(gallery)),
            horizontalOverflow:document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
          };
        });
        assert.equal(heroLayout.count,4,`${engineName} ${viewport.name}: expected four approved model photo slots`);
        assert.equal(heroLayout.overlappingItems,false,`${engineName} ${viewport.name}: ESCO hero product photographs overlap`);
        assert.equal(heroLayout.noteOverlapsGallery,false,`${engineName} ${viewport.name}: ESCO hero provenance note overlaps product images`);
        assert.equal(heroLayout.horizontalOverflow,false,`${engineName} ${viewport.name}: ESCO hero overflows viewport`);
        const directory = path.join(artifactRoot,engineName,viewport.name);
        await mkdir(directory,{recursive:true});
        await page.locator(".esco-hero").screenshot({path:path.join(directory,"esco-hero.png"),animations:"disabled"});
        // The featured product CTA must open its exact model without moving
        // or clearing catalogue search state; card Details remains available.
        await page.locator("[data-esco-spotlight-jump]").first().click();
        const dialog = page.locator("dialog.esco-product-dialog");
        await dialog.waitFor({state:"visible"});
        assert.match(await dialog.locator("[data-esco-dialog-title]").innerText(),/Pediatric Bed/);
        await dialog.locator("[data-esco-dialog-close]").click();
        await page.locator("[data-esco-details]").first().click();
        await dialog.waitFor({state:"visible"});
        const layout = await page.evaluate(() => {
          const dialog = document.querySelector("dialog.esco-product-dialog");
          const picture = dialog.querySelector(".esco-dialog-picture").getBoundingClientRect();
          const copy = dialog.querySelector(".esco-dialog-copy").getBoundingClientRect();
          const intersects = picture.right > copy.left + 1 && copy.right > picture.left + 1 &&
            picture.bottom > copy.top + 1 && copy.bottom > picture.top + 1;
          return { intersects, overflow:dialog.scrollWidth > dialog.clientWidth + 2,
            pictureWidth:picture.width, copyWidth:copy.width };
        });
        assert.equal(layout.intersects,false,`${engineName} ${viewport.name}: ESCO detail image collides with text`);
        assert.equal(layout.overflow,false,`${engineName} ${viewport.name}: ESCO dialog overflows horizontally`);
        assert.ok(layout.pictureWidth > 80 && layout.copyWidth > 80,`${engineName} ${viewport.name}: ESCO dialog collapsed`);
        await dialog.screenshot({path:path.join(directory,"esco-details.png"),animations:"disabled"});
        await dialog.locator("[data-esco-dialog-add]").click();
        assert.equal((await page.locator("[data-esco-top-bag-count]").innerText()).trim(),"1",
          `${engineName} ${viewport.name}: adding a product did not update the single header Bag`);
        assert.equal(await page.locator("[data-esco-quote-tray]").isVisible(),false,
          `${engineName} ${viewport.name}: adding a product showed the old homepage Bag panel`);
        screenshots += 2;
        geometryRuns += 1;
      } finally {
        await page.close();
        await context.close();
      }
    }

  } finally {
    await browser.close();
  }
}

console.log(`Public Pages rendered acceptance passed: ${screenshots} curated viewport screenshots, ${axeRuns} Axe runs and ${geometryRuns} additional homepage geometry checks across Chromium + WebKit. Lazy media was materialised, consent was dismissed for visual evidence, headings did not split inside words, Leadership portrait/title evidence and Regulatory roadmap/Batch Integrity media remained visible, and no route overflowed horizontally.`);
