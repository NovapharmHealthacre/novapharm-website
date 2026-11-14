/**
 * Standalone private Ed25519 source-rights verification boundary for G2.
 * It verifies an independently signed scoped grant and fresh revocation
 * registry before returning an Atlas-reader-compatible rights proof.
 *
 * No licence is issued, no keypair is created, no source rows are read, and
 * no network, database, secret or customer entitlement is accessed here.
 * The caller MUST inject independently controlled trusted public keys,
 * attestation reads and revocation reads from a private server.
 */
import { createPublicKey, verify as verifyEd25519 } from "node:crypto";

const CONTRACT = "novapharm.private-independent-source-rights.v1";
const WORKSPACE = "novapharm-internal-staging";
const PURPOSE = "private_observed_prescribing_ingestion";
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u;
const SHA = /^[0-9a-f]{64}$/u;
const TIME = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/u;
const CLAIM_FIELDS = Object.freeze([
  "contract", "workspaceId", "sourceId", "sourceVersion",
  "rightsRevision", "purpose", "grantDigestSha256",
  "verifierId", "approverId", "keyId", "signedAt",
  "validFrom", "validUntil"
]);
const safeId = x => typeof x === "string" && ID.test(x);
const validTime = x => typeof x === "string" && TIME.test(x) &&
  Number.isFinite(Date.parse(x));
const clockTime = clock => {
  try {
    const ms=clock();
    return Number.isSafeInteger(ms) && ms >= 0 ? ms : null;
  } catch {
    return null;
  }
};
const fail = () => null;
function scopeValid(r) {
  return r && typeof r==="object" && !Array.isArray(r) &&
    r.workspaceId===WORKSPACE && r.purpose===PURPOSE &&
    [r.sourceId,r.sourceVersion,r.rightsRevision].every(safeId) &&
    typeof r.grantDigestSha256==="string" &&
    SHA.test(r.grantDigestSha256);
}
function claimValid(c,scope) {
  return c && typeof c==="object" && !Array.isArray(c) &&
    Object.keys(c).length===CLAIM_FIELDS.length &&
    CLAIM_FIELDS.every(k=>Object.prototype.hasOwnProperty.call(c,k)) &&
    c.contract===CONTRACT && c.workspaceId===scope.workspaceId &&
    c.sourceId===scope.sourceId &&
    c.sourceVersion===scope.sourceVersion &&
    c.rightsRevision===scope.rightsRevision &&
    c.purpose===scope.purpose &&
    c.grantDigestSha256===scope.grantDigestSha256 &&
    [c.verifierId,c.approverId,c.keyId].every(safeId) &&
    c.verifierId!==c.approverId &&
    [c.signedAt,c.validFrom,c.validUntil].every(validTime);
}

/** Canonical bytes signed by the independent Ed25519 authority. */
export function canonicalIndependentRightsClaim(claim) {
  if (!claim || typeof claim!=="object" || Array.isArray(claim) ||
      Object.keys(claim).length!==CLAIM_FIELDS.length ||
      CLAIM_FIELDS.some(k=>!Object.prototype.hasOwnProperty.call(claim,k)))
    throw new Error("Invalid canonical rights claim.");
  return Buffer.from(CONTRACT+"\u0000"+
    JSON.stringify(CLAIM_FIELDS.map(k=>[k,claim[k]])), "utf8");
}

export function createIndependentPrivateRightsVerifier({
  trustedPublicKeys, loadSignedAttestation, readCurrentRevocation,
  clock = Date.now
} = {}) {
  if (!trustedPublicKeys || typeof trustedPublicKeys!=="object" ||
      Array.isArray(trustedPublicKeys) ||
      Object.keys(trustedPublicKeys).length<1 ||
      Object.keys(trustedPublicKeys).length>16 ||
      typeof loadSignedAttestation!=="function" ||
      typeof readCurrentRevocation!=="function" ||
      typeof clock!=="function")
    throw new Error("Private independent rights authority is not configured.");
  const keyring=new Map();
  for(const [id,pem] of Object.entries(trustedPublicKeys)){
    if (!safeId(id) || typeof pem!=="string" ||
        !pem.startsWith("-----BEGIN PUBLIC KEY-----"))
      throw new Error("Trusted public Ed25519 key required.");
    let key;
    try { key=createPublicKey(pem); }
    catch { throw new Error("Invalid trusted public key."); }
    if (key.type!=="public" || key.asymmetricKeyType!=="ed25519")
      throw new Error("Only independent Ed25519 public keys are permitted.");
    keyring.set(id,key);
  }

  return async function verifySignedGrant(scope) {
    if (!scopeValid(scope)) return fail();
    const start=clockTime(clock);
    if (start===null) return fail();
    let att;
    try { att=await loadSignedAttestation(Object.freeze({...scope})); }
    catch { return fail(); }
    const claim=att?.claim;
    if (!claimValid(claim,scope)) return fail();
    const key=keyring.get(claim.keyId);
    if (!key || typeof att?.signatureBase64!=="string" ||
        !/^[A-Za-z0-9+/]{86}==$/u.test(att.signatureBase64)) return fail();
    const sig=Buffer.from(att.signatureBase64,"base64");
    if (sig.length!==64 || sig.toString("base64")!==att.signatureBase64)
      return fail();
    let cryptographicallyValid=false;
    try {
      cryptographicallyValid=verifyEd25519(
        null,canonicalIndependentRightsClaim(claim),key,sig
      );
    } catch { return fail(); }
    if (!cryptographicallyValid) return fail();

    // The revocation registry MUST be independent of the source-rights row and
    // caller-owned request. An old signature is never sufficient by itself.
    let revocation;
    try {
      revocation=await readCurrentRevocation(Object.freeze({
        workspaceId:WORKSPACE,sourceId:claim.sourceId,
        sourceVersion:claim.sourceVersion,
        rightsRevision:claim.rightsRevision,
        grantDigestSha256:claim.grantDigestSha256,
        keyId:claim.keyId
      }));
    } catch { return fail(); }
    const end=clockTime(clock);
    if (end===null || end<start || end-start>60_000 ||
        !validTime(claim.signedAt) ||
        Date.parse(claim.signedAt)>end ||
        Date.parse(claim.validFrom)>end ||
        Date.parse(claim.validUntil)<=end ||
        !revocation || revocation.revoked!==false ||
        revocation.rightsRevision!==claim.rightsRevision ||
        !validTime(revocation.checkedAt) ||
        Date.parse(revocation.checkedAt)>end ||
        end-Date.parse(revocation.checkedAt)>60_000)
      return fail();
    return Object.freeze({
      verifiedSignature:true,revoked:false,
      grantDigestSha256:claim.grantDigestSha256,
      verifierId:claim.verifierId,
      checkedAt:new Date(end).toISOString()
    });
  };
}

export const independentPrivateRightsVerifierStatus=Object.freeze({
  productionConfigured:false,customerRightsGranted:false,
  licenceGranted:false,requiresIndependentKeys:true,
  requiresIndependentRevocationAuthority:true,
  allowedAlgorithm:"Ed25519",maxRevocationAgeMs:60_000
});
