import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, webkit, firefox } from "playwright";
import AxeBuilder from "@axe-core/playwright";

// Read-only inspection. Never submit contact forms or initiate orders/payments.
const origin = "https://novapharmhealthcare.com";
if (process.env.CORPORATE_LIVE_ORIGIN && process.env.CORPORATE_LIVE_ORIGIN !== origin) {
  throw new Error("Corporate browser acceptance refuses an unapproved off-domain origin");
}
const expectedSHA = process.env.EXPECTED_LIVE_SHA ?? "";
const output = path.resolve("artifacts/corporate-live-acceptance");
const pages = [
  ["/", "home", /Medicine\. Where it needs to be/],
  ["/about/", "about", /Getting medicine to where it matters/],
  ["/capabilities/", "capabilities", /From evidence to access/],
  ["/distribution/", "distribution", /Global distribution/],
  ["/market-access/", "market-access", /A product can be ready/],
  ["/markets/", "markets", /Access is local/],
  ["/oncology/", "oncology", /A Hope for\s+Tomorrow/],
  ["/regulatory-services/", "regulatory", /regulat|permission/i],
  ["/products/", "products", /Different products/],
  ["/contact/", "contact", /Let's talk/],
  ["/legal/privacy/", "privacy", /privacy/i],
  ["/legal/accessibility/", "accessibility", /accessibility/i]
];
const results = [];
for (const [engineName, engine] of [["chromium", chromium], ["webkit", webkit], ["firefox", firefox]]) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const [viewportName, width, height] of [["mobile", 390, 844], ["desktop", 1440, 900]]) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce", serviceWorkers: "block" });
      try {
        for (const [route, slug, expectedH1] of pages) {
          const row = { browser: engineName, viewport: viewportName, route, issues: [] };
          const page = await context.newPage();
          const errors = [];
          page.on("pageerror", e => errors.push(e.message));
          try {
            const url = new URL(route, origin);
            url.searchParams.set("live-acceptance", "20261111-" + engineName + "-" + viewportName);
            const response = await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: 45000 });
            if (response?.status() !== 200) row.issues.push("HTTP " + response?.status());
            await page.evaluate(() => document.fonts.ready).catch(() => undefined);
            const state = await page.evaluate(() => {
              const meta = (key, attr = "property") => [...document.querySelectorAll('meta[' + attr + '="' + key + '"]')].map(n => n.content);
              const h1s = [...document.querySelectorAll("main h1")];
              const logo = document.querySelector("header.site-header img[src*='novapharm-healthcare-logo']");
              const nav = document.querySelector("header.site-header nav[aria-label='Primary navigation']");
              const ids = [...document.querySelectorAll("[id]")].map(n => n.id);
              return {
                title: document.title, lang: document.documentElement.lang,
                h1Count: h1s.length, h1: h1s[0]?.innerText.replace(/\s+/g," ").trim() ?? "",
                canonical: document.querySelector('link[rel="canonical"]')?.href ?? "",
                description: meta("description", "name"),
                sourceSha: meta("novapharm-source-sha", "name"),
                og: ["og:image","og:image:secure_url","og:image:type","og:image:width","og:image:height","og:image:alt"].map(k => [k, meta(k)]),
                nav: [...(nav?.querySelectorAll("a") ?? [])].map(a => a.getAttribute("href")),
                logo: Boolean(logo && logo.complete && logo.naturalWidth > 0),
                duplicateIds: ids.filter((id,i) => ids.indexOf(id) !== i).slice(0,5),
                overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
                contact: Boolean(document.querySelector("[data-live-b2b-enquiry-form]")),
                approvedCapabilities: document.querySelector("[data-capabilities-editorial]")?.getAttribute("data-capabilities-editorial"),
                warehouse: document.querySelector("img.ndist-hero-warehouse")?.getAttribute("src") ?? "",
                nasa: document.querySelector("img.markets-hero-photo")?.getAttribute("src") ?? "",
                legalLinks: [...document.querySelectorAll("footer a")].map(a => a.getAttribute("href")),
              };
            });
            row.state = state;
            if (!expectedH1.test(state.h1) || state.h1Count !== 1) row.issues.push("Wrong H1: " + state.h1);
            if (state.overflow > 2) row.issues.push("Horizontal overflow " + state.overflow);
            if (!state.logo) row.issues.push("Header logo not loaded");
            if (!state.nav.includes("/distribution/") || !state.nav.includes("https://portal.novapharmhealthcare.com/")) row.issues.push("Navigation incomplete");
            if (!state.title || !state.lang.startsWith("en")) row.issues.push("Title/lang invalid");
            if (new URL(state.canonical || origin).pathname !== route) row.issues.push("Wrong canonical " + state.canonical);
            if (state.description.length !== 1 || !state.description[0]) row.issues.push("Description metadata");
            for (const [key, values] of state.og) if (values.length !== 1 || !values[0]) row.issues.push("Social metadata " + key + " count " + values.length);
            if (state.duplicateIds.length) row.issues.push("Duplicate IDs " + state.duplicateIds.join(","));
            if (state.sourceSha.length !== 1 || !/^[a-f0-9]{40}$/.test(state.sourceSha[0])) row.issues.push("Source-SHA missing");
            if (expectedSHA && state.sourceSha[0] !== expectedSHA) row.issues.push("Source-SHA mismatch: " + state.sourceSha[0]);
            if (!state.legalLinks.includes("/legal/privacy/") || !state.legalLinks.includes("/legal/accessibility/")) row.issues.push("Privacy/accessibility footer");
            if (slug === "capabilities" && state.approvedCapabilities !== "approved-2026-11") row.issues.push("Stale Capabilities page");
            if (slug === "distribution" && !state.warehouse.endsWith("novapharm-warehouse-original.jpg")) row.issues.push("Warehouse hero not in production");
            if (slug === "markets" && !state.nasa.includes("iss070e075895_lrg.jpg")) row.issues.push("NASA image source not in production");
            if (slug === "contact" && !state.contact) row.issues.push("AWS-backed contact form missing");
            if (errors.length) row.issues.push("JavaScript errors: " + errors.slice(0,2).join(" | "));
            if (engineName === "chromium" && viewportName === "mobile") {
              const audit = await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa","wcag22aa"]).analyze();
              row.axe = audit.violations.map(v => ({ rule: v.id, impact: v.impact, affected: v.nodes.length }));
              for (const v of audit.violations.filter(v => ["serious","critical"].includes(v.impact))) row.issues.push("A11y " + v.id + " " + v.impact);
            }
            if (["chromium","webkit"].includes(engineName) && ["home","about","capabilities","distribution","markets","oncology","products","contact"].includes(slug)) {
              const folder = path.join(output, engineName, viewportName);
              await mkdir(folder, { recursive: true });
              await page.screenshot({ path: path.join(folder, slug + ".png"), fullPage: true, animations: "disabled", timeout: 30000 });
            }
          } catch(e) { row.issues.push("Browser exception: " + e.message); }
          results.push(row);
          console.log(engineName + " " + viewportName + " " + route + ": " + (row.issues.length ? row.issues.join("; ") : "PASS"));
          await page.close();
        }
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
}
await mkdir(output,{recursive:true});
const failed = results.filter(row => row.issues.length);
await writeFile(path.join(output, "results.json"), JSON.stringify({origin, expectedSHA, total: results.length, failed: failed.length, results}, null, 2));
console.log("Corporate live browser acceptance: " + results.length + " checks; " + failed.length + " failures.");
assert.equal(failed.length, 0, "Unresolved live failures: see results.json artifact");
