import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { employeeModules } from "@novapharm/portal-contracts";

const base = process.cwd();
const workspace = readFileSync(path.join(base, "components/employee-distribution-workspace.tsx"), "utf8");
const dashboard = readFileSync(path.join(base, "components/dashboard.tsx"), "utf8");
const stylesheet = readFileSync(path.join(base, "app/employee-distribution.css"), "utf8");
const layout = readFileSync(path.join(base, "app/layout.tsx"), "utf8");

test("employee distribution screens remain inside the one existing governed portal", () => {
  assert.equal(employeeModules.length, 13);
  assert.match(dashboard, /EmployeeDistributionWorkspace/);
  assert.match(dashboard, /module\.area === "employee" && isEditorialEmployeeDistribution/);
  assert.match(dashboard, /module\.code === "employee\.orders"/);
  assert.match(dashboard, /module\.code === "employee\.dashboard"/);
  assert.match(layout, /employee-distribution\.css/);
  assert.match(stylesheet, /\.employee-distribution-shell/);
});

test("every employee module stays accessible with account and role guards intact", () => {
  assert.match(workspace, /employeeModules\.filter/);
  assert.match(workspace, /entry\.visibleInNavigation/);
  assert.match(workspace, /entry\.route/);
  for (const entry of employeeModules.filter((item) => item.visibleInNavigation)) {
    assert.ok(entry.route.startsWith("/employee/"));
  }
  assert.match(workspace, /Assisted order submission is not active/);
  assert.match(workspace, /independently approved service/);
  assert.match(workspace, /regulated medicine supply remain subject/);
});

test("employee UX is calm, typography-led and refuses fabricated commerce state", () => {
  assert.match(workspace, /One network\. Clear decisions\./);
  assert.match(workspace, /Telesales, without friction\./);
  assert.match(workspace, /All operations\./);
  assert.doesNotMatch(workspace, /<iframe|<img|<svg|emoji|localStorage|sessionStorage|document\.cookie/);
  assert.doesNotMatch(workspace, /fetch\(|axios|protectedMutation|checkout|stripe|paymentIntentId/);
  assert.match(stylesheet, /@media\(max-width:570px\)/);
  assert.match(stylesheet, /prefers-reduced-motion/);
});

test("the existing employee warehouse route renders the evidence-first WMS control tower", () => {
  assert.match(dashboard, /module\.code === "employee\.warehouse"/);
  assert.match(workspace, /moduleCode === "employee\.warehouse"/);
  assert.match(workspace, /Every batch\. Accounted for\./);
  assert.match(workspace, /Site- and batch-level reconciliation required/);
  assert.match(workspace, /FEFO review only; no automatic reservation or dispatch/);
  assert.match(stylesheet, /\.distribution-wms-principles/);
  assert.doesNotMatch(workspace, /warehouseCommandIssued|reserveStock\(|createDispatch\(/);
});

test("WMS page describes real operating journeys without claiming live 3PL execution", () => {
  for (const phrase of [
    "From receipt to proof of delivery.",
    "Receive and reconcile.",
    "Control every exception.",
    "Follow every movement.",
    "no independently authenticated",
    "Only authorised quality decisions",
  ]) assert.ok(workspace.includes(phrase), phrase);
  assert.match(stylesheet, /\.distribution-wms-journey-list/);
  assert.match(stylesheet, /@media\(max-width:780px\)/);
  assert.doesNotMatch(workspace, /receiveStock\(|issueRecall\(|placePurchaseOrder\(/);
});

test("five WMS decision layers stay inside already-governed employee routes", () => {
  for (const title of [
    "Commercial control", "Inventory visibility", "Quality and release",
    "Order orchestration", "Distribution intelligence",
  ]) assert.ok(workspace.includes(title), title);
  assert.match(workspace, /aria-label="Five WMS control layers"/);
  assert.match(workspace, /modules\.get\(area\.code\)/);
  assert.match(stylesheet, /\.distribution-wms-control-nav a:focus-visible/);
  assert.doesNotMatch(workspace, /<button[^>]+onClick[^>]+(?:reserve|dispatch|release)/i);
});
