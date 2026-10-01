import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import type { BrowserType, Page } from "playwright";

const viewports = [
  [320, 568], [375, 667], [390, 844], [430, 932], [768, 1024], [1024, 768],
  [1181, 800], [1200, 800], [1280, 800], [1300, 800], [1440, 900],
  [1600, 900], [1728, 1117], [1920, 1080],
] as const;

async function openHome(page: Page, baseUrl: string) {
  const response = await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200);
  await page.locator(".corporate-hero-media img").evaluate(async (element) => {
    await (element as HTMLImageElement).decode();
  });
  const reject = page.getByRole("button", { name: "Reject non-essential", exact: true });
  if (await reject.isVisible()) await reject.click();
}

export async function verifyHeroExperience(engine: string, driver: BrowserType, baseUrl: string, artifactRoot: string) {
  const output = path.join(artifactRoot, "hero", engine);
  await fs.mkdir(output, { recursive: true });
  const browser = await driver.launch();
  const results = [];
  let screenshots = 0;
  let accessibilityRuns = 0;
  try {
    for (const [width, height] of viewports) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
      try {
        const page = await context.newPage();
        const errors: string[] = [];
        const imageRequests: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
        page.on("request", (request) => {
          const source = new URL(request.url()).pathname;
          if (source.includes("medicine-evidence-hero") && source.endsWith(".avif")) imageRequests.push(source);
        });
        await openHome(page, baseUrl);
        assert.equal(await page.getByRole("heading", { level: 1, name: "NovaPharm Healthcare", exact: true }).count(), 1);
        const layout = await page.evaluate(() => {
          const hero = document.querySelector(".corporate-hero")?.getBoundingClientRect();
          const next = document.querySelector(".pharma-principles")?.getBoundingClientRect();
          const image = document.querySelector<HTMLImageElement>(".corporate-hero-media img");
          return {
            width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth,
            heroBottom: hero?.bottom ?? Infinity, nextSectionTop: next?.top ?? Infinity,
            imageDecoded: !!image?.complete && image.naturalWidth > 0,
            imageSource: image?.currentSrc ?? "",
            imageNaturalWidth: image?.naturalWidth ?? 0,
            motion: document.querySelector<HTMLElement>(".corporate-hero")?.dataset.motion,
            actions: [...document.querySelectorAll(".corporate-hero .action-row a")].map((element) => {
              const bounds = element.getBoundingClientRect();
              return { width: bounds.width, height: bounds.height, left: bounds.left, right: bounds.right, bottom: bounds.bottom };
            }),
          };
        });
        assert.ok(layout.documentWidth <= width + 1, `${engine}/${width}: horizontal overflow`);
        assert.ok(layout.nextSectionTop <= height - 24, `${engine}/${width}: next-section hint is hidden (${layout.nextSectionTop})`);
        assert.equal(layout.imageDecoded, true);
        const expectedImage = width <= 720 ? "/assets/media/home/medicine-evidence-hero-800.avif" : "/assets/media/home/medicine-evidence-hero.avif";
        assert.equal(new URL(layout.imageSource).pathname, expectedImage);
        assert.deepEqual(imageRequests, [expectedImage], `${engine}/${width}: redundant hero image download`);
        assert.equal(layout.motion, "still");
        assert.equal(await page.locator(".corporate-hero-motion").count(), 0);
        assert.equal(layout.actions.length, 2);
        for (const action of layout.actions) {
          assert.ok(action.width >= 44 && action.height >= 44);
          assert.ok(action.left >= 0 && action.right <= width + 1 && action.bottom <= height);
        }
        const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
        assert.deepEqual(audit.violations, [], `${engine}/${width}: accessibility findings`);
        accessibilityRuns += 1;
        assert.deepEqual(errors, [], `${engine}/${width}: browser errors`);
        await page.screenshot({ path: path.join(output, `${width}.png`), fullPage: false });
        screenshots += 1;
        results.push({ width, height, layout, imageRequests, accessibility: "PASS" });
      } finally { await context.close(); }
    }

    const motion = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference" });
    try {
      const page = await motion.newPage();
      await openHome(page, baseUrl);
      const hero = page.locator(".corporate-hero");
      const drift = page.locator(".corporate-hero-drift");
      await page.getByRole("button", { name: "Pause visual motion", exact: true }).waitFor();
      await page.mouse.move(1050, 400);
      await page.waitForFunction(() => Math.abs(Number.parseFloat(document.querySelector<HTMLElement>(".corporate-hero")?.style.getPropertyValue("--scene-x") ?? "0")) > 0.5);
      await page.getByRole("button", { name: "Pause visual motion", exact: true }).click();
      assert.equal(await hero.getAttribute("data-motion"), "still");
      assert.equal(await page.getByRole("button", { name: "Play visual motion", exact: true }).getAttribute("aria-pressed"), "true");
      const before = await drift.evaluate(async (element) => {
        const animation = element.getAnimations()[0];
        // CSS pauses settle at a timeline boundary before their currentTime freezes.
        await animation?.ready;
        return {
          name: getComputedStyle(element).animationName,
          state: getComputedStyle(element).animationPlayState,
          playState: animation?.playState,
          time: animation?.currentTime,
        };
      });
      assert.equal(before.name, "corporate-scene-drift");
      assert.equal(before.state, "paused");
      assert.equal(before.playState, "paused");
      assert.equal(typeof before.time, "number");
      const pointer = await hero.evaluate((element) => (element as HTMLElement).style.getPropertyValue("--scene-x"));
      await page.mouse.move(300, 400);
      await page.waitForTimeout(250);
      const after = await drift.evaluate((element) => element.getAnimations()[0]?.currentTime);
      assert.equal(after, before.time, `${engine}: paused animation advanced`);
      assert.equal(await hero.evaluate((element) => (element as HTMLElement).style.getPropertyValue("--scene-x")), pointer);
      await page.getByRole("button", { name: "Play visual motion", exact: true }).focus();
      await page.keyboard.press("Enter");
      assert.equal(await hero.getAttribute("data-motion"), "running");
      await page.waitForTimeout(150);
      assert.ok(Number(await drift.evaluate((element) => element.getAnimations()[0]?.currentTime)) > Number(after));
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.waitForFunction(() => document.querySelector<HTMLElement>(".corporate-hero")?.dataset.motion === "still");
      assert.equal(await drift.evaluate((element) => getComputedStyle(element).animationName), "none");
      assert.equal(await page.locator(".corporate-hero-motion").count(), 0);
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.getByRole("button", { name: "Pause visual motion", exact: true }).waitFor();
      await page.locator("footer").scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector<HTMLElement>(".corporate-hero")?.dataset.motion === "still");
      assert.equal(await drift.evaluate((element) => getComputedStyle(element).animationPlayState), "paused");
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForFunction(() => document.querySelector<HTMLElement>(".corporate-hero")?.dataset.motion === "running");
      await page.getByRole("button", { name: "Pause visual motion", exact: true }).waitFor();
      await page.getByRole("link", { name: "Explore NovaPharm", exact: true }).click();
      await page.waitForURL("**/about/");
      assert.equal(await page.locator("h1").count(), 1);
      await page.emulateMedia({ media: "print" });
      await openHome(page, baseUrl);
      assert.equal(await page.locator(".corporate-hero-media").isVisible(), false);
      assert.equal(await page.locator(".corporate-hero-motion").isVisible(), false);
      if (engine === "chromium") {
        await page.emulateMedia({ media: "screen", forcedColors: "active" });
        assert.equal(await page.locator(".corporate-hero-media").isVisible(), false);
      }
    } finally { await motion.close(); }

    const scriptless = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false, reducedMotion: "reduce", deviceScaleFactor: 2 });
    try {
      const page = await scriptless.newPage();
      assert.equal((await page.goto(`${baseUrl}/`))?.status(), 200);
      assert.equal(await page.getByRole("heading", { level: 1, name: "NovaPharm Healthcare", exact: true }).count(), 1);
      assert.equal(await page.locator(".corporate-hero-motion").count(), 0);
      const image = await page.locator(".corporate-hero-media img").evaluate(async (element) => {
        const image = element as HTMLImageElement;
        await image.decode();
        return { source: new URL(image.currentSrc).pathname, width: image.naturalWidth };
      });
      assert.equal(image.source, "/assets/media/home/medicine-evidence-hero-800.avif");
      // naturalWidth is density-corrected; the registered file remains 800 pixels wide.
      assert.equal(image.width, 390);
      await page.locator("details.mobile-menu summary").click();
      assert.equal(await page.locator(".mobile-menu .menu-close-icon").isVisible(), true);
      assert.equal(await page.locator(".mobile-menu .menu-open-icon").isVisible(), false);
      assert.ok(await page.locator("header nav a:visible").count() > 0);
      await page.screenshot({ path: path.join(output, "390-scriptless-retina.png"), fullPage: false });
      screenshots += 1;
    } finally { await scriptless.close(); }
    const highDensity = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce", deviceScaleFactor: 3 });
    try {
      const page = await highDensity.newPage();
      const imageRequests: string[] = [];
      page.on("request", (request) => {
        const source = new URL(request.url()).pathname;
        if (source.includes("medicine-evidence-hero") && source.endsWith(".avif")) imageRequests.push(source);
      });
      await openHome(page, baseUrl);
      const image = await page.locator(".corporate-hero-media img").evaluate((element) => {
        const image = element as HTMLImageElement;
        return { source: new URL(image.currentSrc).pathname, width: image.naturalWidth };
      });
      assert.equal(image.source, "/assets/media/home/medicine-evidence-hero-1200.avif");
      assert.equal(image.width, 390);
      assert.deepEqual(imageRequests, [image.source]);
      await page.screenshot({ path: path.join(output, "390-high-density-3x.png"), fullPage: false });
      screenshots += 1;
    } finally { await highDensity.close(); }
  } finally { await browser.close(); }
  const report = {
    engine, results, screenshots, accessibilityRuns, motion: "PASS", scriptless: "PASS", highDensity3x: "PASS", print: "PASS",
    forcedColors: engine === "chromium" ? "PASS" : "NOT_TESTED_ENGINE_SUPPORT",
    browserPath: "Browser plugin not available; repository Playwright used",
    scope: "Corporate homepage hero only; not live portal authentication or email delivery",
  };
  await fs.writeFile(path.join(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
  return report;
}
