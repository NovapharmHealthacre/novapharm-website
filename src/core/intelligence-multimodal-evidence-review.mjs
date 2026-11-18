/**
 * NovaPharm Intelligence — research-only multimodal evidence conflict gate.
 * Inspired by Goh et al. (2021), https://openai.com/index/multimodal-neurons/
 *
 * This module DOES NOT perform OCR, CLIP inference, identity resolution, source
 * admission, clinical analysis or regulatory verification. Works identically in
 * browser JavaScript, React Native and Node without external network calls.
 *
 * Inputs are local, explicitly supplied, NON-SENSITIVE CANDIDATE STRINGS only.
 * Client-provided approval booleans can never grant protected source authority.
 */
export const MULTIMODAL_CONTRACT = "novapharm.intelligence.multimodal-review.v1";

const MAX_FIELD_LENGTH = 240;
const FIELDS = ["sourceReference", "country", "visionMedicineName", "imageTextMedicineName", "referenceProductCode", "observedProductCode"];

function clean(value) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_FIELD_LENGTH);
}

function comparable(value) {
  // An exact comparison is deliberately conservative: similarity is not identity.
  // Keep alphanumeric product codes as strings, preserving leading zeroes.
  return clean(value).normalize("NFKC").toLocaleLowerCase("en").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

/**
 * Returns an always non-decision-ready, non-publishable local review candidate.
 * No input content is persisted, logged, returned, uploaded or model-inferred.
 * A trusted backend must separately verify source rights, tenant and purpose.
 */
export function assessMultimodalEvidence(input) {
  const candidate = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const values = Object.fromEntries(FIELDS.map((key) => [key, clean(candidate[key])]));
  const signals = [];
  const needsPurpose = candidate.userInitiated !== true ||
    candidate.nonSensitiveMaterialConfirmed !== true ||
    !["catalogue-research", "non-clinical-quality-review"].includes(candidate.purpose);

  if (needsPurpose) signals.push("purpose_or_consent_missing");
  if (!values.sourceReference || !values.country) signals.push("provenance_missing");
  if (!values.visionMedicineName && !values.imageTextMedicineName && !values.observedProductCode)
    signals.push("candidate_evidence_missing");

  if (values.visionMedicineName && values.imageTextMedicineName &&
      comparable(values.visionMedicineName) !== comparable(values.imageTextMedicineName))
    signals.push("vision_text_name_conflict");

  if (values.referenceProductCode && values.observedProductCode &&
      comparable(values.referenceProductCode) !== comparable(values.observedProductCode))
    signals.push("product_code_conflict");

  // Even if an apparent agreement exists, this is not a calibrated confidence,
  // match, regulatory decision, pharmacovigilance conclusion or rights approval.
  const status = needsPurpose ? "blocked" :
    signals.some((s) => s.endsWith("_conflict")) ? "conflicting_candidates" :
    signals.includes("provenance_missing") || signals.includes("candidate_evidence_missing")
      ? "insufficient_evidence" : "human_review_required";

  return Object.freeze({
    contract: MULTIMODAL_CONTRACT,
    status,
    signals: Object.freeze(signals),
    reviewRequired: true,
    productionAccepted: false,
    identityVerified: false,
    confidenceCalibrated: false,
    sourceRightsVerified: false,
    tenantAuthorised: false,
    canPublish: false,
    decisionReady: false,
    clinicalUseAllowed: false,
    // No strings from the input are echoed in the result.
    next: "Verify the original image, authoritative medicine identifiers, jurisdiction, source rights and provenance in an authorised backend with human review."
  });
}
