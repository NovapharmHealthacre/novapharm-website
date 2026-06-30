# Security Report

## Implemented Controls

- Server-side protection for `/portal/*`, `/employee/*`, `/admin/*`, root Executive Platform pages and protected documents.
- HMAC-signed session cookie with expiry.
- HttpOnly session cookie and `SameSite=Lax`.
- CSRF token endpoint and CSRF validation on state-changing routes.
- Login, contact, application and document-upload rate limits.
- PBKDF2 password hash generation for the initial admin credential.
- Production plaintext password fallback disabled.
- Content Security Policy, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` and COOP headers.
- API responses use `Cache-Control: no-store`.
- Upload limits and content-type allow-list for controlled documents.
- Integration events block safely when credentials are missing rather than faking success.
- Audit logs for lead creation, application submission, customer activation, product/supplier/order/PO creation, documents and integration outcomes.

## Production Requirements

Run:

```sh
PORTAL_PASSWORD=Vish123 node scripts/generate-password-hash.mjs
```

Store the generated `PORTAL_PASSWORD_SALT` and `PORTAL_PASSWORD_HASH` as production environment variables. Do not deploy `PORTAL_PASSWORD` in production.

## Remaining Security Work

- Connect Microsoft Entra ID for real employee and customer SSO.
- Add persistent server-side session storage for multi-instance hosting.
- Add malware scanning for uploaded documents before SharePoint synchronization.
- Complete legal privacy/cookie review before enabling analytics tags.
- Configure production backups, retention and disaster recovery.
