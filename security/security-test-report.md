# Security Test Report

Status: repository and local runtime suites passed; cloud and independent penetration testing pending
Test date: 15 July 2026

## Executed locally

| Area | Result | Evidence |
|---|---|---|
| Authentication and four scopes | Passed | integration and Entra identity tests |
| Bootstrap and forced change | Passed | production-security and integration tests |
| Old-session invalidation | Passed | password/session tests |
| Customer isolation | Passed for implemented order, catalogue and document boundaries | integration tests |
| CSRF, exact origin and host validation | Passed | production-security/integration tests |
| Lockout and rate limiting | Passed | integration tests |
| Private route/file denial | Passed | integration/preview tests |
| Cookie flags, HSTS and private caching | Passed in production-mode test server | production-security test |
| Upload extension/MIME/signature limits | Passed for implemented fixtures | integration test |
| Upload query-token rejection | Passed | integration test |
| Malware release state machine | Passed with deterministic clean/malicious stores | document-scan test; live Defender not claimed |
| Email failure queue and idempotent replay | Passed | controlled mock provider tests |
| Unresolved Key Vault references | Passed fail-closed test | secret-resolution test |
| Backup and isolated restore | Passed for SQLite | backup-restore test |
| Cross-browser/axe acceptance | Passed | 616 page states and 616 axe scans in Chromium/WebKit |
| Browser contact/application/admin workflow | Passed | Chromium and WebKit synthetic workflow test |
| Current-tree and reachable-history secret scan | Passed | Gitleaks directory and Git-history scans with redaction |
| Production dependency audit | Passed | `npm audit --omit=dev --audit-level=high`, zero vulnerabilities |

`npm run check` completed successfully on 15 July 2026 after the backend activation implementation. It covered 33 public pages, six articles, five leadership entities, protected Executive modules, contact and account workflows, role boundaries, session controls, Azure SQL migration structure, document quarantine, cookie consent and SQLite backup/restore. The intentionally simulated email-provider HTTP 503 is expected evidence of the bounded retry path.

`npm audit --omit=dev --audit-level=high` completed with exit code 0 and reported zero vulnerabilities. Gitleaks scanned the current directory and 179 reachable commits with redaction and reported no leaks. The repository scanner and Azure SQL migration validator also passed.

History sanitisation removed the retired value from all owner-writable active branches and tags, and Gitleaks reported zero findings. GitHub-managed read-only pull-request refs 1-4 still retain nine historical matches, so complete remote-object purge remains blocked on GitHub Support. Rotation remains mandatory because rewriting cannot erase external clones, forks or caches.

## Cloud tests still required

- real Entra token, issuer, audience, MFA and licensed-policy behaviour;
- Azure SQL least privilege, injection resistance and connection-resilience validation;
- Blob/SharePoint direct-access and IDOR tests;
- App Service forwarded-header, caching, CORS and generated-host origin tests;
- dynamic XSS, SQL injection, path traversal, MIME confusion, open redirect and session-fixation scans against Azure validation;
- independent penetration test by an authorised specialist.

No penetration test, live Defender scan, Azure deployment or production security acceptance is claimed.
