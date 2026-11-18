/**
 * Nova Model Microscope - a source-only, fail-closed interpretability
 * observation reader. Inspired by OpenAI Microscope; not an OpenAI API.
 * No weights, activation tensors, training data or model inference leave here.
 * The trusted backend, not a web/mobile client, must supply both callbacks.
 */
export const MODEL_MICROSCOPE_CONTRACT = "novapharm.intelligence.model-microscope.v1";
export const MODEL_MICROSCOPE_PURPOSE = "research_model_inspection";

const idPattern = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/u;
const shaPattern = /^[a-f0-9]{64}$/u;
const keys = ["tenantId", "actorId", "modelId", "modelVersion", "layerId", "featureId"];

function fail(message) { throw new Error("Model inspection denied: " + message); }
function validId(value) { return typeof value === "string" && idPattern.test(value); }
function sameScope(value, request) {
  return keys.every((key) => value?.[key] === request[key]);
}
function strictText(value, max = 240) {
  return typeof value === "string" && value.trim().length > 0 &&
    value.length <= max && !/[\u0000-\u001f\u007f]/u.test(value);
}
function requireRequest(request) {
  if (!request || typeof request !== "object" || keys.some((key) => !validId(request[key]))) {
    fail("invalid scoped request");
  }
  if (request.purpose !== MODEL_MICROSCOPE_PURPOSE) fail("invalid purpose");
}
/**
 * Read one approved non-patient feature-inspection record for a verified actor.
 * The authorization callback is required to be the protected server's trusted,
 * independently authenticated tenant/model/feature authorizer.
 * No client-provided approval fields are examined.
 */
export async function inspectGovernedModelFeature({ request, authorizeRead, loadRecord, now = Date.now() }) {
  requireRequest(request);
  if (typeof authorizeRead !== "function" || typeof loadRecord !== "function") {
    fail("trusted backend adapters missing");
  }
  if (!Number.isFinite(now)) fail("invalid clock");

  // Permission MUST precede even the metadata lookup; client metadata is untrusted.
  const grant = await authorizeRead(Object.freeze({ ...Object.fromEntries(keys.map(k => [k, request[k]])), purpose: MODEL_MICROSCOPE_PURPOSE }));
  if (!grant || grant.allowed !== true || !sameScope(grant, request) ||
      grant.purpose !== MODEL_MICROSCOPE_PURPOSE || grant.channel !== "protected_backend" ||
      !strictText(grant.grantId, 128) || typeof grant.expiresAt !== "string" ||
      !Number.isFinite(Date.parse(grant.expiresAt)) || Date.parse(grant.expiresAt) <= now) {
    fail("missing, mismatched or expired authorisation");
  }

  const record = await loadRecord(Object.freeze({ ...Object.fromEntries(keys.map(k => [k, request[k]])) }));
  if (!record || !sameScope(record, request) ||
      record.privacyClass !== "approved_non_patient" ||
      record.rightsReview !== "approved" ||
      record.provenanceVerified !== true ||
      record.inspectionState !== "human_reviewed_candidate" ||
      record.patientContentPresent !== false ||
      record.modelReleaseApproval !== "research_only" ||
      record.explanationState !== "hypothesis_only" ||
      !strictText(record.architecture, 96) ||
      !strictText(record.featureHypothesis, 480) ||
      !validId(record.datasetRef) ||
      !shaPattern.test(record.provenanceSha256) ||
      !shaPattern.test(record.visualizationSha256) ||
      !strictText(record.evaluationRef, 128)) {
    fail("unreviewed, unproven or incompatible artifact");
  }
  // Explicit allow-list projection: never return raw record, input images,
  // prompts, embeddings, tensors, neuron activations, credentials or datasets.
  return Object.freeze({
    contract: MODEL_MICROSCOPE_CONTRACT,
    state: "research_candidate_only",
    modelId: request.modelId,
    modelVersion: request.modelVersion,
    layerId: request.layerId,
    featureId: request.featureId,
    architecture: record.architecture,
    featureHypothesis: record.featureHypothesis,
    datasetRef: record.datasetRef,
    evaluationRef: record.evaluationRef,
    provenanceSha256: record.provenanceSha256,
    visualizationSha256: record.visualizationSha256,
    explanationState: "hypothesis_only",
    authorisationChannel: "protected_backend",
    canPublish: false,
    inferenceEnabled: false,
    clinicalDecisionReady: false,
    regulatoryDecisionReady: false,
    commercialDecisionReady: false
  });
}
