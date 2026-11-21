import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const origin = "https://novapharmhealthcare.com";
const catalogue = readFileSync("apps/corporate/data/pages.ts", "utf8");
const sitemap = readFileSync("sitemap.xml", "utf8");
const sourceSlugs = [...catalogue.matchAll(/\bpage\(\s*"([^"]*)"\s*,\s*"([^"]+)"/g)].map(match => match[1]);
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
// The compatibility-only AI governance route and protected account application
// must not be promoted to public search merely to satisfy catalogue parity.
const excluded = new Set(["technology/ai-governance", "account-application"]);

test("all governed indexable Corporate routes appear exactly once in the checked-in canonical sitemap", () => {
  assert.equal(sourceSlugs.length, 32, "Review changes to the governed corporate source catalogue");
  assert.equal(new Set(sourceSlugs).size, 32);
  assert.equal(new Set(urls).size, urls.length, "Duplicate canonical sitemap URLs");
  for (const slug of sourceSlugs.filter(slug => !excluded.has(slug))) {
    const url = origin + (slug ? "/" + slug + "/" : "/");
    assert.equal(urls.filter(item => item === url).length, 1, "Missing or duplicate indexable corporate route: " + url);
  }
});

test("release sitemap preserves the three independently live-probed distribution and market pages", () => {
  for (const slug of ["distribution", "market-access", "markets"]) {
    const escaped = slug.replace(/[.*+?^{()}|[\]\\]/g, "\\$&");
    assert.match(sitemap, new RegExp("<url><loc>" + origin + "/" + escaped + "/<\\/loc><lastmod>2026-11-10<\\/lastmod><\\/url>"));
  }
});

test("private and noindex routes do not enter the public sitemap", () => {
  for (const slug of [...excluded, "quantum-research", "products/esco/bag", "products/track",
    "portal/dashboard", "employee/dashboard", "admin/dashboard"]) {
    assert.ok(!urls.includes(origin + "/" + slug + "/"), "Restricted route indexed: " + slug);
  }
  assert.ok(urls.some(url => url === origin + "/products/nutraxin/"));
  assert.ok(urls.filter(url => url.startsWith(origin + "/products/nutraxin/") && url !== origin + "/products/nutraxin/").length >= 19);
});
