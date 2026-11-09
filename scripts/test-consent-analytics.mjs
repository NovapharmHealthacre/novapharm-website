import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validGa4Id, publicAnalyticsRoute, analyticsBrand, sanitiseMarketingEvent, analyticsPagePath } from "../assets/js/consent-analytics.js";

assert.equal(validGa4Id("G-ABCD123456"), true);
for (const invalid of ["", "G-", "UA-123456", "G-ABC<script>", "G-abc123"]) {
  assert.equal(validGa4Id(invalid), false, "Reject invalid GA4 identifier");
}
assert.equal(publicAnalyticsRoute("/"), true);
assert.equal(publicAnalyticsRoute("/products/nutraxin/"), true);
assert.equal(publicAnalyticsRoute("/products/nutraxin/vitamin-d3-120-tablets/"), true);
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
