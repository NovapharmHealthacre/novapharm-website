import assert from "node:assert/strict";
import test from "node:test";
import { portalModules } from "@novapharm/portal-contracts";
import { canRenderFinanceWorkspace, financeDivisions, financeEvidenceRoute, financeWorkspaces } from "../data/finance-workspaces";
import { resolvePortalView } from "../data/routes";

test("all approved Finance workspaces are retained without changing the 54-module portal contract", () => {
  assert.equal(portalModules.length, 54);
  assert.equal(financeWorkspaces.length, 36);
  assert.equal(new Set(financeWorkspaces.map((workspace) => workspace.id)).size, 36);
  assert.equal(new Set(financeWorkspaces.map((workspace) => workspace.title)).size, 36);
  assert.deepEqual(financeDivisions.map((division) => financeWorkspaces.filter((workspace) => workspace.division === division).length), [6, 6, 6, 10, 4, 4]);
});
test("Finance directory requires existing verified board Finance module and snapshot", () => {
  assert.equal(canRenderFinanceWorkspace("executive.finance", ["board"], true), true);
  assert.equal(canRenderFinanceWorkspace("executive.finance", ["admin"], true), true);
  for (const scopes of [[], ["customer"], ["employee"]]) {
    assert.equal(canRenderFinanceWorkspace("executive.finance", scopes, true), false);
  }
  assert.equal(canRenderFinanceWorkspace("executive.finance", ["board"], false), false);
  assert.equal(canRenderFinanceWorkspace("employee.finance", ["admin"], true), false);
});
test("related evidence links resolve only to existing visible executive modules", () => {
  const linked = financeWorkspaces.filter((workspace) => financeEvidenceRoute(workspace) !== null);
  assert.equal(linked.length, 6);
  for (const workspace of linked) {
    const route = financeEvidenceRoute(workspace);
    assert.ok(route);
    const view = resolvePortalView(route);
    assert.equal(view?.kind, "module");
    if (view?.kind === "module") {
      assert.equal(view.module.area, "executive");
      assert.equal(view.module.code, workspace.relatedModule);
      assert.equal(view.module.visibleInNavigation, true);
    }
  }
  const first = financeWorkspaces[0];
  assert.ok(first);
  for (const relatedModule of ["employee.finance", "executive.capital", "unknown", null]) {
    assert.equal(financeEvidenceRoute({ ...first, relatedModule }), null);
  }
});
