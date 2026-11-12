# NovaPharm Intelligence customer identity release

**Status: controlled candidate, not an active customer launch.**

## Architecture
The Cognito code+PKCE callback validates issuer, RS256 JWKS, audience, nonce, email verification, freshness, and password+TOTP MFA ACR/AMR. A validated ID token alone grants no customer access.

Only if the frontend NPI_CUSTOMER_SESSION_API_ENABLED flag is true does it call the fixed same-origin POST /customer/session API. The API Gateway route must have an AWS-managed Cognito JWT authorizer. The service then checks strongly consistent records for approved owner, tenant, membership, seat version, signed paid billing, quota and source-rights governance. It writes a SHA-256-hashed opaque session and redacted audit together in an atomic DynamoDB transaction. The browser receives only a host-only Secure HttpOnly SameSite=Lax cookie, expiring within twelve hours and never beyond its subscription period.

GET /customer/session rechecks live approval and returns only verified role and plan. POST /customer/logout uses exact same-origin checking and a transactional revocation with audit. Neither route exposes protected medicine, forecasting, NOVA or customer-commercial data.

## Founder first-login recovery

The Cognito-managed temporary password change and first authenticator-app enrolment can take longer than five minutes. The signed PKCE state, nonce and short-lived host-only cookie permit a **maximum 15-minute** authentication ceremony, with the same 15-minute signed `auth_time` freshness check. Every accepted ID token must still have a valid RSA signature, exact issuer/client/nonce, verified email and Cognito Essentials ACR `urn:cognito:loa:4` with `amr` containing `pwd`, `otp` and `mfa`. No password-only fallback is permitted. The application session and paid/medicine access remain separately disabled by default.

The callback logs only fixed phase/reason classifications such as `identity_email_unverified`, `identity_mfa_level_insufficient` or `transaction_expired_or_mismatched`; no OAuth codes, states, secrets, emails, JWTs or URLs are logged. Failed sign-ins show a generic response and a link to begin a fresh authentication.

Do not promote this fix to production until the signed exact-head application image is released to the established AWS Lambda alias and real browser first-login, TOTP and malicious/expired callback tests pass. A merged source fix is **not** a deployed fix. Do not grant customer seats, billing or dataset rights by changing this timeout.

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
