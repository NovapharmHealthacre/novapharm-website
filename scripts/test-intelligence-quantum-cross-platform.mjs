import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const program = JSON.parse(read("docs/intelligence/quantum-research-program-v1.json"));
test("shared metadata cannot claim physical hardware or production", () => {
  assert.equal(program.schemaVersion, "npi.quantum-program.v1");
  assert.equal(program.modules.length, 7);
  for(const flag of ["publicClaimsApproved","physicalHardwareEnabled","paidComputeEnabled","productionModelConnected","protectedDataIngestionEnabled","clinicalUsePermitted"]) {
    assert.equal(program[flag], false, flag);
  }
  assert.equal(new Set(program.modules.map(m=>m.id)).size,7);
  assert.ok(program.principles.length >= 6);
});
test("corporate, board web and Expo iOS/Android import one review catalogue", () => {
  for(const path of ["apps/corporate/app/quantum-research/page.tsx", "apps/portal/components/science-research-workspace.tsx", "native/novapharm-intelligence-mobile/ScienceResearchMobile.tsx"]) {
    assert.ok(read(path).includes("quantum-research-program-v1.json"), path);
  }
  assert.ok(read("native/novapharm-intelligence-mobile/App.tsx").includes("ScienceResearchMobile"));
  assert.ok(read("apps/portal/app/[[...slug]]/page.tsx").includes("verifiedPortalSession"));
});
test("native adapters reject production authority and 22 medicine routes remain stable", () => {
  for(const path of ["native/novapharm-intelligence-apple/NovaQuantumResearchReceipt.swift", "native/novapharm-intelligence-android/app/src/main/java/com/novapharm/intelligence/research/NovaQuantumResearchReader.kt"]) {
    const body = read(path);
    for (const field of ["productionApproved","customerVisible","clinicalUsePermitted","hardwareMeasured","independentlyVerified"]) {
      assert.ok(body.includes(field), path+" "+field);
    }
  }
  const canonical = read("apps/portal/data/intelligence-workspaces.ts");
  assert.equal([...canonical.matchAll(/\{ slug: "/g)].length, 22);
  const constraints=JSON.parse(read("config/intelligence/owner-production-constraints.json"));
  assert.equal(constraints.productionSignoff,"not_granted");
  assert.equal(constraints.initialInfrastructureBudget.monthlyCapGbp,0);
  assert.equal(constraints.productionPermissions.activatePublicCustomerAccess,false);
});
