import assert from "node:assert/strict";
import test from "node:test";
import {
  assessUnifiedPortalCutover,EXPECTED_WORKSPACES,UNIFIED_PORTAL_HOST
} from "../src/core/unified-portal-cutover-preflight.mjs";

const NOW=Date.parse("2026-11-14T10:00:00.000Z");
const approved=id=>({approved:true,independentlyVerified:true,decisionId:id});
const valid=()=>({
  contract:"novapharm.portal.cutover-evidence.v1",
  observedAt:"2026-11-14T09:59:00.000Z",
  expectedHost:UNIFIED_PORTAL_HOST,
  stagingNutraxinApiId:"wgy9p7ad0d",
  intelligenceApiId:"q2e6ztf8ic",
  candidateIngress:{
    app:"novapharm_unified_portal",apiId:"isolated_portal_candidate",
    authenticatedWorkspaceRouting:true,defaultAnonymousModuleAccess:false
  },
  runtime:{
    enabled:true,desiredTasks:2,runningTasks:2,healthyTargetCheck:true,
    sourceCommit:"a".repeat(40),imageRevision:"a".repeat(40),
    imageDigest:"sha256:"+"b".repeat(64)
  },
  sessionBackend:{
    enabled:true,durableAuthoritativeStorage:true,sessionRevocationVerified:true,
    crossTenantDenied:true,auditCommitVerified:true
  },
  identity:{
    mfaPositiveAndNegativeTested:true,sessionCookieHostScoped:true,csrfDenied:true,
    approvedCallbackUrls:["https://portal.novapharmhealthcare.com/auth/callback"]
  },
  workspaceTests:EXPECTED_WORKSPACES.map(({role,path})=>({
    role,path,authorisedSessionSucceeded:true,anonymousDenied:true,
    wrongRoleDenied:true,crossTenantDenied:true
  })),
  nutraxinPreservation:{
    stagingOrderingRetained:true,existingUsersAndOrdersProtected:true,
    independentFallbackRouteProved:true
  },
  rollback:{
    originalMappingRecorded:true,rollbackDrillPassed:true,operatorAssigned:true
  },
  financeDecision:approved("finance-approval-001"),
  securityDecision:approved("security-approval-001"),
  ownerChangeDecision:approved("owner-approval-001"),
  medicineDataAdmissionEnabled:false,customerBillingEnabled:false,
  nativeVendorConnectionsEnabled:false
});
const assess=p=>assessUnifiedPortalCutover(p,{now:NOW});
const cloned=()=>structuredClone(valid());
const blocked=(mutator,code)=>{
  const p=cloned();mutator(p);
  const result=assess(p);
  assert.equal(result.evidenceComplete,false,code);
  assert.ok(result.blockers.includes(code),JSON.stringify(result));
  assert.equal(result.deploymentAuthorised,false);
  assert.equal(result.productionLiveVerified,false);
};
test("even an entirely evidenced hypothetical packet is NOT release authorisation",()=>{
  const r=assess(valid());
  assert.deepEqual(r.blockers,[]);
  assert.equal(r.evidenceComplete,true);
  assert.equal(r.deploymentAuthorised,false);
  assert.equal(r.productionLiveVerified,false);
  assert.equal(r.requiresSeparateHumanChangeApproval,true);
  assert.ok(Object.isFrozen(r));
});
test("current observed Nov 2026 staging Nutraxin mapping and disabled portal are blocked",()=>{
  const p=cloned();
  p.candidateIngress.apiId="wgy9p7ad0d";
  p.runtime.enabled=false;p.runtime.desiredTasks=0;p.runtime.runningTasks=0;
  p.sessionBackend.enabled=false;
  p.identity.approvedCallbackUrls=["https://intelligence.novapharmhealthcare.com/auth/callback"];
  p.financeDecision=null;
  const r=assess(p);
  for(const code of [
    "missing_independent_authenticated_ingress",
    "unaccepted_immutable_private_runtime",
    "missing_authoritative_session_backend",
    "portal_domain_identity_not_accepted",
    "infrastructure_budget_unapproved"
  ]) assert.ok(r.blockers.includes(code),code);
  assert.equal(r.productionLiveVerified,false);
});
test("stale, malformed, future and missing evidence fails closed",()=>{
  for(const p of [null,undefined,[],false]){
    assert.equal(assess(p).evidenceComplete,false);
  }
  blocked(p=>{p.observedAt="2026-11-14T09:00:00.000Z";},"stale_or_invalid_observation");
  blocked(p=>{p.observedAt="2026-11-14T10:00:01.000Z";},"stale_or_invalid_observation");
  blocked(p=>{p.observedAt="not-a-date";},"stale_or_invalid_observation");
  blocked(p=>{p.contract="unknown";},"unexpected_packet_contract");
  blocked(p=>{p.expectedHost="intelligence.novapharmhealthcare.com";},"incorrect_canonical_hostname");
});
test("neither Nutraxin staging nor Intelligence catch-all can substitute for unified ingress",()=>{
  for(const id of ["wgy9p7ad0d","q2e6ztf8ic"]){
    blocked(p=>{p.candidateIngress.apiId=id;},"missing_independent_authenticated_ingress");
  }
  blocked(p=>{p.candidateIngress.authenticatedWorkspaceRouting=false;},"missing_independent_authenticated_ingress");
  blocked(p=>{p.candidateIngress.defaultAnonymousModuleAccess=true;},"missing_independent_authenticated_ingress");
  blocked(p=>{p.candidateIngress.app="nutraxin_staging";},"missing_independent_authenticated_ingress");
});
test("invalid image provenance and inactive paid compute fail closed",()=>{
  blocked(p=>{p.runtime.desiredTasks=0;p.runtime.runningTasks=0;},"unaccepted_immutable_private_runtime");
  blocked(p=>{p.runtime.runningTasks=1;},"unaccepted_immutable_private_runtime");
  blocked(p=>{p.runtime.sourceCommit="c".repeat(40);},"unaccepted_immutable_private_runtime");
  blocked(p=>{p.runtime.imageDigest="sha256:unknown";},"unaccepted_immutable_private_runtime");
  blocked(p=>{p.runtime.healthyTargetCheck=false;},"unaccepted_immutable_private_runtime");
});
test("MFA, domain-bound callback and session isolation are required",()=>{
  blocked(p=>{p.identity.approvedCallbackUrls=["https://intelligence.novapharmhealthcare.com/auth/callback"];},"portal_domain_identity_not_accepted");
  blocked(p=>{p.identity.mfaPositiveAndNegativeTested=false;},"portal_domain_identity_not_accepted");
  blocked(p=>{p.identity.sessionCookieHostScoped=false;},"portal_domain_identity_not_accepted");
  blocked(p=>{p.identity.csrfDenied=false;},"portal_domain_identity_not_accepted");
  blocked(p=>{p.sessionBackend.durableAuthoritativeStorage=false;},"missing_authoritative_session_backend");
  blocked(p=>{p.sessionBackend.sessionRevocationVerified=false;},"missing_authoritative_session_backend");
  blocked(p=>{p.sessionBackend.crossTenantDenied=false;},"missing_authoritative_session_backend");
});
test("all four workspaces require authenticated and negative role/tenant proofs",()=>{
  for(const role of EXPECTED_WORKSPACES.map(x=>x.role)){
    blocked(p=>{p.workspaceTests=p.workspaceTests.filter(x=>x.role!==role);},"four_role_workspace_acceptance_missing");
    blocked(p=>{p.workspaceTests.find(x=>x.role===role).wrongRoleDenied=false;},"four_role_workspace_acceptance_missing");
    blocked(p=>{p.workspaceTests.find(x=>x.role===role).crossTenantDenied=false;},"four_role_workspace_acceptance_missing");
    blocked(p=>{p.workspaceTests.find(x=>x.role===role).anonymousDenied=false;},"four_role_workspace_acceptance_missing");
  }
});
test("Nutraxin preservation, rollback and three independent approvals cannot be inferred",()=>{
  blocked(p=>{p.nutraxinPreservation.stagingOrderingRetained=false;},"nutraxin_ordering_preservation_unverified");
  blocked(p=>{p.rollback.rollbackDrillPassed=false;},"domain_cutover_rollback_missing");
  blocked(p=>{p.financeDecision=null;},"infrastructure_budget_unapproved");
  blocked(p=>{p.securityDecision.independentlyVerified=false;},"security_acceptance_missing");
  blocked(p=>{p.ownerChangeDecision.decisionId="";},"owner_change_approval_missing");
});
test("separately unapproved medicine, vendor and billing launches deny cutover",()=>{
  for(const field of ["medicineDataAdmissionEnabled","nativeVendorConnectionsEnabled","customerBillingEnabled"]){
    blocked(p=>{p[field]=true;},"prohibited_data_vendor_or_billing_activation");
  }
});
