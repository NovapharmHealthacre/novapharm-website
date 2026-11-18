/**
 * Nova Model Microscope - a source-only, fail-closed interpretability
 * observation reader. Inspired by OpenAI Microscope; not an OpenAI API.
 * No weights, activation tensors, training data or model inference leave here.
 * The trusted backend, not a web/mobile client, must supply independent
 * authorization, artifact-load and independent-evidence callbacks.
 */
export const MODEL_MICROSCOPE_CONTRACT = "novapharm.intelligence.model-microscope.v1";
export const MODEL_MICROSCOPE_PURPOSE = "research_model_inspection";

const idPattern = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/u;
const shaPattern = /^[a-f0-9]{64}$/u;
const keys = ["tenantId", "actorId", "modelId", "modelVersion", "layerId", "featureId"];

class InspectionDenial extends Error {}
function fail(message) { throw new InspectionDenial("Model inspection denied: " + message); }
async function callTrusted(adapter, input, rejection) {
  try { return await adapter(input); }
  catch { fail(rejection); }
}
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
 * independently authenticated tenant/model/feature authorizer and evidence
 * verifier. They must not trust assertions carried inside artifact records.
 * No client-provided approval fields are examined.
 */
async function inspectGovernedModelFeatureInternal({ request, authorizeRead, loadRecord, verifyEvidence, now = Date.now }) {
  requireRequest(request);
  // Pin the authorized scope before invoking asynchronous adapters. The caller
  // cannot mutate request identity halfway through a protected read.
  const scopedRequest = Object.freeze({ ...Object.fromEntries(keys.map(key => [key, request[key]])), purpose: MODEL_MICROSCOPE_PURPOSE });
  let previousClock = null;
  const readClock = () => {
    let tick;
    try { tick = typeof now === "function" ? now() : now; }
    catch { fail("invalid clock"); }
    if (!Number.isSafeInteger(tick) || tick < 0 || (previousClock !== null && tick < previousClock)) fail("invalid clock");
    previousClock = tick;
    return tick;
  };
  if (typeof authorizeRead !== "function" || typeof loadRecord !== "function" || typeof verifyEvidence !== "function") {
    fail("trusted backend adapters missing");
  }
  // Permission MUST precede even the metadata lookup; client metadata is untrusted.
  const grant = await callTrusted(authorizeRead, scopedRequest, "trusted authorizer unavailable");
  // Capture every grant field ONCE before validating the return value.
  // A mutable authorizer object must never change its scope, identity or
  // expiry between validation, storage and independent evidence review.
  const approvedGrant = Object.freeze({
    ...Object.fromEntries(keys.map(key => [key, grant?.[key]])),
    allowed: grant?.allowed,
    purpose: grant?.purpose,
    channel: grant?.channel,
    grantId: grant?.grantId,
    expiresAt: grant?.expiresAt
  });
  // Only sample grant validity after the asynchronous authorization returns.
  // A permit that timed out during the authorizer must never reach storage.
  const requestTime = readClock();
  if (!grant || approvedGrant.allowed !== true || !sameScope(approvedGrant, scopedRequest) ||
      approvedGrant.purpose !== MODEL_MICROSCOPE_PURPOSE || approvedGrant.channel !== "protected_backend" ||
      !strictText(approvedGrant.grantId, 128) || typeof approvedGrant.expiresAt !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(approvedGrant.expiresAt) ||
      !Number.isFinite(Date.parse(approvedGrant.expiresAt)) || new Date(Date.parse(approvedGrant.expiresAt)).toISOString() !== approvedGrant.expiresAt ||
      Date.parse(approvedGrant.expiresAt) <= requestTime ||
      Date.parse(approvedGrant.expiresAt) - requestTime > 5 * 60 * 1000) {
    fail("missing, mismatched or expired authorisation");
  }

  const record = await callTrusted(loadRecord, Object.freeze({ ...Object.fromEntries(keys.map(k => [k, scopedRequest[k]])) }), "protected artifact unavailable");
  if (Date.parse(approvedGrant.expiresAt) <= readClock()) fail("authorisation expired while loading artifact");
  if (!record || !sameScope(record, scopedRequest) ||
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
      !validId(record.rightsGrantId) ||
      !shaPattern.test(record.provenanceSha256) ||
      !shaPattern.test(record.visualizationSha256) ||
      !shaPattern.test(record.modelArtifactSha256) ||
      !strictText(record.evaluationRef, 128)) {
    fail("unreviewed, unproven or incompatible artifact");
  }
  // Freeze the reviewed record fields before the independently awaited verifier.
  // A loader must not be able to swap an already checked hypothesis, rights
  // reference, or artifact digest during the asynchronous verification step.
  const approvedRecord = Object.freeze({
    architecture: record.architecture,
    featureHypothesis: record.featureHypothesis,
    datasetRef: record.datasetRef,
    evaluationRef: record.evaluationRef,
    rightsGrantId: record.rightsGrantId,
    provenanceSha256: record.provenanceSha256,
    visualizationSha256: record.visualizationSha256,
    modelArtifactSha256: record.modelArtifactSha256
  });
  // A second, independent verifier confirms the immutable digest, model and
  // source rights, QA and reviewer separation. Neither client-supplied grants
  // nor a record's own approval flags can promote an artifact to verified.
  const verification = await callTrusted(verifyEvidence, Object.freeze({
    ...Object.fromEntries(keys.map(k => [k, scopedRequest[k]])),
    datasetRef: approvedRecord.datasetRef,
    evaluationRef: approvedRecord.evaluationRef,
    rightsGrantId: approvedRecord.rightsGrantId,
    provenanceSha256: approvedRecord.provenanceSha256,
    visualizationSha256: approvedRecord.visualizationSha256,
    modelArtifactSha256: approvedRecord.modelArtifactSha256,
    authorizationGrantId: approvedGrant.grantId
  }), "independent verifier unavailable");
  if (Date.parse(approvedGrant.expiresAt) <= readClock()) fail("authorisation expired during independent verification");
  if (!verification || !sameScope(verification, scopedRequest) ||
      verification.provenanceSha256 !== approvedRecord.provenanceSha256 ||
      verification.visualizationSha256 !== approvedRecord.visualizationSha256 ||
      verification.modelArtifactSha256 !== approvedRecord.modelArtifactSha256 ||
      verification.datasetRef !== approvedRecord.datasetRef ||
      verification.evaluationRef !== approvedRecord.evaluationRef ||
      verification.rightsGrantId !== approvedRecord.rightsGrantId ||
      verification.authorizationGrantId !== approvedGrant.grantId ||
      verification.reviewState !== "independently_verified" ||
      verification.modelRightsApproved !== true ||
      verification.datasetRightsApproved !== true ||
      verification.patientDataExcluded !== true ||
      verification.separationOfDutiesVerified !== true) {
    fail("independent artifact verification missing or mismatched");
  }

  // Explicit allow-list projection: never return raw record, input images,
  // prompts, embeddings, tensors, neuron activations, credentials or datasets.
  return Object.freeze({
    contract: MODEL_MICROSCOPE_CONTRACT,
    state: "research_candidate_only",
    modelId: scopedRequest.modelId,
    modelVersion: scopedRequest.modelVersion,
    layerId: scopedRequest.layerId,
    featureId: scopedRequest.featureId,
    architecture: approvedRecord.architecture,
    featureHypothesis: approvedRecord.featureHypothesis,
    datasetRef: approvedRecord.datasetRef,
    evaluationRef: approvedRecord.evaluationRef,
    provenanceSha256: approvedRecord.provenanceSha256,
    visualizationSha256: approvedRecord.visualizationSha256,
    modelArtifactSha256: approvedRecord.modelArtifactSha256,
    explanationState: "hypothesis_only",
    authorisationChannel: "protected_backend",
    canPublish: false,
    inferenceEnabled: false,
    clinicalDecisionReady: false,
    regulatoryDecisionReady: false,
    commercialDecisionReady: false
  });
}

/** Never reveal raw errors from malformed externally supplied record objects. */
export async function inspectGovernedModelFeature(input) {
  try { return await inspectGovernedModelFeatureInternal(input); }
  catch (error) {
    if (error instanceof InspectionDenial) throw error;
    fail("invalid protected inspection input");
  }
}
