# Security Audit

## Issues Found

- Original public site could not securely protect customer or employee portals.
- No server-side sessions, CSRF checks, rate limits or security headers.
- No environment validation for secrets.
- No controlled document upload boundary.
- No audit trail for customer onboarding, orders, documents or integration events.
- No safe failure state for SharePoint or warehouse integrations when credentials are absent.

## Implemented

- Secure Node runtime with protected private routes.
- HMAC-signed sessions and expiry.
- CSRF validation for login, logout, contact, applications, uploads, orders, POs and sync actions.
- Rate limits for login, contact, account application and application document upload.
- Security headers and production HSTS.
- Password hash generation script and environment-only credential model.
- Document upload type/size controls.
- Canonical audit log table and audit writes in domain/integration flows.
- SharePoint and Polar Speed events move to `blocked` with explicit error codes when credentials/contracts are missing.

## External Items Required

- Production `SESSION_SECRET`.
- Production `PORTAL_PASSWORD_HASH` and `PORTAL_PASSWORD_SALT`.
- HTTPS-enabled hosting.
- Microsoft Entra ID app registration for production SSO.
- Microsoft Graph app registration and SharePoint permissions.
- Polar Speed/Marken API contract and credentials.
- Final legal/regulatory review of public claims and portal terms.
