/**
 * SOURCE-ONLY six-surface HIG evidence matrix. Never treats an applicability
 * classification, unit test or live public screenshot as full acceptance.
 * Generate locally/CI: node scripts/build-hig-six-surface-acceptance.mjs
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export const SURFACES = Object.freeze([
  { id: "corporate", label: "Corporate website", platform: "web",
    source: "apps/corporate", access: "public",
    checkpoints: ["exact published URL and HTML/source SHA", "320/390/768/1440px plus 200%/400% reflow", "Chromium and WebKit, keyboard, screen reader and manual content/contrast", "links, contact, legal, product-rights and consent journeys"] },
  { id: "portal", label: "Customer/employee/executive/admin Portal", platform: "web",
    source: "apps/portal and packages/portal-contracts/src/module-catalog.json", access: "protected",
    checkpoints: ["approved private deployment and exact image/source SHA", "synthetic role and tenant matrix, MFA, revocation and session expiry", "Chromium/WebKit, keyboard and assistive technology at supported zoom", "authorized search, orders, records, errors, loading and privacy"] },
  { id: "intelligence", label: "NovaPharm Intelligence", platform: "web",
    source: "apps/portal/data/intelligence-workspaces.ts", access: "protected",
    checkpoints: ["actual accessible deployment and exact source SHA", "read-only/gated workspace accuracy, tenant and source/data rights", "evidence provenance, loading, charts and keyboard/AT alternatives", "no fake AI, no unsupported medical/clinical authority or access"] },
  { id: "distribution", label: "Distribution / WMS", platform: "web",
    source: "apps/portal and distribution modules", access: "protected",
    checkpoints: ["real available routes and exact release SHA", "role-bounded inventory, FEFO, QA, picks, dispatch and POD", "safe simulated transactions; idempotent failure/undo and audit records", "keyboard, touch, responsive, offline/error, labels and contrast"] },
  { id: "ios", label: "Native iOS / iPadOS", platform: "ios",
    source: "native/novapharm-intelligence-ios (SwiftUI app); native/novapharm-intelligence-apple (SwiftPM library); native/novapharm-intelligence-mobile (Expo preview)", access: "native",
    checkpoints: ["real app target, bundle ID, signed build and controlled install receipt", "Xcode/Swift UI tests, real iPhone/iPad VoiceOver and Dynamic Type", "dark/light, reduce motion, landscape, keyboard and system permissions", "identity/session/data-rights and approved App Store/TestFlight release scope"] },
  { id: "android", label: "Native Android", platform: "android",
    source: "native/novapharm-intelligence-android and native/novapharm-intelligence-mobile", access: "native",
    checkpoints: ["real release package, signing evidence and device install receipt", "device/API-level tests, real TalkBack, font scaling and switch/keyboard", "dark mode, edge-to-edge, back navigation, rotation and permissions", "identity/session/data-rights and approved Play/internal-release scope"] }
]);

const registerPath = "docs/design/apple-hig-172-topic-acceptance-register.json";
const inventoryPath = "docs/design/apple-hig-runtime-source-scope-20261120.json";
const ownerPath = "config/intelligence/owner-production-constraints.json";
const portalModulePath = "packages/portal-contracts/src/module-catalog.json";
const intelligenceWorkspacePath = "apps/portal/data/intelligence-workspaces.ts";

// The authoritative workspace register is TypeScript rather than JSON.
// Parse only the catalog literal's first four required fields; reject unexpected
// syntax/count changes rather than silently dropping a regulated workspace.
export function readIntelligenceWorkspaceTargets(sourceText) {
  const section = /export const intelligenceWorkspaceCatalogue = Object\.freeze\(\[([\s\S]*?)\]\s+as const satisfies readonly IntelligenceWorkspace\[\]\);/m.exec(sourceText);
  assert.ok(section, "Intelligence workspace catalogue boundary unavailable");
  const re = /^\s*\{\s*slug:\s*"([a-z0-9-]+)",\s*title:\s*"([^"]+)",\s*group:\s*"([^"]+)",\s*state:\s*"(existing-read-only|gated)"/gm;
  const rows = [...section[1].matchAll(re)].map(match => ({
    slug: match[1], title: match[2], group: match[3], sourceState: match[4]
  }));
  assert.equal(new Set(rows.map(row => row.slug)).size, rows.length, "Duplicate Intelligence workspace slug");
  return rows;
}

export function buildSixSurfaceMatrix({ register, inventory, owner, registerBytes, inventoryBytes, ownerBytes, portalModuleBytes, intelligenceWorkspaceBytes }) {
  // A digest only proves provenance when its bytes actually describe the data
  // being scored. Reject stale/mismatched objects rather than mislabel evidence.
  assert.ok(registerBytes && inventoryBytes && ownerBytes && portalModuleBytes && intelligenceWorkspaceBytes,
    "All source input bytes are required");
  assert.deepEqual(register, JSON.parse(registerBytes), "Register object must match hashed register bytes");
  assert.deepEqual(inventory, JSON.parse(inventoryBytes), "Inventory object must match hashed inventory bytes");
  assert.deepEqual(owner, JSON.parse(ownerBytes), "Owner constraints must match hashed owner bytes");
  const portalModules = JSON.parse(portalModuleBytes);
  assert.ok(Array.isArray(portalModules), "Portal module catalogue must be an array");
  assert.equal(portalModules.length, inventory.portal.declaredModules, "Portal module count drift");
  assert.equal(new Set(portalModules.map(x => x.code)).size, portalModules.length, "Duplicate Portal module code");
  assert.equal(new Set(portalModules.map(x => x.route)).size, portalModules.length, "Duplicate Portal module route");
  assert.equal(portalModules.filter(x => x.visibleInNavigation).length,
    inventory.portal.visibleInNavigation, "Portal navigation visibility drift");
  assert.equal(portalModules.filter(x => !x.visibleInNavigation).length,
    inventory.portal.hiddenUntilDependencies, "Portal gated navigation drift");
  for (const [area, expected] of Object.entries(inventory.portal.areas)) {
    assert.equal(portalModules.filter(x => x.area === area).length, expected, "Portal module area drift: " + area);
  }
  for (const module of portalModules) {
    assert.ok(Object.hasOwn(inventory.portal.areas, module.area), "Unclassified Portal module");
    assert.ok(typeof module.code === "string" && module.code.length > 0, "Missing Portal module code");
    assert.ok(/^\/(?:portal|employee|admin)\//.test(module.route), "Unscoped Portal module route");
    assert.ok(typeof module.title === "string" && module.title.length > 0, "Missing Portal module title");
    assert.ok(Array.isArray(module.authorisedRoles) && module.authorisedRoles.length > 0,
      "Missing Portal module role inventory");
    assert.ok(typeof module.productionStatus === "string", "Missing Portal production status");
  }
  const intelligenceWorkspaces = readIntelligenceWorkspaceTargets(String(intelligenceWorkspaceBytes));
  assert.equal(intelligenceWorkspaces.length, inventory.portal.intelligenceWorkspaces,
    "Intelligence workspace count drift");
  assert.equal(intelligenceWorkspaces.filter(x => x.sourceState === "existing-read-only").length,
    inventory.portal.sourceLabeledReadOnly, "Intelligence read-only inventory drift");
  assert.equal(intelligenceWorkspaces.filter(x => x.sourceState === "gated").length,
    inventory.portal.sourceLabeledGated, "Intelligence gated inventory drift");
  assert.equal(register.topics.length, 172, "Expected owner-provided 172-topic index");
  assert.equal(new Set(register.topics.map(x => x.url)).size, 172, "Duplicate HIG source URL");
  assert.equal(SURFACES.length, 6);
  assert.ok(typeof owner.productionSignoff === "string", "Owner release control must be recorded");
  assert.ok(Number.isFinite(owner.initialInfrastructureBudget.monthlyCapGbp), "Budget guard missing");
  const rows = [];
  const counts = { topicCount: register.topics.length, reviewRecorded: 0,
    platformDecisions: 0, surfaceCells: 0, applicableProposals: 0,
    notApplicableProposals: 0, independentlyAcceptedSurfaceCells: 0,
    fullyAcceptedTopics: 0, acceptedWholeTopicNotApplicable: 0,
    sourceClaimedVerifiedTopics: 0, sourceClaimedNotApplicableTopics: 0,
    portalModuleReviewTargets: portalModules.length,
    intelligenceWorkspaceReviewTargets: intelligenceWorkspaces.length,
    independentlyAcceptedPortalModules: 0,
    independentlyAcceptedIntelligenceWorkspaces: 0 };
  for (const topic of register.topics) {
    assert.ok(topic.title && topic.url.startsWith("https://developer.apple.com/"));
    if (topic.guidelineReview === "reviewed") counts.reviewRecorded++;
    assert.ok(["not_verified", "verified", "not_applicable"].includes(topic.implementation), "Unknown topic disposition");
    if (topic.implementation === "verified") counts.sourceClaimedVerifiedTopics++;
    if (topic.implementation === "not_applicable") counts.sourceClaimedNotApplicableTopics++;
    const surfaces = {};
    for (const surface of SURFACES) {
      const proposal = topic.platformApplicability?.[surface.platform];
      assert.ok(proposal && ["applicable", "not_applicable"].includes(proposal.state),
        topic.title + " missing " + surface.platform + " applicability decision");
      if (surface.id === "corporate" || surface.id === "ios" || surface.id === "android")
        counts.platformDecisions++;
      counts.surfaceCells++;
      const proposedApplicable = proposal.state === "applicable";
      if (proposedApplicable) counts.applicableProposals++;
      else counts.notApplicableProposals++;
      surfaces[surface.id] = {
        inheritedPlatformProposal: proposal.state,
        surfaceDisposition: proposedApplicable ? "surface_applicability_review_pending" :
          "proposed_not_applicable_requires_independent_review",
        inheritedRationale: proposal.rationale,
        evidenceRequirements: surface.checkpoints,
        sourceFileOrRouteInventory: surface.source,
        observedLiveDeployedSha: null,
        fullKeyboardAndAssistiveTechnologyReceipt: null,
        verifiedDataAndTenantRightsReceipt: null,
        signedDeviceInstallReceipt: null,
        independentReviewerApprovalReceipt: null,
        ownerReleaseApprovalReceipt: null,
        independentAcceptance: false
      };
    }
    rows.push({ topic: topic.title, officialSource: topic.markdown || topic.url,
      priority: topic.priority, section: topic.section,
      sourceReviewRecorded: topic.guidelineReview === "reviewed",
      sourceReviewIndependentFullTextConfirmed: Boolean(register.meta?.ownerReviewAttestation?.fullTextReviewIndependentlyVerifiedForAll172),
      surfaces, sourceClaimedDisposition: topic.implementation,
      independentProductionReadbackDisposition: "not_verified_by_this_source_only_generator" });
  }
  assert.equal(counts.platformDecisions, 516);
  assert.equal(counts.surfaceCells, 1032);
  assert.equal(counts.applicableProposals + counts.notApplicableProposals, 1032);
  return {
    schema: "novapharm.hig-six-surface-independent-acceptance-preparation.v1",
    meaning: "Generated acceptance checklist only; zero independent production verification and zero N/A approvals",
    source: { register: registerPath, sha256: createHash("sha256").update(registerBytes).digest("hex"),
      sourceInventory: inventoryPath,
      inventoryJsonSha256: createHash("sha256").update(inventoryBytes).digest("hex"),
      inventorySnapshotSha: inventory.sourceSnapshotSha,
      ownerConstraints: ownerPath,
      ownerConstraintsJsonSha256: createHash("sha256").update(ownerBytes).digest("hex"),
      portalModuleCatalogue: portalModulePath,
      portalModuleCatalogueSha256: createHash("sha256").update(portalModuleBytes).digest("hex"),
      intelligenceWorkspaceCatalogue: intelligenceWorkspacePath,
      intelligenceWorkspaceCatalogueSha256: createHash("sha256").update(intelligenceWorkspaceBytes).digest("hex") },
    selectedScope: SURFACES,
    // These are extra source-derived review targets, NOT deployed modules or
    // verified HIG implementation receipts. Their acceptance is separately gated.
    moduleEvidenceTargets: {
      portal: portalModules.map(module => ({
        code: module.code, title: module.title, area: module.area,
        sourceRoute: module.route,
        declaredAuthorisedRoles: module.authorisedRoles,
        sourceVisibleInNavigation: module.visibleInNavigation,
        sourceWriteCapability: module.writeCapability,
        sourceProductionStatus: module.productionStatus,
        deployedSourceShaReceipt: null, protectedRoleTenantMfaReceipt: null,
        accessibleJourneyReceipt: null, independentApprovalReceipt: null,
        independentAcceptance: false
      })),
      intelligence: intelligenceWorkspaces.map(workspace => ({
        ...workspace,
        sourceCatalogue: intelligenceWorkspacePath,
        deployedSourceShaReceipt: null, sourceDataRightsReceipt: null,
        protectedRoleTenantMfaReceipt: null, accessibleJourneyReceipt: null,
        independentApprovalReceipt: null, independentAcceptance: false
      }))
    },
    completion: counts,
    gates: {
      branchProtectionMainAndGhPages: "independently_verify",
      realPublicDeploymentAndSourceSha: "independently_verify",
      privateStagingAndSyntheticRoles: "independently_verify",
      clinicalAndSupplierDataRights: "independently_verify",
      physicalVoiceOverAndTalkBack: "independently_verify",
      signedNativeBuildAndInstallation: "independently_verify",
      independentQualitySecurityAndRelevantClinicalReview: "independently_verify",
      ownerControlledReleaseSignoff: owner.productionSignoff
    },
    topics: rows
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const registerBytes = readFileSync(registerPath);
  const inventoryBytes = readFileSync(inventoryPath);
  const ownerBytes = readFileSync(ownerPath);
  const portalModuleBytes = readFileSync(portalModulePath);
  const intelligenceWorkspaceBytes = readFileSync(intelligenceWorkspacePath);
  const matrix = buildSixSurfaceMatrix({
    register: JSON.parse(registerBytes), registerBytes,
    inventory: JSON.parse(inventoryBytes), inventoryBytes,
    owner: JSON.parse(ownerBytes), ownerBytes,
    portalModuleBytes, intelligenceWorkspaceBytes
  });
  const dest = "artifacts/apple-hig-production-audit/six-surface-evidence-matrix.json";
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, JSON.stringify(matrix, null, 2) + "\n");
  console.log(JSON.stringify({ output: dest, ...matrix.completion }));
}
