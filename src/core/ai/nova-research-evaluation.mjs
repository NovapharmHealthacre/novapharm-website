/**
 * NOVA research evaluation metrics: pure, deterministic and data-free output.
 * This is a scoring utility, not independent verification of ground truth.
 * Dataset provenance, inter-rater agreement, licensing and external validity
 * must be assessed independently. Synthetic fixtures confer no production claim.
 */
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{1,79}$/u;
const TRUTH = Object.freeze(["supported", "contradicted", "insufficient"]);
const OUTPUT = Object.freeze(["supported", "contradicted", "abstain"]);
const MAX_CASES = 10000;
const deny = () => Object.assign(new Error("Invalid NOVA evaluation inputs."), {
  code: "nova_evaluation_input_rejected", statusCode: 400
});

function exactFields(value, allowed) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw deny();
  if (Object.keys(value).some(key => !allowed.includes(key))) throw deny();
}
function referenceIds(ids, allowEmpty) {
  if (!Array.isArray(ids) || ids.length > 20 || (!allowEmpty && !ids.length) ||
      ids.some(id => typeof id !== "string" || !ID.test(id)) ||
      new Set(ids).size !== ids.length) throw deny();
}
function proportion(n, d) { return d === 0 ? null : n / d; }

/**
 * Each case must be independently annotated before using these metrics for
 * scientific claims. Predictions are generated outside this scorer.
 * No free-text evidence, patient data, commercial inputs or raw model output
 * are accepted, only opaque reference IDs and categorical judgments.
 */
export function evaluateNovaResearchCases({ cases, predictions } = {}) {
  if (!Array.isArray(cases) || !Array.isArray(predictions) || cases.length === 0 ||
      cases.length > MAX_CASES || cases.length !== predictions.length) throw deny();
  const groundTruth = new Map();
  for (const item of cases) {
    exactFields(item, ["caseId", "expectedLabel", "referenceSourceIds"]);
    if (typeof item.caseId !== "string" || !ID.test(item.caseId) ||
        !TRUTH.includes(item.expectedLabel) || groundTruth.has(item.caseId)) throw deny();
    referenceIds(item.referenceSourceIds, item.expectedLabel === "insufficient");
    groundTruth.set(item.caseId, item);
  }
  const matrix = Object.fromEntries(TRUTH.map(label => [
    label, Object.fromEntries(OUTPUT.map(output => [output, 0]))
  ]));
  const seen = new Set();
  let correct = 0, supportedCases = 0, supportedCorrect = 0;
  let insufficientCases = 0, correctAbstentions = 0;
  let assertionCases = 0, unsupportedAssertions = 0;
  let citationTruePositives = 0, citationPredicted = 0, citationExpected = 0;
  let confidenceErrorSum = 0;
  for (const item of predictions) {
    exactFields(item, ["caseId", "outputLabel", "citedSourceIds", "confidence"]);
    if (typeof item.caseId !== "string" || !groundTruth.has(item.caseId) ||
        seen.has(item.caseId) || !OUTPUT.includes(item.outputLabel) ||
        typeof item.confidence !== "number" || !Number.isFinite(item.confidence) ||
        item.confidence < 0 || item.confidence > 1) throw deny();
    referenceIds(item.citedSourceIds, true);
    if (item.outputLabel === "abstain" && item.citedSourceIds.length) throw deny();
    seen.add(item.caseId);
    const reference = groundTruth.get(item.caseId);
    matrix[reference.expectedLabel][item.outputLabel] += 1;
    const labelCorrect =
      (reference.expectedLabel === "insufficient" && item.outputLabel === "abstain") ||
      (reference.expectedLabel !== "insufficient" && item.outputLabel === reference.expectedLabel);
    const expected = new Set(reference.referenceSourceIds);
    const matches = item.citedSourceIds.filter(id => expected.has(id)).length;
    citationTruePositives += matches;
    citationPredicted += item.citedSourceIds.length;
    // Count gold citations only when asserting a claim; abstention does not
    // pretend to cite sources and receives no unsupported citation credit.
    if (item.outputLabel !== "abstain") citationExpected += expected.size;
    const grounded = item.outputLabel === "abstain" ||
      (item.citedSourceIds.length > 0 && matches === item.citedSourceIds.length);
    if (labelCorrect && grounded) correct++;
    confidenceErrorSum += (item.confidence - Number(labelCorrect && grounded)) ** 2;
    if (reference.expectedLabel === "insufficient") {
      insufficientCases++;
      if (item.outputLabel === "abstain") correctAbstentions++;
    } else {
      supportedCases++;
      if (labelCorrect && grounded) supportedCorrect++;
    }
    if (item.outputLabel !== "abstain") {
      assertionCases++;
      if (!labelCorrect || !grounded) unsupportedAssertions++;
    }
  }
  if (seen.size !== groundTruth.size) throw deny();
  return {
    contract: "novapharm.intelligence.nova-research-evaluation.v1",
    status: "research_metrics_unverified",
    productionCertified: false,
    independentGroundTruthVerified: false,
    sourceRightsVerified: false,
    sampleSize: cases.length,
    matrix,
    metrics: {
      groundedDecisionAccuracy: proportion(correct, cases.length),
      sufficientEvidenceCorrectRate: proportion(supportedCorrect, supportedCases),
      insufficientEvidenceAbstentionRate: proportion(correctAbstentions, insufficientCases),
      unsupportedAssertionRate: proportion(unsupportedAssertions, assertionCases),
      citationPrecision: proportion(citationTruePositives, citationPredicted),
      citationRecallWhenAsserting: proportion(citationTruePositives, citationExpected),
      meanSquaredReportedConfidenceError: confidenceErrorSum / cases.length
    },
    denominators: {
      sufficientEvidenceCases: supportedCases,
      insufficientEvidenceCases: insufficientCases,
      assertionCases, citedSourceReferences: citationPredicted,
      goldReferencesForAssertions: citationExpected
    },
    limitations: [
      "Results are conditional on caller-supplied reference judgments; annotations and licences are not independently verified.",
      "A fixture or internal sample does not establish scientific performance, population validity or medicine-access impact.",
      "Reported-confidence squared error is a diagnostic, not a formal calibration guarantee.",
      "No customer-facing claim or model launch can be inferred from these scores."
    ]
  };
}
