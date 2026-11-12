import assert from "node:assert/strict";
import test from "node:test";
import {
  acknowledgeFounderManagedMfaOnly, auditedFounderMfaPoolContract,
} from "../src/core/intelligence-founder-managed-mfa-compat.mjs";

const second=1_800_000_000;
const signed={
  founderProviderIdentityOnly:true,
  identityVerified:false,
  mfaVerifiedInSignedClaims:false,
  grantsTenantAccess:false,
  verifiedIssuer:"https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_jBL6hCUE2",
  verifiedCognitoSubject:"41fb4ecc-e9c6-4f7e-a376-17b0eddb4a8a",
  signedAuthTimeSeconds:second-20,
  signedIssuedAtSeconds:second-15,
};
const enrolled={
  authenticatorRegistered:true,mfaVerifiedThisLogin:false,
  identityAccepted:false,grantsTenantAccess:false,
};
const context={
  signedFounderIdentity:signed,
  cognitoEnrolledFounder:enrolled,
  transactionCreatedAtMs:(second-35)*1000,
  nowMs:second*1000,
};
test("Cognito-required password+TOTP founder acknowledgment is identity-only",()=>{
  const result=acknowledgeFounderManagedMfaOnly(context);
  assert.deepEqual(result,{
    cognitoFounderAuthenticated:true,
    awsRequiredMfaPolicyAttestedAtRelease:true,
    mfaProofInSignedToken:false,
    applicationSessionIssued:false,
    customerAccessGranted:false,
    tenantAccepted:false,
    paidSubscriptionAccepted:false,
    medicineDataAccessible:false,
  });
  assert.ok(Object.isFrozen(result));
  assert.equal("mfaVerified" in result,false);
  assert.equal("identityVerified" in result,false);
  assert.equal("sessionToken" in result,false);
  assert.equal(auditedFounderMfaPoolContract.mfaRequired,true);
  assert.deepEqual(auditedFounderMfaPoolContract.permittedFirstFactors,["PASSWORD"]);
  assert.deepEqual(auditedFounderMfaPoolContract.activeSecondFactors,["SOFTWARE_TOKEN_MFA"]);
  assert.deepEqual(auditedFounderMfaPoolContract.identityProviders,["COGNITO"]);
});
test("founder fallback refuses forged conditions, stale or misbound sessions",()=>{
  const invalid=[
    {signedFounderIdentity:{...signed,founderProviderIdentityOnly:false}},
    {signedFounderIdentity:{...signed,identityVerified:true}},
    {signedFounderIdentity:{...signed,mfaVerifiedInSignedClaims:true}},
    {signedFounderIdentity:{...signed,grantsTenantAccess:true}},
    {signedFounderIdentity:{...signed,verifiedIssuer:"https://untrusted.example"}},
    {signedFounderIdentity:{...signed,verifiedCognitoSubject:"bad"}},
    {signedFounderIdentity:{...signed,signedAuthTimeSeconds:second-200}},
    {signedFounderIdentity:{...signed,signedAuthTimeSeconds:second+120}},
    {signedFounderIdentity:{...signed,signedIssuedAtSeconds:second-30}},
    {cognitoEnrolledFounder:{...enrolled,authenticatorRegistered:false}},
    {cognitoEnrolledFounder:{...enrolled,mfaVerifiedThisLogin:true}},
    {cognitoEnrolledFounder:{...enrolled,identityAccepted:true}},
    {cognitoEnrolledFounder:{...enrolled,grantsTenantAccess:true}},
    {transactionCreatedAtMs:(second+1)*1000},
    {transactionCreatedAtMs:(second-1000)*1000},
    {transactionCreatedAtMs:(second+30)*1000,nowMs:(second+31)*1000},
    {policy:{...auditedFounderMfaPoolContract,mfaRequired:false}},
  ];
  for(const variant of invalid){
    assert.throws(()=>acknowledgeFounderManagedMfaOnly({...context,...variant}));
  }
});
