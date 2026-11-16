import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";

const origin = process.env.PUBLIC_PAGES_BASE_URL ?? "http://127.0.0.1:4310";
const viewports = [
  { width: 320, height: 720 },
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
];
const locales = ["en-GB", "ar", "he"];

for (const [engineName, engine] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const viewport of viewports) {
      for (const locale of locales) {
        // Isolated browser context: no user accounts, API mutations or reused
        // browser cookies. The source public site is allowed to load directly.
        const context = await browser.newContext({ viewport });
        try {
          if (locale !== "en-GB") {
            await context.addCookies([{ name: "np_locale", value: locale, url: origin }]);
          }
          const page = await context.newPage();
          const response = await page.goto(origin + "/", { waitUntil: "domcontentloaded" });
          assert.equal(response?.status(), 200, engineName + " public home returned non-200");
          const selector = page.locator("[data-np-locale-control]");
          await selector.waitFor({ state: "visible" });
          assert.equal(await selector.count(), 1, "Exactly one language selector is permitted");
          const info = await selector.evaluate((node) => {
            const element = node;
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            const select = element.querySelector("select");
            const field = select ? getComputedStyle(select) : null;
            const host = element.closest(".npd-footer-bottom, .site-footer, footer");
            return {
              insideFooter: Boolean(host),
              position: style.position,
              background: style.backgroundColor,
              border: [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth],
              shadow: style.boxShadow,
              fieldBorder: field?.borderTopWidth,
              fieldHeight: select?.getBoundingClientRect().height ?? 0,
              left: rect.left,
              right: rect.right,
              screenWidth: document.documentElement.clientWidth,
              locale: document.documentElement.lang,
              direction: document.documentElement.dir,
              chosen: select?.value,
              noteVisible: !getComputedStyle(element.querySelector(".np-locale-note")).clipPath.startsWith("inset("),
              text: element.textContent,
            };
          });
          const label = engineName + " / " + locale + " / " + viewport.width;
          assert.equal(info.insideFooter, true, label + ": not integrated into site footer");
          assert.equal(info.position, "static", label + ": overlay could obscure content");
          assert.match(info.background, /rgba?\(0,\s*0,\s*0,\s*0\)/, label + ": card fill still visible");
          assert.ok(info.border.every((x) => x === "0px"), label + ": boxed border still visible");
          assert.equal(info.shadow, "none", label + ": card shadow still visible");
          assert.equal(info.fieldBorder, "0px", label + ": dropdown field border still visible");
          assert.ok(info.fieldHeight >= 43, label + ": dropdown hit target too small");
          assert.ok(info.left >= -2 && info.right <= info.screenWidth + 2, label + ": selector clipped");
          assert.equal(info.locale, locale, label + ": selected language not applied");
          assert.equal(info.direction, locale === "en-GB" ? "ltr" : "rtl", label + ": page direction mismatch");
          assert.equal(info.chosen, locale, label + ": selected option not shown");
          assert.equal(info.noteVisible, locale !== "en-GB", label + ": incomplete translation disclosure incorrectly hidden");
          assert.ok(info.text?.includes("preview") || locale === "ar" || locale === "he",
            label + ": preview disclosure missing");
          await page.locator("#np-interface-locale").focus();
          assert.equal(await page.evaluate(() => document.activeElement?.id), "np-interface-locale",
            label + ": keyboard focus is unavailable");
          console.log("Footer language acceptance passed:", label);
        } finally {
          await context.close();
        }
      }
    }
    // The Contact journey uses a standalone visible footer and hides the
    // legacy global footer. Never bury the language selector in that shell.
    for (const locale of ["en-GB", "ar"]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      try {
        if (locale !== "en-GB") {
          await context.addCookies([{ name: "np_locale", value: locale, url: origin }]);
        }
        const page = await context.newPage();
        const response = await page.goto(origin + "/contact/", { waitUntil: "domcontentloaded" });
        assert.equal(response?.status(), 200, engineName + " Contact page must load");
        const selector = page.locator("[data-np-locale-control]");
        await selector.waitFor({ state: "visible" });
        assert.equal(await selector.count(), 1, "Contact must expose one visible locale selector");
        assert.equal(await selector.evaluate((node) =>
          Boolean(node.closest(".np-contact-reference-footer-inner"))), true,
          engineName + " / " + locale + ": selector inserted into hidden legacy Contact footer");
        assert.equal(await page.locator("#np-interface-locale").inputValue(), locale);
        console.log("Standalone Contact footer locale acceptance passed:", engineName, locale);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}
