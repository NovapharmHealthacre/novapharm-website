import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import test from "node:test";

// This is an acceptance BACKLOG derived from the owner's canonical HIG
// register. No line in this report certifies a live deployment or a signed app.
const readJSON = path => JSON.parse(readFileSync(path, "utf8"));
const outPath = "artifacts/apple-hig-production-audit/516-platform-acceptance-plan.json";
const platforms = ["web", "ios", "android"];
const evidenceNeeds = {
  web: [
    "Source-identifiable deployed public or authorized protected route",
    "Chromium and WebKit real rendered layout, keyboard and accessibility observations",
    "Supported viewport, text reflow, error, consent and privacy behavior",
    "Protected session role, MFA and tenant isolation where applicable",
    "Qualified independent Quality/Security acceptance and release/rollback receipt"
  ],
  ios: [
    "Identified authorized iOS bundle, signed installable build and source revision",
    "Real iPhone/iPad supported-OS screen and dynamic text-size layout evidence",
    "VoiceOver, keyboard/accessibility, light/dark, permissions and lifecycle checks",
    "Authenticated session, tenant/data rights and StoreKit only where specifically in scope",
    "Qualified independent native Security/Quality approval and controlled release receipt"
  ],
  android: [
    "Identified authorized Android package, signed installable build and source revision",
    "Actual Android device/API and edge-to-edge/font-scale layout evidence",
    "TalkBack, keyboard/accessibility, permissions and app lifecycle checks",
    "Authenticated session, tenant/data rights and Play Billing only where applicable",
    "Qualified independent native Security/Quality approval and controlled release receipt"
  ]
};
const receiptTemplate = () => ({
  exactSourceSha: null,
  deployedRouteOrSignedArtifact: null,
  browserOrDeviceRunUrl: null,
  accessibilityAndAssistiveTechnologyReceipt: null,
  securityRoleTenantReceipt: null,
  independentReviewerApproval: null,
  finalReleaseOrNADispositionReceipt: null
});

test("generate 516 evidence-empty, platform-appropriate HIG source-to-production acceptance slots", () => {
  const register = readJSON("docs/design/apple-hig-172-topic-acceptance-register.json");
  const owner = readJSON("config/intelligence/owner-production-constraints.json");

  assert.equal(register.topics.length, 172);
  assert.equal(new Set(register.topics.map(t => t.url)).size, 172);
  assert.equal(owner.productionSignoff, "not_granted",
    "Production gate changed: a separate signed release workflow must review this source-only plan");
  assert.equal(owner.initialInfrastructureBudget.monthlyCapGbp, 0);
  assert.equal(owner.productionPermissions.enableCustomerBilling, false);

  const counts = {
    topicCount: register.topics.length,
    platformSlots: 0,
    reviewedTopics: 0,
    assessedPlatformDecisions: 0,
    applicableCandidateSlots: 0,
    notApplicableCandidateSlots: 0,
    unassessedSlots: 0,
    allPlatformOutOfScopeTopicCandidates: 0,
    sourcePlanProductionAcceptedSlots: 0
  };
  const slots = [];
  for (const topic of register.topics) {
    const reviewed = topic.guidelineReview === "reviewed";
    if (reviewed) counts.reviewedTopics++;
    const allOut = platforms.every(p =>
      topic.platformApplicability?.[p]?.state === "not_applicable");
    if (allOut) counts.allPlatformOutOfScopeTopicCandidates++;
    for (const platform of platforms) {
      const decision = topic.platformApplicability?.[platform];
      assert.ok(decision, "Missing platform decision: " + topic.title + "/" + platform);
      assert.ok(["unassessed", "applicable", "not_applicable"].includes(decision.state),
        "Unknown platform state: " + topic.title + "/" + platform);
      assert.ok(decision.state === "unassessed" ||
        (reviewed && typeof decision.rationale === "string" && decision.rationale.length >= 20),
        "Assessed platform lacks written reviewed rationale: " + topic.title + "/" + platform);
      if (decision.state === "unassessed") counts.unassessedSlots++;
      if (decision.state === "applicable") counts.applicableCandidateSlots++;
      if (decision.state === "not_applicable") counts.notApplicableCandidateSlots++;
      if (decision.state !== "unassessed") counts.assessedPlatformDecisions++;
      slots.push({
        topic: topic.title,
        section: topic.section,
        priority: topic.priority,
        officialAppleReference: topic.markdown,
        platform,
        sourceReview: topic.guidelineReview,
        applicabilityDecision: decision.state,
        applicabilityRationale: decision.rationale ?? null,
        requiresIndependentScopeDisposition: allOut,
        requiredEvidence: decision.state === "applicable"
          ? [...evidenceNeeds[platform]]
          : decision.state === "not_applicable"
            ? ["Independently review whether this Apple HIG requirement is genuinely inapplicable to this target platform"]
            : ["Complete actual official-article review and platform applicability decision first"],
        receipt: receiptTemplate(),
        acceptanceFromThisSourceOnlyPlan: "not_verified"
      });
    }
  }

  assert.equal(slots.length, 516);
  assert.equal(new Set(slots.map(s => s.officialAppleReference + "|" + s.platform)).size, 516);
  assert.equal(counts.platformSlots, 0);
  counts.platformSlots = slots.length;
  assert.equal(counts.reviewedTopics,
    register.topics.filter(t => t.guidelineReview === "reviewed").length);
  assert.equal(counts.assessedPlatformDecisions, register.meta.platformsAssessed);
  assert.equal(counts.unassessedSlots + counts.applicableCandidateSlots +
    counts.notApplicableCandidateSlots, 516);
  assert.ok(slots.every(s =>
    s.acceptanceFromThisSourceOnlyPlan === "not_verified" &&
    Object.values(s.receipt).every(value => value === null)));
  const output = {
    schema: "novapharm.hig-516-platform-source-acceptance-plan.v1",
    scope: "Source-only QA/release backlog. Never a 516-platform certificate or a substitute for independent native/web production evidence.",
    evaluatedCommit: process.env.GITHUB_SHA ?? null,
    sourceReviewMergedState: "tracked_register_snapshot_only",
    productionOwnerSignoff: owner.productionSignoff,
    approvedByThisPlan: 0,
    scopeCandidateDecisionsNotIndependentApprovals: true,
    exhaustiveNativeScreensNotInventoried: true,
    counts,
    slots
  };
  mkdirSync("artifacts/apple-hig-production-audit", { recursive: true });
  writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");
  const saved = readJSON(outPath);
  assert.equal(saved.slots.length, 516);
  assert.equal(saved.approvedByThisPlan, 0);
});
