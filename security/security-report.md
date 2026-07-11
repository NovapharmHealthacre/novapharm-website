# Security Report

## Implemented Controls

- Server-side protection and role checks for `/portal/*`, `/employee/*`, `/admin/*`, root Executive Platform pages and protected documents.
- GitHub Pages-safe public portal shells with no dashboard bindings, records or controlled files.
- Runtime-only secure content root, excluded from the public Git repository and configured with `SECURE_CONTENT_ROOT`.
- HTTP static fallback denylist for runtime data, source code, integration code, architecture/audit records, dotfiles and root configuration files.
- Customer, employee, board and administrator access scopes. The initial Vishal account has all four scopes; additional users use hashed `PORTAL_USERS_JSON` records.
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
PORTAL_PASSWORD='a temporary local password' node scripts/generate-password-hash.mjs
```

Store the generated `PORTAL_PASSWORD_SALT` and `PORTAL_PASSWORD_HASH` as production environment variables. Do not deploy `PORTAL_PASSWORD` in production.

## Remaining Security Work

- Connect Microsoft Entra ID for real employee and customer SSO.
- Add persistent server-side session storage for multi-instance hosting.
- Add malware scanning for uploaded documents before SharePoint synchronization.
- Complete legal privacy/cookie review before enabling analytics tags.
- Configure production backups, retention and disaster recovery.
- Deploy the Node runtime and mount private content before inviting users; GitHub Pages is only the public website surface.
