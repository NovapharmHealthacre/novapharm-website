export const auditedFounderMfaPoolContract: Readonly<{
  poolId: string; clientId: string; mfaRequired: true;
  permittedFirstFactors: readonly ["PASSWORD"];
  activeSecondFactors: readonly ["SOFTWARE_TOKEN_MFA"];
  identityProviders: readonly ["COGNITO"];
  codeFlowOnly: true;
  noIdentitySessionOrCustomerEntitlement: true;
  ownerMfaRequired: true;
}>;
export function acknowledgeFounderManagedMfaOnly(options: {
  signedFounderIdentity: {
    founderProviderIdentityOnly: true; identityVerified: false;
    mfaVerifiedInSignedClaims: false; grantsTenantAccess: false;
    verifiedCognitoSubject: string; verifiedIssuer: string;
    signedAuthTimeSeconds: number; signedIssuedAtSeconds: number;
  };
  cognitoEnrolledFounder: {
    authenticatorRegistered: true; mfaVerifiedThisLogin: false;
    identityAccepted: false; grantsTenantAccess: false;
  };
  transactionCreatedAtMs: number;
  nowMs?: number;
  policy?: typeof auditedFounderMfaPoolContract;
}): Readonly<{
  cognitoFounderAuthenticated: true;
  awsRequiredMfaPolicyAttestedAtRelease: true;
  mfaProofInSignedToken: false;
  applicationSessionIssued: false;
  customerAccessGranted: false;
  tenantAccepted: false;
  paidSubscriptionAccepted: false;
  medicineDataAccessible: false;
}>;
