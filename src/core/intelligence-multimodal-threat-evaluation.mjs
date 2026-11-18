/**
 * Offline synthetic negative-control runner; NO neural network, image processing,
 * imaging attack generation, scoring calibration or live patient/pharma data.
 * Tests the existing fail-closed string review against 2021 multimodal and
 * classical adversarial research themes. Never interprets a pass as model safety.
 */
import { assessMultimodalEvidence } from "./intelligence-multimodal-evidence-review.mjs";
import {
  multimodalResearchReferences,
  multimodalEvaluationDimensions,
  multimodalModelReleaseBlockers
} from "./intelligence-multimodal-research-basis.mjs";

const baseline = Object.freeze({
  userInitiated: true,
  nonSensitiveMaterialConfirmed: true,
  purpose: "catalogue-research",
  sourceReference: "synthetic_fixture_only",
  country: "GB",
  visionMedicineName: "Example Alpha",
  imageTextMedicineName: "Example Alpha",
  referenceProductCode: "000123",
  observedProductCode: "000123",
  referenceStrength: "10 mg", observedStrength: "10 mg",
  referenceDoseForm: "tablet", observedDoseForm: "tablet",
  referenceManufacturer: "Example Lab", observedManufacturer: "Example Lab"
});

export const multimodalSyntheticProbes = Object.freeze([
  Object.freeze({ id:"text_overlay_conflict", theme:"multimodal", paperNumbers:[13,21],
    overrides:{imageTextMedicineName:"Example Beta"}, expectedStatus:"conflicting_candidates", signal:"vision_text_name_conflict" }),
  Object.freeze({ id:"lookalike_code", theme:"adversarial", paperNumbers:[4,6,21],
    overrides:{observedProductCode:"123"}, expectedStatus:"conflicting_candidates", signal:"product_code_conflict" }),
  Object.freeze({ id:"packaging_strong_dose", theme:"invariance", paperNumbers:[1,17,18],
    overrides:{observedStrength:"20 mg"}, expectedStatus:"conflicting_candidates", signal:"strength_conflict" }),
  Object.freeze({ id:"formulation_mismatch", theme:"invariance", paperNumbers:[1,18],
    overrides:{observedDoseForm:"capsule"}, expectedStatus:"conflicting_candidates", signal:"dose_form_conflict" }),
  Object.freeze({ id:"supplier_attribution_mismatch", theme:"governance", paperNumbers:[15,16],
    overrides:{observedManufacturer:"Different Manufacturer"}, expectedStatus:"conflicting_candidates", signal:"manufacturer_conflict" }),
  Object.freeze({ id:"bidi_spoof", theme:"adversarial", paperNumbers:[4,21],
    overrides:{imageTextMedicineName:"Example\u202e Alpha"}, expectedStatus:"blocked", signal:"invalid_or_oversized_input" }),
  Object.freeze({ id:"unbounded_input", theme:"adversarial", paperNumbers:[6,21],
    overrides:{imageTextMedicineName:"X".repeat(241)}, expectedStatus:"blocked", signal:"invalid_or_oversized_input" }),
  Object.freeze({ id:"provenance_missing", theme:"governance", paperNumbers:[15,16],
    overrides:{sourceReference:""}, expectedStatus:"insufficient_evidence", signal:"provenance_missing" }),
  Object.freeze({ id:"purpose_not_approved", theme:"governance", paperNumbers:[15,16],
    overrides:{purpose:"diagnosis"}, expectedStatus:"blocked", signal:"purpose_or_consent_missing" }),
  Object.freeze({ id:"multilingual_alias_conflict", theme:"terminology", paperNumbers:[14,20],
    overrides:{visionMedicineName:"薬剤甲",imageTextMedicineName:"薬剤乙"}, expectedStatus:"conflicting_candidates", signal:"vision_text_name_conflict" }),
  Object.freeze({ id:"all_strings_appear_equal", theme:"architecture", paperNumbers:[2],
    overrides:{}, expectedStatus:"human_review_required", signal:null }),
  Object.freeze({ id:"no_candidates", theme:"interpretability", paperNumbers:[3,5,7,8,9,10,11,12,19],
    overrides:{visionMedicineName:"",imageTextMedicineName:"",observedProductCode:""}, expectedStatus:"insufficient_evidence", signal:"candidate_evidence_missing" })
].map((probe) => Object.freeze({
  ...probe,
  paperNumbers: Object.freeze(probe.paperNumbers),
  overrides: Object.freeze(probe.overrides)
})));

/**
 * Safe offline regression signals only: all probes use fake names and return
 * metadata; there is no model-quality evaluation, quantitative attack success
 * rate, image representation or calibration evidence here.
 */
export function runMultimodalSyntheticThreatAudit() {
  const coveredPaperNumbers = new Set(multimodalSyntheticProbes.flatMap(p=>p.paperNumbers));
  const failures = [];
  for (const probe of multimodalSyntheticProbes) {
    const result = assessMultimodalEvidence({ ...baseline, ...probe.overrides });
    if (result.status !== probe.expectedStatus ||
      (probe.signal && !result.signals.includes(probe.signal)) ||
      result.canPublish !== false || result.productionAccepted !== false ||
      result.identityVerified !== false || result.decisionReady !== false ||
      result.tenantAuthorised !== false || result.sourceRightsVerified !== false) {
      failures.push(probe.id);
    }
  }
  return Object.freeze({
    contract: "novapharm.intelligence.synthetic-threat-contract.v1",
    syntheticOnly: true,
    neuralNetworkTested: false,
    imageAttacksExecuted: false,
    realPatientOrProductRecordsUsed: false,
    modelRobustnessVerified: false,
    productionAccepted: false,
    canPublish: false,
    cases: multimodalSyntheticProbes.length,
    failures: Object.freeze(failures),
    coveredReferenceCount: [...coveredPaperNumbers].filter(id =>
      multimodalResearchReferences.some(ref=>ref.number===id)).length,
    researchDimensions: Object.freeze(Object.keys(multimodalEvaluationDimensions)),
    remainingProductionBlockers: multimodalModelReleaseBlockers
  });
}
