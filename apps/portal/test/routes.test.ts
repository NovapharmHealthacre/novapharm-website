import assert from "node:assert/strict";
import test from "node:test";
import { portalModules, visiblePortalModules } from "@novapharm/portal-contracts";
import { areaLandingRoutes, isPortalAccessType, landingRouteForAccess, medicinesIntelligenceSubviews, normalisePortalPath, resolvePortalView } from "../data/routes";

test("only release-visible governed modules resolve through the component portal", () => {
  for (const module of portalModules) {
    const view = resolvePortalView(module.route);
    if (module.visibleInNavigation) {
      assert.equal(view?.kind, "module");
      if (view?.kind === "module") assert.equal(view.module.code, module.code);
    } else {
      assert.equal(view, null, `${module.code} must fail closed until its dependency exists`);
    }
  }
  assert.equal(visiblePortalModules.length, 48);
});

test("login, password replacement and legacy board aliases remain controlled", () => {
  assert.equal(resolvePortalView("/")?.kind, "login");
  assert.equal(resolvePortalView("/portal")?.kind, "login");
  assert.equal(resolvePortalView("/portal/change-password")?.kind, "password-change");
  const board = resolvePortalView("/board");
  assert.equal(board?.kind, "module");
  if (board?.kind === "module") assert.equal(board.module.code, "executive.command-centre");
});

test("area landing routes are canonical and unknown routes fail closed", () => {
  assert.equal(areaLandingRoutes.admin, "/admin/dashboard/");
  assert.equal(landingRouteForAccess("board"), "/portal/executive-platform/");
  assert.equal(landingRouteForAccess("customer"), "/portal/dashboard/");
  assert.equal(isPortalAccessType("admin"), true);
  assert.equal(isPortalAccessType("https://attacker.example"), false);
  assert.equal(normalisePortalPath("/employee/dashboard?ignored=true"), "/employee/dashboard/");
  assert.equal(resolvePortalView("/public-data/"), null);
});

test("Medicines Intelligence has eight governed nested views and rejects every other child route", () => {
  for (const subview of medicinesIntelligenceSubviews) {
    const view = resolvePortalView(`/portal/executive-platform/medicines-intelligence/${subview}/`);
    assert.equal(view?.kind, "module");
    if (view?.kind === "module") {
      assert.equal(view.module.code, "executive.nhs-data");
      assert.equal(view.subview, subview);
    }
  }
  assert.equal(new Set(medicinesIntelligenceSubviews).size, 8);
  assert.equal(resolvePortalView("/portal/executive-platform/medicines-intelligence/unapproved-view/"), null);
  assert.equal(resolvePortalView("/portal/executive-platform/nhs-data/"), null);
});
