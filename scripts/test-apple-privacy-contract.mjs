import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseConsent, saveConsent, CONSENT_VERSION, CONSENT_MAX_AGE_MS } from "../assets/js/cookie-consent.js";
import { publicAnalyticsRoute } from "../assets/js/consent-analytics.js";

const source = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("static and Next consent records share version and field contract", () => {
  const next = source("apps/corporate/components/cookie-controls.tsx");
  assert.match(next, new RegExp('consentVersion = "' + CONSENT_VERSION + '"'));
  assert.match(next, /readonly id: string/);
  assert.match(next, /readonly timestamp: string/);
  assert.match(next, /necessary: true/);
  assert.match(next, /age > maxAgeMs/);
  assert.match(next, /window\.dispatchEvent\(new CustomEvent\("novapharm:consent"/);
  assert.match(next, /readConsent\(\) === null/);
  assert.match(next, /window\.localStorage\.setItem/);
  assert.match(next, /Non-essential services remain off/);
  const when = new Date("2026-11-15T12:00:00.000Z");
  const cache = new Map();
  const storage = { setItem: (key, value) => cache.set(key, value), getItem: (key) => cache.get(key) ?? null };
  const choice = saveConsent(storage, { necessary: true, preferences: true, analytics: true, marketing: false }, { now: when, id: "11111111-2222-4333-8444-555555555555" });
  assert.equal(parseConsent(storage.getItem("np_cookie_consent"), when.getTime())?.categories.analytics, true);
  assert.equal(parseConsent(storage.getItem("np_cookie_consent"), when.getTime() + CONSENT_MAX_AGE_MS + 1), null);
  assert.equal(parseConsent(JSON.stringify({ ...choice, version: "obsolete" }), when.getTime()), null);
});

test("the UI never pre-authorises inactive advertising or marketing providers", () => {
  const staticUi = source("assets/js/cookie-consent.js");
  const nextUi = source("apps/corporate/components/cookie-controls.tsx");
  assert.match(staticUi, /name="marketing" disabled/);
  assert.match(staticUi, /if \(action === "accept"\) choose\(\{ preferences: true, analytics: true, marketing: false \}\)/);
  assert.match(nextUi, /Marketing tracking unavailable/);
  assert.doesNotMatch(nextUi, /marketing: true/);
  assert.match(source("assets/js/consent-analytics.js"), /ad_personalization: "denied"/);
});

test("privacy notices provide actionable user choice, data rights and permission boundaries", () => {
  const staticPrivacy = source("legal/privacy/index.html");
  const staticCookies = source("legal/cookies/index.html");
  const corporatePages = source("apps/corporate/data/pages.ts");
  const renderer = source("apps/corporate/components/page-renderer.tsx");
  for (const id of ["privacy-by-design", "privacy-controls", "protected-device-resources", "optional-website-analytics"]) {
    assert.match(staticPrivacy, new RegExp('id="' + id + '"'));
  }
  assert.match(staticPrivacy, /data-cookie-settings/);
  assert.match(staticPrivacy, /Privacy Lead/);
  assert.match(staticPrivacy, /browser.*permission interface/);
  assert.match(staticCookies, /data-cookie-settings/);
  assert.match(corporatePages, /title: "Privacy by design"/);
  assert.match(corporatePages, /title: "Protected resources and location"/);
  assert.match(renderer, /CookieSettingsButton className=/);
  assert.match(renderer, /legal\/privacy/);
  assert.doesNotMatch(staticPrivacy, /<meta name="novapharm-ga4-id"/);
});

test("GA4 route exclusions retain legal, contact and account privacy boundaries", () => {
  for (const path of ["/legal/privacy/", "/legal/cookies/", "/contact/", "/account-application/", "/portal/", "/admin/", "/products/nutraxin/checkout/"]) {
    assert.equal(publicAnalyticsRoute(path), false, path);
  }
  assert.equal(publicAnalyticsRoute("/"), true);
  assert.equal(publicAnalyticsRoute("/technology/"), true);
  const register = source("compliance/cookie-register.md");
  assert.match(register, /2026-11-15-v1.3/);
  assert.match(register, /Google Analytics 4/);
});

test("native-only APIs are not misrepresented as website implementations", () => {
  const guide = source("docs/design/apple-privacy-web-adaptation.md");
  for (const part of ["UIKit", "Core Location", "App Tracking Transparency", "WebAuthn", "legal review"]) {
    assert.ok(guide.includes(part), part);
  }
  assert.doesNotMatch(source("legal/privacy/index.html"), /navigator\.geolocation|getUserMedia\(/);
});
