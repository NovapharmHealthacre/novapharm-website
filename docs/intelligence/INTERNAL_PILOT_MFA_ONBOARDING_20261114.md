# Internal second-user MFA onboarding — 14 November 2026

**Status: code candidate, not deployed. Access remains OFF.**

## Evidence from AWS

At approximately 12:10 UTC on 14 November the owner-confirmed second user successfully changed the Cognito invitation password, moving to CONFIRMED status. The OIDC callback later returned HTTP 401 with privacy-preserving CloudWatch reason `identity_email_unverified` at 12:10:43 UTC. Cognito had `email_verified=false` despite the completed invitation. Following the owner's direct confirmation that they received and used the invitation, the verified-email attribute was administratively attested for this account only. Readback: status CONFIRMED, enabled, `email_verified=true`, no TOTP enrolled. This is an administrator assertion based on owner-confirmed invitation possession, **not a Cognito code-challenge proof**.

## Identified second blocker

The deployed application has founder-only first-time TOTP setup restricted to the verified founder identity. The separately nominated account cannot legitimately use that founder path. The current private Lambda alias is on an earlier image; this source patch is NOT the live image.

## Separate pilot-only solution

- New dedicated, default-OFF config gate `NPI_INTERNAL_PILOT_MFA_ENABLED=true` and exact private `NPI_INTERNAL_PILOT_MFA_EMAIL`, provisioned only by an approved deployment operator. Neither is a browser parameter.
- Pinned issuer, client, RSA signature, fresh nonce, 5-minute `auth_time`, verified email and exact allowed pilot email for MFA setup *only*. Signed contradictory MFA claims fail closed.
- Per-user Cognito `GetUser` re-verifies subject/email/verified status/no current MFA. No admin credentials are given to browser.
- The internal pilot uses its own AES-256-GCM cookie/key-domain/AAD and `/auth/internal/mfa/setup` path. It is incompatible with founder onboarding or application sessions, has 10-minute expiry, CSRF protection and strict same-origin POST.
- User receives Cognito `AssociateSoftwareToken` key, scans it using a local authenticator, provides a 6-digit code, `VerifySoftwareToken` checks it and `SetUserMFAPreference` makes it preferred. No code or secret is logged.
- The registration flow explicitly grants **no** founder session, customer session, tenant, billing, source rights or medicine-data permission. After registration the user must begin a **fresh sign-in** with a verified MFA challenge.
- The release requires *all* exact-head tests, code review, portal/browser acceptance, ECR image and Lambda alias provenance, immutable rollback and API Gateway route authorization; verify live on a new sign-in before calling it fixed.

## Operations

After CI passes and the exact image deploys, carefully configure the server-only pilot settings, add GET and POST route for `/auth/internal/mfa/setup` to the same protected application Lambda integration, and verify negative tests. Do not point it at a generic public proxy without the encrypted cookie and role/tenant denials.

If Authenticated identity claims still do not include per-login TOTP evidence due to Cognito rollout, user may see an *identity only* acknowledgement, not a customer access grant. A verified authenticator enrollment is separate from accepted customer account access.

No licence, customer identity impersonation, email invitation or payment changes are part of this patch. NHSBSA/MHRA API integration work remains separate.
