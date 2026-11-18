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
const FIELDS = ["sourceReference", "country", "visionMedicineName", "imageTextMedicineName", "referenceProductCode", "observedProductCode", "referenceStrength", "observedStrength", "referenceDoseForm", "observedDoseForm", "referenceManufacturer", "observedManufacturer"];
// Control and invisible formatting characters can spoof a visually equal name.
const SUSPICIOUS_FORMATTING = /[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/u;

function clean(value) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_FIELD_LENGTH);
}

function comparable(value) {
  // An exact comparison is deliberately conservative: similarity is not identity.
  // Keep alphanumeric product codes as strings, preserving leading zeroes.
  return clean(value).normalize("NFKC").toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

/**
 * Returns an always non-decision-ready, non-publishable local review candidate.
 * No input content is persisted, logged, returned, uploaded or model-inferred.
 * A trusted backend must separately verify source rights, tenant and purpose.
 */
export function assessMultimodalEvidence(input) {
  // Inspect own data-property descriptors before accessing any input. This
  // prevents getters, inherited flags and extra private/AI approval fields from
  // being mistaken for valid manually supplied evidence.
  const plain = input !== null && typeof input === "object" &&
    !Array.isArray(input) && Object.getPrototypeOf(input) === Object.prototype;
  const allowed = [...FIELDS, "userInitiated", "nonSensitiveMaterialConfirmed", "purpose"];
  const descriptors = plain ? Object.getOwnPropertyDescriptors(input) : {};
  const unsafeShape = !plain || Reflect.ownKeys(descriptors).some((key) =>
    typeof key !== "string" || !allowed.includes(key) ||
    !Object.hasOwn(descriptors[key], "value"));
  const candidate = unsafeShape ? {} : Object.fromEntries(
    allowed.filter((key) => Object.hasOwn(descriptors,key))
      .map((key) => [key, descriptors[key].value])
  );
  const values = Object.fromEntries(FIELDS.map((key) => [key, clean(candidate[key])]));
  const signals = [];
  // Fail closed rather than silently accepting a truncated or spoofed value.
  const invalidInput = unsafeShape || FIELDS.some((key) => candidate[key] !== undefined &&
    (typeof candidate[key] !== "string" || candidate[key].length > MAX_FIELD_LENGTH ||
      SUSPICIOUS_FORMATTING.test(candidate[key])));
  if (invalidInput) signals.push("invalid_or_oversized_input");
  const needsPurpose = candidate.userInitiated !== true ||
    candidate.nonSensitiveMaterialConfirmed !== true ||
    !["catalogue-research", "non-clinical-quality-review"].includes(candidate.purpose);

  if (needsPurpose) signals.push("purpose_or_consent_missing");
  if (!values.sourceReference || !values.country) signals.push("provenance_missing");
  if (!values.visionMedicineName && !values.imageTextMedicineName && !values.observedProductCode)
    signals.push("candidate_evidence_missing");
  // A lone visual name, lone text-in-image name, or product code alone is not a
  // cross-modal comparison. It must never appear as completed human review.
  if (!values.visionMedicineName || !values.imageTextMedicineName)
    signals.push("incomplete_multimodal_name_pair");

  if (values.visionMedicineName && values.imageTextMedicineName &&
      comparable(values.visionMedicineName) !== comparable(values.imageTextMedicineName))
    signals.push("vision_text_name_conflict");

  if (values.referenceProductCode && values.observedProductCode &&
      values.referenceProductCode !== values.observedProductCode)
    signals.push("product_code_conflict");

  // A reference without an observed code/strength/form/manufacturer (or the
  // reverse) is missing evidence, not a non-conflicting identity comparison.
  const incompleteCriticalPair = [
    ["referenceProductCode", "observedProductCode"],
    ["referenceStrength", "observedStrength"],
    ["referenceDoseForm", "observedDoseForm"],
    ["referenceManufacturer", "observedManufacturer"]
  ].some(([left, right]) => Boolean(values[left]) !== Boolean(values[right]));
  if (incompleteCriticalPair) signals.push("incomplete_critical_attribute_pair");

  // Packaging matches are never identity proof. Compare independent attributes
  // conservatively; even equivalent abbreviations require reviewer reconciliation.
  for (const [left, right, signal] of [
    ["referenceStrength", "observedStrength", "strength_conflict"],
    ["referenceDoseForm", "observedDoseForm", "dose_form_conflict"],
    ["referenceManufacturer", "observedManufacturer", "manufacturer_conflict"]
  ]) {
    if (values[left] && values[right] && comparable(values[left]) !== comparable(values[right])) {
      signals.push(signal);
    }
  }

  // Even if an apparent agreement exists, this is not a calibrated confidence,
  // match, regulatory decision, pharmacovigilance conclusion or rights approval.
  const status = needsPurpose || invalidInput ? "blocked" :
    signals.some((s) => s.endsWith("_conflict")) ? "conflicting_candidates" :
    signals.includes("provenance_missing") || signals.includes("candidate_evidence_missing") ||
    signals.includes("incomplete_multimodal_name_pair") ||
    signals.includes("incomplete_critical_attribute_pair")
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
