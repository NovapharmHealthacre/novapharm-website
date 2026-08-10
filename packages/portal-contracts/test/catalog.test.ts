import assert from "node:assert/strict";
import test from "node:test";
import {
  adminModules,
  customerModules,
  dependencyBlockedPortalModules,
  employeeModules,
  executiveModules,
  hiddenForSafetyPortalModules,
  moduleFinalReleaseStates,
  portalModuleActivationMatrix,
  portalModules,
  visiblePortalModules,
} from "../src/index";

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

test("all 54 modules have one complete, unambiguous production activation record", () => {
  assert.equal(portalModuleActivationMatrix.length, 54);
  assert.equal(new Set(portalModuleActivationMatrix.map((module) => module.code)).size, 54);
  assert.equal(dependencyBlockedPortalModules.length, 47);
  assert.equal(hiddenForSafetyPortalModules.length, 7);
  assert.deepEqual(new Set(moduleFinalReleaseStates), new Set([
    "FULLY OPERATIONAL",
    "OPERATIONAL READ-ONLY",
    "DEPENDENCY-BLOCKED",
    "HIDDEN FOR SAFETY",
    "NOT APPLICABLE",
  ]));

  for (const activation of portalModuleActivationMatrix) {
    for (const value of [
      activation.purpose,
      activation.businessOwner,
      activation.route,
      activation.dataAuthority,
      activation.currentRepositoryState,
      activation.requiredExternalDependency,
      activation.productionDataSource,
      activation.documentAuthority,
      activation.securityClassification,
      activation.accessibilityState,
      activation.responsiveState,
      activation.performanceState,
      activation.backupRecoveryImplications,
      activation.knownLimitation,
    ]) assert.ok(value.trim(), `${activation.code}: activation field must not be blank`);

    assert.ok(activation.allowedRoles.length, `${activation.code}: allowed roles are required`);
    assert.ok(activation.apiEndpoints.length, `${activation.code}: API boundary must be recorded`);
    assert.deepEqual(activation.releasedModuleApiEndpoints, activation.apiEndpoints, `${activation.code}: released endpoint alias drift`);
    assert.ok(Array.isArray(activation.implementedProtectedServerAuthorities), `${activation.code}: protected server authorities must be explicit`);
    assert.ok(activation.databaseTablesViews.length, `${activation.code}: database tables/views boundary must be recorded`);
    assert.ok(activation.integrationDependencies.length, `${activation.code}: integration dependency must be recorded`);
    assert.ok(activation.auditRequirements.length, `${activation.code}: audit requirements are required`);
    assert.ok(activation.currentTests.length, `${activation.code}: current tests are required`);
    assert.ok(activation.missingTests.length, `${activation.code}: missing production/staging tests must be explicit`);
    assert.ok(activation.monitoring.length, `${activation.code}: monitoring requirements are required`);
    assert.equal(activation.businessOwnerAcceptance, "NOT ACCEPTED FOR PRODUCTION");
    assert.deepEqual(activation.productionEvidence, []);
    assert.ok(moduleFinalReleaseStates.includes(activation.finalReleaseState));

    const source = portalModules.find((module) => module.code === activation.code);
    assert.ok(source, `${activation.code}: source catalogue record missing`);
    assert.equal(activation.readState, source.readCapability);
    assert.equal(activation.writeState, source.writeCapability);
    assert.equal(activation.allowedRoles.join("|"), source.authorisedRoles.join("|"));
    assert.equal(activation.currentTests.join("|"), source.testCoverage.join("|"));

    const [readEndpoint] = activation.apiEndpoints;
    assert.ok(readEndpoint, `${activation.code}: governed read endpoint missing`);
    assert.equal(readEndpoint.startsWith(`GET /api/enterprise/modules/${activation.code}`), true);

    if (activation.finalReleaseState === "HIDDEN FOR SAFETY") {
      assert.equal(source.visibleInNavigation, false);
      assert.equal(source.releaseClassification, "hidden_until_dependency_exists");
      assert.match(readEndpoint, /fail-closed/iu);
    } else {
      assert.equal(activation.finalReleaseState, "DEPENDENCY-BLOCKED");
      assert.equal(source.visibleInNavigation, true);
      assert.equal(source.releaseClassification, "informational_only");
    }
  }
});

test("write-capable module activation records name only the implemented released endpoints", () => {
  const writes = new Map(portalModuleActivationMatrix
    .filter((module) => module.writeState !== "none_read_only")
    .map((module) => [module.code, module.releasedModuleApiEndpoints.filter((endpoint) => endpoint.startsWith("POST "))]));

  assert.deepEqual(Object.fromEntries(writes), {
    "customer.returns": ["POST /api/enterprise/customer/returns"],
    "customer.quality-complaints": ["POST /api/enterprise/customer/quality-complaints"],
    "customer.support": ["POST /api/enterprise/customer/support"],
    "employee.products": ["POST /api/enterprise/products/{productId}/status"],
    "employee.administration": ["POST /api/enterprise/workflows/{workflowId}/advance"],
  });
});

test("protected Admin server authorities are governed without releasing R1 module mutations", () => {
  const byCode = new Map(portalModuleActivationMatrix.map((module) => [module.code, module]));
  const dashboard = byCode.get("admin.dashboard");
  const localReview = byCode.get("admin.local-review");
  const users = byCode.get("admin.users");
  assert.ok(dashboard && localReview && users);

  assert.deepEqual(dashboard.implementedProtectedServerAuthorities, ["GET /api/admin/summary"]);
  assert.deepEqual(localReview.implementedProtectedServerAuthorities, [
    "GET /api/admin/applications/{applicationId}",
    "POST /api/admin/applications/{applicationId}/status",
    "POST /api/admin/applications/{applicationId}/activate",
    "GET /api/admin/notifications/{notificationId}/preview",
    "POST /api/admin/notifications/{notificationId}/replay",
  ]);
  assert.deepEqual(users.implementedProtectedServerAuthorities, ["POST /api/admin/users/{username}/sessions/revoke"]);

  for (const activation of [dashboard, localReview, users]) {
    assert.equal(activation.writeState, "none_read_only");
    assert.equal(activation.releasedModuleApiEndpoints.some((endpoint) => endpoint.startsWith("POST ")), false);
    assert.equal(activation.finalReleaseState, "DEPENDENCY-BLOCKED");
  }

  assert.match(localReview.auditRequirements.join(" "), /protected server-authority/iu);
  assert.match(users.monitoring.join(" "), /protected server-authority/iu);
  assert.match(users.missingTests.join(" "), /without implying that the module UI releases the mutation/iu);
});
