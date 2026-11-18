import assert from "node:assert/strict";
import test from "node:test";
import {
  compileL0SparseLinearCandidate,
  l0ActivationProbability,
  l0DeterministicGate,
  l0ExpectedActiveCount,
  l0SampleGate,
  scoreL0SparseLinearCandidate,
} from "../src/l0-sparsity.ts";

test("hard-concrete expected L0 matches the closed-form gate probability", () => {
  const expected = 1 / (1 + Math.exp(-(2 / 3) * Math.log(11)));
  assert.ok(Math.abs(l0ActivationProbability(0) - expected) < 1e-12);
  assert.ok(Math.abs(l0ExpectedActiveCount([0, 0]) - 2 * expected) < 1e-12);
  assert.equal(l0DeterministicGate(0), 0.5);
  assert.equal(l0SampleGate(0, 0.5), 0.5);
});

test("extreme gates produce exact zeros and ones without numerical overflow", () => {
  assert.equal(l0DeterministicGate(-1000), 0);
  assert.equal(l0DeterministicGate(1000), 1);
  assert.equal(l0SampleGate(-1000, 0.5), 0);
  assert.equal(l0SampleGate(1000, 0.5), 1);
  assert.equal(l0ActivationProbability(-1000), 0);
  assert.equal(l0ActivationProbability(1000), 1);
});

test("candidate inference uses fixed feature order, dimensionality and exact pruning", () => {
  const model = compileL0SparseLinearCandidate({
    featureNames: ["demand", "stock", "lead_time"],
    weights: [2, 999, 4],
    logAlphas: [1000, -1000, 0],
    bias: 3,
  });
  assert.equal(model.nonZeroCount, 2);
  assert.deepEqual(model.coefficients, [2, 0, 2]);
  assert.equal(scoreL0SparseLinearCandidate(model, { lead_time: 4, demand: 5, stock: 99 }), 21);
  assert.equal(model.productionApproved, false);
  assert.equal(model.customerVisible, false);
  assert.equal(model.releaseStatus, "research-only");
  assert.ok(Object.isFrozen(model));
  assert.ok(Object.isFrozen(model.coefficients));
});

test("bad numerical values, malformed schemas and mutated release metadata fail closed", () => {
  for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assert.throws(() => l0DeterministicGate(bad));
    assert.throws(() => l0ActivationProbability(bad));
    assert.throws(() => l0SampleGate(0, bad));
  }
  for (const bad of [0, 1, -0.1, 1.5]) assert.throws(() => l0SampleGate(0, bad));
  assert.throws(() => l0DeterministicGate(0, { gamma: 0 }));
  assert.throws(() => l0DeterministicGate(0, { zeta: 1 }));
  assert.throws(() => l0DeterministicGate(0, { temperature: 0 }));
  assert.throws(() => l0ExpectedActiveCount([]));
  assert.throws(() => compileL0SparseLinearCandidate({ featureNames: ["demand", "demand"], weights: [1, 2], logAlphas: [0, 0], bias: 0 }));
  assert.throws(() => compileL0SparseLinearCandidate({ featureNames: ["Demand"], weights: [1], logAlphas: [0], bias: 0 }));
  assert.throws(() => compileL0SparseLinearCandidate({ featureNames: ["demand"], weights: [Number.NaN], logAlphas: [0], bias: 0 }));
  const model = compileL0SparseLinearCandidate({ featureNames: ["demand"], weights: [2], logAlphas: [100], bias: 0 });
  assert.throws(() => scoreL0SparseLinearCandidate(model, { demand: Number.NaN }));
  assert.throws(() => scoreL0SparseLinearCandidate(model, { other: 10 }));
  assert.throws(() => scoreL0SparseLinearCandidate(model, { demand: 1, extra: 2 }));
  assert.throws(() => scoreL0SparseLinearCandidate({ ...model, productionApproved: true } as unknown as typeof model, { demand: 1 }));
});
