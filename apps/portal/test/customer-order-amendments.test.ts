import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(process.cwd(), "../..");
const read = (file: string) => readFileSync(path.join(root, file), "utf8");
const form = read("apps/portal/components/customer-order-amendments.tsx");
const admin = read("apps/portal/components/customer-order-amendment-review.tsx");
const dashboard = read("apps/portal/components/dashboard.tsx");
const server = read("server.mjs");
const gateway = read("apps/portal/app/gateway/[...path]/route.ts");
const service = read("src/core/customer-order-amendments.mjs");

test("customer orders show actual account records and changes require explicit user action", () => {
  assert.match(dashboard, /module\.code === "customer\.orders"[\s\S]*<CustomerOrderAmendments/);
  assert.match(form, /gatewayJson<Overview>\("enterprise\/customer\/order-overview"\)/);
  assert.match(form, /approved" && a\.address_kind === "delivery"/);
  assert.match(form, /submit change request|Submit change request/i);
  assert.match(form, /tracking_reference/);
  assert.doesNotMatch(form, /localStorage|sessionStorage|stripe\.com/i);
});
test("order changes are tenant-scoped and never silently mutate payment or warehouse dispatch", () => {
  assert.match(service, /CUSTOMER_ORDER_AMENDMENTS_ENABLED === "true"/);
  assert.match(service, /WHERE id = \? AND customer_id = \?/);
  assert.match(service, /FROM shipments WHERE order_id = \?/);
  assert.match(service, /accepted_pending_execution/);
  assert.doesNotMatch(service, /stripe|processPolarSpeedEvents|payment_intents|UPDATE orders/i);
});
test("order change routes are explicit and administrative reviews require authenticated roles", () => {
  assert.match(gateway, /customer\\\/order-overview/);
  assert.match(gateway, /customer\\\/order-amendments/);
  assert.match(server, /submitCustomerOrderAmendment\(await readBody\(request\), enterpriseContext\(session\)\)/);
  assert.match(server, /decideCustomerOrderAmendment\(orderAmendmentDecision\[1\], body\.decision, session\.username\)/);
  assert.match(server, /authenticated\(request, response, \["admin"\]\)/);
  assert.match(admin, /Accept for operations/);
  assert.match(admin, /warehouse instructions have not yet been changed/i);
});
