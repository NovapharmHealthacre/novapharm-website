# Security Report

## Implemented Controls

- Persistent server-side identities, PBKDF2-SHA256 credentials, access scopes, sessions, lockouts, rate limits and security events.
- One-time administrator bootstrap, forced first-login password change, password-breach range checking, credential versioning and all-session invalidation after a change.
- HMAC-signed session IDs with expiry; `Secure`, `HttpOnly` and `SameSite=Lax` session cookie in production.
- Customer, employee, board and administrator authorisation at route and API boundaries.
- CSRF double-submit protection and production browser-origin validation for every state change.
- Public static denylist for private content, source, database, architecture, audit, security, integration and deployment files.
- Data-free public shells for every protected route.
- Production HSTS, frame denial, MIME sniffing protection, COOP, CORP, referrer and permissions policies. Public CSP disallows inline code; authenticated legacy Executive Platform files receive a private-root-only inline allowance.
- Controlled input lengths, enum validation, email validation, privacy acknowledgement, patient-data safety declaration, duplicate suppression and spam honeypot.
- 512 KB JSON body limit and 10 MB document limit.
- Expiring onboarding upload token; private persistent storage with restrictive file modes.
- Extension, MIME and basic signature validation for PDF, JPEG, PNG, CSV, DOCX and XLSX.
- Draft lifecycle status and audit/outbox records for uploaded evidence.
- Safe blocked/retry states for Graph, warehouse and email integrations.
- Health endpoint exposes service readiness and version, not secrets.
- Browser CSP permits same-origin connections only; the password-breach range request is made server-side and never exposes the complete password.

## Credential Procedure

The owner enters the temporary value only through Render's protected `BOOTSTRAP_ADMIN_PASSWORD` input. The service stores only a unique salt and PBKDF2 hash, requires a replacement at first login, rejects reuse and common or known-compromised values, revokes all other sessions, and records the event. The bootstrap environment variable must then be deleted. The server refuses a plaintext `PORTAL_PASSWORD` in production.

## Required Before User Invitation

- Enable Microsoft Entra ID SSO, MFA and conditional access.
- Add malware scanning and quarantine release before approving uploaded evidence.
- Configure encrypted off-host backups and complete a restore test.
- Approve privacy notice, portal terms, retention schedule and incident process.
- Break inherited SharePoint permissions on the Executive Platform and assign only board/administrator groups.
- Complete an independent penetration test before storing real customer, employee or regulated records.

## Verification Boundary

The 201-file current candidate scan passes and ignored runtime/private paths contain no local administrator credential or active session. This is not a full-history result: the retired credential remains in affected remote Git history and requires the separate owner-approved sanitisation runbook, all-ref scan and GitHub secret-scan acceptance.
