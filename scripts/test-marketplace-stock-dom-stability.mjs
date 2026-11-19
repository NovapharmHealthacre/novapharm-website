import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const marketplace = readFileSync(new URL("../assets/js/commerce-marketplace.js", import.meta.url), "utf8");
const geometry = readFileSync(new URL("./test-public-sitemap-geometry.mjs", import.meta.url), "utf8");

test("advisory stock lookup refreshes visible labels without recreating product images", () => {
  const loadStock = marketplace.slice(
    marketplace.indexOf("async function loadStock(rows)"),
    marketplace.indexOf("const fold=")
  );
  assert.ok(loadStock.includes("refreshVisibleStock();"), "Stock settlement must update text in place");
  assert.ok(!loadStock.includes("render();"), "Async stock refresh must not replace image cards");
  assert.match(marketplace, /stockView\.dataset\.marketplaceStockSku=p\.sku/);
  assert.match(marketplace, /node\.textContent=stockLabel\(node\.dataset\.marketplaceStockSku\)/);
  assert.match(marketplace, /renderCompare\(\);/);
  assert.match(marketplace, /checkoutAuthority===false/);
});

test("marketplace geometry audit awaits async catalogue cards before checking images", () => {
  const route = geometry.indexOf('if (route === "/products/marketplace/")');
  const eager = geometry.indexOf('img.loading = "eager"');
  assert.ok(route >= 0 && eager > route, "The 24-card readiness gate must precede image audit");
  assert.match(geometry, /querySelectorAll\("\[data-commerce-marketplace\] \.mp-card"\)\.length === 24/);
  assert.match(geometry, /timeout: 15000/);
  assert.match(geometry, /Unloaded visible local images:/);
  assert.match(geometry, /Broken local images:/);
});
