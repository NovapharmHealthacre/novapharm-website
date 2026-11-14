import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const portal = process.cwd();
const repositoryRoot = path.resolve(portal, "../..");
const readPortal = (file: string) => readFileSync(path.join(portal, file), "utf8");
const logoPath = path.join(repositoryRoot, "assets/brand/novapharm-distribution-logo.svg");
const svg = readFileSync(logoPath, "utf8");
const component = readPortal("components/distribution-brand.tsx");
const dashboard = readPortal("components/dashboard.tsx");
const route = readPortal("app/[[...slug]]/page.tsx");
const workspace = readPortal("components/employee-distribution-workspace.tsx");
const css = readPortal("app/employee-distribution.css");
const layout = readPortal("app/layout.tsx");

test("official Distribution identity reuses the canonical published owner artwork", () => {
  assert.ok(statSync(logoPath).size > 4000);
  assert.match(svg, /viewBox="0 0 2307 408"/);
  assert.match(svg, /#1D1D1F/i);
  assert.doesNotMatch(svg, /<script|<foreignObject|onload=|javascript:/i);
  assert.match(component, /novapharm-distribution-logo\.svg/);
  assert.match(component, /alt="NovaPharm Distribution"/);
  assert.match(component, /aria-label="NovaPharm Distribution operations home"/);
});
test("Distribution header is scoped to three employee operations routes", () => {
  assert.match(dashboard, /<DistributionBrand home=\{areaLandingRoutes\.employee\}/);
  assert.match(dashboard, /<PortalBrand home=\{areaLandingRoutes\.customer\}/);
  assert.match(route, /export async function generateMetadata/);
  assert.match(route, /"employee\.dashboard", "employee\.orders", "employee\.warehouse"/);
  assert.match(route, /NovaPharm Distribution \| Warehouse & Inventory/);
  assert.match(layout, /title: "NovaPharm Secure Portal"/);
  assert.match(workspace, /NOVAPHARM DISTRIBUTION \/ WAREHOUSE CONTROL TOWER/);
  assert.match(css, /\.distribution-brand:focus-visible/);
});
