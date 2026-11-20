import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import test from "node:test";
import {validateHigOwnerReleaseState} from "./hig-owner-release-state.mjs";

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

// Source-oriented *acceptance plan*, not an implementation or Apple certification.
// Every item needs inspectable runtime evidence before an independent reviewer
// may accept an actual live route. Applicability is verified against the register.
const criteriaByTopic = Object.freeze({
  "Accessibility": [
    "Chromium and WebKit keyboard-only traversal, visible focus and skip navigation",
    "Automated axe inspection and manual VoiceOver or another appropriate assistive-technology review",
    "320px viewport and 200–400% zoom/reflow with meaningful names, roles and statuses"
  ],
  "Layout": [
    "Actual deployed route at 320px, 390px and 1440px with no unintentional horizontal overflow",
    "Capture portrait and wide layout screenshots with source SHA and route",
    "Validate content hierarchy, safe-area and responsive navigation at supported widths"
  ],
  "Color": [
    "Record light, dark and system high-contrast or forced-colors behavior where supported",
    "Verify interactive state meaning does not depend on color alone",
    "Capture a documented contrast evaluation for readable text, controls and focus"
  ],
  "Typography": [
    "Validate heading order, readable text wrapping and user-controlled browser text resize",
    "Capture 200% and 400% zoom evidence without obscured content or clipped controls",
    "Check long localized labels and narrow screens for truncation/reflow failures"
  ],
  "Privacy": [
    "Inspect actual route for accidental disclosure of private account or medicine records",
    "Confirm consent and data-use disclosure with no sensitive values in screenshots or logs",
    "Verify public preview does not imply protected customer or patient permissions"
  ],
  "Navigation and search": [
    "Exercise route navigation with keyboard and assistive technology, with current location identified",
    "Verify search labels, empty results, keyboard dismissal and back-navigation recovery where present",
    "Record actual route availability, 404 handling and direct-link behavior"
  ],
  "Managing accounts": [
    "Use approved synthetic role-scoped sessions to verify sign-in, MFA and expiry behavior",
    "Prove sign-out and access revocation; check role and tenant isolation",
    "Capture redacted authorized-user evidence without customer, staff or patient details"
  ],
  "Entering data": [
    "Verify labels, format constraints and clear error messages for applicable forms",
    "Exercise keyboard, screen reader, correction and safe retry for invalid submissions",
    "Reject unapproved patient or medicine records in the synthetic acceptance environment"
  ],
  "Feedback": [
    "Check actionable feedback for success, error, pending and disabled states as applicable",
    "Verify feedback is accessible without relying solely on colors, icons or animation",
    "Record recovery or undo interaction and evidence from real rendered behavior"
  ],
  "Loading": [
    "Verify truthful loading and completion states with no indefinite busy announcements",
    "Exercise slow, failed, cancelled and out-of-order requests in an authorized test environment",
    "Ensure private user data never enters a public fallback, log or unsupported offline cache"
  ]
});
const criteriaEntries = Object.entries(criteriaByTopic);
assert.equal(criteriaEntries.length, 10);
for (const [topic, criteria] of criteriaEntries) {
  assert.ok(criteria.length >= 3, "Insufficient acceptance criteria: " + topic);
  assert.equal(new Set(criteria).size, criteria.length);
  assert.ok(criteria.every(x => x.length >= 55));
}

test("source route acceptance has 138 evidence-empty candidate routes and explicit HIG critical-topic scope", () => {
  const ledger = readJSON(candidateFile);
  const tracker = readJSON("docs/design/apple-hig-172-topic-acceptance-register.json");
  const owner = readJSON("config/intelligence/owner-production-constraints.json");

  assert.equal(ledger.schema, "novapharm.hig-route-acceptance-candidates.v1");
  assert.equal(ledger.sourceOnly, true);
  assert.equal(ledger.fullUrlUniverseProven, false);
  assert.equal(ledger.deployedOriginOrArtifactAccepted, false);
  assert.equal(ledger.candidates.length, 138);
  validateHigOwnerReleaseState(owner);
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
      firstWaveCriteriaRefs: [...topics],
      verificationRequirements: {
        exactDeployedSourceAndRoute: null,
        crossBrowserScreenshots: null,
        keyboardAndAssistiveTechnology: null,
        protectedSessionRoleTenantChecks: candidate.access === "protected_candidate" ? null : "not_required_for_public_candidate",
        independentSecurityQualityApproval: null
      },
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
    // Requirements are tasks for an independent acceptance run; there are no
    // browser/device outputs, production receipts, or approved dispositions.
    criteriaCatalogue: Object.fromEntries(
      protectedTopics.map(topic => [topic, {
        officialSource: registeredTopics.get(topic).markdown,
        platform: "web",
        checks: [...criteriaByTopic[topic]],
        requiredEvidence: "actual deployed route and source SHA, browser/AT artifacts, independent review"
      }])
    ),
    unresolvedNativeDeviceAcceptance: true,
    productionSignoff: owner.productionSignoff,
    entries
  };
  mkdirSync("artifacts/apple-hig-production-audit", { recursive: true });
  writeFileSync(planFile, JSON.stringify(plan, null, 2) + "\n");
  assert.equal(plan.entries.length, 138);
  assert.equal(Object.keys(plan.criteriaCatalogue).length, 10);
  assert.ok(plan.entries.every(entry =>
    entry.firstWaveCriteriaRefs.every(name => plan.criteriaCatalogue[name]?.checks.length >= 3) &&
    entry.verificationRequirements.exactDeployedSourceAndRoute === null &&
    entry.verificationRequirements.crossBrowserScreenshots === null &&
    entry.verificationRequirements.independentSecurityQualityApproval === null));
  assert.equal(plan.productionVerificationCount, 0);
});
