import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { LIVE_ORIGIN, verifyPublishedHtml, PUBLIC_ROUTES } from "./verify-public-brand-source-live.mjs";

const products = [
  "artoflex-90-tablets", "collagen-complex-90-tablets", "collagen-gold-30-sachets",
  "collagen-gold-30-tablets", "l-carnitine-60-tablets", "magnesium-complex-60-tablets",
  "magnesium-daily-60-tablets", "mens-multivitamin-complex-60-tablets",
  "multivitamin-mineral-energy-60-tablets", "vitamin-b12-60-sublingual-tablets",
  "vitamin-c-1000mg-30-tablets", "vitamin-c-500mg-chewable-30-tablets",
  "vitamin-d3-120-tablets", "vitamin-d3-k2-120-tablets", "vitamin-d3-k2-spray-30ml",
  "vitamin-d3-spray-30ml", "vitamin-max-15-effervescent-tablets", "vitamin-max-60-tablets",
  "womens-multivitamin-complex-60-tablets"
];
const routes = [...new Set([...PUBLIC_ROUTES, "/about/", "/technology/", "/news-insights/",
  "/products/nutraxin/", "/products/nutraxin/bag/",
  "/distribution/", "/market-access/", "/markets/", "/services/", "/cro/",
  "/regulatory-services/", "/trust-centre/", "/about/company/", "/about/governance/",
  "/leadership/", "/leadership/vishal-chakravarty/", "/leadership/prabhakar-lahare/",
  "/leadership/girish-achliya/", "/leadership/helly-panchal/", "/leadership/nishita-trivedi/",
  "/careers/", "/investor-information/", "/partner-with-us/",
  "/products/marketplace/", "/products/strategic-portfolio/", "/products/track/",
  "/products/esco/", "/products/esco/bag/", "/products/nutraxin/order-request/",
  "/account-application/", "/legal/", "/legal/privacy/", "/legal/terms/",
  "/legal/cookies/", "/legal/modern-slavery/", "/legal/environment-carbon/",
  "/news-insights/compliance-first-pharmaceutical-distribution-uk/",
  "/news-insights/three-pillar-pharmaceutical-sourcing-model/",
  "/news-insights/plpi-pharmaceutical-supply-resilience/",
  "/news-insights/gdp-qms-pharmaceutical-distribution-foundations/",
  "/news-insights/oncology-supply-chain-demand-forecasting/",
  "/news-insights/batch-to-buyer-pharmaceutical-traceability/",
  ...products.map(slug => "/products/nutraxin/" + slug + "/")])];
const artifactMode = process.argv[2] === "--artifact";
const artifactRoot = artifactMode ? resolve(process.argv[3] || "_site") : null;
const expected = artifactMode ? process.argv[4] : process.env.EXPECTED_SITEWIDE_SHA;
if (expected) assert.match(expected, /^[a-f0-9]{40}$/, "Exact source SHA required");
if (artifactMode) {
  const dirs = readdirSync(resolve(artifactRoot, "products/nutraxin"), { withFileTypes: true });
  const found = dirs.filter(d => d.isDirectory() && !["account","bag","gift-cards","order-request"].includes(d.name)).map(d => d.name).sort();
  assert.deepEqual(found, [...products].sort(), "Exactly the 19 reviewed product routes are required");
  assert.ok(readFileSync(resolve(artifactRoot, "assets/css/novapharm.bundle.css"), "utf8").includes("--np-color-canvas: #FFFFFF"), "Approved white canvas is missing");
}
const nonce = Date.now();
async function get(route) {
  if (artifactMode) return readFileSync(resolve(artifactRoot, "." + route, "index.html"), "utf8");
  const response = await fetch(LIVE_ORIGIN + route + "?sitewide_verification=" + nonce + "-" + Date.now(),
    { redirect: "manual", headers: { "Cache-Control": "no-cache, no-store, max-age=0" },
      signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, route + " HTTP status");
  assert.ok((response.headers.get("content-type") || "").includes("text/html"), route + " content type");
  const html = await response.text();
  assert.ok(html.length < 1600000, route + " response budget");
  return html;
}
const receipt = html => html.match(/<meta name="novapharm-source-sha" content="([a-f0-9]{40})">/)?.[1];
let home;
if (!artifactMode && expected) {
  // Pages may still be propagating after the deploy action returns. Only accept
  // the approved SHA; never treat an older successful response as publication.
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      const html = await get("/");
      if (receipt(html) === expected) { home = html; break; }
    } catch (error) {
      console.warn("Waiting for exact deployment receipt: " + String(error.message).slice(0, 120));
    }
    if (attempt < 11) await new Promise(resolve => setTimeout(resolve, 5000));
  }
  assert.ok(home, "Exact deployment receipt did not propagate");
} else home = await get("/");
const source = receipt(home);
assert.ok(source, "Homepage missing exact source receipt: possible rollback");
if (expected) assert.equal(source, expected, "Homepage does not match exact approved release");
let failures = 0;
for (let i = 0; i < routes.length; i += 5) {
  await Promise.all(routes.slice(i, i + 5).map(async route => {
    try {
      const html = route === "/" ? home : await get(route);
      const errors = verifyPublishedHtml(html, route, source);
      if (route !== "/legal/accessibility/" &&
          ((html.match(/<header class="site-header npd-header"/g) || []).length !== 1 ||
           (html.match(/<footer class="site-footer npd-footer"/g) || []).length !== 1))
        errors.push("Shared header/footer missing or duplicated");
      assert.deepEqual(errors, [], route);
      console.log("PASS " + route);
    } catch (error) {
      failures++;
      console.error("FAIL " + route + ": " + String(error.message).slice(0, 500));
    }
  }));
}
assert.equal(failures, 0, "Sitewide publication consistency failure");
console.log("Verified " + routes.length + " pages against homepage release " + source);
