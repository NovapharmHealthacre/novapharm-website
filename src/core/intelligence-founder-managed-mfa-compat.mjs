/**
 * Founder-only Cognito managed-login compatibility acknowledgement.
 * Cognito ACR/AMR claims are rolling out gradually.
 *
 * The production pool was verified on 2026-11-12: MFA ON, PASSWORD only
 * first-factor, software TOTP only second-factor, COGNITO provider only.
 * A signed fresh JWT and authenticated token-scoped GetUser are required.
 * This is NEVER an entitlement, application session, or customer MFA proof.
 */
const blocked = code => Object.assign(
  new Error("Cognito founder identity-only confirmation unavailable."),
  { code },
);

export const auditedFounderMfaPoolContract = Object.freeze({
  poolId: "eu-north-1_jBL6hCUE2",
  clientId: "7c76122stt76k4d8cjvd7tf6ck",
  mfaRequired: true,
  permittedFirstFactors: Object.freeze(["PASSWORD"]),
  activeSecondFactors: Object.freeze(["SOFTWARE_TOKEN_MFA"]),
  identityProviders: Object.freeze(["COGNITO"]),
  codeFlowOnly: true,
  noIdentitySessionOrCustomerEntitlement: true,
  ownerMfaRequired: true,
});

/**
 * Acknowledge a signed provider identity under the independently audited
 * enforced MFA policy, without claiming ACR4 or creating a customer session.
 * Caller MUST first verify signed Cognito JWT and token-scoped GetUser.
 */
export function acknowledgeFounderManagedMfaOnly({
  signedFounderIdentity,
  cognitoEnrolledFounder,
  transactionCreatedAtMs,
  nowMs = Date.now(),
  policy = auditedFounderMfaPoolContract,
} = {}) {
  if (policy !== auditedFounderMfaPoolContract ||
      policy.mfaRequired !== true ||
      policy.codeFlowOnly !== true ||
      policy.noIdentitySessionOrCustomerEntitlement !== true ||
      !Number.isSafeInteger(transactionCreatedAtMs) ||
      !Number.isSafeInteger(nowMs) ||
      nowMs < transactionCreatedAtMs ||
      nowMs - transactionCreatedAtMs > 900_000) {
    throw blocked("founder_provider_policy_not_attested");
  }
  if (signedFounderIdentity?.founderProviderIdentityOnly !== true ||
      signedFounderIdentity.identityVerified !== false ||
      signedFounderIdentity.mfaVerifiedInSignedClaims !== false ||
      signedFounderIdentity.grantsTenantAccess !== false ||
      signedFounderIdentity.verifiedIssuer !==
        "https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_jBL6hCUE2" ||
      !/^[A-Za-z0-9-]{8,128}$/u.test(
        signedFounderIdentity.verifiedCognitoSubject ?? ""
      ) ||
      cognitoEnrolledFounder?.authenticatorRegistered !== true ||
      cognitoEnrolledFounder.mfaVerifiedThisLogin !== false ||
      cognitoEnrolledFounder.identityAccepted !== false ||
      cognitoEnrolledFounder.grantsTenantAccess !== false) {
    throw blocked("founder_provider_identity_unattested");
  }
  const signedAuthMs = signedFounderIdentity.signedAuthTimeSeconds * 1000;
  const issuedAtMs = signedFounderIdentity.signedIssuedAtSeconds * 1000;
  if (!Number.isSafeInteger(signedAuthMs) ||
      !Number.isSafeInteger(issuedAtMs) ||
      signedAuthMs < transactionCreatedAtMs - 45_000 ||
      signedAuthMs > nowMs + 60_000 ||
      issuedAtMs < signedAuthMs ||
      issuedAtMs > nowMs + 60_000 ||
      nowMs - signedAuthMs > 150_000) {
    throw blocked("founder_provider_session_not_fresh");
  }
  return Object.freeze({
    cognitoFounderAuthenticated: true,
    awsRequiredMfaPolicyAttestedAtRelease: true,
    mfaProofInSignedToken: false,
    applicationSessionIssued: false,
    customerAccessGranted: false,
    tenantAccepted: false,
    paidSubscriptionAccepted: false,
    medicineDataAccessible: false,
  });
}
