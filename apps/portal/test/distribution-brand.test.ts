import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const project = process.cwd();
const read = (file: string) => readFileSync(path.join(project, file), "utf8");
const logo = readFileSync(path.resolve(project, "../..", "assets", "brand", "novapharm-distribution-logo.svg"), "utf8");
const distributionBrand = read("components/distribution-brand.tsx");
const portalBrand = read("components/portal-brand.tsx");
const dashboard = read("components/dashboard.tsx");

test("employee WMS uses the owner-supplied wider-aspect Distribution vector", () => {
  assert.match(logo, /viewBox="0 0 13000 1410.2538"/);
  const sha = createHash("sha256").update(logo).digest("hex");
  assert.equal(sha, "28bf14552ad480c4e1fd62c23c8ef22af924826f5238d27d2b8cdc05ebc618c3");
  const intrinsic = /width=\{(\d+)\} height=\{(\d+)\}/.exec(distributionBrand);
  assert.ok(intrinsic, "Distribution Next/Image requires explicit responsive intrinsic dimensions");
  assert.ok(Math.abs((Number(intrinsic[1]) / Number(intrinsic[2])) / (13000 / 1410.2538) - 1) < 0.002, "Do not stretch the approved wider wordmark");
  assert.match(logo, /NovaPharm Distribution/);
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
