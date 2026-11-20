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
    source: "native/novapharm-intelligence-apple and native/novapharm-intelligence-mobile", access: "native",
    checkpoints: ["real app target, bundle ID, signed build and controlled install receipt", "Xcode/Swift UI tests, real iPhone/iPad VoiceOver and Dynamic Type", "dark/light, reduce motion, landscape, keyboard and system permissions", "identity/session/data-rights and approved App Store/TestFlight release scope"] },
  { id: "android", label: "Native Android", platform: "android",
    source: "native/novapharm-intelligence-android and native/novapharm-intelligence-mobile", access: "native",
    checkpoints: ["real release package, signing evidence and device install receipt", "device/API-level tests, real TalkBack, font scaling and switch/keyboard", "dark mode, edge-to-edge, back navigation, rotation and permissions", "identity/session/data-rights and approved Play/internal-release scope"] }
]);

const registerPath = "docs/design/apple-hig-172-topic-acceptance-register.json";
const inventoryPath = "docs/design/apple-hig-runtime-source-scope-20261120.json";
const ownerPath = "config/intelligence/owner-production-constraints.json";

export function buildSixSurfaceMatrix({ register, inventory, owner, registerBytes }) {
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
    sourceClaimedVerifiedTopics: 0, sourceClaimedNotApplicableTopics: 0 };
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
      sourceInventory: inventoryPath, inventorySnapshotSha: inventory.sourceSnapshotSha,
      ownerConstraints: ownerPath },
    selectedScope: SURFACES,
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
  const matrix = buildSixSurfaceMatrix({
    register: JSON.parse(registerBytes), registerBytes,
    inventory: JSON.parse(readFileSync(inventoryPath)),
    owner: JSON.parse(readFileSync(ownerPath))
  });
  const dest = "artifacts/apple-hig-production-audit/six-surface-evidence-matrix.json";
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, JSON.stringify(matrix, null, 2) + "\n");
  console.log(JSON.stringify({ output: dest, ...matrix.completion }));
}
