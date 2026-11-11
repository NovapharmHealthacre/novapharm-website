# NovaPharm Intelligence customer identity release

**Status: controlled candidate, not an active customer launch.**

## Architecture
The Cognito code+PKCE callback validates issuer, RS256 JWKS, audience, nonce, email verification, freshness, and password+TOTP MFA ACR/AMR. A validated ID token alone grants no customer access.

Only if the frontend NPI_CUSTOMER_SESSION_API_ENABLED flag is true does it call the fixed same-origin POST /customer/session API. The API Gateway route must have an AWS-managed Cognito JWT authorizer. The service then checks strongly consistent records for approved owner, tenant, membership, seat version, signed paid billing, quota and source-rights governance. It writes a SHA-256-hashed opaque session and redacted audit together in an atomic DynamoDB transaction. The browser receives only a host-only Secure HttpOnly SameSite=Lax cookie, expiring within twelve hours and never beyond its subscription period.

GET /customer/session rechecks live approval and returns only verified role and plan. POST /customer/logout uses exact same-origin checking and a transactional revocation with audit. Neither route exposes protected medicine, forecasting, NOVA or customer-commercial data.

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
