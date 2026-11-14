import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const portal = process.cwd();
const root = path.resolve(portal, "../..");
const brand = (name: string) => path.join(root, "assets", "brand", name);
const source = (name: string) => readFileSync(path.join(portal, name), "utf8");
const graphite = readFileSync(brand("novapharm-distribution.svg"), "utf8");
const reverse = readFileSync(brand("novapharm-distribution-reverse.svg"), "utf8");
const mark = readFileSync(brand("novapharm-distribution-mark.svg"), "utf8");
const touchIcon = readFileSync(brand("novapharm-distribution-apple-touch-icon.png"));
const component = source("components/distribution-brand.tsx");
const dashboard = source("components/dashboard.tsx");
const employee = source("components/employee-distribution-workspace.tsx");
const metadata = source("app/[[...slug]]/page.tsx");
const sharedLayout = source("app/layout.tsx");
const stylesheet = source("app/employee-distribution.css");
const assetSync = source("scripts/sync-public-assets.mjs");

test("official SVG brand masters preserve paths, geometry and approved color", () => {
  assert.match(graphite, /viewBox="0 0 2307 408"/);
  assert.match(graphite, /fill="#1D1D1F"/);
  assert.match(reverse, /fill="#FFFFFF"/);
  assert.equal(
    graphite.replace('aria-label="Novapharm Distribution logo"', 'aria-label="Novapharm Distribution reverse logo"')
      .replace('fill="#1D1D1F"', 'fill="#FFFFFF"'),
    reverse,
  );
  for (const svg of [graphite, reverse, mark]) {
    assert.match(svg, /^<svg /);
    assert.match(svg, /<path\s/);
    assert.doesNotMatch(svg, /<script|<foreignObject|onload=|onerror=|<image|javascript:|https?:\/\//i);
  }
  assert.match(mark, /viewBox="0 0 256 256"/);
});

test("the official WMS touch icon remains byte-for-byte identical to the owner kit", () => {
  assert.equal(touchIcon.length, 2181);
  assert.equal(
    createHash("sha256").update(touchIcon).digest("hex"),
    "9d7db87e4c39737febb0f70d1faec0c4081b39fff7bd5ff1acf3d85ae1da0b2c",
  );
  assert.ok(statSync(brand("novapharm-distribution-apple-touch-icon.png")).isFile());
});

test("Distribution wordmark is accessible and restricted to employee distribution", () => {
  assert.match(component, /aria-label="NovaPharm Distribution operations home"/);
  assert.match(component, /alt="NovaPharm Distribution"/);
  assert.match(component, /novapharm-distribution\.svg/);
  assert.match(component, /novapharm-distribution-reverse\.svg/);
  assert.match(component, /width=\{2307\} height=\{408\}/);
  assert.match(dashboard, /<DistributionBrand home=\{areaLandingRoutes\.employee\}/);
  assert.match(dashboard, /<PortalBrand home=\{areaLandingRoutes\.customer\}/);
  assert.match(employee, /label: "NovaPharm Distribution"/);
  assert.match(employee, /NOVAPHARM DISTRIBUTION \/ WAREHOUSE CONTROL TOWER/);
  assert.match(stylesheet, /\.distribution-brand:focus-visible/);
});

test("only distribution routes receive the WMS browser title and favicon", () => {
  assert.match(metadata, /export async function generateMetadata/);
  assert.match(metadata, /"employee\.dashboard", "employee\.orders", "employee\.warehouse"/);
  assert.match(metadata, /NovaPharm Distribution \| Warehouse & Inventory/);
  assert.match(metadata, /novapharm-distribution-mark\.svg/);
  assert.match(metadata, /novapharm-distribution-apple-touch-icon\.png/);
  assert.match(sharedLayout, /title: "NovaPharm Secure Portal"/);
  assert.match(sharedLayout, /novapharm-healthcare-logo|favicon\.svg/);
  assert.doesNotMatch(metadata, /"customer\.dashboard", "customer\.orders"/);
});

test("brand assets are included in portal public sync without external image hosts", () => {
  assert.match(assetSync, /"assets\/brand"/);
  assert.match(assetSync, /await cp\(path\.join\(repositoryRoot, "assets\/brand"\)/);
  assert.doesNotMatch(component, /https?:\/\/|fetch\(|localStorage|sessionStorage/);
});
