# NovaPharm | Microsoft Entra ID P1 to AWS portal, verified starting point

Date: 6 November 2026. Region: `eu-north-1`.

**Existing P1 MFA:** The owner has confirmed Microsoft Entra ID P1 MFA is already configured. **Keep it.** Entra remains the workforce identity provider; do not replace it with a new password-only Cognito login.

## AWS staging broker already created

- Cognito Lite user pool: `eu-north-1_dZRAEzkYa`, name `novapharm-staging-entra-p1-broker`.
- Default native user sign-up: **disabled**. TOTP MFA: **ON** for local identities. Deletion protection: **ACTIVE**.
- Cognito staging domain: `novapharm-staging-250675045172.auth.eu-north-1.amazoncognito.com`, verified **ACTIVE**.
- No user accounts, no app clients, no connected Entra provider, no public portal sign-in. Not production.

**Exact Microsoft Entra application reply/redirect URI for AWS Cognito OIDC federation:**

`https://novapharm-staging-250675045172.auth.eu-north-1.amazoncognito.com/oauth2/idpresponse`

## Required configuration in the existing Entra P1 tenant

1. Locate the actual existing NovaPharm enterprise application registration or create a narrowly scoped, **single-tenant** OIDC application if one doesn't already exist. Do not share secrets or refresh tokens in chat or Git.
2. Add the AWS Cognito callback URI above as the supported **web** redirect. Preserve all approved existing callbacks unless independently reviewed.
3. Use the real Microsoft tenant-specific issuer `https://login.microsoftonline.com/{tenant-id}/v2.0` and OIDC metadata (not `common` or a guessed tenant) to configure the Cognito external provider. Provide the verified client ID and secret only through administrator-controlled AWS secret storage.
4. Grant `openid email profile` only as needed, explicitly map immutable subject and tenant, and add role/group mapping for `NovaPharm.Employee`, `NovaPharm.Board`, and `NovaPharm.Admin` based on approved assignments. Do not confer customer access by employee login.
5. Create a Cognito app client **only after** Entra federation is configured, with authorization-code + PKCE, allow-listed portal HTTPS callback(s), exact token audience/issuer checking and restricted `SupportedIdentityProviders` (no local Cognito fallback unless separately authorized).
6. Keep the existing Entra Conditional Access **P1 MFA**, require phishing-resistant MFA for privileged users where applicable, then verify actual MFA enforcement in an interactive owner sign-in.
7. Deploy a real HTTPS Next.js portal and protected API; validate cookie/session expiry, logout, CSRF, route ACLs, denied role/tenant access and audit logs at an exact deployed SHA.

**Important:** The old Azure App Service `X-MS-CLIENT-PRINCIPAL` header MUST NOT be trusted on AWS. Portal source already rejects these headers when `NOVAPHARM_CLOUD_PLATFORM=aws`. A P1 license or enabled tenant MFA policy alone cannot authorize the portal if the OIDC app integration has not been completed and tested.

Source references: [AWS Cognito OIDC provider documentation](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-oidc-idp.html), [Cognito external IdP authentication](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-identity-federation.html).

## Current production truth

`https://portal.novapharmhealthcare.com/portal/` returned **HTTP 503** in the independently run 6 November live probe. Cognito has **no external IdP configured and no app client**, so there is no legitimate way to claim a Microsoft MFA login succeeded on AWS today. Do not enable real accounts, set public DNS to this empty user pool, publish a mock portal, or weaken existing P1 protections.
