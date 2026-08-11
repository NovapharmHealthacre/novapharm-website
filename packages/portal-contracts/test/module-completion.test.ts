import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import presentations from "../../../apps/portal/data/module-presentations.json";
import {
  portalModuleActivationMatrix,
  portalModules,
} from "../src/index";

const rootFile = (path: string) => new URL(`../../../${path}`, import.meta.url);
const baseSource = await readFile(rootFile("src/core/enterprise-domain-service-base.mjs"), "utf8");
const dispatcherSource = await readFile(rootFile("src/core/enterprise-domain-service.mjs"), "utf8");
const overlaySource = await readFile(rootFile("src/core/enterprise-module-overlays.mjs"), "utf8");
const executiveSource = await readFile(rootFile("src/core/executive-module-views.mjs"), "utf8");

function sliceBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0 && endIndex > startIndex, `Unable to isolate authored source segment ${start} -> ${end}`);
  return source.slice(startIndex, endIndex);
}

const customerSource = sliceBetween(baseSource, "async function customerSnapshot", "async function employeeSnapshot");
const employeeSource = sliceBetween(baseSource, "async function employeeSnapshot", "async function executiveSnapshot");
const authoredExecutiveSource = `${dispatcherSource}\n${overlaySource}\n${executiveSource}`;
const activationByCode = new Map(portalModuleActivationMatrix.map((entry) => [entry.code, entry]));
const allowedPresentations = new Set(["command", "ledger", "workflow", "catalogue", "tracking", "documents", "regulated", "intelligence"]);
const hiddenExecutiveCodes = new Set([
  "executive.nhs-data",
  "executive.plpi",
  "executive.pharmacovigilance",
  "executive.tenders",
  "executive.capital",
  "executive.microsoft-365",
  "executive.ai-technology",
]);

function hasAuthoredRuntime(module: (typeof portalModules)[number]): boolean {
  if (module.releaseClassification === "hidden_until_dependency_exists") return true;
  if (module.area === "customer") return customerSource.includes(`"${module.slug}"`);
  if (module.area === "employee") return employeeSource.includes(`"${module.slug}"`);
  if (module.area === "admin") return overlaySource.includes(`case "${module.slug}"`);
  return authoredExecutiveSource.includes(`"${module.slug}"`);
}

test("every governed Portal module satisfies the complete repository-layer contract", () => {
  assert.equal(portalModules.length, 54);
  assert.equal(portalModuleActivationMatrix.length, 54);
  assert.equal(Object.keys(presentations).length, 54);

  const completed: string[] = [];
  const hidden: string[] = [];

  for (const module of portalModules) {
    const activation = activationByCode.get(module.code as (typeof portalModuleActivationMatrix)[number]["code"]);
    assert.ok(activation, `${module.code}: activation record missing`);

    const presentation = presentations[module.code as keyof typeof presentations];
    assert.ok(presentation, `${module.code}: presentation archetype missing`);
    assert.ok(allowedPresentations.has(presentation), `${module.code}: ungoverned presentation archetype ${presentation}`);

    assert.ok(module.route.startsWith("/"), `${module.code}: governed route missing`);
    assert.ok(module.businessOwner.trim(), `${module.code}: business owner missing`);
    assert.ok(module.dataAuthority.trim(), `${module.code}: data authority missing`);
    assert.ok(module.authorisedRoles.length > 0, `${module.code}: authorised roles missing`);
    assert.ok(module.testCoverage.length > 0, `${module.code}: repository test coverage missing`);
    assert.equal(hasAuthoredRuntime(module), true, `${module.code}: no authored runtime/fail-closed implementation found`);

    assert.equal(activation.allowedRoles.join("|"), module.authorisedRoles.join("|"), `${module.code}: role contract drift`);
    assert.ok(activation.currentTests.length > 0, `${module.code}: activation test evidence missing`);
    assert.ok(activation.auditRequirements.length > 0, `${module.code}: audit contract missing`);
    assert.ok(activation.monitoring.length > 0, `${module.code}: monitoring contract missing`);
    assert.ok(activation.missingTests.length > 0, `${module.code}: remaining staging/production tests must remain explicit`);
    assert.equal(activation.businessOwnerAcceptance, "NOT ACCEPTED FOR PRODUCTION", `${module.code}: unsupported production acceptance claim`);
    assert.deepEqual(activation.productionEvidence, [], `${module.code}: production evidence cannot be fabricated at R1`);
    assert.deepEqual(activation.releasedModuleApiEndpoints, activation.apiEndpoints, `${module.code}: released endpoint contract drift`);
    assert.ok(Array.isArray(activation.implementedProtectedServerAuthorities), `${module.code}: protected authority list must be explicit`);

    const hiddenForSafety = activation.finalReleaseState === "HIDDEN FOR SAFETY";
    if (hiddenForSafety) {
      hidden.push(module.code);
      assert.equal(module.visibleInNavigation, false, `${module.code}: hidden module leaked into navigation`);
      assert.equal(module.releaseClassification, "hidden_until_dependency_exists", `${module.code}: hidden release classification drift`);
      assert.equal(activation.databaseTablesViews.length, 0, `${module.code}: hidden module must exercise zero current DB authority`);
      assert.match(activation.apiEndpoints[0] ?? "", /fail-closed/iu, `${module.code}: hidden read endpoint must fail closed`);
      assert.equal(hiddenExecutiveCodes.has(module.code), true, `${module.code}: unexpected hidden module`);
    } else {
      completed.push(module.code);
      assert.equal(activation.finalReleaseState, "DEPENDENCY-BLOCKED", `${module.code}: visible R1 module must remain dependency-blocked rather than imply production operation`);
      assert.equal(module.visibleInNavigation, true, `${module.code}: visible informational module missing from navigation`);
      assert.equal(module.releaseClassification, "informational_only", `${module.code}: visible module release classification drift`);
      assert.ok(activation.databaseTablesViews.length > 0, `${module.code}: visible module must state exact current DB authority`);
    }
  }

  assert.equal(completed.length, 47, "Exactly 47 modules should be repository-authored/visible at R1");
  assert.equal(hidden.length, 7, "Exactly seven dependency-gated Executive modules should remain hidden for safety");
  assert.deepEqual(new Set(hidden), hiddenExecutiveCodes, "Hidden-for-safety inventory drift");
});

test("module completion is layered evidence, never a production claim", () => {
  const releasedPostAuthorities = portalModuleActivationMatrix
    .flatMap((module) => module.releasedModuleApiEndpoints.map((endpoint) => [module.code, endpoint] as const))
    .filter(([, endpoint]) => endpoint.startsWith("POST "));
  const protectedAdminPostAuthorities = portalModuleActivationMatrix
    .filter((module) => module.code.startsWith("admin."))
    .flatMap((module) => module.implementedProtectedServerAuthorities.map((endpoint) => [module.code, endpoint] as const))
    .filter(([, endpoint]) => endpoint.startsWith("POST "));

  assert.equal(releasedPostAuthorities.length, 5, "Only five governed module write paths are released at R1");
  assert.ok(protectedAdminPostAuthorities.length > 0, "Protected Admin server authorities must be governed even while unreleased in UI");
  for (const [code, endpoint] of protectedAdminPostAuthorities) {
    const activation = activationByCode.get(code);
    assert.ok(activation);
    assert.equal(activation.releasedModuleApiEndpoints.includes(endpoint), false, `${code}: protected Admin POST leaked into released module actions`);
  }

  console.log(JSON.stringify({
    governedModules: portalModules.length,
    repositoryAuthoredVisible: portalModules.filter((module) => module.visibleInNavigation).length,
    hiddenForSafety: portalModules.filter((module) => !module.visibleInNavigation).length,
    presentationArchetypes: new Set(Object.values(presentations)).size,
    releasedModulePostAuthorities: releasedPostAuthorities.length,
    protectedAdminPostAuthorities: protectedAdminPostAuthorities.length,
    productionAcceptedModules: 0,
    truthfulReleaseState: "R1 PUBLIC RELEASE VERIFIED",
  }, null, 2));
});
