import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import { canonicalMicroscopeReceiptBytes, verifySignedMicroscopeEvidence as verify } from "../src/core/ai/model-microscope-signed-evidence.mjs";
import { inspectGovernedModelFeature as inspect } from "../src/core/ai/model-microscope.mjs";

const now=Date.parse("2026-11-18T08:00:00.000Z");
const keyPair=generateKeyPairSync("ed25519");
const otherKeyPair=generateKeyPairSync("ed25519");
const keys={ "review-key-v1":keyPair.publicKey };
const expected={
  tenantId:"tenant-a",actorId:"researcher-a",modelId:"inspectable-model",
  modelVersion:"2026.11",layerId:"layer-4",featureId:"channel-8",
  datasetRef:"authorized-synthetic",evaluationRef:"evaluation-5",rightsGrantId:"rights-77",
  authorizationGrantId:"auth-82",
  provenanceSha256:"a".repeat(64),visualizationSha256:"b".repeat(64),
  modelArtifactSha256:"c".repeat(64)
};
const payload={
  schemaVersion:"novapharm.model-microscope.signed-evidence.v1",
  keyId:"review-key-v1",issuerId:"review-authority",reviewerId:"reviewer-b",rightsApproverId:"rights-c",
  ...expected,reviewState:"independently_verified",
  modelRightsApproved:true,datasetRightsApproved:true,patientDataExcluded:true,
  separationOfDutiesVerified:true,
  issuedAt:"2026-11-18T07:59:00.000Z",expiresAt:"2026-11-18T08:03:00.000Z"
};
const envelope=(p=payload,privateKey=keyPair.privateKey)=>({
  payload:p, signature:sign(null,canonicalMicroscopeReceiptBytes(p),privateKey).toString("base64url")
});
const run=(env=envelope(), options={})=>verify({envelope:env,expected,trustedPublicKeys:keys,now,...options});
test("Ed25519 proof validates exact bound model, visualization, provenance and rights",()=>{
  const result=run();
  assert.equal(result.tenantId,expected.tenantId);
  assert.equal(result.modelArtifactSha256,expected.modelArtifactSha256);
  assert.equal(result.visualizationSha256,expected.visualizationSha256);
  assert.equal(result.separationOfDutiesVerified,true);
  assert.equal(Object.hasOwn(result,"reviewerId"),false);
  assert.equal(Object.hasOwn(result,"signature"),false);
});
test("signature is rejected on tampering, unknown key, mismatched scope or wrong signing key",()=>{
  assert.throws(()=>run({...envelope(),payload:{...payload,featureId:"channel-9"}}),/denied/);
  assert.throws(()=>run(envelope({...payload,keyId:"untrusted-key"})),/denied/);
  assert.throws(()=>run(envelope(payload,otherKeyPair.privateKey)),/denied/);
  assert.throws(()=>run(envelope(),{expected:{...expected,tenantId:"tenant-b"}}),/denied/);
  assert.throws(()=>run(envelope(),{expected:{...expected,visualizationSha256:"d".repeat(64)}}),/denied/);
  assert.throws(()=>run(envelope(),{trustedPublicKeys:{}}),/denied/);
  assert.throws(()=>run(envelope(),{trustedPublicKeys:{"review-key-v1":keyPair.privateKey}}),/denied/);
  assert.throws(()=>run(envelope(),{trustedPublicKeys:{"review-key-v1":keyPair.privateKey.export({format:"pem",type:"pkcs8"})}}),/denied/);
  const publicPem=keyPair.publicKey.export({format:"pem",type:"spki"});
  assert.equal(run(envelope(),{trustedPublicKeys:{"review-key-v1":publicPem}}).reviewState,"independently_verified");
});
test("signed receipts cannot approve themselves or replay after expiry",()=>{
  for(const override of [
    {reviewerId:"rights-c"},{reviewerId:"researcher-a"},
    {modelRightsApproved:false},{patientDataExcluded:false},
    {issuedAt:"2026-11-18T08:02:00.000Z"},
    {expiresAt:"2026-11-18T10:00:00.000Z"},
    {provenanceSha256:"f".repeat(64)},
    {unexpected:"injected"}]) {
    const p={...payload,...override};
    assert.throws(()=>run(envelope(p)),/denied/);
  }
  assert.throws(()=>run(envelope(),{now:Date.parse("2026-11-18T08:05:00.000Z")}),/denied/);
  assert.throws(()=>run({...envelope(),signature:"not-valid"}),/denied/);
});
test("independent signed verifier integrates with read-only inspection contract without disclosing receipt",async()=>{
  const artifact={
    ...Object.fromEntries(["tenantId","actorId","modelId","modelVersion","layerId","featureId"].map(k=>[k,expected[k]])),
    privacyClass:"approved_non_patient",rightsReview:"approved",provenanceVerified:true,
    inspectionState:"human_reviewed_candidate",patientContentPresent:false,
    modelReleaseApproval:"research_only",explanationState:"hypothesis_only",
    architecture:"Locally owned test vision network",featureHypothesis:"Hypothesis only, not clinical evidence",
    datasetRef:expected.datasetRef,evaluationRef:expected.evaluationRef,rightsGrantId:expected.rightsGrantId,
    provenanceSha256:expected.provenanceSha256,visualizationSha256:expected.visualizationSha256,
    modelArtifactSha256:expected.modelArtifactSha256
  };
  const value=await inspect({
    request:{ ...Object.fromEntries(["tenantId","actorId","modelId","modelVersion","layerId","featureId"].map(k=>[k,expected[k]])),purpose:"research_model_inspection" },
    authorizeRead:async()=>({ ...Object.fromEntries(["tenantId","actorId","modelId","modelVersion","layerId","featureId"].map(k=>[k,expected[k]])),allowed:true,purpose:"research_model_inspection",channel:"protected_backend",grantId:expected.authorizationGrantId,expiresAt:"2026-11-18T08:02:00.000Z" }),
    loadRecord:async()=>artifact,
    verifyEvidence:async(input)=>verify({envelope:envelope(),expected:input,trustedPublicKeys:keys,now}),
    now
  });
  assert.equal(value.canPublish,false);
  assert.equal(value.modelArtifactSha256,expected.modelArtifactSha256);
  assert.ok(!JSON.stringify(value).includes("review-key-v1"));
  assert.ok(!JSON.stringify(value).includes("researcher-a"));
  assert.equal(Object.hasOwn(value,"signature"),false);
});
