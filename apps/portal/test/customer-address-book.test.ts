import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(process.cwd(), "../..");
const read = (file: string) => readFileSync(path.join(root, file), "utf8");
const component = read("apps/portal/components/customer-address-book.tsx");
const dashboard = read("apps/portal/components/dashboard.tsx");
const gateway = read("apps/portal/app/gateway/[...path]/route.ts");
const server = read("server.mjs");
const service = read("src/core/customer-address-service.mjs");

test("My Account shows address and contact collection, not a second storefront", () => {
  assert.match(dashboard, /module\.code === "customer\.account"[\s\S]*CustomerAddressBook/);
  for (const field of ["recipientName", "contactPhone", "line1", "city", "postcode", "countryCode", "deliveryInstructions"]) assert.match(component, new RegExp(field));
  assert.match(component, /Address submitted for review/);
  assert.doesNotMatch(component, /localStorage|sessionStorage|checkout\.stripe\.com/);
});
test("address routes require a signed account session, CSRF and admin decision", () => {
  assert.match(gateway, /enterprise.*customer.*addresses/);
  assert.match(server, /customerAddressBook\(enterpriseContext\(session\)\)/);
  assert.match(server, /submitCustomerAddress\(await readBody\(request\), enterpriseContext\(session\)\)/);
  assert.match(server, /decideCustomerAddress\(addressDecisionMatch\[1\], body\.decision, session\.username\)/);
  assert.match(server, /requireCsrf\(request\)/);
});
test("address entry is default-off and cannot self-approve or become a paid order", () => {
  assert.match(service, /CUSTOMER_ADDRESS_REQUESTS_ENABLED === "true"/);
  assert.match(service, /status = 'pending_review'/);
  assert.match(service, /"approve", "reject"/);
  assert.doesNotMatch(service, /stripe|paymentStarted|createOrder\(/i);
});
