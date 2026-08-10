import assert from "node:assert/strict";
import test from "node:test";
import { adminModules, customerModules, employeeModules, executiveModules, portalModules, visiblePortalModules } from "../src/index";

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

test("release classifications expose only honest informational modules", () => {
  const informational = portalModules.filter((module) => module.releaseClassification === "informational_only");
  const hidden = portalModules.filter((module) => module.releaseClassification === "hidden_until_dependency_exists");
  assert.equal(informational.length, 47);
  assert.equal(hidden.length, 7);
  assert.equal(visiblePortalModules.length, informational.length);
  assert.equal(portalModules.some((module) => module.releaseClassification === "fully_operational_and_tested"), false);
  assert.equal(portalModules.some((module) => module.productionStatus !== "not_deployed_owner_controlled"), false);

  for (const module of portalModules) {
    assert.ok(module.businessOwner.trim(), `${module.code} requires a business owner`);
    assert.ok(module.dataSource.trim(), `${module.code} requires a data source boundary`);
    assert.ok(module.dataAuthority.trim(), `${module.code} requires a data authority`);
    assert.ok(module.externalDependency.trim(), `${module.code} requires an external dependency or production gate`);
    assert.ok(module.authorisedRoles.length, `${module.code} requires authorised roles`);
    assert.ok(module.testCoverage.length, `${module.code} requires test coverage`);
    assert.equal(module.validationDataState, "synthetic_non_confidential_only");
    assert.equal(module.visibleInNavigation, module.releaseClassification === "informational_only");
    if (module.releaseClassification === "hidden_until_dependency_exists") {
      assert.equal(module.readCapability, "none_while_hidden");
    }
  }
});
