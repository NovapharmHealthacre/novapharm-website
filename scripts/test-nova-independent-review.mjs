import assert from "node:assert/strict";
import test from "node:test";
import { compareNovaIndependentReviews } from "../src/core/ai/nova-independent-review.mjs";

const a = "a".repeat(64);
const b = "b".repeat(64);
const c = "c".repeat(64);
const snapshot = "d".repeat(64);
const review = (reviewerPseudonymSha256, verdict = "supported", sourceIds = ["source-1"]) =>
  ({ reviewerPseudonymSha256, verdict, sourceIds });
const sample = () => ({
  datasetVersion: "expert-set-v1",
  cases: [{
    caseId: "case-1", sourceSnapshotFingerprintSha256: snapshot,
    annotations: [review(a), review(b, "supported", ["source-1"])]
  }]
});

test("two matching review records are only provisional and never accepted gold", () => {
  const result = compareNovaIndependentReviews(sample());
  assert.equal(result.contract, "novapharm.intelligence.nova-independent-review.v1");
  assert.equal(result.status, "research_review_only");
  assert.equal(result.productionCertified, false);
  assert.equal(result.pairwiseVerdictAgreement, 1);
  assert.equal(result.pairwiseVerdictAndCitationAgreement, 1);
  assert.equal(result.cases[0].status, "provisional_agreement_needs_adjudication");
  assert.equal(result.cases[0].provisionalVerdict, "supported");
  assert.equal(result.cases[0].benchmarkGoldAccepted, false);
  assert.equal(result.cases[0].evidenceRightsVerified, false);
  assert.equal(result.cases[0].reviewerIndependenceVerified, false);
});

test("contradictory verdicts require adjudication and cannot be silently averaged", () => {
  const input = sample();
  input.cases[0].annotations[1] = review(b, "contradicted", ["source-1"]);
  const result = compareNovaIndependentReviews(input);
  assert.equal(result.pairwiseVerdictAgreement, 0);
  assert.equal(result.cases[0].status, "conflict_needs_adjudication");
  assert.equal(result.cases[0].provisionalVerdict, null);
});

test("same verdict supported by different citations does not imply resolved research truth", () => {
  const input = sample();
  input.cases[0].annotations[1].sourceIds = ["source-2"];
  const result = compareNovaIndependentReviews(input);
  assert.equal(result.pairwiseVerdictAgreement, 1);
  assert.equal(result.pairwiseVerdictAndCitationAgreement, 0);
  assert.equal(result.cases[0].status, "conflict_needs_adjudication");
});

test("one reviewer remains pending; unresolved records do not earn agreement credit", () => {
  const input = sample();
  input.cases[0].annotations.pop();
  const result = compareNovaIndependentReviews(input);
  assert.equal(result.pairwiseReviewComparisons, 0);
  assert.equal(result.pairwiseVerdictAgreement, null);
  assert.equal(result.cases[0].status, "awaiting_second_reviewer");
  assert.equal(result.cases[0].benchmarkGoldAccepted, false);
});

test("input order cannot affect output and reviewer pseudonyms are never disclosed", () => {
  const input = sample();
  input.cases.push({
    caseId: "case-2", sourceSnapshotFingerprintSha256: snapshot,
    annotations: [review(a, "insufficient", []), review(c, "insufficient", [])]
  });
  const x = compareNovaIndependentReviews(input);
  const reordered = { ...input, cases: [...input.cases].reverse().map(item => ({
    ...item, annotations: [...item.annotations].reverse()
  })) };
  const y = compareNovaIndependentReviews(reordered);
  assert.deepEqual(x, y);
  assert.doesNotMatch(JSON.stringify(x), new RegExp(a));
  assert.doesNotMatch(JSON.stringify(x), new RegExp(b));
  assert.equal(x.cases[1].provisionalVerdict, "insufficient");
});

test("raw text, duplicate reviewers, invalid citations, invalid rights and malformed input fail closed", () => {
  const mutants = [
    x => { x.cases[0].annotations[0].reviewerPseudonymSha256 = "person@company.com"; },
    x => { x.cases[0].annotations[1].reviewerPseudonymSha256 = a; },
    x => { x.cases[0].annotations[0].notes = "patient name leaked"; },
    x => { x.cases[0].annotations[0].sourceIds = ["source-1", "source-1"]; },
    x => { x.cases[0].annotations[0].verdict = "approved"; },
    x => { x.cases[0].annotations[0].verdict = "insufficient"; },
    x => { x.cases[0].sourceSnapshotFingerprintSha256 = "not-a-hash"; },
    x => { x.cases[0].reviewerIndependenceVerified = true; },
    x => { x.cases.push({ ...x.cases[0] }); }
  ];
  for (const mutate of mutants) {
    const input = sample();
    mutate(input);
    assert.throws(() => compareNovaIndependentReviews(input),
      e => e.code === "nova_review_input_rejected");
  }
});
