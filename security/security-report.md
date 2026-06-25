# Security Report

## Implemented Controls
- Server-side portal and admin route protection.
- Environment-based credential configuration.
- Optional PBKDF2 password hash verification.
- HttpOnly session cookie.
- CSRF token endpoint and validation.
- Login and contact form rate limits.
- Content Security Policy.
- Referrer and permissions restrictions.

## Required Production Configuration
Run:

```sh
PORTAL_PASSWORD=***REMOVED*** npm run hash:password
```

Store the generated `PORTAL_PASSWORD_SALT` and `PORTAL_PASSWORD_HASH` as production environment variables. Do not store plaintext passwords in the repository.
