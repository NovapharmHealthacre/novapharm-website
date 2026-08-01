import assert from "node:assert/strict";
import test from "node:test";
import { adminModules, customerModules, employeeModules, executiveModules, portalModules } from "../src/index";

test("one catalogue governs all four portal areas", () => {
  assert.equal(portalModules.length, 54);
  assert.equal(customerModules.length, 18);
  assert.equal(employeeModules.length, 13);
  assert.equal(executiveModules.length, 18);
  assert.equal(adminModules.length, 5);
  assert.equal(new Set(portalModules.map((module) => module.code)).size, portalModules.length);
  assert.equal(new Set(portalModules.map((module) => module.route)).size, portalModules.length);
});

test("planned and externally blocked modules state their dependency", () => {
  for (const module of portalModules) {
    if (module.maturity !== "operational_foundation") assert.ok(module.externalDependency, `${module.code} needs a dependency boundary`);
  }
});
