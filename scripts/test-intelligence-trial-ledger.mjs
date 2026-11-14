import assert from "node:assert/strict";
import test from "node:test";
import {
  prepareIntelligenceStarterTrialIssuance,
  prepareIntelligenceTrialSearchReservation,
} from "../src/core/intelligence-trial-ledger.mjs";
const principal={verifiedServerSide:true,mfaVerified:true,identityProvider:"cognito-oidc",
 tenantId:"verified-company",subject:"verified-user-001"};
const tenant={verifiedServerSide:true,tenantId:principal.tenantId,ownerSubject:principal.subject,
 ownershipVerified:true,status:"active"};
const history={verifiedServerSide:true,tenantId:principal.tenantId,everRedeemed:false,
 atomicUniquenessEnforced:true};
const terms={verifiedServerSide:true,tenantId:principal.tenantId,subject:principal.subject,
 freeTrialTermsAccepted:true,noAutomaticPaidConversionAcknowledged:true};
const release={verifiedServerSide:true,freeTrialEnrollmentEnabled:true,freeTrialAccessEnabled:true,
 freeTrialOperationalBudgetApproved:true,freeTrialAbuseControlsAccepted:true,sourceRightsApproved:true,
 productionApprovedFeatures:["medicine-search","medicine-identity"]};
const trialId="npi_trial_ABCDEFGHIJKL";
const now="2026-11-14T11:00:00.000Z";
const grant={verifiedServerSide:true,source:"verified-free-trial-ledger",issuer:"npi-private-trial-ledger",
 status:"trialing",plan:"starter",policyVersion:1,contractAccepted:true,
 oneTrialPerOrganisationVerified:true,trialId,tenantId:principal.tenantId,subject:principal.subject,
 trialStart:"2026-11-01T00:00:00.000Z",trialEnd:"2026-12-01T00:00:00.000Z",
 entitledFeatures:["medicine-search"]};
const usage={verifiedServerSide:true,tenantId:principal.tenantId,
 subject:principal.subject,trialId,trialSearchCount:24};
const enrollment=(o={})=>({principal,tenant,history,terms,release,trialId,now,...o});
const reservation=(o={})=>({principal,grant,usage,release,now,requestId:"npi_req_ABCDEFGHIJKL",...o});
test("issuance returns two never-overwriting atomic writes, without granting access",()=>{
 const result=prepareIntelligenceStarterTrialIssuance(enrollment());
 assert.equal(result.prepared,true);
 assert.equal(result.grantsAccess,false);
 assert.equal(result.chargesMoney,false);
 assert.equal(result.transactItems.length,2);
 const [sentinel,usageItem]=result.transactItems;
 assert.equal(sentinel.Put.Item.SK.S,"TRIAL#STARTER");
 assert.equal(sentinel.Put.Item.redeemedEver.BOOL,true);
 assert.match(sentinel.Put.ConditionExpression,/attribute_not_exists/);
 assert.equal(usageItem.Put.Item.trialSearchCount.N,"0");
 assert.equal(result.trialStart,now);
 assert.equal(result.trialEnd,"2026-12-14T11:00:00.000Z");
 assert.equal(JSON.stringify(result).includes("sk_live_"),false);
});
test("once-used tenant, missing rights, malformed time, closed release cannot issue",()=>{
 for(const change of [
  {history:{...history,everRedeemed:true}},
  {tenant:{...tenant,ownerSubject:"other-user"}},
  {release:{...release,sourceRightsApproved:false}},
  {release:{...release,freeTrialEnrollmentEnabled:false}},
  {release:{...release,productionApprovedFeatures:[]}},
  {trialId:"invalid"},
  {now:"2026-11-31T11:00:00.000Z"},
 ]) {
  const r=prepareIntelligenceStarterTrialIssuance(enrollment(change));
  assert.equal(r.prepared,false);
  assert.equal(r.transactItems.length,0);
 }
});
test("reservation is one conditional transaction: active sentinel, bounded counter, unique request",()=>{
 const result=prepareIntelligenceTrialSearchReservation(reservation());
 assert.equal(result.prepared,true);
 assert.equal(result.grantsAccess,false);
 assert.equal(result.transactItems.length,3);
 const [sentinel,quota,idempotency]=result.transactItems;
 assert.equal(sentinel.ConditionCheck.Key.SK.S,"TRIAL#STARTER");
 assert.match(sentinel.ConditionCheck.ConditionExpression,/trialEnd > :now/);
 assert.equal(quota.Update.ExpressionAttributeValues[":limit"].N,"25");
 assert.match(quota.Update.ConditionExpression,/#count < :limit/);
 assert.equal(idempotency.Put.Item.SK.S,"TRIAL_REQUEST#npi_req_ABCDEFGHIJKL");
 assert.match(idempotency.Put.ConditionExpression,/attribute_not_exists/);
});
test("reservation denies out-of-quota, expired, replay-looking inputs, unapproved sources",()=>{
 for(const change of [
  {usage:{...usage,trialSearchCount:25}},
  {usage:{...usage,trialSearchCount:26}},
  {now:"2026-12-01T00:00:00.000Z"},
  {release:{...release,sourceRightsApproved:false}},
  {release:{...release,freeTrialAccessEnabled:false}},
  {grant:{...grant,trialId:"npi_trial_anotheruser"}},
  {requestId:"bad"},
  {principal:{...principal,tenantId:"attacker"}},
 ]) {
  const r=prepareIntelligenceTrialSearchReservation(reservation(change));
  assert.equal(r.prepared,false);
  assert.equal(r.transactItems.length,0);
 }
});
test("empty inputs default fail closed with no DynamoDB writes",()=>{
 assert.equal(prepareIntelligenceStarterTrialIssuance({}).prepared,false);
 assert.equal(prepareIntelligenceTrialSearchReservation({}).prepared,false);
});
