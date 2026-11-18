import assert from "node:assert/strict";
import test from "node:test";
import {
  assessRewardProxySweep, evaluateCritiqueAssistance,
  evaluateInstructionConformance, assessOfflineScenarioRollouts
} from "../src/core/ai/nova-alignment-research.mjs";

const receipt = result => {
  assert.equal(result.contract, "novapharm.intelligence.nova-alignment-research.v1");
  assert.equal(result.researchOnly, true);
  assert.equal(result.productionApproved, false);
  assert.equal(result.customerVisible, false);
  assert.equal(result.independentGroundTruthVerified, false);
  assert.equal(result.dataRightsVerified, false);
  assert.equal(result.humanAdjudicationRequired, true);
};

test("reward overoptimization warns when proxy rises after independent peak declines", () => {
  const result = assessRewardProxySweep({ steps: [
    { candidateId: "candidate_a", step: 0, proxyScore: 0, independentScore: 0 },
    { candidateId: "candidate_b", step: 1, proxyScore: 4, independentScore: 3 },
    { candidateId: "candidate_c", step: 2, proxyScore: 6, independentScore: 2 },
  ]});
  receipt(result);
  assert.equal(result.independentPeakCandidateId, "candidate_b");
  assert.equal(result.independentDeterioratedAfterPeak, true);
  assert.equal(result.observedPeakToFinalIndependentGap, 1);
  assert.equal(result.status, "proxy_overoptimization_warning");
});

test("reward sweep reports insufficient evidence if proxy and independent scores both improve", () => {
  const result = assessRewardProxySweep({ steps: [
    { candidateId: "candidate_a", step: 0, proxyScore: 0, independentScore: 0 },
    { candidateId: "candidate_b", step: 1, proxyScore: 1, independentScore: 1 },
    { candidateId: "candidate_c", step: 2, proxyScore: 2, independentScore: 2 },
  ] });
  receipt(result);
  assert.equal(result.independentDeterioratedAfterPeak, false);
});

test("critique assessment measures proposed vs independent adjudication claims without verification", () => {
  const result = evaluateCritiqueAssistance({ cases: [
    { caseId: "case_a", proposedFlawIds: ["flaw_a", "flaw_c"], adjudicatedFlawIds: ["flaw_a", "flaw_b"] },
    { caseId: "case_b", proposedFlawIds: [], adjudicatedFlawIds: [] }
  ]});
  receipt(result);
  assert.equal(result.matchingFlawIds, 1);
  assert.equal(result.precisionOnCallerLabels, 0.5);
  assert.equal(result.recallOnCallerLabels, 0.5);
  assert.equal(result.fullFlawCoverageCases, 0);
});

test("instruction check is only rule-set auditing, not a permission grant", () => {
  const result = evaluateInstructionConformance({ cases: [
    { caseId: "case_b", requiredRuleIds: ["no_patient_data", "cite_sources"], satisfiedRuleIds: ["no_patient_data"],
      forbiddenRuleIds: ["write_stock"], violatedRuleIds: ["write_stock"] },
    { caseId: "case_a", requiredRuleIds: ["cite_sources"], satisfiedRuleIds: ["cite_sources"],
      forbiddenRuleIds: ["publish"], violatedRuleIds: [] },
  ]});
  receipt(result);
  assert.equal(result.requiredRuleSatisfaction, 2 / 3);
  assert.equal(result.allRulesSatisfiedCaseRate, 0.5);
  assert.equal(result.violationCount, 1);
  assert.deepEqual(result.cases.map(c => c.caseId), ["case_a", "case_b"]);
  assert.deepEqual(result.cases[1].missingRequiredRuleIds, ["cite_sources"]);
});

test("offline synthetic rollouts detect unsafe attempts and calculate discounted rewards", () => {
  const result = assessOfflineScenarioRollouts({ discount: 0.5, episodes: [
    { scenarioId: "scenario_a", steps: [
      { simulatedReward: 2, unsafeActionAttempted: false },
      { simulatedReward: 4, unsafeActionAttempted: true }
    ] },
    { scenarioId: "scenario_b", steps: [
      { simulatedReward: -2, unsafeActionAttempted: false }
    ] },
  ]});
  receipt(result);
  assert.equal(result.averageDiscountedSimulatedReward, 1);
  assert.equal(result.unsafeEpisodeCount, 1);
  assert.equal(result.stepCount, 3);
  assert.equal(result.hasAnySafetyViolation, true);
});

test("malformed inputs, fake verification and source text all fail closed", () => {
  const bad = [
    () => assessRewardProxySweep({ steps: [
      { candidateId: "a", step: 0, proxyScore: 0, independentScore: 0 },
      { candidateId: "b", step: 1, proxyScore: 1, independentScore: 1 },
      { candidateId: "c", step: 2, proxyScore: 0, independentScore: 2 }
    ] }),
    () => assessRewardProxySweep({ steps: [
      { candidateId: "a", step: 0, proxyScore: 0, independentScore: 0 },
      { candidateId: "a", step: 1, proxyScore: 1, independentScore: 1 },
      { candidateId: "c", step: 2, proxyScore: 2, independentScore: 3 }
    ] }),
    () => evaluateCritiqueAssistance({ cases: [{ caseId: "case", proposedFlawIds: ["x", "x"], adjudicatedFlawIds: [] }] }),
    () => evaluateCritiqueAssistance({ cases: [{ caseId: "case", proposedFlawIds: [], adjudicatedFlawIds: [], medicalRecord: "secret" }] }),
    () => evaluateInstructionConformance({ cases: [{ caseId: "case", requiredRuleIds: ["cite_sources"],
      satisfiedRuleIds: ["skip_citation"], forbiddenRuleIds: [], violatedRuleIds: [] }] }),
    () => evaluateInstructionConformance({ cases: [{ caseId: "case", requiredRuleIds: ["same"],
      satisfiedRuleIds: [], forbiddenRuleIds: ["same"], violatedRuleIds: [] }] }),
    () => assessOfflineScenarioRollouts({ episodes: [{ scenarioId: "scenario", steps: [
      { simulatedReward: Number.NaN, unsafeActionAttempted: false }
    ] }] }),
    () => assessOfflineScenarioRollouts({ episodes: [{ scenarioId: "scenario", steps: [
      { simulatedReward: 1, unsafeActionAttempted: "no" }
    ] }] }),
    () => assessOfflineScenarioRollouts({ episodes: [{ scenarioId: "scenario", steps: [
      { simulatedReward: 1, unsafeActionAttempted: false }
    ] }], discount: 1.1 })
  ];
  for (const invalid of bad) assert.throws(invalid, error => error.code === "nova_alignment_research_invalid_input");
});

test("empty proposed/adjudicated flaws return null precision/recall and no invented benchmark score", () => {
  const result = evaluateCritiqueAssistance({ cases: [{ caseId: "case", proposedFlawIds: [], adjudicatedFlawIds: [] }] });
  receipt(result);
  assert.equal(result.precisionOnCallerLabels, null);
  assert.equal(result.recallOnCallerLabels, null);
});
