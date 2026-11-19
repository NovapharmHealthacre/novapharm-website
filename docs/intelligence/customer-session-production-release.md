# NovaPharm Intelligence customer identity release

**Status: controlled candidate, not an active customer launch.**

## Architecture
The Cognito code+PKCE callback validates issuer, RS256 JWKS, audience, nonce, email verification, freshness, and password+TOTP MFA ACR/AMR. A validated ID token alone grants no customer access.

Only if the frontend NPI_CUSTOMER_SESSION_API_ENABLED flag is true does it call the fixed same-origin POST /customer/session API. The API Gateway route must have an AWS-managed Cognito JWT authorizer. The service then checks strongly consistent records for approved owner, tenant, membership, seat version, signed paid billing, quota and source-rights governance. It writes a SHA-256-hashed opaque session and redacted audit together in an atomic DynamoDB transaction. The browser receives only a host-only Secure HttpOnly SameSite=Lax cookie, expiring within twelve hours and never beyond its subscription period.

GET /customer/session rechecks live approval and returns only verified role and plan. POST /customer/logout uses exact same-origin checking and a transactional revocation with audit. Neither route exposes protected medicine, forecasting, NOVA or customer-commercial data.

## Founder first-login recovery

The Cognito-managed temporary password change and first authenticator-app enrolment can take longer than five minutes. The signed PKCE state, nonce and short-lived host-only cookie permit a **maximum 15-minute** authentication ceremony, with the same 15-minute signed `auth_time` freshness check. Every accepted ID token must still have a valid RSA signature, exact issuer/client/nonce, verified email and Cognito Essentials ACR `urn:cognito:loa:4` with `amr` containing `pwd`, `otp` and `mfa`. No password-only fallback is permitted. The application session and paid/medicine access remain separately disabled by default.

## First-time TOTP enrolment request

The founder's current first-login flow requests only Cognito ACR level 4. Cognito can reject that request before a user with no enrolled TOTP factor can reach the mandatory first-time enrolment ceremony.

This change requests `urn:cognito:loa:4 urn:cognito:loa:1` in that order, while preserving `prompt=login` and `max_age=0` so a prior password-only managed-login session is not silently reused. The lower ACR is a provider-side onboarding request only; it is not an accepted application identity.

## Security boundary remains unchanged

- Normal identity still requires a Cognito-signed ACR 4 token with `pwd`, `otp` and `mfa`, exact issuer/client/nonce, verified founder email and fresh `auth_time`.
- A lower-level or missing-ACR token is routed only to the existing first-time enrolment branch. Cognito `GetUser` must independently match the founder subject/email and confirm no MFA method is enrolled before the 10-minute enrolment-only cookie is issued.
- The owner must personally scan/use the authenticator and submit a valid six-digit code to Cognito `VerifySoftwareToken`; the app cannot enrol, verify or invent a code on the owner's behalf.
- Enrolment grants no founder application session, customer seat, medicine data, paid subscription, source rights or NOVA inference access. A fresh password+TOTP login is still required afterwards.
- No credentials, TOTP secrets, reset codes, JWTs, PKCE values or tokens are logged.

## CI correction

The earlier PR #513 production-readiness failure is traced to the CSS validator rejecting existing `-0.08em` editorial tracking in the two governed Intelligence workspace stylesheets. Current main contains the narrowly file-scoped allowlist capped at `-0.08em`; this PR does not weaken or alter that validator.

Require all exact-head production readiness, OIDC, CodeQL, dependency, secure Portal, Chromium/WebKit and unified browser checks to pass before any merge. This PR is source-only; AWS deployment remains separately gated by verified £0 credit coverage, immutable image scanning, Lambda alias/rollback checks and owner-side MFA acceptance.

The callback logs only fixed phase/reason classifications such as `identity_email_unverified`, `identity_mfa_level_insufficient` or `transaction_expired_or_mismatched`; no OAuth codes, states, secrets, emails, JWTs or URLs are logged. Failed sign-ins show a generic response and a link to begin a fresh authentication.

Do not promote this fix to production until the signed exact-head application image is released to the established AWS Lambda alias and real browser first-login, TOTP and malicious/expired callback tests pass. A merged source fix is **not** a deployed fix. Do not grant customer seats, billing or dataset rights by changing this timeout.

## Root-cause correction: Cognito claim-rollout-safe first TOTP registration (12 November 2026, 14:50 IST)

At 09:20:07 UTC on 12 November 2026, the real v20 callback failed
`mfa_enrolment_identity / mfa_enrolment_password_proof_missing` while
Cognito CloudTrail recorded a successful `verifyPassword_POST` at
09:19:36 UTC. The login reached the fixed identity service and passed the
signed token's issuer, audience, signature, nonce and email checks. The
missing `pwd` in `amr` has **not** been proven to mean the user skipped
password authentication: Cognito's ACR/AMR feature is still rolling out to
pools, as explicitly noted in official AWS documentation. The application
had wrongly coupled **initial TOTP registration** to a token claim that
may be unavailable. The exact token's `amr` contents are intentionally
not logged, so avoid claims about whether the array was absent or incomplete.

This code separates two security decisions:

1. **Limited first-time founder authenticator registration:** require
   Cognito RSA-signed ID JWT from the exact production issuer, audience and
   nonce; exact verified founder email; fresh signed `auth_time`
   (within 300 seconds); optional known ACR/AMR values if present;
   then use the associated access token to call **Cognito GetUser**,
   verifying the matching subject, verified founder email, and **no
   already-enrolled MFA method**. The encrypted 10-minute HttpOnly cookie
   grants only the self-service `AssociateSoftwareToken`,
   `VerifySoftwareToken` and `SetUserMFAPreference` sequence. Registration
   completes only after the owner personally submits a TOTP code that Cognito
   verifies. No customer session or medicine rights can be granted here.
   This is an authenticated founder session; do not describe it as proof
   of a password method when AMR is missing. Passwordless authenticated
   accounts are allowed only this same self-enrolment capability that
   their Cognito access token already authorizes, never application access.

2. **Actual full MFA customer identity:** **unchanged**, requiring a
   signed `acr=urn:cognito:loa:4` and `amr` containing
   `pwd, otp, mfa`, recent `auth_time`, distinct tenant, subscription,
   rights and revocation-fenced acceptance. If the pool still cannot
   issue these claims after TOTP enrolment, this remains fail-closed and
   requires an independent Cognito-provider-attested release design.
   Neither a mere user MFA enrolment flag nor the pool MFA configuration
   alone is an accepted replacement.

Other callbacks at 09:12–09:16 UTC had `transaction_invalid` from stale
or mismatched PKCE transactions; those are distinct and are **not** fixed
by changing authentication claims. Avoid multiple simultaneous browser
sign-ins. No password reset, bypass, or unapproved email is performed.

Evidence: AWS CloudWatch private callback classifications, Cognito
CloudTrail 09:19:36 UTC verifyPassword success, Cognito user confirmed with
MFA ON, and official AWS step-up caveat:
https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-step-up-authentication.html

## Founder password-proven MFA enrolment correction (12 November 2026, 14:32 IST)

Live Lambda v19 reached `mfa_enrolment_identity` and rejected founder callbacks
at 09:01:14 and 09:02:39 UTC with `mfa_enrolment_not_authorised`.
Cognito CloudTrail separately recorded successful managed-login
`verifyPassword_POST` steps around 09:00:54 and 09:02:20 UTC.
The exact rejected claim value is **not** known; do not manufacture it.

The earlier first-time enrolment verifier erroneously required **only**
`acr=urn:cognito:loa:1`, even though AWS Cognito can produce a stronger
ACR for password plus another completed factor. The enrollment-only branch
now requires a valid Cognito-signed ID token, exact issuer/client/nonce,
email_verified, exact founder email, signed `amr` containing `pwd`,
the known Cognito ACR levels 1, 3 or 4 (or absent ACR), and `auth_time`
no more than five minutes old. Passwordless email OTP (`amr` without
`pwd`) and LOA2 are still rejected. Strict CUSTOMER level-4 TOTP
verification and external tenant/seat/subscription rights remain unchanged.

The privacy-safe rejection classification now distinguishes email mismatch,
missing password proof, incompatible ACR and stale authentication. Neither
JWTs nor identifiers, claims, codes, tokens, TOTP secrets, or PKCE transaction
materials are logged. User still must personally register a valid TOTP, and
complete a new level-4 password-plus-TOTP sign-in. No customer access is
granted through first-time enrolment.

Official reference:
https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-step-up-authentication.html

## Cognito JWT key identifier compatibility (12 November 2026)

At approximately 13:04 IST the founder returned from Cognito with an OAuth
callback that reached `id_token_verification`, then failed with the
privacy-safe `identity_signature_invalid` code. A separate earlier set
of failures showed `transaction_invalid`, which requires a fresh start and
a present signed PKCE cookie.

The Next.js ID-token verifier incorrectly used a **base64url-only** regular
expression for the JWT header `kid`. Cognito public JWKS signing-key
identifiers may use standard base64 characters `+`, `/` and trailing
`=`, as documented by AWS in its official JWT verification examples.
The verifier now accepts these characters in a bounded header key ID and
still requires all of:

- Exact expected RSA `RS256` algorithm.
- Exact string match against a key from the fixed production Cognito
  issuer's public `/.well-known/jwks.json` endpoint, with RSA signing
  type and no `none` algorithm.
- Successful cryptographic RSA SHA-256 verification of the raw JWT bytes.
- Exact signed issuer, client audience, nonce, expiry, verified email and
  required level-4 MFA claims. No customer rights granted by identity alone.

Unit tests cover valid padded/base64 signing-key IDs, forged signatures,
unknown IDs and invalid header characters. No JWT, OAuth code, user email,
PKCE secret or cookie is stored in the test artifacts or logged.

This is a **code candidate**, not a verified production sign-in. Require
exact-head CI, image scanning, pinned Lambda alias release, negative
callback tests and successful real MFA browser login before closing.

AWS reference:
https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html

## Release controls

Both CloudFormation parameters default to false: EnableCustomerRoutes and CustomerLaunchAccepted. The Next.js customer session exchange flag is absent/false unless set explicitly in reviewed production configuration.

The generator is scripts/build-intelligence-customer-session-api-template.mjs; tests are scripts/test_intelligence_customer_session_api.py and scripts/test-intelligence-customer-session-api-template.mjs.

## Mandatory gates before activation

1. All exact-head source tests, portal build, CodeQL, dependency review and browser checks green.
2. Deploy only an isolated private Lambda with both release parameters OFF; verify no function URL, scoped IAM, CloudWatch logs, callback failure handling and rollback.
3. Verify Cognito JWT authorizer with authentic signed identity tokens and explicit rejection of weak MFA, wrong audience, forged tokens and replayed sessions; verify API throttling and operational monitoring.
4. Independently accept actual invited customer organisation ownership, contract, verified Cognito MFA, member and seats, live Stripe subscription and invoice, source-specific rights and feature approval. Never fabricate customer, invoice or rights records.
5. Run two-tenant negative and positive end-to-end tests, session revocation, billing suspension and source rights denial, quota concurrency, recovery/restore and release evidence.
6. Only after independent acceptance enable the API routes, CustomerLaunchAccepted, then frontend NPI_CUSTOMER_SESSION_API_ENABLED, and deploy immutable exact-head production image.
7. Protect all downstream medicines, reports, forecasting and AI APIs with separate medicine/tenant/seat/source-rights authorization before exposing protected data.

## Rollback

Disable frontend session exchange, then revoke customer release and disable API routes if required. Do not claim durable logout if storage is unavailable. Retain redacted audit history and backups.

Never create placeholder customers, send customer emails, initiate unauthorized payments, bypass MFA, expose credentials, or confuse a successful identity login with access to licensed medicine data.
