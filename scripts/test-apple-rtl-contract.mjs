import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");
const css = read("assets/css/rtl-localization.css");
const js = read("assets/js/rtl-localization.js");

test("Apple HIG RTL foundation uses logical direction, does not reverse brand imagery or numeric digits", () => {
  assert.match(css, /--np-rtl-contract:\s*1/);
  for (const rule of ["html[dir=\"rtl\"]", "direction: rtl", "direction: ltr",
    "unicode-bidi: isolate", "input[type=\"email\"]", "input[type=\"tel\"]",
    "data-np-number", "data-np-medicine-code", "data-np-directional-arrow",
    "env(safe-area-inset-bottom", "@media (max-width: 420px)", "forced-colors: active",
    ".desktop-nav a::after", ".roadmap-track li::before", ".status-notice",
    ".refresh-command", ".service-row > a", ".profile-detail aside",
    ".medicine-search-results li button", ".article-disclaimer"]) {
    assert.ok(css.includes(rule), `Missing right-to-left requirement: ${rule}`);
  }
  assert.doesNotMatch(css, /html\[dir="rtl"\]\s*:?is\([^)]*(?:img|picture|svg)[^)]*\)\s*\{[^}]*scaleX\(-1\)/s);
  assert.doesNotMatch(css, /html\[dir="rtl"\]\s*(?:body|main)\s*\{[^}]*transform:/s);
  assert.match(css, /main\[lang="en-GB"\]/);
});

test("static locale bootstrap resolves only the supported Arabic and Hebrew choices before rendering", () => {
  for (const locale of ["en-GB", "ar", "he", "ar-SA", "unexpected"]) {
    const element = { dataset: {} };
    const calls = [];
    const document = {
      cookie: `np_locale=${locale}; other=x`,
      documentElement: element,
      readyState: "loading",
      addEventListener(event) { calls.push(event); },
    };
    runInNewContext(js, { document });
    const expected = locale === "ar" || locale === "he" ? locale : "en-GB";
    assert.equal(element.lang, expected);
    assert.equal(element.dir, expected === "en-GB" ? "ltr" : "rtl");
    assert.equal(calls[0], "DOMContentLoaded");
  }
});

test("five Next.js properties share server-side locale direction and a functional user preference", () => {
  for (const app of ["corporate", "portal", "technology", "founder", "status"]) {
    const layout = read(`apps/${app}/app/layout.tsx`);
    assert.match(layout, /resolveInterfaceLocale\(\(await cookies\(\)\)\.get\("np_locale"\)\?\.value\)/, app);
    assert.match(layout, /<html[^>]*lang=\{locale\}[^>]*dir=\{directionForLocale\(locale\)\}/, app);
    assert.match(layout, /<InterfaceLocaleSwitcher locale=\{locale\} \/>/, app);
    assert.match(layout, /assets\/css\/rtl-localization\.css/, app);
    assert.match(layout, /lang="en-GB" data-np-untranslated/, app);
  }
  for (const client of ["apps/corporate/components/mobile-navigation.tsx", "apps/founder/components/chrome.tsx", "apps/technology/components/site-header.tsx"]) {
    assert.ok(read(client).startsWith('"use client";'), `Client boundary lost: ${client}`);
  }
  const switcher = read("src/components/interface-locale-switcher.tsx");
  for (const token of ["onChange={onChange}", "document.cookie", "window.location.reload()",
    "SameSite=Lax", "value=\"ar\"", "value=\"he\"", "full content translation pending"]) {
    assert.ok(switcher.includes(token), `Missing locale control: ${token}`);
  }
});

test("protected workspace formats currencies, numbers and dates using the server locale", () => {
  const page = read("apps/portal/app/[[...slug]]/page.tsx");
  const client = read("apps/portal/components/portal-client.tsx");
  const dashboard = read("apps/portal/components/dashboard.tsx");
  assert.match(page, /locale=\{locale\}/);
  assert.match(client, /<Dashboard module=\{module\} subview=\{subview\} locale=\{locale\} \/>/);
  assert.match(dashboard, /new Intl\.NumberFormat\(locale, \{ style: "currency"/);
  assert.match(dashboard, /new Intl\.NumberFormat\(locale\)\.format/);
  assert.match(dashboard, /\.toLocaleString\(locale/);
  assert.match(dashboard, /data-np-number=/);
  assert.match(dashboard, /data-np-medicine-code=/);
  // Values and permissions are not translated, only their display format.
  assert.match(page, /sessionDecision\(view, session\)/);
});

test("static navigation retains localized accessible names after opening and closing", () => {
  const menuSource = read("assets/js/novapharm.js").split("/* Desktop category navigation:")[0];
  for (const [locale, names] of Object.entries({
    "en-GB": ["Open navigation", "Close navigation", "Menu", "Close", "Primary navigation"],
    ar: ["فتح القائمة", "إغلاق القائمة", "القائمة", "إغلاق", "التنقل الرئيسي"],
    he: ["פתיחת תפריט", "סגירת תפריט", "תפריט", "סגירה", "ניווט ראשי"],
  })) {
    const attrs = {};
    const navAttrs = {};
    const handlers = {};
    const hiddenLabel = { textContent: "" };
    const visibleLabel = { textContent: "" };
    const classes = new Set();
    const menu = {
      setAttribute(key, value) { attrs[key] = value; },
      querySelector(selector) { return selector === ".sr-only" ? hiddenLabel : visibleLabel; },
      addEventListener(event, fn) { handlers[event] = fn; },
      contains() { return false; },
      focus() {},
    };
    const nav = {
      setAttribute(key, value) { navAttrs[key] = value; },
      querySelectorAll() { return []; },
      classList: {
        toggle(name, state) { if (state) classes.add(name); else classes.delete(name); },
        contains(name) { return classes.has(name); },
      },
      addEventListener() {},
      contains() { return false; },
    };
    const document = {
      documentElement: { lang: locale },
      querySelector(selector) {
        if (selector === "[data-nav-toggle]") return menu;
        if (selector === "[data-site-nav]") return nav;
        return null;
      },
      addEventListener() {},
    };
    const window = {
      location: { pathname: "/" },
      innerWidth: 390,
      addEventListener() {},
    };
    runInNewContext(menuSource, { document, window, URL });
    assert.equal(attrs["aria-label"], names[0]);
    assert.equal(navAttrs["aria-label"], names[4]);
    handlers.click();
    assert.equal(attrs["aria-label"], names[1]);
    assert.equal(attrs["aria-expanded"], "true");
    assert.equal(hiddenLabel.textContent, names[1]);
    assert.equal(visibleLabel.textContent, names[3]);
    handlers.click();
    assert.equal(attrs["aria-label"], names[0]);
    assert.equal(hiddenLabel.textContent, names[0]);
    assert.equal(visibleLabel.textContent, names[2]);
    assert.equal(attrs["aria-expanded"], "false");
  }
});

test("operational table values isolate mixed-language data and logos stay original", () => {
  const dashboard = read("apps/portal/components/dashboard.tsx");
  assert.match(dashboard, /<bdi dir=\{/);
  assert.match(dashboard, /<bdi dir="auto">/);
  const brand = read("apps/corporate/components/brand.tsx");
  assert.match(brand, /lang="en-GB" aria-label="NovaPharm Healthcare home"/);
  const switcher = read("src/components/interface-locale-switcher.tsx");
  for (const locale of ["en-GB", "ar", "he"]) {
    assert.ok(switcher.includes('lang="' + locale + '"'), "Picker option language missing: " + locale);
  }
  for (const app of ["technology", "status"]) {
    const layout = read("apps/" + app + "/app/layout.tsx");
    assert.ok(layout.lastIndexOf('import "../../../assets/css/rtl-localization.css";') >
      layout.indexOf('import "../../../assets/css/novapharm-apple-27-web-adaptation.css";'),
      "RTL override must follow adaptation CSS: " + app);
  }
});

test("public and protected static shells load RTL script without changing governed legal copy", () => {
  const publicBuilder = read("scripts/build-public-pages.mjs");
  const privateBuilder = read("scripts/build-pages.mjs");
  assert.match(publicBuilder, /<script src="\/assets\/js\/rtl-localization\.js"><\/script>/);
  assert.match(privateBuilder, /<script src="\/assets\/js\/rtl-localization\.js"><\/script>/);
  assert.match(publicBuilder, /<main id="main" lang="en-GB" data-np-untranslated>/);
  assert.match(js, /names\s*=\s*\{[\s\S]*ar:\s*\{[\s\S]*he:\s*\{/);
  assert.match(js, /\.site-header nav a/);
});

test("RTL CSS is a reproducible public asset and remains included in all CSS entrypoints", () => {
  assert.match(read("scripts/build-css-bundle.mjs"), /\["rtl-localization\.css", null\]/);
  assert.match(read("assets/css/novapharm.css"), /@import url\("\.\/rtl-localization\.css"\)/);
  const bundle = read("assets/css/novapharm.bundle.css");
  assert.match(bundle, /Source: rtl-localization\.css/);
  assert.match(bundle, /--np-rtl-contract:\s*1/);
});

test("interface localization does not claim that clinical, legal, or regulated editorial content is translated", () => {
  const source = read("src/core/interface-locale.ts");
  assert.match(source, /"en-GB": \{\}/);
  assert.match(source, /return labels\[locale\]\[english\] \?\? english/);
  assert.match(source, /new Intl\.NumberFormat\(locale\)/);
  assert.match(source, /new Intl\.DateTimeFormat\(locale,/);
  assert.equal((read("apps/corporate/components/site-header.tsx").match(/interfaceLabel\(locale, label\)/g) ?? []).length, 2, "Both corporate desktop link branches must translate");
  assert.equal((read("apps/corporate/components/mobile-navigation.tsx").match(/interfaceLabel\(locale, label\)/g) ?? []).length, 2, "Both corporate mobile link branches must translate");
  assert.match(read("apps/founder/components/chrome.tsx"), /interfaceLabel\(locale, "Contact"\)/);
  assert.match(read("apps/corporate/components/site-footer.tsx"), /interfaceLabel\(locale,/);
  const arrowLink = read("apps/technology/components/arrow-link.tsx");
  assert.match(arrowLink, /<ArrowRight data-np-directional-arrow="true" \/>/);
  assert.match(arrowLink, /<ArrowUpRight \/>/);
});
