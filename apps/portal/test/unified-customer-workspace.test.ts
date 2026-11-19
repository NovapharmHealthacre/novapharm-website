import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { adminModules, customerModules, employeeModules, executiveModules } from "@novapharm/portal-contracts";
import { areaLandingRoutes, landingRouteForAccess } from "../data/routes";

const component = readFileSync(path.join(process.cwd(), "components/customer-commerce-workspace.tsx"), "utf8");
const dashboard = readFileSync(path.join(process.cwd(), "components/dashboard.tsx"), "utf8");
const login = readFileSync(path.join(process.cwd(), "components/login-panel.tsx"), "utf8");

test("one Customer workspace still contains all 18 canonical modules, without modifying privileged roles", () => {
  assert.equal(customerModules.length, 18);
  assert.equal(employeeModules.length, 13);
  assert.equal(executiveModules.length, 18);
  assert.equal(adminModules.length, 5);
  assert.equal(areaLandingRoutes.customer, "/portal/dashboard/");
  assert.equal(landingRouteForAccess("employee"), "/employee/dashboard/");
  assert.equal(landingRouteForAccess("board"), "/portal/executive-platform/");
  assert.equal(landingRouteForAccess("admin"), "/admin/dashboard/");
});

test("Customer dashboard owns the shared collections and has no independent Nutraxin checkout", () => {
  assert.match(component, /customer\.dashboard/);
  assert.match(component, /customer\.products/);
  assert.match(component, /Nutraxin/);
  assert.match(component, /ESCO Anand/);
  assert.match(component, /module\.route/);
  assert.match(dashboard, /CustomerCommerceWorkspace/);
  // The static navigation must exist on first paint; never wait for an API
  // response to inject a tall module index and shift the mobile viewport.
  assert.match(dashboard, /module\.area === "customer"/);
  assert.doesNotMatch(dashboard, /user && snapshot \? <CustomerCommerceWorkspace/);
  assert.doesNotMatch(component, /https?:\/\/[^"\s]*checkout|\/api\/retail\/checkout/);
  assert.doesNotMatch(component, /localStorage|sessionStorage|document\.cookie/);
});

test("Customer collection handoff does not change employee, board or admin login", () => {
  assert.match(login, /validatedCustomerCommerceIntentQuery/);
  assert.match(login, /isPortalAccessType\(result\.accessType\)/);
  assert.match(login, /result\.accessType !== accessType/);
});


test("Apple-inspired customer overview retains governed navigation and real product photos", () => {
  const layout = readFileSync(path.join(process.cwd(), "app/layout.tsx"), "utf8");
  const stylesheet = readFileSync(path.join(process.cwd(), "app/customer-editorial-dashboard.css"), "utf8");
  const assets = readFileSync(path.join(process.cwd(), "scripts/sync-public-assets.mjs"), "utf8");
  assert.match(component, /customer-editorial-hub/);
  assert.match(component, /Everything for your/);
  assert.match(component, /customer-editorial-packshots/);
  assert.match(dashboard, /isEditorialCustomerDashboard/);
  assert.match(dashboard, /customer-primary-nav/);
  assert.match(layout, /customer-editorial-dashboard\.css/);
  assert.match(stylesheet, /\.customer-editorial-dashboard\.workspace-shell/);
  for (const image of [
    "vitamin-d3-120-tablets-480.webp",
    "magnesium-complex-60-tablets-480.webp",
    "collagen-gold-30-tablets-480.webp",
  ]) {
    assert.match(component, new RegExp(image.replaceAll(".", "\\.")));
    assert.match(assets, new RegExp(image.replaceAll(".", "\\.")));
  }
  assert.doesNotMatch(component, /<iframe|data:image\/svg|https?:\/\//);
});
