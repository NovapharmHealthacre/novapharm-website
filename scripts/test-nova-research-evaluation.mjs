import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateNovaResearchCases } from "../src/core/ai/nova-research-evaluation.mjs";

const cases = [
  { caseId: "A", expectedLabel: "supported", referenceSourceIds: ["s1"] },
  { caseId: "B", expectedLabel: "insufficient", referenceSourceIds: [] },
  { caseId: "C", expectedLabel: "contradicted", referenceSourceIds: ["s2"] }
];
const predictions = [
  { caseId: "A", outputLabel: "supported", citedSourceIds: ["s1"], confidence: 0.9 },
  { caseId: "B", outputLabel: "supported", citedSourceIds: ["wrong"], confidence: 0.8 },
  { caseId: "C", outputLabel: "abstain", citedSourceIds: [], confidence: 0.7 }
];

test("scientific metrics report errors, abstentions and citations with clear denominators", () => {
  const result = evaluateNovaResearchCases({ cases, predictions });
  assert.equal(result.sampleSize, 3);
  assert.equal(result.metrics.groundedDecisionAccuracy, 1 / 3);
  assert.equal(result.metrics.sufficientEvidenceCorrectRate, 0.5);
  assert.equal(result.metrics.insufficientEvidenceAbstentionRate, 0);
  assert.equal(result.metrics.unsupportedAssertionRate, 0.5);
  assert.equal(result.metrics.citationPrecision, 0.5);
  assert.equal(result.metrics.citationRecallWhenAsserting, 1);
  assert.equal(result.denominators.assertionCases, 2);
  assert.equal(result.matrix.insufficient.supported, 1);
  assert.equal(result.matrix.contradicted.abstain, 1);
  assert.equal(result.metrics.meanSquaredReportedConfidenceError,
    ((0.9 - 1) ** 2 + 0.8 ** 2 + 0.7 ** 2) / 3);
  assert.equal(result.status, "research_metrics_unverified");
  assert.equal(result.productionCertified, false);
  assert.equal(result.independentGroundTruthVerified, false);
});

test("incorrect citations invalidate otherwise correct asserted labels", () => {
  const result = evaluateNovaResearchCases({
    cases: [{ caseId: "X", expectedLabel: "supported", referenceSourceIds: ["gold"] }],
    predictions: [{ caseId: "X", outputLabel: "supported", citedSourceIds: ["unrelated"], confidence: 0.95 }]
  });
  assert.equal(result.metrics.groundedDecisionAccuracy, 0);
  assert.equal(result.metrics.unsupportedAssertionRate, 1);
  assert.equal(result.metrics.citationPrecision, 0);
  assert.equal(result.metrics.citationRecallWhenAsserting, 0);
});

test("correct abstention on insufficient evidence earns credit without phantom citations", () => {
  const result = evaluateNovaResearchCases({
    cases: [{ caseId: "X", expectedLabel: "insufficient", referenceSourceIds: [] }],
    predictions: [{ caseId: "X", outputLabel: "abstain", citedSourceIds: [], confidence: 1 }]
  });
  assert.equal(result.metrics.groundedDecisionAccuracy, 1);
  assert.equal(result.metrics.insufficientEvidenceAbstentionRate, 1);
  assert.equal(result.metrics.unsupportedAssertionRate, null);
  assert.equal(result.metrics.citationPrecision, null);
});

test("scores are independent of case order and no names or private content can enter", () => {
  const a = evaluateNovaResearchCases({ cases, predictions });
  const b = evaluateNovaResearchCases({
    cases: [...cases].reverse(), predictions: [...predictions].reverse()
  });
  assert.deepEqual(a, b);
  assert.doesNotMatch(JSON.stringify(a), /patient|commercial|s1|wrong/iu);
});

test("rejects duplicate, missing, extra, malformed or free-text case fields", () => {
  const base = { cases, predictions };
  const broken = [
    { ...base, cases: [] },
    { ...base, predictions: predictions.slice(0, 2) },
    { ...base, cases: [cases[0], cases[0], cases[2]] },
    { ...base, cases: [{ ...cases[0], patient_name: "secret" }, ...cases.slice(1)] },
    { ...base, predictions: [{ ...predictions[0], answer: "raw medical text" }, ...predictions.slice(1)] },
    { ...base, predictions: [{ ...predictions[0], confidence: 2 }, ...predictions.slice(1)] },
    { ...base, predictions: [{ ...predictions[0], citedSourceIds: ["s1", "s1"] }, ...predictions.slice(1)] },
    { ...base, predictions: [{ ...predictions[0], caseId: "D" }, ...predictions.slice(1)] },
    { ...base, predictions: [{ ...predictions[0], outputLabel: "abstain", citedSourceIds: ["s1"] }, ...predictions.slice(1)] },
  ];
  for (const item of broken) {
    assert.throws(() => evaluateNovaResearchCases(item), e => e.code === "nova_evaluation_input_rejected");
  }
});
