/**
 * NOVA benchmark double-review gate. This module compares constrained,
 * pseudonymous, independent-review *claims*. It neither attests reviewer
 * independence nor admits observations, model outputs or dataset rights.
 * A trusted human adjudicator and original publisher evidence are still needed.
 *
 * No raw prompts, patient records, free-text annotations or model calls.
 */
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/u;
const SOURCE_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/u;
const SHA = /^[a-f0-9]{64}$/u;
const VERDICTS = Object.freeze(["supported", "contradicted", "insufficient"]);
const error = () => Object.assign(new Error("Invalid NOVA independent-review input."), {
  code: "nova_review_input_rejected", statusCode: 400
});
function exactFields(obj, fields) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj) ||
      Object.keys(obj).some(k => !fields.includes(k)) ||
      fields.some(k => !Object.hasOwn(obj, k))) throw error();
}
function same(left, right) { return JSON.stringify(left) === JSON.stringify(right); }
function sourceIds(ids, verdict) {
  if (!Array.isArray(ids) || ids.length > 20 ||
      ids.some(x => typeof x !== "string" || !SOURCE_ID.test(x)) ||
      new Set(ids).size !== ids.length ||
      (verdict === "insufficient" && ids.length !== 0) ||
      (verdict !== "insufficient" && ids.length === 0)) throw error();
  return [...ids].sort();
}

/**
 * \`reviewerPseudonymSha256\` is generated outside this function by a trusted
 * review platform; its format alone does not prove distinct real reviewers.
 */
export function compareNovaIndependentReviews({ datasetVersion, cases } = {}) {
  if (typeof datasetVersion !== "string" || !ID.test(datasetVersion) ||
      !Array.isArray(cases) || cases.length < 1 || cases.length > 2000) throw error();
  const keys = new Set();
  const decisions = [];
  let totalPairs = 0, matchingVerdicts = 0, matchingVerdictsAndSources = 0;
  for (const item of cases) {
    exactFields(item, ["caseId", "sourceSnapshotFingerprintSha256", "annotations"]);
    if (typeof item.caseId !== "string" || !ID.test(item.caseId) || keys.has(item.caseId) ||
        typeof item.sourceSnapshotFingerprintSha256 !== "string" ||
        !SHA.test(item.sourceSnapshotFingerprintSha256) ||
        !Array.isArray(item.annotations) || item.annotations.length < 1 ||
        item.annotations.length > 5) throw error();
    keys.add(item.caseId);
    const reviewers = new Set();
    const validated = item.annotations.map(a => {
      exactFields(a, ["reviewerPseudonymSha256", "verdict", "sourceIds"]);
      if (typeof a.reviewerPseudonymSha256 !== "string" || !SHA.test(a.reviewerPseudonymSha256) ||
          reviewers.has(a.reviewerPseudonymSha256) || !VERDICTS.includes(a.verdict)) throw error();
      reviewers.add(a.reviewerPseudonymSha256);
      return { verdict: a.verdict, sourceIds: sourceIds(a.sourceIds, a.verdict) };
    });
    const complete = validated.length >= 2;
    for (let i = 0; i < validated.length; i++) {
      for (let j = i + 1; j < validated.length; j++) {
        totalPairs += 1;
        if (validated[i].verdict === validated[j].verdict) {
          matchingVerdicts += 1;
          if (same(validated[i].sourceIds, validated[j].sourceIds)) matchingVerdictsAndSources += 1;
        }
      }
    }
    const unanimous = complete && validated.every(a => a.verdict === validated[0].verdict &&
      same(a.sourceIds, validated[0].sourceIds));
    const status = !complete ? "awaiting_second_reviewer" :
      unanimous ? "provisional_agreement_needs_adjudication" : "conflict_needs_adjudication";
    decisions.push({
      caseId: item.caseId,
      sourceSnapshotFingerprintSha256: item.sourceSnapshotFingerprintSha256,
      reviewCount: validated.length,
      status,
      provisionalVerdict: unanimous ? validated[0].verdict : null,
      // Never turn review agreement into an accepted research benchmark gold label.
      benchmarkGoldAccepted: false,
      evidenceRightsVerified: false,
      reviewerIndependenceVerified: false,
      humanAdjudicationRequired: true
    });
  }
  decisions.sort((a, b) => a.caseId.localeCompare(b.caseId, "en"));
  return {
    contract: "novapharm.intelligence.nova-independent-review.v1",
    status: "research_review_only",
    productionCertified: false,
    datasetVersion, caseCount: decisions.length,
    pairwiseReviewComparisons: totalPairs,
    pairwiseVerdictAgreement: totalPairs ? matchingVerdicts / totalPairs : null,
    pairwiseVerdictAndCitationAgreement: totalPairs ? matchingVerdictsAndSources / totalPairs : null,
    cases: decisions,
    limitations: [
      "Matching pseudonyms do not independently verify human identity or review independence.",
      "Agreement is not evidence accuracy, rights admission, independent gold-label certification or scientific validation.",
      "No review result can activate an AI model or authorise a clinical or commercial decision."
    ]
  };
}
