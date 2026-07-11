# Security Report

## Implemented Controls

- Persistent server-side identities, PBKDF2-SHA256 credentials, access scopes, sessions, lockouts, rate limits and security events.
- HMAC-signed session IDs with expiry; `Secure`, `HttpOnly` and `SameSite=Lax` session cookie in production.
- Customer, employee, board and administrator authorisation at route and API boundaries.
- CSRF double-submit protection and production browser-origin validation for every state change.
- Public static denylist for private content, source, database, architecture, audit, security, integration and deployment files.
- Data-free public shells for every protected route.
- Production HSTS, frame denial, MIME sniffing protection, COOP, CORP, referrer and permissions policies. Public CSP disallows inline code; authenticated legacy Executive Platform files receive a private-root-only inline allowance.
- Controlled input lengths, enum validation, email validation, consent evidence and spam honeypot.
- 512 KB JSON body limit and 10 MB document limit.
- Expiring onboarding upload token; private persistent storage with restrictive file modes.
- Extension, MIME and basic signature validation for PDF, JPEG, PNG, CSV, DOCX and XLSX.
- Draft lifecycle status and audit/outbox records for uploaded evidence.
- Safe blocked/retry states for Graph, warehouse and email integrations.
- Health endpoint exposes service readiness and version, not secrets.

## Credential Procedure

Generate an administrator hash in a controlled terminal:

```sh
PORTAL_PASSWORD='temporary value entered locally' npm run hash:password
```

Store only `PORTAL_PASSWORD_SALT` and `PORTAL_PASSWORD_HASH` in production. The server refuses a plaintext `PORTAL_PASSWORD` when `NODE_ENV=production`.

## Required Before User Invitation

- Enable Microsoft Entra ID SSO, MFA and conditional access.
- Add malware scanning and quarantine release before approving uploaded evidence.
- Configure encrypted off-host backups and complete a restore test.
- Approve privacy notice, portal terms, retention schedule and incident process.
- Break inherited SharePoint permissions on the Executive Platform and assign only board/administrator groups.
- Complete an independent penetration test before storing real customer, employee or regulated records.
