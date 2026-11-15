import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium, webkit } from "playwright";

// This route is a 22-workspace demonstrator, not production data or a protected customer role.
const baseUrl = process.env.PUBLIC_PAGES_BASE_URL ?? "http://127.0.0.1:4310";
const artifacts = path.resolve(process.env.PUBLIC_PAGES_BROWSER_ARTIFACT_ROOT ?? "artifacts/public-pages-browser", "intelligence-accessibility");
await mkdir(artifacts, { recursive: true });

for (const [engine, browserType] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await browserType.launch({ headless: true });
  try {
    for (const viewport of [{ name: "mobile-390", width: 390, height: 844 }, { name: "desktop-1440", width: 1440, height: 900 }]) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: "reduce" });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      try {
        const response = await page.goto(baseUrl + "/technology/workspaces/", { waitUntil: "networkidle", timeout: 30_000 });
        assert.equal(response?.status(), 200, engine + " " + viewport.name + ": public preview unavailable");
        await page.locator("#tabs [data-category]").first().waitFor();
        assert.equal(await page.locator("main").count(), 1, "Preview requires a main landmark");
        assert.equal(await page.locator("#tabs").getAttribute("role"), "group", "Disciplines are buttons, not incomplete ARIA tabs");
        assert.equal(await page.locator("#tabs [data-category]").count(), 5);
        assert.equal(await page.locator("#workspace-list [data-index]").count(), 6);

        const market = page.locator('#tabs [data-category="market"]');
        await market.click();
        assert.equal(await market.getAttribute("aria-pressed"), "true");
        assert.equal(await market.evaluate((node) => document.activeElement === node), true, "Changing discipline must restore keyboard focus");

        const forecast = page.locator("#workspace-list [data-index]").filter({ hasText: "Forecasting" });
        await forecast.click();
        assert.equal(await forecast.getAttribute("aria-pressed"), "true");
        assert.equal(await forecast.evaluate((node) => document.activeElement === node), true, "Changing workspace must restore keyboard focus");
        assert.equal((await page.locator("#preview-title").innerText()).trim(), "Forecasting");
        const chartData = page.locator("#demo-content .chart-data").first();
        await chartData.locator("summary").click();
        assert.equal(await chartData.locator("table").isVisible(), true, "Chart values must have an accessible table alternative");
        assert.ok(await chartData.locator("tbody tr").count() >= 6, "Chart table must include all sample periods");
        assert.match((await chartData.locator("caption").innerText()), /illustrative index values/);

        await page.locator("#official").click();
        assert.equal(await page.locator("#modal").isVisible(), true);
        assert.equal(await page.locator("#modal-close").evaluate((node) => document.activeElement === node), true);
        await page.keyboard.press("Shift+Tab");
        assert.equal(await page.locator("#modal-body a").last().evaluate((node) => document.activeElement === node), true,
          "Reverse tab must stay inside modal");
        await page.keyboard.press("Tab");
        assert.equal(await page.locator("#modal-close").evaluate((node) => document.activeElement === node), true,
          "Forward tab must wrap inside modal");
        await page.keyboard.press("Escape");
        assert.equal(await page.locator("#modal").isHidden(), true);
        assert.equal(await page.locator("#official").evaluate((node) => document.activeElement === node), true,
          "Escape must return focus to opener");

        const search = page.locator("#search");
        await search.fill("missing-no-workspaces-expected");
        assert.equal(await page.locator("#workspace-list [data-index]").count(), 0);
        assert.equal(await page.locator("#result-caption").getAttribute("role"), "status");
        assert.match(await page.locator("#result-caption").innerText(), /0 matching workspaces/);
        await page.locator("#clear").click();
        assert.equal(await search.evaluate((node) => document.activeElement === node), true);

        // Run Axe on the normal, populated state, not a hidden or unrendered skeleton.
        const axe = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        const severe = axe.violations.filter((v) => ["serious", "critical"].includes(v.impact));
        assert.deepEqual(severe.flatMap((v) => v.nodes.map((node) =>
          v.id + ": " + v.help + " — " + node.target.join(", "))), [], engine + " " + viewport.name + ": Axe violations");
        assert.deepEqual(errors, [], engine + " " + viewport.name + ": uncaught browser exceptions");

        await page.screenshot({
          path: path.join(artifacts, engine + "-" + viewport.name + ".png"),
          animations: "disabled",
          fullPage: true
        });
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}
console.log("Intelligence 22-workspace preview accessibility: Chromium and WebKit interactions, focus, dialog trap, chart tables and Axe severe violations passed.");
