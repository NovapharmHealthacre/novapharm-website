import assert from "node:assert/strict";
import test from "node:test";
import { portalModules, visiblePortalModules } from "@novapharm/portal-contracts";
import { areaLandingRoutes, normalisePortalPath, resolvePortalView } from "../data/routes";

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
  assert.equal(visiblePortalModules.length, 47);
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
  assert.equal(normalisePortalPath("/employee/dashboard?ignored=true"), "/employee/dashboard/");
  assert.equal(resolvePortalView("/public-data/"), null);
});
