import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const project = process.cwd();
const read = (file: string) => readFileSync(path.join(project, file), "utf8");
const logo = readFileSync(path.resolve(project, "../..", "assets", "brand", "novapharm-distribution-logo.svg"), "utf8");
const distributionBrand = read("components/distribution-brand.tsx");
const portalBrand = read("components/portal-brand.tsx");
const dashboard = read("components/dashboard.tsx");

test("employee WMS reuses approved in-repository official Distribution vector", () => {
  assert.match(logo, /viewBox="0 0 2307 408"/);
  assert.match(logo, /Novapharm Distribution/);
  assert.doesNotMatch(logo, /<script|<foreignObject|javascript:/i);
  assert.match(distributionBrand, /novapharm-distribution-logo\.svg/);
  assert.match(distributionBrand, /alt="NovaPharm Distribution"/);
  assert.match(distributionBrand, /aria-label="NovaPharm Distribution operations home"/);
});

test("employee branding is separated from corporate and customer identity", () => {
  assert.match(dashboard, /import \{ DistributionBrand \} from "\.\/distribution-brand"/);
  assert.match(dashboard, /<DistributionBrand home=\{areaLandingRoutes\.employee\}/);
  assert.match(dashboard, /<PortalBrand home=\{areaLandingRoutes\.customer\}/);
  assert.match(portalBrand, /NovaPharm Healthcare secure portal home/);
  assert.match(dashboard, /"employee\.dashboard" \|\| module\.code === "employee\.orders" \|\| module\.code === "employee\.warehouse"/);
});
