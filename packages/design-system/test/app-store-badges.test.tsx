import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppleAppStoreBadges, isValidAppStoreListing, designSystemCss } from "../src/index.ts";

const ios = {
  platform: "ios" as const,
  appName: "NovaPharm Intelligence",
  url: "https://apps.apple.com/gb/app/novapharm-intelligence/id1234567890",
};
const mac = {
  platform: "mac" as const,
  appName: "NovaPharm Intelligence",
  url: "https://apps.apple.com/gb/app/novapharm-intelligence/id1234567891",
};

test("badges remain unpublished by default", () => {
  assert.equal(renderToStaticMarkup(<AppleAppStoreBadges listings={[ios, mac]} />), "");
  assert.equal(renderToStaticMarkup(<AppleAppStoreBadges listings={[]} approvedForPublication />), "");
});

test("only direct Apple App Store product links are permitted", () => {
  assert.equal(isValidAppStoreListing(ios), true);
  assert.equal(isValidAppStoreListing(mac), true);
  for (const url of [
    "https://apple.com/",
    "https://apps.apple.com/",
    "https://apps.apple.com/gb/app/",
    "https://apps.apple.com.evil.example/gb/app/a/id123",
    "http://apps.apple.com/gb/app/a/id123",
    "https://apps.apple.com/gb/app/a/",
    "javascript:alert(1)",
    "/apps/",
    "https://apps.apple.com@evil.example/gb/app/a/id123",
  ]) {
    assert.equal(isValidAppStoreListing({ ...ios, url }), false, url);
  }
  assert.equal(isValidAppStoreListing({ ...ios, appName: "   " }), false);
});

test("Apple's black badge lineup is ordered iPhone/iPad before Mac and remains an image", () => {
  const html = renderToStaticMarkup(
    <AppleAppStoreBadges listings={[mac, ios, ios]} approvedForPublication />,
  );
  assert.match(html, /aria-label="App downloads"/);
  assert.equal((html.match(/class="np-app-store-badges__link"/g) ?? []).length, 2);
  assert.ok(html.indexOf("app-store-black.svg") < html.indexOf("mac-app-store-black.svg"));
  assert.match(html, /aria-label="Download NovaPharm Intelligence on the App Store"/);
  assert.match(html, /aria-label="Download NovaPharm Intelligence on the Mac App Store"/);
  assert.match(html, /aria-hidden="true"/);
  assert.doesNotMatch(html, /<svg|<button|style=/);
});

test("badge CSS respects 40px minimum, 25 percent clearance and no re-colouring", () => {
  assert.match(designSystemCss, /\.np-app-store-badges__link\{[^}]*margin:10px/);
  assert.match(designSystemCss, /\.np-app-store-badges__artwork\{[^}]*height:40px/);
  assert.doesNotMatch(designSystemCss, /\.np-app-store-badges__artwork\{[^}]*filter:|\.np-app-store-badges__artwork\{[^}]*transform:/);
});
