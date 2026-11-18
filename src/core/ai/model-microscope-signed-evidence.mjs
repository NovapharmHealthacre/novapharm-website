/**
 * Optional verification adapter for independently issued Ed25519 microscope
 * receipts. Trusted keys MUST come from private operator configuration,
 * never from the model record, request body, or client. No signing secrets here.
 */
import { createPublicKey, verify as verifySignature } from "node:crypto";

const SCOPE = Object.freeze(["tenantId","actorId","modelId","modelVersion","layerId","featureId"]);
const BINDINGS = Object.freeze(["datasetRef","evaluationRef","rightsGrantId","authorizationGrantId","provenanceSha256","visualizationSha256","modelArtifactSha256"]);
export const MICROSCOPE_SIGNED_RECEIPT_FIELDS = Object.freeze([
  "schemaVersion","keyId","issuerId","reviewerId","rightsApproverId",
  ...SCOPE,...BINDINGS,
  "reviewState","modelRightsApproved","datasetRightsApproved","patientDataExcluded",
  "separationOfDutiesVerified","issuedAt","expiresAt"
]);
const digest = /^[a-f0-9]{64}$/u;
const identifier = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/u;
const dateUtc = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
function deny() { throw new Error("Model evidence denied."); }
const own = (object, key) => Object.hasOwn(object, key);
function fieldsExact(payload) {
  return payload && typeof payload === "object" && !Array.isArray(payload) &&
    Object.keys(payload).length === MICROSCOPE_SIGNED_RECEIPT_FIELDS.length &&
    MICROSCOPE_SIGNED_RECEIPT_FIELDS.every(key => own(payload,key));
}
function normalizedBytes(payload) {
  if (!fieldsExact(payload)) deny();
  return Buffer.from(JSON.stringify(Object.fromEntries(
    MICROSCOPE_SIGNED_RECEIPT_FIELDS.map(key => [key,payload[key]])
  )), "utf8");
}
/** Deterministic bytes for signing by an independently authorized issuer. */
export function canonicalMicroscopeReceiptBytes(payload) {
  return normalizedBytes(payload);
}
/**
 * Verify a read-only inspection proof against a backend-pinned public key.
 * This *does not* confirm issuer onboarding, model rights or QA by itself;
 * operator must validate each authorized signing identity beforehand.
 */
export function verifySignedMicroscopeEvidence({ envelope, expected, trustedPublicKeys, now = Date.now() }) {
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope) ||
      Object.keys(envelope).length !== 2 || !own(envelope,"payload") ||
      !own(envelope,"signature") || !fieldsExact(envelope.payload) ||
      !expected || typeof expected !== "object" || !trustedPublicKeys ||
      typeof trustedPublicKeys !== "object" || !Number.isFinite(now)) deny();
  const p = envelope.payload;
  if (p.schemaVersion !== "novapharm.model-microscope.signed-evidence.v1" ||
      !["keyId","issuerId","reviewerId","rightsApproverId"].every(k => identifier.test(p[k])) ||
      p.reviewerId === p.rightsApproverId || p.reviewerId === p.actorId ||
      p.rightsApproverId === p.actorId ||
      [...SCOPE,...BINDINGS].some(k => p[k] !== expected[k]) ||
      SCOPE.some(k => !identifier.test(p[k])) ||
      BINDINGS.filter(k=>k.endsWith("Sha256")).some(k => !digest.test(p[k])) ||
      BINDINGS.filter(k=>!k.endsWith("Sha256")).some(k => !identifier.test(p[k])) ||
      p.reviewState !== "independently_verified" ||
      p.modelRightsApproved !== true || p.datasetRightsApproved !== true ||
      p.patientDataExcluded !== true || p.separationOfDutiesVerified !== true ||
      typeof p.issuedAt !== "string" || typeof p.expiresAt !== "string" ||
      !dateUtc.test(p.issuedAt) || !dateUtc.test(p.expiresAt)) deny();
  const issuedAt = Date.parse(p.issuedAt), expiresAt = Date.parse(p.expiresAt);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) ||
      issuedAt > now || expiresAt <= now || expiresAt <= issuedAt ||
      expiresAt - issuedAt > 5 * 60 * 1000) deny();

  const key = trustedPublicKeys instanceof Map
    ? trustedPublicKeys.get(p.keyId)
    : own(trustedPublicKeys,p.keyId) ? trustedPublicKeys[p.keyId] : null;
  if (!key || typeof envelope.signature !== "string" ||
      !/^[A-Za-z0-9_-]{86}$/u.test(envelope.signature)) deny();
  const signature = Buffer.from(envelope.signature,"base64url");
  if (signature.byteLength !== 64 || signature.toString("base64url") !== envelope.signature) deny();
  try {
    const publicKey = createPublicKey(key);
    if (publicKey.asymmetricKeyType !== "ed25519" ||
        !verifySignature(null,normalizedBytes(p),publicKey,signature)) deny();
  } catch { deny(); }
  // Return precisely the fields consumed by the independent verifier.
  // The raw signed receipt and reviewer identities are never sent to clients.
  return Object.freeze({
    ...Object.fromEntries([...SCOPE,...BINDINGS].map(k=>[k,p[k]])),
    reviewState: "independently_verified",
    modelRightsApproved: true,
    datasetRightsApproved: true,
    patientDataExcluded: true,
    separationOfDutiesVerified: true
  });
}
