import assert from "node:assert/strict";
import test from "node:test";
import { portalModules, visiblePortalModules } from "@novapharm/portal-contracts";
import { intelligenceWorkspaceCatalogue, intelligenceWorkspaceSlugs } from "../data/intelligence-workspaces";
import { novaMlWorkspaceCatalogue, novaMlWorkspaceSlugs } from "../data/nova-ml-modules";
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

test("Medicines Intelligence retains eight legacy views plus a protected Science research extension", () => {
  for (const subview of medicinesIntelligenceSubviews) {
    const view = resolvePortalView(`/portal/executive-platform/medicines-intelligence/${subview}/`);
    assert.equal(view?.kind, "module");
    if (view?.kind === "module") {
      assert.equal(view.module.code, "executive.nhs-data");
      assert.equal(view.subview, subview);
    }
  }
  const legacy = [
    "medicine-search", "geography", "prescribers", "pharmacies",
    "forecasts", "opportunities", "campaigns", "data-sources",
  ];
  assert.deepEqual(medicinesIntelligenceSubviews.slice(0, 8), legacy);
  assert.equal(medicinesIntelligenceSubviews[8], "science-lab");
  assert.equal(new Set(medicinesIntelligenceSubviews).size, 9);
  const science = resolvePortalView("/portal/executive-platform/medicines-intelligence/science-lab/");
  assert.equal(science?.kind, "module");
  if (science?.kind === "module") {
    assert.equal(science.module.code, "executive.nhs-data");
    assert.equal(science.module.area, "executive", "Science must inherit board-level SSR protection");
    assert.equal(science.subview, "science-lab");
  }
  assert.equal(resolvePortalView("/portal/executive-platform/medicines-intelligence/unapproved-view/"), null);
  assert.equal(resolvePortalView("/portal/executive-platform/nhs-data/"), null);
});

test("all 22 canonical workspaces resolve to the existing protected executive module without fabricating live capability", () => {
  assert.equal(intelligenceWorkspaceCatalogue.length, 22);
  assert.equal(new Set(intelligenceWorkspaceSlugs).size, 22);
  assert.equal(intelligenceWorkspaceCatalogue.filter((workspace) => workspace.state === "gated").length > 0, true);
  for (const workspace of intelligenceWorkspaceCatalogue) {
    const route = `/portal/executive-platform/medicines-intelligence/${workspace.slug}/`;
    const view = resolvePortalView(route);
    assert.equal(view?.kind, "module", route);
    if (view?.kind === "module") {
      assert.equal(view.module.code, "executive.nhs-data");
      assert.equal(view.subview, workspace.slug);
    }
    assert.equal(workspace.requirements.length >= 2, true, `${workspace.title} must document an evidence boundary`);
    assert.ok(workspace.state === "gated" || workspace.state === "existing-read-only");
  }
  assert.equal(resolvePortalView("/portal/executive-platform/medicines-intelligence/admin/"), null);
  assert.equal(resolvePortalView("/portal/executive-platform/medicines-intelligence/data-operations/"), null);
});

test("Nova ML and model interpretability remain five independently named protected extensions", () => {
  assert.equal(novaMlWorkspaceCatalogue.length, 5);
  assert.equal(new Set(novaMlWorkspaceSlugs).size, 5);
  assert.equal(novaMlWorkspaceSlugs.includes("nova-model-microscope"), true);
  assert.equal(intelligenceWorkspaceCatalogue.length, 22, "native extensions must not redefine the canonical medicine workspaces");

  const landing = resolvePortalView("/portal/executive-platform/nova-ml/");
  assert.equal(landing?.kind, "module");
  if (landing?.kind === "module") {
    assert.equal(landing.module.code, "executive.nhs-data");
    assert.equal(landing.subview, "nova-ml-studio");
  }

  for (const candidate of novaMlWorkspaceCatalogue) {
    for (const prefix of [
      "/portal/executive-platform/nova-ml/",
      "/portal/executive-platform/medicines-intelligence/",
    ]) {
      const route = `${prefix}${candidate.slug}/`;
      const view = resolvePortalView(route);
      assert.equal(view?.kind, "module", route);
      if (view?.kind === "module") {
        assert.equal(view.module.code, "executive.nhs-data");
        assert.equal(view.subview, candidate.slug);
      }
    }
    assert.ok(candidate.requirements.length >= 3);
    assert.match(candidate.platform, /required/);
  }
  for (const route of [
    "/portal/executive-platform/nova-ml/unapproved-model/",
    "/portal/executive-platform/nova-ml/nova-ml-studio/secret/",
    "/portal/executive-platform/nova-ml/admin/",
    "/portal/executive-platform/nova-ml/nova-model-microscope/private-model/",
  ]) assert.equal(resolvePortalView(route), null, route);
});
