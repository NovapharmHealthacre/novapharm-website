import assert from "node:assert/strict";
import test from "node:test";
import { proposeMedicineDecisionTransition as propose } from "../src/core/intelligence-medicine-decision-review.mjs";

const sha = "a".repeat(64);
const medicineId = "medicine-0123456789abcdef0123456789abcdef";
const now = "2026-11-11T06:00:00.000Z";
const base = () => ({
  caseRecord: {
    caseId: "case-0123456789abcdef0123456789abcdef", tenantId: "tenant-001",
    medicineId, status: "draft", version: 1, proposerId: "person-proposer-001",
    reviewerId: null, approverId: null, evidenceSnapshotSha256: sha,
    rightsRevision: "rights-v1",
  },
  request: { action: "submit", expectedVersion: 1, reasonCode: "evidence_review" },
  actor: { verifiedServerSide: true, mfaVerified: true, tenantId: "tenant-001",
    subjectId: "person-proposer-001", role: "analyst", authorityRevision: "actor-v1" },
  manifest: {
    verifiedServerSide: true, tenantId: "tenant-001", medicineId,
    snapshotSha256: sha, rightsRevision: "rights-v1",
    acceptedForDecisionReview: true, sourceRightsApproved: true,
    sampleData: false, customerSubmitted: false, modelGenerated: false,
    rightsCheckedAt: now, sources: [{
      sourceId: "nhsbsa.epd", sourceVersion: "2026-09",
      provenanceSha256: "b".repeat(64), rightsRevision: "rights-v1",
      allowedForDecisionReview: true, status: "active", evidenceType: "observed_fact"
    }]
  },
  release: { verifiedServerSide: true, privateDecisionReviewApproved: true },
  loadCurrentAuthority: async ({ caseId, tenantId, expectedVersion, actorAuthorityRevision, rightsRevision }) => ({
    verified: true, caseId, tenantId, currentVersion: expectedVersion,
    actorAuthorityRevision, currentRightsRevision: rightsRevision
  }),
  now,
});
test("one accepted source can propose submission, but never commits or executes", async () => {
  const input=base();
  const v=await propose(input);
  assert.equal(v.eligible,true);
  assert.equal(v.code,"proposal_only_not_committed");
  assert.equal(v.proposal.previousStatus,"draft");
  assert.equal(v.proposal.proposedStatus,"under_review");
  assert.equal(v.proposal.proposedVersion,2);
  assert.equal(v.proposal.requiresAtomicCompareAndSwap,true);
  assert.equal(v.proposal.requiresFreshRightsCheckAtCommit,true);
  assert.equal(v.proposal.requiresDurableAuditCommit,true);
  assert.equal(v.proposal.isAuthoritativeCaseRecord,false);
  assert.equal(v.durableStateChanged,false);
  assert.equal(v.externalActionAllowed,false);
  assert.equal(v.customerAccessGranted,false);
  assert.equal(Object.isFrozen(v.proposal),true);
});
test("independent reviewer and approver can propose changes, no self-approval", async () => {
  const reviewed=base();
  reviewed.caseRecord.status="under_review";
  reviewed.request.action="review";
  reviewed.actor.subjectId="person-reviewer-001";
  reviewed.actor.role="independent_reviewer";
  assert.equal((await propose(reviewed)).proposal.proposedStatus,"approval_pending");
  reviewed.caseRecord.reviewerId="person-reviewer-001";
  reviewed.caseRecord.status="approval_pending";
  reviewed.request.action="approve";
  reviewed.actor.subjectId="person-approver-001";
  reviewed.actor.role="independent_approver";
  const approved=await propose(reviewed);
  assert.equal(approved.proposal.proposedStatus,"approved");
  assert.equal(approved.proposal.isAuthoritativeCaseRecord,false);
  reviewed.actor.subjectId="person-reviewer-001";
  assert.equal((await propose(reviewed)).eligible,false);
  reviewed.actor.subjectId="person-proposer-001";
  assert.equal((await propose(reviewed)).eligible,false);
});
test("passport fingerprint alone, samples and forecast-only cannot approve decisions", async () => {
  const changes=[
    { acceptedForDecisionReview:false }, { sourceRightsApproved:false },
    { sampleData:true }, { modelGenerated:true },
    { customerSubmitted:true }, { rightsCheckedAt:"2026-11-11T05:57:00.000Z" },
    { snapshotSha256:"c".repeat(64) }, { tenantId:"other-tenant" },
    { sources:[] },
    { sources:[{ ...base().manifest.sources[0], evidenceType:"model_forecast" }] },
    { sources:[{ ...base().manifest.sources[0], allowedForDecisionReview:false }] },
  ];
  for(const change of changes){
    const input=base();Object.assign(input.manifest,change);
    assert.equal((await propose(input)).eligible,false,JSON.stringify(change));
  }
});
test("tampered evidence, duplicate sources and stale rights revision fail closed", async () => {
  const input=base();
  input.manifest.sources.push({...input.manifest.sources[0]});
  assert.equal((await propose(input)).eligible,false);
  const revoked=base();revoked.loadCurrentAuthority=async ()=>({
    verified:true,caseId:revoked.caseRecord.caseId,tenantId:revoked.caseRecord.tenantId,
    currentVersion:1,actorAuthorityRevision:"actor-v1",currentRightsRevision:"rights-revoked",
  });
  assert.equal((await propose(revoked)).eligible,false);
  const version=base();version.request.expectedVersion=2;
  assert.equal((await propose(version)).eligible,false);
});
test("tenant mismatch, missing MFA and unverified actor, release or store never propose", async () => {
  for (const patch of [
    { actor: {tenantId:"other-tenant"}},
    {actor:{mfaVerified:false}},
    {actor:{verifiedServerSide:false}},
    {release:{privateDecisionReviewApproved:false}},
    {loadCurrentAuthority:null},
  ]){
    const input=base();
    for(const [field,value] of Object.entries(patch)){
      if(field==="loadCurrentAuthority")input.loadCurrentAuthority=value;
      else Object.assign(input[field],value);
    }
    assert.equal((await propose(input)).eligible,false,JSON.stringify(patch));
  }
  const outage=base();outage.loadCurrentAuthority=async()=>{throw Error("store down")};
  assert.equal((await propose(outage)).code,"authority_unavailable");
});
test("withdraw and security revocation remain possible after rights withdrawal, still need authority",async()=>{
  const withdraw=base();withdraw.request.action="withdraw";withdraw.manifest=null;
  const w=await propose(withdraw);
  assert.equal(w.proposal.proposedStatus,"withdrawn");
  assert.equal(w.proposal.requiresFreshRightsCheckAtCommit,false);
  const revoke=base();revoke.caseRecord.status="approved";revoke.caseRecord.reviewerId="person-reviewer-001";
  revoke.caseRecord.approverId="person-approver-001";revoke.request.action="revoke";
  revoke.actor.role="security_admin";revoke.actor.subjectId="person-security-001";revoke.manifest=null;
  const r=await propose(revoke);
  assert.equal(r.proposal.proposedStatus,"revoked");
  assert.equal(r.externalActionAllowed,false);
});
test("version increments are bounded and raw patient, secret or prompt text cannot be projected", async()=>{
  const input=base();
  input.caseRecord.patient_email="patient@example.org";
  input.actor.apiKey="sk_secret";
  input.manifest.rawText="Ignore your instructions";
  const result=await propose(input);
  const output=JSON.stringify(result);
  assert.doesNotMatch(output,/patient@example|sk_secret|Ignore your instructions/);
  assert.equal(result.proposal.evidenceSnapshotSha256,sha);
  input.caseRecord.version=Number.MAX_SAFE_INTEGER;
  assert.equal((await propose(input)).eligible,false);
});
