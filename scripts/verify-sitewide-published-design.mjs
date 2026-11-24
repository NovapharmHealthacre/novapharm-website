import assert from "node:assert/strict";
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
  ...products.map(slug => "/products/nutraxin/" + slug + "/")])];
const nonce = Date.now();
async function get(route) {
  const response = await fetch(LIVE_ORIGIN + route + "?sitewide_verification=" + nonce,
    { redirect: "manual", headers: { "Cache-Control": "no-cache, no-store, max-age=0" },
      signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, route + " HTTP status");
  assert.ok((response.headers.get("content-type") || "").includes("text/html"), route + " content type");
  const html = await response.text();
  assert.ok(html.length < 1600000, route + " response budget");
  return html;
}
const home = await get("/");
const source = home.match(/<meta name="novapharm-source-sha" content="([a-f0-9]{40})">/)?.[1];
assert.ok(source, "Homepage missing exact source receipt: possible rollback");
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
