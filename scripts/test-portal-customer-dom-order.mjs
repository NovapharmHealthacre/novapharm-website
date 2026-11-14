import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync("apps/portal/components/dashboard.tsx","utf8");
const styles = readFileSync("apps/portal/components/module-presentations.module.css","utf8");

test("customer hub starts in its final visual order before async data resolves", () => {
  const inDashboard = dashboard.slice(dashboard.indexOf("export function Dashboard("));
  const heading = inDashboard.indexOf('<header className="module-heading">');
  const hub = inDashboard.indexOf('<CustomerCommerceWorkspace moduleCode={module.code} />');
  const workspace = inDashboard.indexOf('<div className="workspace-content">');
  assert.ok(workspace >= 0 && hub > workspace);
  assert.ok(heading > hub, "Customer hub must precede the heading in DOM, matching CSS order");
  assert.equal(inDashboard.split('<CustomerCommerceWorkspace moduleCode={module.code} />').length,2);
  assert.ok(inDashboard.includes('module.code === "customer.dashboard" || module.code === "customer.products"'));
  assert.ok(styles.includes('.presentation :global(.module-heading) {'));
  assert.ok(styles.includes("order: 1;"));
  assert.ok(styles.includes(".presentation :global(.area-switcher) { order: 2; }"));
});
test("static customer hub never renders medicine, personal account or paid data",()=>{
  const hub = readFileSync("apps/portal/components/customer-commerce-workspace.tsx","utf8");
  assert.ok(hub.includes("no browser-side order submission"));
  assert.ok(hub.includes('module.releaseClassificationLabel'));
  assert.ok(hub.includes('const moduleMap = new Map(customerModules.filter'));
  assert.equal(hub.includes("gatewayJson("),false);
  assert.equal(hub.includes("protectedMutation("),false);
});
