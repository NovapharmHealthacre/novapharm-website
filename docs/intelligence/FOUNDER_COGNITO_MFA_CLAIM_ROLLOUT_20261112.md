# Founder Cognito MFA claim-rollout compatibility | 12 Nov 2026

## Verified live failure

The founder's 16:04 IST browser screenshot displayed **Authenticator active** even
though AWS independently recorded successful Cognito password and TOTP steps.

Cognito CloudTrail events for the same recent managed-login attempts:
- 10:34:35 UTC and 10:35:21 UTC: verifyPassword_POST returned status 204.
- 10:34:49 UTC and 10:35:36 UTC: mfa_totp_POST returned status 204.
- 10:34:50 UTC and 10:35:36 UTC: Token_POST returned status 200.

CloudWatch shows callback `npi_registered_mfa_reauthentication_required`,
and Cognito AdminGetUser confirms SOFTWARE_TOKEN_MFA is enrolled and preferred.
AWS documentation states ACR/AMR token claims are in gradual rollout and may
be absent, even though the MFA challenge was completed.

Official references:
- https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-step-up-authentication.html
- https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-mfa.html

## Independently audited production policy

As verified directly from AWS Cognito on 12 Nov 2026:
- User pool eu-north-1_jBL6hCUE2: MFA ON; first-factor list PASSWORD only.
- TOTP enabled; SMS and email MFA not configured; no passkey MFA; no custom
  Lambda triggers or device configuration found.
- App client 7c76122stt76k4d8cjvd7tf6ck: native COGNITO identity provider
  only, authorization code OAuth callback pinned to NovaPharm origin.
- Confirmed founder user: software TOTP present and preferred.
- Lambda private identity code always uses signed code+PKCE state/nonce and
  forces prompt=login, max_age=0.
- The Lambda execution role has CloudWatch-only privileges and cannot read
  pool policy directly at runtime. **This code must not be repurposed into
  a customer-entitlement or session gate without a separately authorized
  provider assertion and runtime policy attestation.**

## Narrow change

When the strict signed ACR4 + AMR pwd/otp/mfa verifier rejects an otherwise
valid Cognito token, a founder-only **identity acknowledgement** is possible
only if all the following hold:

1. The ID token passes pinned issuer, client ID, RS256 JWKS signature,
   audience, token_use, exact nonce and verified founder email.
2. The token has no signed ACR or AMR claim, rather than an explicit weak
   or incompatible claim. A contrary signed claim is **not** overridden.
3. The signed auth_time and issued-at are recent and bounded to the signed
   PKCE transaction creation timestamp.
4. The Cognito access token is used server-side for GetUser, independently
   matching exact subject, founder email, email_verified and enrolled+preferred
   software TOTP. No TOTP re-enrolment is possible.
5. The source-reviewed provider policy contract is limited to this verified
   Cognito pool, PASSWORD first factor, TOTP second factor and exact app client.

The response says only **Cognito sign-in confirmed**. It does not set any
customer account cookie, admit a tenant, create a session, activate billing,
return JWTs to the browser, grant medicine-data rights or establish signed
ACR4/AMR evidence. This fallback does NOT call the customer-session acceptance
API even if that separate feature flag is on.

A valid strict signed ACR4/AMR token still follows the existing identity
verification and independent customer-acceptance path without change.

## Production safety / acceptance

- Validate all strict Cognito signing, nonce, PKCE and account tests.
- Validate claimless founder response cannot issue a customer session even
  when the customer-session feature flag is deliberately enabled in tests.
- Fail closed on explicit insufficient claims, identity mismatch, stale auth,
  absent factor, changed audited policy, unauthorized access token.
- Recheck the live Cognito pool/client MFA policy and founder MFA preference
  before **each** release. Runtime IAM does not permit dynamic pool config reads.
- Verify image source SHA, CodeQL, TypeScript, dependency review, image scan,
  exact paths and protected alias before promotion.
- Do not claim authenticated Medicines Terminal tenant access until the
  independent customer session and data-rights gates are accepted. A future
  customer launch needs a cryptographic per-session MFA attestation or a
  separately reviewed provider-enforced assurance implementation, not this
  identity-only compatibility UI.

Related GitHub issue #176 and PRs #516, #522, #525, #528 and #532.
