# Security Test Report

Status: repository, local runtime and exact-pushed-SHA security suites passed; cloud and independent penetration testing pending
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
| JSON response injection boundary | Passed | safe-JSON unit test and production/integration server suites |
| Browser contact/application/admin workflow | Passed | Chromium and WebKit synthetic workflow test |
| Current-tree and reachable-history secret scan | Passed | Gitleaks directory and Git-history scans with redaction |
| Dependency audits | Passed | full and production-only `npm audit --audit-level=high`, zero vulnerabilities |
| Exact-SHA CodeQL | Passed | GitHub CodeQL workflow and Advanced Security CodeQL check on security-source commit `b9a2f25a0f09463ef3f50498ce039c2b299c8183` |
| Exact-SHA dependency review | Passed | GitHub Supply chain workflow on security-source commit `b9a2f25a0f09463ef3f50498ce039c2b299c8183` |
| Software bill of materials | Passed | CycloneDX SBOM generated with 450 components and SHA-256 checksum |
| Workflow provenance | Passed locally | 53 third-party action uses are pinned to immutable SHAs across 16 workflows |
| Dependency licences | Passed | 524 dependency records satisfy the repository licence policy |
| Reproducible dependency graph | Passed | `npm ci --ignore-scripts` and exact `pnpm@11.9.0 --frozen-lockfile --lockfile-only` validation |
| Azure template security contract | Passed with synthetic compile parameters | all Bicep modules and eight environment parameter sets compiled; free-validation and unified-estate topology validators passed |

`npm run check` completed successfully on 9 August 2026 against the current working candidate. It covered all six applications, workspace type checking and tests, 5,900 governed requirements, claims and content validation, SEO and structured data, portal classification, role and customer isolation, CSRF and origin controls, Azure SQL migration structure, document quarantine, cookie consent, backup/restore and secret scanning. The intentionally simulated email-provider HTTP 503 remains expected evidence of the bounded retry path.

The six-application rendered matrix produced 2,510 genuine screenshots and 526 Axe runs in Chromium and Playwright WebKit, with zero serious or critical accessibility findings. The portal portion covered 54 governed modules, 47 visible informational modules, ten viewports, protected-route denial, role-specific navigation, search, read-only, hidden-route, loading, access-denied and session-expiry states using synthetic records only. A separate legacy/public workflow matrix also passed contact, account application, upload, local email preview and administrator review in both engines.

The current-tree and active-history Gitleaks 8.30.1 scans completed with exit code 0. Both full and production-only dependency audits reported zero vulnerabilities. The supply-chain gate validated immutable workflow references, lockfiles, licence policy, changesets and release governance. A CycloneDX SBOM containing 450 components was generated as ignored build evidence; release artifacts for Corporate, NIT, Founder, Portal, API and Status passed checksum and runtime-content validation.

Local CodeQL-driven remediations now use structured HTML parsing, bounded validation, descriptor-stable file reads, escaped JSON responses, atomic constrained file/network sinks, keyed HMAC digests and exact portal access contracts. The exact-pushed-SHA [CodeQL workflow](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/31322026769), separate Advanced Security CodeQL check and [dependency-review workflow](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/31322026724) passed for security-source commit `b9a2f25a0f09463ef3f50498ce039c2b299c8183`.

The remaining HIBP protocol and constrained file-sink alerts were reviewed individually and dismissed as false positives with source-specific audit comments; no query, security workflow or analysis scope was disabled. The PR has zero open CodeQL alerts after that review. The default branch still has one high-severity Dependabot alert for development dependency `sharp` below 0.35.0. The candidate pins `sharp` 0.35.3, passes dependency review and reports zero full or production audit findings; the default-branch alert remains open until this candidate is merged and must not be described as remediated on `main` beforehand.

## Reviewed CodeQL boundaries

| Boundary | Source review and compensating controls | Disposition |
|---|---|---|
| API JSON response | Payloads are JSON encoded, then `<`, `>`, `&`, U+2028 and U+2029 are escaped before a no-store `application/json` response with `nosniff`; the data model is verified by a round-trip test. | Remediated in source; exact-SHA CodeQL passed |
| HIBP range digest | The Pwned Passwords k-anonymity protocol requires a transient SHA-1 digest. Only the first five hexadecimal characters leave the process; neither digest nor password is stored. Local password verification remains PBKDF2 based. | Individually reviewed protocol-specific false positive; auditable GitHub dismissal recorded |
| Product-media acquisition | Both source URL and repository destination come from a reviewed allowlist; redirects are rejected; byte size, MIME type, file signature and dimensions are checked before an exclusive temporary write and atomic rename. | Individually reviewed controlled build sink; auditable GitHub dismissal recorded |
| SharePoint secure-content sync | Names and extensions are allowlisted, paths are confined to the private content root, size is checked before and after transformation, and exclusive temporary writes are atomically renamed with restrictive modes. No synced file is served anonymously. | Individually reviewed controlled private integration sink; auditable GitHub dismissal recorded |

History sanitisation removed the retired value from all owner-writable active branches and tags, and Gitleaks reported zero findings. GitHub-managed read-only pull-request refs 1-4 still retain nine historical matches, so complete remote-object purge remains blocked on GitHub Support. Rotation remains mandatory because rewriting cannot erase external clones, forks or caches.

## Cloud tests still required

- real Entra token, issuer, audience, MFA and licensed-policy behaviour;
- Azure SQL least privilege, injection resistance and connection-resilience validation;
- Blob/SharePoint direct-access and IDOR tests;
- App Service forwarded-header, caching, CORS and generated-host origin tests;
- dynamic XSS, SQL injection, path traversal, MIME confusion, open redirect and session-fixation scans against Azure validation;
- independent penetration test by an authorised specialist.

No penetration test, live Defender scan, Azure deployment or production security acceptance is claimed.
