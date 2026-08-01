import assert from "node:assert/strict";
import test from "node:test";
import { portalModules } from "@novapharm/portal-contracts";
import { areaLandingRoutes, normalisePortalPath, resolvePortalView } from "../data/routes";

test("all governed modules resolve through the component portal", () => {
  for (const module of portalModules) {
    const view = resolvePortalView(module.route);
    assert.equal(view?.kind, "module");
    if (view?.kind === "module") assert.equal(view.module.code, module.code);
  }
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
