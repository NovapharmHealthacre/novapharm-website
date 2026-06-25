# Security Audit

## Issues Found
- Original site was static only and could not securely protect a private client portal.
- No server-controlled session cookies.
- No CSRF implementation.
- No rate limiting for login or enquiry forms.
- No server-side security headers.
- No environment variable validation for secrets.
- No SharePoint credential boundary.

## Implemented
- Node runtime with HttpOnly session cookie.
- Credentials are supplied via environment variables.
- PBKDF2 password hashing script for production password hash generation.
- CSRF endpoint and token validation for state-changing requests.
- Login and contact form rate limiting.
- Security headers: CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy, COOP and X-Content-Type-Options.
- Private `/portal/*` and `/admin/*` protection through server-side routing.

## External Items Required
- Set production `SESSION_SECRET`.
- Generate and set `PORTAL_PASSWORD_HASH` and `PORTAL_PASSWORD_SALT`.
- Use HTTPS in production so secure cookies are enforced.
- Configure Microsoft Graph credentials for SharePoint sync.
