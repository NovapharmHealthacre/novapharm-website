# Security Audit

## Findings Resolved

- Replaced in-memory sessions and rate limits with persistent database records.
- Added PBKDF2-SHA256 credential provisioning, constant-time password comparison, failed-attempt lockout and security events.
- Removed plaintext portal credentials from tracked files; production rejects `PORTAL_PASSWORD`.
- Enforced customer, employee, board and administrator scopes at API and static-file boundaries.
- Added CSRF double-submit tokens, foreign-origin rejection, HMAC-signed session IDs and secure cookie settings.
- Added CSP, HSTS in production, frame denial, MIME sniffing protection, referrer and permissions policies.
- Denied source, database, audit, integration, deployment, dotfile and private-content paths from static serving.
- Added request-size, upload-size, extension, MIME and file-signature controls.
- Added expiring account-application upload tokens and private persistent document paths.
- Added contact consent records, honeypot handling and safe visitor messages.
- Added auditable notification and integration failure states without secret/provider leakage.

## Residual Controls Requiring External Services

- Microsoft Entra SSO and conditional access for real employee, board and customer identities.
- Malware scanning before a draft upload can become an approved controlled document.
- Approved privacy, retention, incident-response and portal terms.
- Off-host encrypted backups and restore exercises.
- Board-only SharePoint permissions: the Executive Platform currently inherits site Owners, Members and Visitors groups. There is no anonymous link, but a SharePoint administrator must break inheritance and assign the approved board group.
