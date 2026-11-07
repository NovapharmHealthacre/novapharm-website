# AWS Cognito and Microsoft Entra staging-only identity verification

Status: **STAGING CODE CANDIDATE; NOT PUBLICLY DEPLOYED**. A server-approved Cognito session exchange has been implemented behind independent default-OFF feature flags. Do not advertise the portal as live, or point customers to this staging-only route.

## Independent AWS checks (7 Nov 2026)
- AWS account 250675045172, eu-north-1, pool eu-north-1_dZRAEzkYa, prefix novapharm-staging-250675045172.
- Provider EntraP1, app client 26al3v0so11731c1l1hglfa8d1, code flow, scopes email/openid/profile, login redirect http://localhost:4303/auth/callback/.
- Conditional Access MFA policy remains report-only; Microsoft Security Defaults must not be disabled without reviewed replacements.
- No production portal hosting, private API, real role mapping, DNS or trusted application session has been verified.

## Local verification only
Run on a controlled developer machine, after obtaining the *separate Cognito app-client secret*, never checking it into Git:
```sh
export COGNITO_STAGING_VERIFICATION_ENABLED=true
export NEXT_PUBLIC_COGNITO_STAGING_VERIFICATION_ENABLED=true
export COGNITO_DOMAIN=https://novapharm-staging-250675045172.auth.eu-north-1.amazoncognito.com
export COGNITO_CALLBACK_URL=http://localhost:4303/auth/callback/
export COGNITO_CLIENT_ID=26al3v0so11731c1l1hglfa8d1
export COGNITO_CLIENT_SECRET='(value from approved Secrets Manager/secure admin store)'
export COGNITO_TRANSACTION_KEY='(random server-only key >=32 characters)'
npm run dev --workspace @novapharm/portal
```
The `/auth/start/` route does authorization-code+PKCE+state+nonce, and `/auth/callback/` exchanges the code **server-side** and verifies RSA signatures, Cognito issuer/audience/token use, nonce, expiry and EntraP1 identity. The signed, HttpOnly, short-lived transaction cookie is deleted after callback.

**Default-off verification mode never issues `np_session`.** When *all* approval-gated backend flags are enabled in an isolated environment, the Next.js callback can obtain an existing application-managed, revocable `np_session` from the protected API. The API independently revalidates the Cognito RSA JWT and authorisation-code nonce, validates a one-time signed gateway assertion, and creates a session only for an exact preapproved Cognito subject, approved matching email, and employee/board/admin scope. No customer role is auto-provisioned. A requested role or email domain alone never grants access.

Do not enable the staging verification flags in deployed production until HTTPS staging hosting, its exact Cognito callback, server secrets, CSP and independent browser/MFA evidence exist. In production runtime, HTTP localhost is rejected. The current static GitHub Pages website is not a credential collector.

Run `npm test --workspace @novapharm/portal` for negative cryptographic tests. No real identities are used in tests.

Contact production is separate: `infra/aws/contact-production.json` passed CloudFormation ValidateTemplate but no production stack exists. The public form stays email-only until a persisted synthetic receipt and delivery acceptance are verified.

## Backend identity integration: implemented candidate, default OFF

- `src/core/cognito-id-token.mjs`: independently verifies the Cognito user pool issuer, app-client audience, RSA signature, `token_use=id`, signed OAuth nonce, times and exactly the `EntraP1` OIDC identity.
- `src/core/cognito-approval.mjs`: denies all users until `COGNITO_WORKFORCE_BACKEND_ENABLED=true` and a per-subject mapping is approved; only `employee`, `board` or `admin`.
- `src/core/cognito-portal-identity.mjs`: verifies the private HMAC assertion and consumed nonce, checks grants, disallows mutable-email identity takeover, provisions an appropriately restricted workforce profile and records an audit event.
- `server.mjs`: `POST /api/auth/cognito` creates a database-backed, revocable, signed HttpOnly session only after both identity and role gates pass.
- `apps/portal/lib/cognito-session-exchange.mjs`: the Next.js callback submits token and nonce directly to the private API, verifies role agreement and the server's signed session cookie; never puts JWTs in browser storage or URLs.
- `apps/portal/app/auth/callback/route.ts`: keeps verification-only mode by default; `COGNITO_PORTAL_SESSION_ENABLED=true` switches to the explicitly authorised backend exchange.
- `apps/portal/test/cognito-backend-integration.test.mjs`: rejects forged RSA JWTs, wrong issuer/client, bad nonce, wrong IdP, wrong API role, missing session cookie, unauthorised subjects and customer enrolment.

## Unresolved operations: these must be completed before enabling

1. Provision a **dedicated HTTPS staging portal and private API** and accept their health checks. Current AWS ECS staging cluster has zero services and the Cognito app client callback is **localhost** only. Do not enable against GitHub Pages.
2. Provision a **durable backed-up application database** accepted by the present server persistence code. The existing MongoDB Atlas staging collections are synthetic audit data, not a migrated session store; the current API's runtime only supports SQLite or legacy Azure SQL.
3. Store these separately for the portal and private API in approved AWS Secrets Manager secret references: Cognito app-client secret, random OAuth transaction key, and a shared strong `PORTAL_GATEWAY_SECRET`. Never put any values into GitHub, public `NEXT_PUBLIC_` variables or chat.
4. Require `COGNITO_WORKFORCE_APPROVALS_JSON` on the **private API only**, in the form `{"<verified-Cognito-sub>":{"scope":"employee","expectedEmail":"approved@novapharmhealthcare.com"}}` (example placeholders only). Board and administrator access must be separately approved and tested. Do not use an email wildcard.
5. API: `COGNITO_WORKFORCE_BACKEND_ENABLED=true` plus the protected approvals, `PORTAL_GATEWAY_SECRET`, and `PUBLIC_API_ORIGIN` / `PORTAL_ORIGIN` with real HTTPS.
6. Next.js: set server-only `COGNITO_STAGING_VERIFICATION_ENABLED=true`, `COGNITO_PORTAL_SESSION_ENABLED=true`, verified `INTERNAL_API_ORIGIN`, `PORTAL_ORIGIN`, `COGNITO_DOMAIN`, `COGNITO_CALLBACK_URL`, client ID/secret and transaction key. Set public build flags `NEXT_PUBLIC_COGNITO_STAGING_VERIFICATION_ENABLED=true` and `NEXT_PUBLIC_COGNITO_PORTAL_SESSION_ENABLED=true` **only after acceptance**.
7. Replace the localhost Cognito callback with the exact HTTPS staging callback on the Cognito app client and test login with an assigned Entra pilot user under an **enabled and verified** MFA Conditional Access policy. Then verify authorised sign-in, unassigned sign-in, wrong tenant, wrong scope, logout/revocation, cookie attributes, private-API 401 and 403 responses, HTTP headers, DNS and TLS.
8. Establish a separate production pool, app-client, certificates, hostnames, approved role mappings and operational controls before permitting real customers. This candidate intentionally pins the **staging** user pool and cannot be marked production-ready simply by changing DNS.

**Release gate:** Until steps 1–8 are independently tested, leave production feature flags OFF and #55 OPEN.

## Logout boundary

The protected API revokes `np_session` in its persistence store first. The portal then uses `/auth/end-session/` for Cognito identities instead of the obsolete Azure `/.auth/logout` path. That route deletes the browser session cookie, and redirects to the Cognito managed-logout endpoint **only if** `COGNITO_POST_LOGOUT_URL` is an exact HTTPS, application-origin homepage URL already recorded among the app client's Allowed sign-out URLs. Without that configuration, it returns to the application homepage after the backend revocation.

Cognito managed logout does not automatically end the upstream Entra OIDC session; explicit Microsoft SSO logout and Conditional Access reauthentication requirements must be reviewed in the security acceptance test. See the [AWS logout documentation](https://docs.aws.amazon.com/cognito/latest/developerguide/logout-endpoint.html).
