import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildSixSurfaceMatrix, SURFACES } from "./build-hig-six-surface-acceptance.mjs";

const registerBytes = readFileSync("docs/design/apple-hig-172-topic-acceptance-register.json");
const register = JSON.parse(registerBytes);
const inventoryBytes = readFileSync("docs/design/apple-hig-runtime-source-scope-20261120.json");
const ownerBytes = readFileSync("config/intelligence/owner-production-constraints.json");
const inventory = JSON.parse(inventoryBytes);
const owner = JSON.parse(ownerBytes);
const portalModuleBytes = readFileSync("packages/portal-contracts/src/module-catalog.json");
const intelligenceWorkspaceBytes = readFileSync("apps/portal/data/intelligence-workspaces.ts");
const wmsPrototypeBytes = readFileSync("apps/portal/components/wms-prototype-workspace-map.tsx");
const create = (r = register, o = owner) =>
  buildSixSurfaceMatrix({
    register: r, inventory, owner: o,
    registerBytes: r === register ? registerBytes : Buffer.from(JSON.stringify(r)),
    inventoryBytes,
    ownerBytes: o === owner ? ownerBytes : Buffer.from(JSON.stringify(o)),
    portalModuleBytes, intelligenceWorkspaceBytes, wmsPrototypeBytes
  });

test("owner-selected six distinct surfaces produce a traceable 172-by-six evidence matrix", () => {
  assert.deepEqual(SURFACES.map(s => s.id),
    ["corporate", "portal", "intelligence", "distribution", "ios", "android"]);
  assert.deepEqual(SURFACES.map(s => s.platform),
    ["web", "web", "web", "web", "ios", "android"]);
  assert.match(SURFACES.find(s => s.id === "ios").source, /native\/novapharm-intelligence-ios/);
  const matrix = create();
  assert.equal(matrix.topics.length, 172);
  assert.equal(matrix.completion.reviewRecorded, 172);
  assert.equal(matrix.completion.platformDecisions, 516);
  assert.equal(matrix.completion.surfaceCells, 1032);
  assert.equal(matrix.completion.applicableProposals, 684);
  assert.equal(matrix.completion.notApplicableProposals, 348);
  assert.equal(matrix.completion.portalModuleReviewTargets, 54);
  assert.equal(matrix.completion.intelligenceWorkspaceReviewTargets, 22);
  assert.equal(matrix.completion.distributionPrototypeReviewTargets, 16);
  assert.equal(matrix.completion.independentlyAcceptedDistributionPrototypeCapabilities, 0);
  assert.equal(matrix.completion.independentlyAcceptedPortalModules, 0);
  assert.equal(matrix.completion.independentlyAcceptedIntelligenceWorkspaces, 0);
  assert.equal(matrix.completion.fullyAcceptedTopics, 0);
  assert.equal(matrix.completion.acceptedWholeTopicNotApplicable, 0);
  assert.equal(matrix.completion.independentlyAcceptedSurfaceCells, 0);
  assert.equal(matrix.gates.ownerControlledReleaseSignoff, "not_granted");
});

test("every proposed applicable surface still needs actual deployed evidence and reviewer", () => {
  const matrix = create();
  for (const topic of matrix.topics) {
    assert.equal(Object.keys(topic.surfaces).length, 6);
    for (const surface of SURFACES) {
      const cell = topic.surfaces[surface.id];
      assert.equal(cell.independentAcceptance, false);
      assert.equal(cell.independentReviewerApprovalReceipt, null);
      assert.equal(cell.observedLiveDeployedSha, null);
      assert.equal(cell.ownerReleaseApprovalReceipt, null);
      assert.ok(cell.evidenceRequirements.length >= 4);
      assert.ok(cell.inheritedRationale);
      if (cell.inheritedPlatformProposal === "not_applicable") {
        assert.equal(cell.surfaceDisposition, "proposed_not_applicable_requires_independent_review");
      } else {
        assert.equal(cell.surfaceDisposition, "surface_applicability_review_pending");
      }
    }
  }
});

test("source only cannot claim remote-independent acceptance even when a source topic is marked verified", () => {
  const altered = structuredClone(register);
  altered.topics[0].implementation = "verified";
  const candidate = create(altered);
  assert.equal(candidate.completion.sourceClaimedVerifiedTopics, 1);
  assert.equal(candidate.completion.fullyAcceptedTopics, 0);
  assert.equal(candidate.topics[0].independentProductionReadbackDisposition,
    "not_verified_by_this_source_only_generator");
});

test("owner signoff change is recorded but never self-certifies a topic", () => {
  const changedOwner = structuredClone(owner);
  changedOwner.productionSignoff = "granted";
  const report = create(register, changedOwner);
  assert.equal(report.gates.ownerControlledReleaseSignoff, "granted");
  assert.equal(report.completion.independentlyAcceptedSurfaceCells, 0);
});

test("reject missing platform decisions instead of silently assuming not-applicability", () => {
  const altered = structuredClone(register);
  delete altered.topics[0].platformApplicability.ios;
  assert.throws(() => create(altered), /missing ios applicability decision/);
});

test("all six evidence input digests match the exact parsed source files", () => {
  const matrix = create();
  const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
  assert.equal(matrix.source.sha256, sha256(registerBytes));
  assert.equal(matrix.source.inventoryJsonSha256, sha256(inventoryBytes));
  assert.equal(matrix.source.ownerConstraintsJsonSha256, sha256(ownerBytes));
  assert.equal(matrix.source.portalModuleCatalogueSha256, sha256(portalModuleBytes));
  assert.equal(matrix.source.intelligenceWorkspaceCatalogueSha256, sha256(intelligenceWorkspaceBytes));
  assert.equal(matrix.source.distributionPrototypeMapSha256, sha256(wmsPrototypeBytes));
});

test("reject mismatched source objects and bytes before generating evidence", () => {
  const changedRegister = structuredClone(register);
  changedRegister.topics[0].title += " (uncommitted change)";
  assert.throws(() => buildSixSurfaceMatrix({
    register: changedRegister, inventory, owner, registerBytes, inventoryBytes, ownerBytes, portalModuleBytes, intelligenceWorkspaceBytes, wmsPrototypeBytes
  }), /Register object must match hashed register bytes/);

  const changedInventory = structuredClone(inventory);
  changedInventory.sourceSnapshotSha = "untracked-source";
  assert.throws(() => buildSixSurfaceMatrix({
    register, inventory: changedInventory, owner, registerBytes, inventoryBytes, ownerBytes, portalModuleBytes, intelligenceWorkspaceBytes, wmsPrototypeBytes
  }), /Inventory object must match hashed inventory bytes/);

  const changedOwner = structuredClone(owner);
  changedOwner.productionSignoff = "granted";
  assert.throws(() => buildSixSurfaceMatrix({
    register, inventory, owner: changedOwner, registerBytes, inventoryBytes, ownerBytes, portalModuleBytes, intelligenceWorkspaceBytes, wmsPrototypeBytes
  }), /Owner constraints must match hashed owner bytes/);
});

test("54 Portal modules preserve exact role-scoped source routes, but earn no production acceptance", () => {
  const matrix = create();
  const modules = matrix.moduleEvidenceTargets.portal;
  assert.equal(modules.length, 54);
  assert.equal(new Set(modules.map(x => x.code)).size, 54);
  assert.equal(new Set(modules.map(x => x.sourceRoute)).size, 54);
  assert.equal(modules.filter(x => x.sourceVisibleInNavigation).length, 48);
  assert.equal(modules.filter(x => !x.sourceVisibleInNavigation).length, 6);
  for (const module of modules) {
    assert.ok(module.declaredAuthorisedRoles.length > 0);
    assert.equal(module.independentAcceptance, false);
    assert.equal(module.deployedSourceShaReceipt, null);
    assert.equal(module.protectedRoleTenantMfaReceipt, null);
    assert.equal(module.accessibleJourneyReceipt, null);
    assert.equal(module.independentApprovalReceipt, null);
  }
});

test("22 Intelligence workspace candidates are individually scoped but not deployed or accepted", () => {
  const matrix = create();
  const ws = matrix.moduleEvidenceTargets.intelligence;
  assert.equal(ws.length, 22);
  assert.equal(new Set(ws.map(x => x.slug)).size, 22);
  assert.equal(ws.filter(x => x.sourceState === "existing-read-only").length, 5);
  assert.equal(ws.filter(x => x.sourceState === "gated").length, 17);
  for (const workspace of ws) {
    assert.equal(workspace.independentAcceptance, false);
    assert.equal(workspace.deployedSourceShaReceipt, null);
    assert.equal(workspace.sourceDataRightsReceipt, null);
    assert.equal(workspace.protectedRoleTenantMfaReceipt, null);
    assert.equal(workspace.accessibleJourneyReceipt, null);
    assert.equal(workspace.independentApprovalReceipt, null);
  }
});

test("module inventory drift fails closed rather than silently losing routes", () => {
  const incomplete = JSON.parse(portalModuleBytes);
  incomplete.pop();
  assert.throws(() => buildSixSurfaceMatrix({
    register, inventory, owner, registerBytes, inventoryBytes, ownerBytes,
    portalModuleBytes: Buffer.from(JSON.stringify(incomplete)), intelligenceWorkspaceBytes, wmsPrototypeBytes
  }), /Portal module count drift/);

  const repeated = JSON.parse(portalModuleBytes);
  repeated[1].route = repeated[0].route;
  assert.throws(() => buildSixSurfaceMatrix({
    register, inventory, owner, registerBytes, inventoryBytes, ownerBytes,
    portalModuleBytes: Buffer.from(JSON.stringify(repeated)), intelligenceWorkspaceBytes, wmsPrototypeBytes
  }), /Duplicate Portal module route/);
});

test("Intelligence catalogue drift rejects missing and duplicate workspaces", () => {
  const content = String(intelligenceWorkspaceBytes);
  const missing = content.replace('slug: "medicine-search"', 'key: "medicine-search"');
  assert.notEqual(missing, content);
  assert.throws(() => buildSixSurfaceMatrix({
    register, inventory, owner, registerBytes, inventoryBytes, ownerBytes,
    portalModuleBytes, intelligenceWorkspaceBytes: Buffer.from(missing), wmsPrototypeBytes
  }), /Intelligence workspace count drift/);

  const duplicate = content.replace('slug: "medicine-overview"', 'slug: "medicine-search"');
  assert.notEqual(duplicate, content);
  assert.throws(() => buildSixSurfaceMatrix({
    register, inventory, owner, registerBytes, inventoryBytes, ownerBytes,
    portalModuleBytes, intelligenceWorkspaceBytes: Buffer.from(duplicate), wmsPrototypeBytes
  }), /Duplicate Intelligence workspace slug/);
});

test("all 16 WMS blueprint capabilities are explicit non-operational evidence targets", () => {
  const matrix = create();
  const wms = matrix.moduleEvidenceTargets.distributionPrototype;
  assert.equal(wms.length, 16);
  assert.equal(new Set(wms.map(x => x.title)).size, 16);
  assert.equal(wms.filter(x => x.mappedPortalModuleCode !== null).length, 12);
  assert.equal(wms.filter(x => x.mappedPortalModuleCode === null).length, 4);
  for (const capability of wms) {
    assert.ok(capability.statedConstraint);
    assert.equal(capability.prototypeOnly, true);
    assert.equal(capability.independentAcceptance, false);
    assert.equal(capability.verifiedPhysicalStockReceipt, null);
    assert.equal(capability.authorisedThreePlReconciliationReceipt, null);
    assert.equal(capability.qualityFefoPickDispatchPodReceipt, null);
    assert.equal(capability.realRoleAndTenantReceipt, null);
    assert.equal(capability.independentApprovalReceipt, null);
  }
});

test("WMS blueprint omissions and unlicensed module remapping fail closed", () => {
  const source = String(wmsPrototypeBytes);
  const missing = source.replace('title: "Control tower"', 'name: "Control tower"');
  assert.notEqual(missing, source);
  assert.throws(() => buildSixSurfaceMatrix({
    register, inventory, owner, registerBytes, inventoryBytes, ownerBytes,
    portalModuleBytes, intelligenceWorkspaceBytes, wmsPrototypeBytes: Buffer.from(missing)
  }), /WMS prototype capability count drift/);

  const unsafe = source.replace('module: "employee.dashboard"', 'module: "customer.dashboard"');
  assert.notEqual(unsafe, source);
  assert.throws(() => buildSixSurfaceMatrix({
    register, inventory, owner, registerBytes, inventoryBytes, ownerBytes,
    portalModuleBytes, intelligenceWorkspaceBytes, wmsPrototypeBytes: Buffer.from(unsafe)
  }), /WMS prototype mapping points to absent\/nonemployee Portal module/);
});
