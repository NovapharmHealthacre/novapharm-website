import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard=readFileSync("apps/portal/components/dashboard.tsx","utf8");
const hub=readFileSync("apps/portal/components/customer-commerce-workspace.tsx","utf8");
const page=readFileSync("apps/portal/app/[[...slug]]/page.tsx","utf8");

test("SSR verifies the real portal session before mounting protected modules",()=>{
  assert.match(page,/await verifiedPortalSession\(/);
  assert.match(page,/sessionDecision\(view, session\)/);
  assert.match(page,/if \(decision !== "allow"\) redirect\("\/"\)/);
});
test("customer navigation is initially present instead of asynchronously inserted",()=>{
  assert.match(dashboard,/<CustomerCommerceWorkspace moduleCode=\{module\.code\} \/>/);
  assert.doesNotMatch(dashboard,/\{user && snapshot \? <CustomerCommerceWorkspace/);
});
test("customer commerce hub renders only pre-defined static navigation, no customer records",()=>{
  assert.match(hub,/moduleCode === "customer\.dashboard"/);
  assert.match(hub,/moduleCode === "customer\.products"/);
  assert.doesNotMatch(hub,/useEffect\s*\(|gatewayJson\s*\(|fetch\s*\(|localStorage|sessionStorage|document\.cookie/);
});
test("real module snapshot, actions and nutraxin customer selection still require auth",()=>{
  assert.match(dashboard,/\{snapshot \? <>/);
  assert.match(dashboard,/\{user && snapshot && selectedNutraxinProduct \?/);
  assert.match(dashboard,/\{user \? <AreaSwitcher/);
  assert.match(dashboard,/session\.user\.accessScopes\.includes\(requiredScope\)/);
});
