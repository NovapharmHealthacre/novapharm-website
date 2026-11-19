# NovaPharm Intelligence | Post-TOTP Cognito reauthentication

## Confirmed production failure, 12 November 2026

At 10:00:38 UTC founder TOTP setup POST returned HTTP 200, and Cognito
AdminGetUser independently confirmed `SOFTWARE_TOKEN_MFA` present and
preferred. Nevertheless follow-up OAuth callbacks at 10:00:47,
10:00:53, 10:01:33, 10:01:48 and 10:01:51 UTC were rejected at
`mfa_enrolment_eligibility / mfa_enrolment_not_eligible`. AWS API Gateway
GET /auth/customer/start consistently returned HTTP 302.

The **"Start a new secure sign-in" link worked**, but Cognito managed
login could return a still-recent SSO session originating before TOTP
enrolment. The portal attempted the first-time enrolment path again
rather than handling an already-enrolled account.

### Corrective release

1. All new Cognito managed-login authorization transactions use
   `prompt=login` and `max_age=0`. AWS documents this as forcing a
   new authentication ceremony instead of reusing an active managed-login
   session. PKCE S256, signed state/nonce and the pinned URI are unchanged.
   Reference: https://docs.aws.amazon.com/cognito/latest/developerguide/authorization-endpoint.html
2. The server calls Cognito GetUser using the scoped, short-lived access
   token, verifies the exact founder subject/email and existing preferred
   `SOFTWARE_TOKEN_MFA` status, and **does not attempt to re-enrol or
   replace** an already-registered authenticator.
3. Existing enrolment alone is explicitly **not** treated as MFA evidence
   for the current login. Without signed Cognito
   `acr=urn:cognito:loa:4` and `amr` with pwd/otp/mfa, the portal shows
   an explanatory, no-store identity-only page and refuses customer
   session, tenancy, subscriptions, billing and medicine data access.
   The founder needs a real fresh password-plus-TOTP Cognito flow.
4. Regression tests ensure a registered MFA account cannot run the
   setup flow or silently receive a customer session, and its safe
   response does not include JWTs, cookies or MFA secrets.

### Acceptance

- Exact-source GitHub OIDC, first-time MFA, tenant-isolation, browser,
  type, dependency and CodeQL checks.
- Container build from merged `main`, ECR vulnerability scan,
  isolated AWS Lambda GET/POST negative smokes and security headers.
- Identity-only alias promotion with pinned image digest and rollback.
- A real owner-driven password + authenticator sign-in must be verified
  separately; simulated token tests never prove a live factor challenge.
- Keep `private-acceptance` alias 15 and customer session flag disabled.
