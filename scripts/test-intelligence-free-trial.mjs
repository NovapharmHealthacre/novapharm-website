import assert from "node:assert/strict";
import test from "node:test";
import {assessIntelligenceTrialEnrollment,decideIntelligenceFreeTrialEntitlement,intelligenceStarterTrialPolicy} from "../src/core/intelligence-free-trial.mjs";
import {decideIntelligenceEntitlement} from "../src/core/intelligence-subscription-entitlements.mjs";
const principal={verifiedServerSide:true,mfaVerified:true,identityProvider:"cognito-oidc",tenantId:"verified-company",subject:"verified-user-001"};
const release={verifiedServerSide:true,freeTrialEnrollmentEnabled:true,freeTrialAccessEnabled:true,
 freeTrialOperationalBudgetApproved:true,freeTrialAbuseControlsAccepted:true,
 sourceRightsApproved:true,productionApprovedFeatures:["medicine-search","medicine-identity","us-fda-labels"]};
const tenant={verifiedServerSide:true,tenantId:principal.tenantId,ownerSubject:principal.subject,ownershipVerified:true,status:"active"};
const history={verifiedServerSide:true,tenantId:principal.tenantId,everRedeemed:false,atomicUniquenessEnforced:true};
const terms={verifiedServerSide:true,tenantId:principal.tenantId,subject:principal.subject,
 freeTrialTermsAccepted:true,noAutomaticPaidConversionAcknowledged:true};
const grant={verifiedServerSide:true,source:"verified-free-trial-ledger",issuer:"npi-private-trial-ledger",status:"trialing",
 plan:"starter",policyVersion:1,contractAccepted:true,oneTrialPerOrganisationVerified:true,
 trialId:"npi_trial_ABCDEFGHIJKL",tenantId:principal.tenantId,subject:principal.subject,
 trialStart:"2026-11-01T00:00:00.000Z",trialEnd:"2026-12-01T00:00:00.000Z",
 entitledFeatures:["medicine-search","medicine-identity"]};
const usage={verifiedServerSide:true,tenantId:principal.tenantId,subject:principal.subject,
 trialId:grant.trialId,trialSearchCount:24};
const req=(o={})=>({principal,grant,usage,release,feature:"medicine-search",now:"2026-11-14T12:00:00.000Z",...o});
const enroll=(o={})=>({principal,tenant,history,terms,release,...o});
test("finite non-renewing Starter offer requires no payment details",()=>{
 assert.equal(intelligenceStarterTrialPolicy.durationDays,30);
 assert.equal(intelligenceStarterTrialPolicy.totalSearchLimit,25);
 assert.equal(intelligenceStarterTrialPolicy.paymentMethodRequired,false);
 assert.equal(intelligenceStarterTrialPolicy.automaticPaidConversion,false);
 assert.ok(!intelligenceStarterTrialPolicy.trialFeatures.includes("nova"));
});
test("enrollment only assesses a never-redeemed verified organisation",()=>{
 assert.deepEqual(assessIntelligenceTrialEnrollment(enroll()),{
 eligible:true,code:"private_atomic_trial_issuance_required",createsTrial:false,grantsAccess:false,
 durationDays:30,totalSearchLimit:25,paymentMethodRequired:false,automaticPaidConversion:false});
 for(const change of [
  {release:{...release,freeTrialEnrollmentEnabled:false}},
  {release:{...release,freeTrialOperationalBudgetApproved:false}},
  {principal:{...principal,mfaVerified:false}},
  {tenant:{...tenant,ownerSubject:"different-user"}},
  {history:{...history,everRedeemed:true}},
  {history:{...history,atomicUniquenessEnforced:false}},
  {terms:{...terms,noAutomaticPaidConversionAcknowledged:false}},
 ]) assert.equal(assessIntelligenceTrialEnrollment(enroll(change)).eligible,false);
});
test("existing authorizer accepts only verified explicitly enabled in-window trials",()=>{
 const good=decideIntelligenceEntitlement(req());
 assert.equal(good.allowed,true);assert.equal(good.code,"authorised_trial");
 assert.equal(good.remainingSearches,1);assert.equal(good.effectivePlan,"starter");
 for(const change of [
  {release:{...release,freeTrialAccessEnabled:false}},
  {release:{...release,freeTrialOperationalBudgetApproved:false}},
  {principal:{...principal,tenantId:"another-tenant"}},
  {grant:{...grant,subject:"another-user"}},
  {grant:{...grant,issuer:"client"}},
  {grant:{...grant,oneTrialPerOrganisationVerified:false}},
  {grant:{...grant,contractAccepted:false}},
  {grant:{...grant,plan:"enterprise"}},
  {usage:{...usage,trialId:"npi_trial_otherledger"}},
  {usage:{...usage,verifiedServerSide:false}},
  {usage:{...usage,trialSearchCount:-1}},
  {release:{...release,sourceRightsApproved:false}},
  {release:{...release,productionApprovedFeatures:[]}},
  {feature:"nova"},
  {feature:"observed-market"},
  {now:"2026-10-31T23:59:59.000Z"},
  {now:"2026-12-01T00:00:00.000Z"},
  {grant:{...grant,trialEnd:"2027-01-01T00:00:00.000Z"}},
  {grant:{...grant,trialEnd:"2026-11-31T00:00:00.000Z"}},
 ]) assert.equal(decideIntelligenceEntitlement(req(change)).allowed,false);
});
test("trial cap is cumulative, never reset per calendar month",()=>{
 assert.equal(decideIntelligenceEntitlement(req({usage:{...usage,trialSearchCount:25}})).code,"trial_search_limit_reached");
 assert.equal(decideIntelligenceEntitlement(req({
   usage:{...usage,trialSearchCount:25},feature:"medicine-identity"
 })).remainingSearches,0);
});
test("Stripe trialing cannot substitute for an independently issued free grant",()=>{
 const result=decideIntelligenceEntitlement(req({grant:{...grant,source:"verified-stripe-webhook-ledger"}}));
 assert.equal(result.allowed,false);assert.equal(result.code,"subscription_not_verified");
 assert.equal(decideIntelligenceFreeTrialEntitlement({}).allowed,false);
 assert.equal(assessIntelligenceTrialEnrollment({}).eligible,false);
});
