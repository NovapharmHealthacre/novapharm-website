# AWS Cognito and Microsoft Entra staging-only identity verification

Status: **CODE CANDIDATE ONLY — NOT A PRODUCTION LOGIN OR SESSION**. Do not point customers to this route.

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

**There is intentionally NO `np_session` issued and NO customer, employee, board or admin role assigned.** The callback only displays an identity-verification outcome. Full application access depends on a separately reviewed private API, immutable subject/tenant binding, an approved server-side role directory, negative authorisation tests and a revocable session store. Never infer roles from the selector, an email suffix or an unverified OIDC claim.

Do not enable the staging verification flags in deployed production until HTTPS staging hosting, its exact Cognito callback, server secrets, CSP and independent browser/MFA evidence exist. In production runtime, HTTP localhost is rejected. The current static GitHub Pages website is not a credential collector.

Run `npm test --workspace @novapharm/portal` for negative cryptographic tests. No real identities are used in tests.

Contact production is separate: `infra/aws/contact-production.json` passed CloudFormation ValidateTemplate but no production stack exists. The public form stays email-only until a persisted synthetic receipt and delivery acceptance are verified.
