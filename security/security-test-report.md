# Security Test Report

Status: repository and local runtime suites passed; exact-pushed-SHA, cloud and independent penetration testing pending
Test date: 9 August 2026

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
| Cross-browser/axe acceptance | Passed | 2,510 screenshots and 526 Axe runs across six applications in Chromium/WebKit |
| Browser contact/application/admin workflow | Passed | Chromium and WebKit synthetic workflow test |
| Current-tree and reachable-history secret scan | Passed | Gitleaks directory and Git-history scans with redaction |
| Dependency audits | Passed | full and production-only `npm audit --audit-level=high`, zero vulnerabilities |
| Software bill of materials | Passed | CycloneDX SBOM generated with 450 components and SHA-256 checksum |
| Workflow provenance | Passed locally | 53 third-party action uses are pinned to immutable SHAs across 16 workflows |
| Dependency licences | Passed | 524 dependency records satisfy the repository licence policy |
| Reproducible dependency graph | Passed | `npm ci --ignore-scripts` and exact `pnpm@11.9.0 --frozen-lockfile --lockfile-only` validation |
| Azure template security contract | Passed with synthetic compile parameters | all Bicep modules and eight environment parameter sets compiled; free-validation and unified-estate topology validators passed |

`npm run check` completed successfully on 9 August 2026 against the current working candidate. It covered all six applications, workspace type checking and tests, 5,900 governed requirements, claims and content validation, SEO and structured data, portal classification, role and customer isolation, CSRF and origin controls, Azure SQL migration structure, document quarantine, cookie consent, backup/restore and secret scanning. The intentionally simulated email-provider HTTP 503 remains expected evidence of the bounded retry path.

The six-application rendered matrix produced 2,510 genuine screenshots and 526 Axe runs in Chromium and Playwright WebKit, with zero serious or critical accessibility findings. The portal portion covered 54 governed modules, 47 visible informational modules, ten viewports, protected-route denial, role-specific navigation, search, read-only, hidden-route, loading, access-denied and session-expiry states using synthetic records only. A separate legacy/public workflow matrix also passed contact, account application, upload, local email preview and administrator review in both engines.

The current-tree and active-history Gitleaks 8.30.1 scans completed with exit code 0. Both full and production-only dependency audits reported zero vulnerabilities. The supply-chain gate validated immutable workflow references, lockfiles, licence policy, changesets and release governance. A CycloneDX SBOM containing 450 components was generated as ignored build evidence; release artifacts for Corporate, NIT, Founder, Portal, API and Status passed checksum and runtime-content validation.

Local CodeQL-driven remediations now use structured HTML parsing, bounded validation, descriptor-stable file reads, constrained file/network sinks, keyed HMAC digests and exact portal access contracts. CodeQL and dependency-review conclusions must still be rerun on the exact pushed candidate SHA; the earlier PR head is not accepted as evidence for this increment.

History sanitisation removed the retired value from all owner-writable active branches and tags, and Gitleaks reported zero findings. GitHub-managed read-only pull-request refs 1-4 still retain nine historical matches, so complete remote-object purge remains blocked on GitHub Support. Rotation remains mandatory because rewriting cannot erase external clones, forks or caches.

## Cloud tests still required

- real Entra token, issuer, audience, MFA and licensed-policy behaviour;
- Azure SQL least privilege, injection resistance and connection-resilience validation;
- Blob/SharePoint direct-access and IDOR tests;
- App Service forwarded-header, caching, CORS and generated-host origin tests;
- dynamic XSS, SQL injection, path traversal, MIME confusion, open redirect and session-fixation scans against Azure validation;
- independent penetration test by an authorised specialist.

No penetration test, live Defender scan, Azure deployment or production security acceptance is claimed.
