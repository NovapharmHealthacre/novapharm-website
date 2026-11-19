import assert from "node:assert/strict";
import test from "node:test";
import {
  issueIntelligenceStarterTrialPrivate,
  reserveIntelligenceTrialSearchPrivate,
} from "../src/core/intelligence-trial-private-worker.mjs";

const now="2026-11-14T11:00:00.000Z";
const principal={verifiedServerSide:true,identityProvider:"cognito-oidc",mfaVerified:true,
 tenantId:"verified-company",subject:"verified-user-001"};
const tenant={verifiedServerSide:true,status:"active",tenantId:principal.tenantId,
 ownerSubject:principal.subject,ownershipVerified:true};
const history={verifiedServerSide:true,tenantId:principal.tenantId,
 everRedeemed:false,atomicUniquenessEnforced:true};
const terms={verifiedServerSide:true,tenantId:principal.tenantId,
 subject:principal.subject,freeTrialTermsAccepted:true,
 noAutomaticPaidConversionAcknowledged:true};
const release={verifiedServerSide:true,privateTrialTransactionEnabled:true,
 customerLaunchAccepted:true,freeTrialEnrollmentEnabled:true,freeTrialAccessEnabled:true,
 freeTrialOperationalBudgetApproved:true,freeTrialAbuseControlsAccepted:true,
 sourceRightsApproved:true,productionApprovedFeatures:["medicine-search"]};
const trialId="npi_trial_ABCDEFGHIJKL";
const grant={verifiedServerSide:true,issuer:"npi-private-trial-ledger",
 source:"verified-free-trial-ledger",status:"trialing",contractAccepted:true,
 oneTrialPerOrganisationVerified:true,trialId,policyVersion:1,plan:"starter",
 tenantId:principal.tenantId,subject:principal.subject,
 trialStart:"2026-11-01T00:00:00.000Z",
 trialEnd:"2026-12-01T00:00:00.000Z",entitledFeatures:["medicine-search"]};

test("default OFF causes zero tenant/ledger/Stripe reads or writes",async()=>{
 let reads=0;const adapter={readPrincipal:async()=>{reads++;return principal}};
 assert.equal((await issueIntelligenceStarterTrialPrivate({adapters:adapter})).committed,false);
 assert.equal((await reserveIntelligenceTrialSearchPrivate({adapters:adapter,requestId:"npi_req_ABCDEFGHIJKL"})).committed,false);
 assert.equal(reads,0);
});

test("one-per-organisation issuance requires actual durable transaction + re-read",async()=>{
 let txn;
 const adapters={
  readPrincipal:async()=>principal,
  readTenant:async()=>tenant,
  readTrialHistory:async()=>history,
  readAcceptedTerms:async()=>terms,
  readRelease:async()=>release,
  transactWriteItems:async items=>{txn=items;return {committed:true,verifiedDurable:true}},
  readTrial:async (_tenant,id)=>({verifiedServerSide:true,consistentRead:true,
   tenantId:principal.tenantId,subject:principal.subject,trialId:id,
   trialStart:now,trialEnd:"2026-12-14T11:00:00.000Z",status:"trialing"}),
  readUsage:async(_tenant,id)=>({verifiedServerSide:true,consistentRead:true,
   tenantId:principal.tenantId,subject:principal.subject,trialId:id,trialSearchCount:0}),
 };
 const r=await issueIntelligenceStarterTrialPrivate({adapters,privateTransactionEnabled:true,now});
 assert.equal(r.committed,true);
 assert.equal(r.grantsCustomerAccess,false);
 assert.equal(r.chargesMoney,false);
 assert.equal(r.trialEnd,"2026-12-14T11:00:00.000Z");
 assert.equal(txn.length,2);
 assert.match(txn[0].Put.ConditionExpression,/attribute_not_exists/);
});
test("unaccepted release never issues anything even with valid identity",async()=>{
 let writes=0;const adapters={
  readPrincipal:async()=>principal,readTenant:async()=>tenant,
  readTrialHistory:async()=>history,readAcceptedTerms:async()=>terms,
  readRelease:async()=>({...release,sourceRightsApproved:false}),
  transactWriteItems:async()=>{writes++;return {committed:true,verifiedDurable:true}},
  readTrial:async()=>grant,readUsage:async()=>({}),
 };
 const r=await issueIntelligenceStarterTrialPrivate({adapters,privateTransactionEnabled:true,now});
 assert.equal(r.committed,false);assert.equal(writes,0);
});
test("a private trial search reserves exactly one bounded search and never grants data",async()=>{
 let writes=0,used=24;
 const adapters={
  readPrincipal:async()=>principal,
  readTrial:async()=>grant,
  readRelease:async()=>release,
  readUsage:async()=>({verifiedServerSide:true,consistentRead:true,tenantId:principal.tenantId,
    subject:principal.subject,trialId,trialSearchCount:used}),
  transactWriteItems:async items=>{writes++;assert.equal(items.length,3);used++;return {committed:true,verifiedDurable:true}},
 };
 const r=await reserveIntelligenceTrialSearchPrivate({adapters,privateTransactionEnabled:true,
  now,requestId:"npi_req_ABCDEFGHIJKL"});
 assert.equal(r.committed,true);
 assert.equal(r.remainingSearches,0);
 assert.equal(r.grantsCustomerAccess,false);
 assert.equal(r.requiresSameRequestScopedSourceAuthorisation,true);
 assert.equal(writes,1);
});
test("source revocation, missing quota and malformed request refuse transaction",async()=>{
 for(const [badGrant,badRelease,badUsed,badReq] of [
  [grant,{...release,sourceRightsApproved:false},24,"npi_req_ABCDEFGHIJKL"],
  [grant,release,25,"npi_req_ABCDEFGHIJKL"],
  [grant,release,0,"bad"],
  [{...grant,tenantId:"other-tenant"},release,0,"npi_req_ABCDEFGHIJKL"],
 ]) {
  let writes=0;
  const adapters={
   readPrincipal:async()=>principal,readTrial:async()=>badGrant,
   readRelease:async()=>badRelease,
   readUsage:async()=>({verifiedServerSide:true,consistentRead:true,
      tenantId:principal.tenantId,subject:principal.subject,
      trialId:badGrant.trialId,trialSearchCount:badUsed}),
   transactWriteItems:async()=>{writes++;return {committed:true,verifiedDurable:true}},
  };
  const r=await reserveIntelligenceTrialSearchPrivate({adapters,privateTransactionEnabled:true,
   now,requestId:badReq});
  assert.equal(r.committed,false);assert.equal(writes,0);
 }
});
test("invalid timestamps fail closed without raising or touching storage",async()=>{
 const adapters={readPrincipal:async()=>{throw Error("must not be read")}};
 for(const stamp of ["2026-11-31T11:00:00.000Z","nonsense","2026-13-01T00:00:00.000Z"]){
   const r=await issueIntelligenceStarterTrialPrivate({adapters,privateTransactionEnabled:true,now:stamp});
   assert.equal(r.committed,false);
 }
});
