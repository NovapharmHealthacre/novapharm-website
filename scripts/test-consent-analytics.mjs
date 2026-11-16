import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { APPROVED_NUTRAXIN_PRODUCT_PATHS, validGa4Id, publicAnalyticsRoute, analyticsBrand, sanitiseMarketingEvent, analyticsPagePath } from "../assets/js/consent-analytics.js";

assert.equal(validGa4Id("G-ABCD123456"), true);
for (const invalid of ["", "G-", "UA-123456", "G-ABC<script>", "G-abc123"]) {
  assert.equal(validGa4Id(invalid), false, "Reject invalid GA4 identifier");
}
assert.equal(publicAnalyticsRoute("/"), true);
assert.equal(publicAnalyticsRoute("/products/nutraxin/"), true);
assert.equal(publicAnalyticsRoute("/products/nutraxin/vitamin-d3-120-tablets/"), true);
// GA4 must be opt-in AND limited to exact reviewed public product URLs.
const approvedRetail = JSON.parse(readFileSync("assets/data/nutraxin-retail-catalogue.json", "utf8")).products;
assert.equal(approvedRetail.length, 19, "Review the product allowlist whenever the catalogue changes");
assert.deepEqual(
  [...APPROVED_NUTRAXIN_PRODUCT_PATHS].sort(),
  approvedRetail.map((product) => "/products/nutraxin/" + product.slug + "/").sort(),
  "Consent analytics may allow exactly the current 19 reviewed public product pages, without extra or missing slugs"
);
for (const product of approvedRetail) {
  assert.equal(publicAnalyticsRoute("/products/nutraxin/" + product.slug + "/"), true, "Approved informational product must remain eligible: " + product.slug);
}
for (const privatePath of [
  "/products/nutraxin/bag/", "/products/nutraxin/account/",
  "/products/nutraxin/checkout/", "/products/nutraxin/order-request/",
  "/products/nutraxin/confirmation/", "/products/nutraxin/orders/",
  "/products/nutraxin/receipt/", "/products/nutraxin/payment/",
  "/products/nutraxin/my-orders/", "/products/nutraxin/forgot-password/",
  "/products/nutraxin/unreviewed-future-page/",
  "/products/nutraxin/vitamin-d3-120-tablets/orders/"
]) {
  assert.equal(publicAnalyticsRoute(privatePath), false, "No analytics on a transactional, account, nested or unapproved route: " + privatePath);
  assert.equal(sanitiseMarketingEvent({ event: "add_to_cart" }, privatePath), null, "No funnel event on private route: " + privatePath);
}
for (const publicPath of ["/products/", "/products/strategic-portfolio/", "/products/marketplace/", "/products/esco/"]) {
  assert.equal(publicAnalyticsRoute(publicPath), true, "Approved informational product page must remain eligible: " + publicPath);
}
for (const privatePath of [
  "/products/orders/", "/products/checkout/", "/products/payment/",
  "/products/track/", "/products/esco/checkout/", "/products/marketplace/bag/",
  "/products/private-future-page/", "/products/strategic-portfolio/account/"
]) {
  assert.equal(publicAnalyticsRoute(privatePath), false, "Do not measure unreviewed product route: " + privatePath);
  assert.equal(sanitiseMarketingEvent({ event: "cta_click", ctaId: "checkout" }, privatePath), null);
}
assert.equal(publicAnalyticsRoute("/technology/"), true);
for (const forbidden of ["/portal/", "/contact/", "/account-application/", "/admin/", "/employee/", "/legal/privacy/", "/products/nutraxin/order-request/", "/products/nutraxin/checkout/"]) {
  assert.equal(publicAnalyticsRoute(forbidden), false, "Private or sensitive route must not be measured: " + forbidden);
}
assert.equal(analyticsBrand("/products/nutraxin/"), "nutraxin");
assert.equal(analyticsBrand("/technology/"), "intelligence");
assert.equal(analyticsBrand("/"), "healthcare");
assert.deepEqual(sanitiseMarketingEvent({ event:"add_to_cart", sku:"private", price:5000, email:"private@example.com" }, "/products/nutraxin/"), {
  event: "add_to_cart", brand: "nutraxin"
});
assert.deepEqual(sanitiseMarketingEvent({ event:"cta_click", ctaId:"partner-with-us", attribution:{email:"secret"} }, "/"), {
  event:"cta_click", brand:"healthcare", cta_id:"partner-with-us"
});
assert.deepEqual(sanitiseMarketingEvent({ event:"cta_click", ctaId:"contains space?utm=foo" }, "/"), {
  event:"cta_click",brand:"healthcare"
});
for (const forbidden of ["purchase", "qualified_enquiry", "qualified_early_access", "refund", "order_confirmed"]) {
  assert.equal(sanitiseMarketingEvent({event:forbidden}, "/products/nutraxin/"), null, "No unverified revenue or leads");
}
assert.equal(sanitiseMarketingEvent({event:"cta_click"}, "/contact/"), null);

const source = readFileSync("assets/js/consent-analytics.js", "utf8");
const generator = readFileSync("scripts/enhance-seo-authority.mjs", "utf8");
const store = readFileSync("assets/js/nutraxin-retail-store.js", "utf8");
assert.match(source, /analyticsConsent\(\)/);
assert.match(source, /novapharm:consent/);
assert.match(source, /ga-disable-/);
assert.match(source, /eraseGaCookies/);
assert.match(source, /send_page_view: false/);
assert.match(source, /"consent", "default"/);
assert.match(source, /"consent", "update"/);
assert.match(source, /analytics_storage: "denied"/);
assert.match(source, /analytics_storage: "granted"/);
assert.match(source, /cookie_expires: 90 \* 24 \* 60 \* 60/);
assert.match(source, /page_referrer: ""/);
assert.match(generator, /PUBLIC_ANALYTICS_PRIVACY_APPROVED/);
assert.match(generator, /PUBLIC_GA4_MEASUREMENT_ID/);
assert.match(store, /emitRetailFunnelEvent\("add_to_cart"\)/);
assert.match(store, /emitRetailFunnelEvent\("begin_checkout"\)/);
assert.match(source, /send\("view_item", \{ item_category: "food_supplements" \}\)/);
const sourcePage = readFileSync("index.html", "utf8");
if (sourcePage.includes('<meta name="novapharm-ga4-id"')) {
  assert.match(sourcePage, /G-897L1VS8BX/);
  assert.match(sourcePage, /src="\/assets\/js\/consent-analytics\.js"/);
  for (const route of ["contact/index.html", "portal/index.html", "legal/cookies/index.html", "legal/privacy/index.html"]) {
    assert.doesNotMatch(readFileSync(route, "utf8"), /<meta name="novapharm-ga4-id"/, "Private/legal route tracked: " + route);
  }
}
assert.equal(analyticsPagePath("/products/nutraxin/vitamin-d3-120-tablets/"), "/products/nutraxin/product/");
assert.equal(analyticsPagePath("/products/nutraxin/bag/"), "/products/nutraxin/bag/");
assert.match(readFileSync("assets/js/cookie-consent.js", "utf8"), /Google Analytics 4/);
assert.match(readFileSync("legal/cookies/index.html", "utf8"), /Google Analytics 4/);
assert.match(readFileSync("legal/privacy/index.html", "utf8"), /optional-website-analytics/);
assert.match(generator, /G-897L1VS8BX/, "Use the confirmed public NovaPharm Analytics web stream, not a portfolio stream");
assert.match(generator, /PUBLIC_ANALYTICS_PRIVACY_APPROVED/);

console.log("Consent analytics tests passed: GA4 disabled by default, sensitive routes excluded, coarse events only and no synthetic conversions.");
