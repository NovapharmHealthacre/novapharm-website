import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import test from "node:test";

const readJSON = name => JSON.parse(readFileSync(name, "utf8"));
const candidateFile = "artifacts/apple-hig-production-audit/source-route-candidates.json";
const planFile = "artifacts/apple-hig-production-audit/source-route-topic-plan.json";

// First-wave, source-applicable critical HIG topics. This is a PRIORITY
// crosswalk, not exhaustive 172-topic mapping or production certification.
const publicTopics = Object.freeze([
  "Accessibility", "Layout", "Color", "Typography", "Privacy", "Navigation and search"
]);
const protectedTopics = Object.freeze([
  ...publicTopics, "Managing accounts", "Entering data", "Feedback", "Loading"
]);

test("source route acceptance has 138 evidence-empty candidate routes and explicit HIG critical-topic scope", () => {
  const ledger = readJSON(candidateFile);
  const tracker = readJSON("docs/design/apple-hig-172-topic-acceptance-register.json");
  const owner = readJSON("config/intelligence/owner-production-constraints.json");

  assert.equal(ledger.schema, "novapharm.hig-route-acceptance-candidates.v1");
  assert.equal(ledger.sourceOnly, true);
  assert.equal(ledger.fullUrlUniverseProven, false);
  assert.equal(ledger.deployedOriginOrArtifactAccepted, false);
  assert.equal(ledger.candidates.length, 138);
  assert.equal(owner.productionSignoff, "not_granted");
  assert.equal(owner.initialInfrastructureBudget.monthlyCapGbp, 0);
  assert.equal(owner.productionPermissions.activatePublicCustomerAccess, false);

  const registeredTopics = new Map(tracker.topics.map(topic => [topic.title, topic]));
  for (const name of protectedTopics) {
    const topic = registeredTopics.get(name);
    assert.ok(topic, "Missing official guideline: " + name);
    assert.equal(topic.guidelineReview, "reviewed", "Unreviewed source: " + name);
    assert.equal(topic.priority, "Critical", "Noncritical scope default: " + name);
    assert.equal(topic.platformApplicability.web.state, "applicable",
      "Cannot apply Apple-only native API to a web route: " + name);
    assert.ok(topic.guidelineReviewEvidence.some(note => note.includes(topic.markdown)),
      "Missing official source review evidence: " + name);
  }

  const publicCount = ledger.candidates.filter(x => x.access === "public_candidate").length;
  const protectedCount = ledger.candidates.filter(x => x.access === "protected_candidate").length;
  assert.equal(publicCount, 57);
  assert.equal(protectedCount, 81);
  assert.equal(publicCount + protectedCount, 138);

  const entries = ledger.candidates.map(candidate => {
    assert.equal(candidate.status, "source_candidate_not_production_verified");
    assert.equal(candidate.productionReceipt, null);
    assert.equal(candidate.accessibilityAcceptance, null);
    assert.equal(candidate.independentApproval, null);
    const topics = candidate.access === "protected_candidate" ? protectedTopics : publicTopics;
    return {
      route: candidate.route,
      kind: candidate.kind,
      access: candidate.access,
      requiredHigSourceReviewTopics: [...topics],
      // All values stay pending until actual deployed route, role/tenant,
      // accessibility and independent reviewer receipts are inspected.
      deployedSourceSha: null,
      accessibleBrowserEvidence: null,
      authorizedTenantJourneyEvidence: null,
      signedNativeArtifactEvidence: null,
      independentQualitySecurityApproval: null,
      acceptance: "not_verified"
    };
  });
  const requiredSourceTopicRoutePairs = entries.reduce(
    (sum, entry) => sum + entry.requiredHigSourceReviewTopics.length, 0);
  assert.equal(requiredSourceTopicRoutePairs, 1152);
  assert.equal(new Set(entries.map(e => e.route)).size, entries.length);
  assert.ok(entries.every(e => e.acceptance === "not_verified" &&
    e.independentQualitySecurityApproval === null && e.deployedSourceSha === null));

  const plan = {
    schema: "novapharm.hig-route-critical-first-wave-plan.v1",
    sourceBaselineSha: ledger.sourceBaselineSha,
    evaluatedCommit: ledger.evaluatedCommit,
    sourceOnly: true,
    productionVerificationCount: 0,
    acceptedNotApplicableCount: 0,
    sourceTopicRoutePairs: requiredSourceTopicRoutePairs,
    scope: "First-wave route/topic QA BACKLOG only. Not 1152 passed tests, not exhaustive HIG scope, not live or protected acceptance.",
    publicRoutes: publicCount,
    protectedRoutes: protectedCount,
    unresolvedNativeDeviceAcceptance: true,
    productionSignoff: owner.productionSignoff,
    entries
  };
  mkdirSync("artifacts/apple-hig-production-audit", { recursive: true });
  writeFileSync(planFile, JSON.stringify(plan, null, 2) + "\n");
  assert.equal(plan.entries.length, 138);
});
