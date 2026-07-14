# Security Test Report

Status: repository tests passed locally; cloud and independent penetration testing pending  
Test date: 14 July 2026

## Executed locally

| Area | Result | Evidence |
|---|---|---|
| Authentication and four scopes | Passed | integration and Entra identity tests |
| Bootstrap and forced change | Passed | production-security and integration tests |
| Old-session invalidation | Passed | password/session tests |
| Customer isolation | Passed for implemented order/catalog/document boundaries | integration tests |
| CSRF and exact origin | Passed | production-security/integration tests |
| Host-header rejection | Passed | production-security test |
| Lockout and rate limiting | Passed | integration tests |
| Private route/file denial | Passed | integration/preview tests |
| Cookie flags and HSTS | Passed in production-mode test server | production-security test |
| Upload extension/MIME/signature limits | Passed for implemented fixtures | integration test |
| Upload bearer tokens absent from URLs | Passed | integration test rejects query-token use |
| Malware release state machine | Passed with deterministic clean/malicious stores | document-scan test |
| Email failure queue and idempotent replay | Passed | two failed contact deliveries entered bounded retry state; administrator replay reused stable provider idempotency keys; account notification and acknowledgement both sent in the controlled mock |
| Unresolved Key Vault references | Passed fail-closed test | secret-resolution test |
| Backup and isolated restore | Passed for SQLite | backup-restore test |

`npm run check` completed successfully on 14 July 2026: 33 public pages, six articles, 40 locked shells, 1,906 local links, 62 JavaScript/MJS/TypeScript syntax checks, nine stylesheets and 281 repository files in the current-tree scanner. The intentionally simulated Resend HTTP 503 is logged in the integration test and is expected evidence of the retry path.

`npm audit --omit=dev --audit-level=high` was executed locally and returned exit code 1 because the sandbox could not resolve `registry.npmjs.org` (`ENOTFOUND`), so the local invocation produced no vulnerability result. GitHub Production readiness run 32 subsequently completed the locked install, this audit command and `npm run check` successfully.

## Cloud tests still required

- real Entra token/issuer/audience/MFA and Conditional Access;
- real Azure SQL injection/least-privilege/connection-resilience validation;
- real Defender for Storage tag handling and malicious test sample under an approved safe procedure;
- Blob/SharePoint direct-access and IDOR tests;
- Key Vault network/reference failure tests;
- App Service forwarded-header, caching, CORS and custom-domain origin tests;
- dynamic XSS, SQL injection, path traversal, MIME confusion, open redirect and session-fixation scans against staging;
- independent penetration test by an authorised specialist.

No penetration test is claimed.
