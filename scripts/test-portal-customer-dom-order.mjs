import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync("apps/portal/components/dashboard.tsx", "utf8");
const styles = readFileSync("apps/portal/components/module-presentations.module.css", "utf8");
const hub = readFileSync("apps/portal/components/customer-commerce-workspace.tsx", "utf8");

test("customer hub DOM order matches visual order at initial render", () => {
  const component = dashboard.slice(dashboard.indexOf("export function Dashboard("));
  const workspace = component.indexOf('<div className="workspace-content">');
  const help = component.indexOf("<AccountAccessHelp audience=");
  const customerHub = component.indexOf("<CustomerCommerceWorkspace moduleCode={module.code} />");
  const heading = component.indexOf('<header className="module-heading">');
  assert.ok(workspace >= 0 && help > workspace, "Authorised account help remains in the workspace");
  assert.ok(customerHub > help && heading > customerHub, "Customer navigation must precede module heading in the DOM");
  assert.equal(component.split("<CustomerCommerceWorkspace moduleCode={module.code} />").length, 2);
  assert.ok(component.includes('module.code === "customer.dashboard" || module.code === "customer.products"'));
  assert.match(styles, /\.presentation :global\(\.workspace-content\) \{\s*display: flex;\s*flex-direction: column;/);
  assert.match(styles, /\.presentation :global\(\.module-heading\) \{\s*order: 1;/);
});

test("static customer navigation contains no transactions or privileged fetch", () => {
  assert.match(hub, /Deliberately no browser-side order submission/);
  assert.match(hub, /const moduleMap = new Map\(customerModules\.filter/);
  assert.doesNotMatch(hub, /gatewayJson\(|protectedMutation\(/);
});
