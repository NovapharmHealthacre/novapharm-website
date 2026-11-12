import { chromium, webkit } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const dir = path.resolve("artifacts/oncology-live-safari");
mkdirSync(dir, { recursive: true });
const summaries = [];
for (const [engine, browserType] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await browserType.launch({ headless: true });
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({
        viewport: { width, height: width === 390 ? 844 : 900 },
        deviceScaleFactor: 1,
        locale: "en-GB",
        colorScheme: "light",
        reducedMotion: "reduce",
      });
      const assets = [];
      page.on("response", res => {
        if (/oncology-(hope-v2|editorial)\.css|novapharm\.bundle\.css/.test(res.url())) {
          assets.push({
            url: res.url(),
            status: res.status(),
            cache: res.headers()["cache-control"],
            age: res.headers()["age"],
            etag: res.headers().etag,
          });
        }
      });
      const url = "https://novapharmhealthcare.com/oncology/?owner-ss2-safari-live-probe=" + Date.now();
      try {
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
        await page.locator(".npoc-hope-hero").waitFor({ state: "visible", timeout: 20000 });
        await page.waitForTimeout(1800);
        const selectors = await page.evaluate(() => {
          const el = selector => document.querySelector(selector);
          const css = node => node ? getComputedStyle(node) : null;
          const rect = node => node?.getBoundingClientRect().toJSON() || null;
          const card = el(".npoc-focus-card");
          const heroImage = el(".npoc-hero-visual img");
          const focus = el(".npoc-hope-focus");
          const cards = [...document.querySelectorAll(".npoc-focus-card")];
          return {
            title: document.title,
            releaseSha: el('meta[name="novapharm-source-sha"]')?.content || null,
            stylesheetLinks: [...document.querySelectorAll('link[rel="stylesheet"]')].map(x => x.href),
            stylesheetRules: [...document.styleSheets].map(x => ({ href: x.href, readable: (() => {
              try { return x.cssRules.length } catch { return "unavailable" }
            })() })),
            hero: rect(el(".npoc-hope-hero")),
            heroCopy: rect(el(".npoc-hero-copy")),
            heroHeading: rect(el(".npoc-hope-hero h1")),
            heroHeadingFont: css(el(".npoc-hope-hero h1"))?.fontSize,
            heroImage: rect(heroImage),
            heroImageFit: css(heroImage)?.objectFit,
            heroImageMask: css(heroImage)?.maskImage,
            heroLayerMask: css(el(".npoc-hero-visual"))?.maskImage,
            heroLayerWidth: rect(el(".npoc-hero-visual"))?.width,
            focus: rect(focus),
            focusLayout: css(el(".npoc-focus-layout"))?.gridTemplateColumns,
            cardWidth: rect(card)?.width,
            cardHeight: rect(card)?.height,
            cardCount: cards.length,
            cardPositions: cards.map(x => rect(x)),
            focusH2: rect(el(".npoc-focus-copy h2")),
            horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          };
        });
        const base = engine + "-" + width;
        await page.locator(".npoc-hope-hero").screenshot({ path: path.join(dir, base + "-hero.png") });
        await page.locator(".npoc-hope-focus").screenshot({ path: path.join(dir, base + "-focus.png") });
        const summary = { engine, width, http: response?.status(), url, assets, ...selectors };
        summaries.push(summary);
        console.log("LIVE_ONCOLOGY_RESULT " + JSON.stringify(summary));
      } catch (error) {
        console.log("LIVE_ONCOLOGY_ERROR " + JSON.stringify({ engine, width, message: String(error) }));
        summaries.push({ engine, width, error: String(error) });
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
}
writeFileSync(path.join(dir, "computed.json"), JSON.stringify(summaries, null, 2));
if (summaries.some(x => x.error || x.http !== 200)) process.exitCode = 1;
