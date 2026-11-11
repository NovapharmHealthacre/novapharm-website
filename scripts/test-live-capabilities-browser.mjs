import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, webkit } from "playwright";

// Observe the REAL customer host after the protected publisher succeeds.
// The earlier source-only checks did not prove Safari's rendered appearance.
const origin = process.env.CAPABILITIES_LIVE_ORIGIN ?? "https://novapharmhealthcare.com";
const artifactRoot = path.resolve("artifacts/capabilities-live-browser");
const version = "20261111-capabilities-design-verified-v4";
const viewports = [
  { label: "mobile-390", width: 390, height: 844, columns: 1 },
  { label: "tablet-768", width: 768, height: 1024, columns: 2 },
  { label: "desktop-1440", width: 1440, height: 900, columns: 4 },
];

for (const [name, engine] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        reducedMotion: "reduce",
        serviceWorkers: "block",
      });
      try {
        const page = await context.newPage();
        const failures = [];
        page.on("pageerror", (error) => failures.push(error.message));
        const url = `${origin}/capabilities/?visual-acceptance=${Date.now()}-${name}-${viewport.label}`;
        const response = await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
        assert.equal(response?.status(), 200, `${name} ${viewport.label}: live route unavailable`);
        await page.locator(".ncap-page").waitFor({ state: "visible" });
        await page.locator(".ncap-earth").scrollIntoViewIfNeeded();
        await page.waitForFunction(() => [...document.querySelectorAll(".ncap-vial-illustration,.ncap-earth-illustration")]
          .every((image) => image.complete), undefined, { timeout: 15_000 });
        const observation = await page.evaluate(() => {
          const main = document.querySelector(".ncap-page");
          const hero = document.querySelector(".ncap-hero h1");
          const grid = document.querySelector(".ncap-grid");
          const earth = document.querySelector(".ncap-earth");
          const logo = document.querySelector("header.site-header img[src*='novapharm-healthcare-logo.png']");
          const vial = document.querySelector(".ncap-vial-illustration");
          const earthImage = document.querySelector(".ncap-earth-illustration");
          const css = document.querySelector("link[href*='capabilities-editorial.css']");
          const imageOK = (node) => node instanceof HTMLImageElement &&
            node.complete && node.naturalWidth >= 100 && node.getBoundingClientRect().width > 100;
          return {
            marker: main?.getAttribute("data-capabilities-editorial"),
            headline: hero?.innerText.replace(/\s+/g, " ").trim(),
            headerLogo: imageOK(logo) && getComputedStyle(logo).display !== "none",
            headlineFont: hero && getComputedStyle(hero).fontFamily,
            css: css?.getAttribute("href") ?? "",
            columns: grid && getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length,
            vial: imageOK(vial),
            earth: imageOK(earthImage),
            earthColor: earth && getComputedStyle(earth).backgroundColor,
            linkedDisciplines: [...document.querySelectorAll(".ncap-discipline")].map((a) => a.getAttribute("href")),
            closingTitle: document.querySelector(".ncap-earth h2")?.textContent?.trim(),
            horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
          };
        });
        assert.equal(observation.marker, "approved-2026-11", `${name} ${viewport.label}: old page template served`);
        assert.equal(observation.headline, "From evidence to access.", `${name} ${viewport.label}: wrong live hero`);
        assert.ok(observation.headerLogo, `${name} ${viewport.label}: approved logo is missing`);
        assert.match(observation.headlineFont ?? "", /-apple-system|BlinkMacSystemFont|Helvetica Neue/i);
        assert.ok(observation.css.includes(version), `${name} ${viewport.label}: stale CSS URL served`);
        assert.equal(observation.columns, viewport.columns, `${name} ${viewport.label}: wrong responsive grid`);
        assert.ok(observation.vial && observation.earth, `${name} ${viewport.label}: artwork not rendered`);
        assert.equal(observation.earthColor, "rgb(7, 22, 37)", `${name} ${viewport.label}: dark Earth stage missing`);
        assert.deepEqual(observation.linkedDisciplines, ["/services/", "/regulatory-services/", "/cro/", "/technology/"]);
        assert.equal(observation.closingTitle, "Start with one decision.");
        assert.equal(observation.horizontalOverflow, false, `${name} ${viewport.label}: horizontal overflow`);
        assert.deepEqual(failures, [], `${name} ${viewport.label}: JavaScript runtime errors`);
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        await mkdir(path.join(artifactRoot, name), { recursive: true });
        await page.screenshot({
          path: path.join(artifactRoot, name, `${viewport.label}.png`),
          fullPage: true,
          animations: "disabled",
          timeout: 25_000,
        });
        console.log(`${name} ${viewport.label}: approved Capabilities live visual rendered; ${observation.css}`);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}
console.log("Actual production Capabilities passed six independent rendered browser checks.");
