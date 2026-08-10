import assert from "node:assert/strict";
import test from "node:test";
import { canAccess, roleScopes, type AuthorisedIdentity } from "../src/index.ts";

const vishal: AuthorisedIdentity = {
  subject: "validation-vishal",
  role: "admin",
  grantedScopes: roleScopes.admin,
  credentialVersion: 2
};

test("administrator scope aggregation is explicit", () => {
  assert.deepEqual(vishal.grantedScopes, ["customer", "employee", "board", "admin"]);
});

test("scope does not bypass customer isolation", () => {
  const customer: AuthorisedIdentity = {
    subject: "customer-a",
    role: "customer",
    grantedScopes: roleScopes.customer,
    customerId: "customer-a",
    credentialVersion: 1
  };
  assert.equal(canAccess(customer, { requiredScopes: ["customer"], customerId: "customer-a" }), true);
  assert.equal(canAccess(customer, { requiredScopes: ["customer"], customerId: "customer-b" }), false);
  assert.equal(canAccess(customer, { requiredScopes: ["board"] }), false);
});

test("administrator resource access still requires the requested scope", () => {
  assert.equal(canAccess(vishal, { requiredScopes: ["board"] }), true);
  assert.equal(canAccess({ ...vishal, grantedScopes: ["admin"] }, { requiredScopes: ["board"] }), false);
});
