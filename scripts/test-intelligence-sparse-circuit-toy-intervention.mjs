import test from "node:test";
import assert from "node:assert/strict";
import { runToySparseCircuitIntervention } from "./research/toy-sparse-circuit-intervention.mjs";

test("synthetic mean ablation changes a deliberately simple quote-feature result", () => {
  const run = runToySparseCircuitIntervention();
  assert.equal(run.kind, "synthetic-intervention-smoke-only");
  assert.equal(run.calibrationSamples, 64);
  assert.equal(run.holdoutSamples, 128);
  assert.equal(run.calibrationMean, 0.5);
  assert.equal(run.candidateSummary.valid, true);
  assert.equal(run.candidateSummary.lossDeltaCircuitVsBaseline, 0);
  assert.equal(run.candidateSummary.lossDeltaAblatedVsCircuit, 0.25);
  assert.equal(run.negativeControls.distractorControlDelta, 0);
  assert.equal(run.negativeControls.invertedLabelLoss, 1);
  assert.equal(Object.isFrozen(run.negativeControls), true);
  assert.equal(run.candidateSummary.nodeCount, 3);
  assert.equal(run.candidateSummary.edgeCount, 2);
});

test("synthetic smoke result is deterministic and permanently non-authorising", () => {
  const first = runToySparseCircuitIntervention();
  const second = runToySparseCircuitIntervention();
  assert.deepEqual(first, second);
  assert.equal(first.candidateSummary.status, "unverified-research-candidate");
  assert.equal(first.candidateSummary.productionEligible, false);
  assert.equal(first.candidateSummary.clinicalUsePermitted, false);
  assert.equal(first.candidateSummary.mechanisticExplanationVerified, false);
  assert.equal("patientData" in first, false);
  assert.equal(Object.isFrozen(first), true);
  assert.match(first.limitation, /No transformer training/);
});

test("irrelevant feature perturbation is a genuine negative control", () => {
  const run = runToySparseCircuitIntervention();
  assert.equal(run.negativeControls.distractorControlDelta, 0);
  assert.equal(run.negativeControls.invertedLabelLoss, 1);
  assert.ok(run.candidateSummary.lossDeltaAblatedVsCircuit >
    run.negativeControls.distractorControlDelta);
  assert.equal(run.candidateSummary.productionEligible, false);
});
