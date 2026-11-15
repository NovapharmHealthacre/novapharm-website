# NovaPharm account, authentication and onboarding — Apple guidance mapping

Status: staged web UX changes; **not** a claim of full Apple Sign in, passkey, account deletion or production completion.
Reviewed: 2026-11-15. Applies to Corporate public entry, Customer, Employee/Distribution, Board, Administrator, Intelligence and founder journeys.

## First-party source material reviewed

1. [Apple HIG — Managing accounts](https://developer.apple.com/design/human-interface-guidelines/managing-accounts)
2. [Authentication Services — Supporting passkeys](https://developer.apple.com/documentation/authenticationservices/supporting-passkeys)
3. [Apple HIG — Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding)
4. [Apple HIG — Sign in with Apple](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple)
5. [Authentication Services framework](https://developer.apple.com/documentation/authenticationservices)
6. [Displaying Sign in with Apple buttons on the web](https://developer.apple.com/documentation/signinwithapple/displaying-sign-in-with-apple-buttons-on-the-web)

Apple's native Swift / AuthenticationServices APIs are not directly callable from a Next.js browser. For websites, passkeys use HTTPS + WebAuthn with server-generated challenges, and Sign in with Apple uses Apple's web OAuth/OIDC service with server verification. Copying the style of a login button alone is not implementation.

## Delivered in this PR

- Shared, optional disclosure instructions for five audience contexts; first-party account/application, trust and privacy routes. Guidance appears on secure entry pages and verified, role-matching landing workspaces, without being a forced tutorial.
- Clear purpose for an account before asking for credentials; public browsing remains accessible; regulated identity invitations and customer reviews are not silently bypassed.
- Preserve existing password autofill, one-time-code autofill and authorised identity methods; add a keyboard-accessible, accurately labeled password show/hide toggle in the four-role portal.
- Maintain existing authorised role boundaries, CSRF, protected login mutation, Cognito identity challenge, mandatory authenticator, independent customer seat approval and server-side sessions. No browser tokens or password storage added.
- Apple identity and passkeys are not shown when unavailable. Avoid decorative buttons that appear functional but are not linked to real, independently verified server implementations.

## Required before passkeys are enabled

1. Confirm the canonical relying-party ID and origin across portal.novapharmhealthcare.com and intelligence.novapharmhealthcare.com. Cross-subdomain access needs intentional RP-ID design and provider support; never merge credential namespaces implicitly.
2. Implement HTTPS WebAuthn registration and assertion and platform conditional UI only after the server issues unpredictable, expiring, single-use challenges. Verify RP ID hash, origin, challenge, signature, authenticator flags, credential ID and replay protections on the server.
3. Bind credentials to the already authenticated, verified individual identity and a server-authorised tenant/scope; secure account recovery and reauthentication are mandatory. Credential public-key storage and revocation must have audit history, rate limits, replay defense and constrained reset pathways.
4. Decide with Cognito/Entra and the protected private portal whether passkeys satisfy existing mandatory authenticator policies. Never treat a WebAuthn assertion as permission to skip the Intelligence TOTP gate or to grant a tenant/board/administrator scope.
5. Validate Safari/WebKit, Chrome, Windows and Android, including credential rejection, device loss, cancellation, recovery, credential revocation, concurrent sessions and accessibility.

## Required before Sign in with Apple is enabled

1. Create and validate Apple Developer team/service ID, web domain, allowed return URL and a securely stored signing-key configuration. Production domain verification and any private-email relay configuration must be real.
2. Configure the official Apple-hosted web button from the SDK and localized variants. Follow Apple's minimum sizing, contrast, required Apple artwork, wording and surrounding clear space. Do not render a fake custom logo, or show the button before working integration is verified.
3. Implement server-originated state, nonce, PKCE where supported, exact redirect URI, anti-CSRF and replay controls; validate the ID token's signature against Apple JWKS, issuer, audience, nonce and expiration, and exchange codes only on trusted server infrastructure. Never trust an unverified email claim.
4. Link an Apple stable subject to an existing verified NovaPharm principal through explicit consent and a verified reauthentication step. **Never auto-provision a board/admin/employee scope or match tenants solely by email or a Hide My Email alias.**
5. Handle relay email privacy, first-login-only name disclosure, account-linking, token revocation at deletion, sign-out, errors and audit logs without exposing tokens or personal identity data. Test across browsers.

## Account administration and deletion still requiring backend work

- Account overview should expose identity method, recovery options, trusted sessions, profile editing, account export/request deletion and progress notifications after the actual backing services exist.
- Create a securely authenticated, step-up-protected deletion request endpoint with ownership checks, rate limits, audit trails, explicit confirmation, service coordination, notice and completion updates. A mailto link masquerading as deletion is insufficient.
- Separate deletion of login identity and optional profile from regulated transactional, financial, pharmacovigilance or healthcare records with statutory retention. Document what must be preserved, why, and for how long, and revoke relevant sessions/Apple tokens when appropriate.
- Customer business master records and identity-provider tenants must be reconciled without destroying legitimate company audit records or other users' permissions.
- First-login invitations, mandatory setup and access approvals are actual provisioning security steps and **cannot** be skipped as if they were optional tutorials.
- Implement durable user preference for dismissal only when a verified account setting is available; this PR intentionally uses an optional, accessible disclosure rather than persisting personal state in anonymous storage.

## Acceptance and deployment gates

- Portal typecheck, lint, unit tests, browser acceptance and core security/role-boundary tests pass.
- Authenticated/private deployment verified independently on the production domain; customer and staff test identities exercise allowed/denied operations.
- No additional Apple/Passkey provider displayed until end-to-end Apple Developer/Cognito/Entra integration and live registration, sign-in, recovery, revocation and token checks pass.
- Account deletion and data retention workflow is legal/regulatory reviewed and independently tested before being labeled complete.

This work is a web-adapted interpretation of Apple design guidance, **not** an Apple endorsement or proof that Swift-specific framework capabilities exist on a website.
