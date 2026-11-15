import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { employeeModules } from "@novapharm/portal-contracts";
import { WMS_PROTOTYPE_WORKSPACE_MAP } from "../components/wms-prototype-workspace-map";

const base = process.cwd();
const workspace = readFileSync(path.join(base, "components/employee-distribution-workspace.tsx"), "utf8");
const catalog = readFileSync(path.join(base, "components/wms-prototype-workspace-map.tsx"), "utf8");
const css = readFileSync(path.join(base, "app/employee-distribution.css"), "utf8");

test("prototype's 16 named workspaces map to existing control-plane architecture", () => {
  assert.equal(WMS_PROTOTYPE_WORKSPACE_MAP.length, 16);
  assert.deepEqual(
    [...new Set(WMS_PROTOTYPE_WORKSPACE_MAP.map((item) => item.group))],
    ["Overview", "Warehouse operations", "Enterprise planning", "Administration"],
  );
  assert.deepEqual(
    WMS_PROTOTYPE_WORKSPACE_MAP.map((item) => item.title),
    [
      "Control tower", "Exceptions & decisions", "Performance analytics",
      "Product master", "Inbound & ASN", "Batch & lot control",
      "Quality & recalls", "Inventory & slotting", "Orders & allocation",
      "Waves & execution", "Yard & delivery", "AI planning studio",
      "Labour & automation", "3PL & billing", "Integration monitor",
      "Audit & data export",
    ],
  );
  for (const workspace of WMS_PROTOTYPE_WORKSPACE_MAP) {
    assert.ok(workspace.evidence.length >= 12);
    assert.ok(workspace.constraint.length >= 20);
  }
});

test("all linked workspaces use existing employee RBAC routes, not new mock APIs", () => {
  const allowed = new Set(employeeModules.filter((module) => module.visibleInNavigation).map((module) => module.code));
  const linked = WMS_PROTOTYPE_WORKSPACE_MAP.filter((entry) => entry.module !== null);
  const pending = WMS_PROTOTYPE_WORKSPACE_MAP.filter((entry) => entry.module === null);
  assert.equal(linked.length, 12);
  assert.equal(pending.length, 4);
  for (const item of linked) assert.ok(allowed.has(item.module), item.module);
  assert.deepEqual(pending.map((entry) => entry.title), [
    "Waves & execution", "Yard & delivery", "AI planning studio", "Labour & automation",
  ]);
  assert.match(catalog, /employeeRoutes\.get\(entry\.module\)/);
  assert.match(catalog, /Integration required/);
});

test("prototype interactions cannot leak into production without source authority", () => {
  assert.match(workspace, /<WmsPrototypeWorkspaceMap \/>/);
  assert.match(catalog, /Physical warehouse stock remains unverified/);
  assert.match(catalog, /None are production-enabled/);
  assert.doesNotMatch(catalog, /localStorage\.(?:getItem|setItem)|sessionStorage\.(?:getItem|setItem)|fetch\(|XMLHttpRequest|onClick=|reserveStock\(|dispatchShipment\(/);
  assert.match(css, /\.distribution-wms-workspace-map/);
  assert.match(css, /\.distribution-wms-workspace-map-groups li>a:focus-visible/);
  assert.match(css, /@media\(max-width:830px\)/);
});
