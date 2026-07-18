# Enterprise Portal Security Report

**Review date:** 18 July 2026
**Assessment:** Repository, browser, advisory and local-runtime controls passed; production external controls remain owner-gated

## Controls Verified

- Credentials are verified server-side and never embedded in generated portal HTML.
- Customer, employee, board and administrator access is enforced by server-side scopes.
- Customer queries require an authenticated customer mapping and were tested against a second synthetic customer.
- Customer cross-account return access is rejected.
- Board access is read-only for governed enterprise actions.
- Protected content is served from `_secure` with `no-store` and `noindex` headers.
- Direct storage paths and confidential document URLs are not exposed in module payloads.
- Mutating requests require CSRF and applicable role/scope checks.
- Sessions rotate at authentication, persist server-side, expire by idle and absolute limits, and are invalidated after password change.
- Login throttling, lockout, generic errors and audit/security events are active.
- Product and supplier creation always begins in controlled draft/prospect status, regardless of browser input.
- Nutraxin activation is blocked without regulatory classification, approved claims evidence and sale approval.
- Parameterised SQL and an injection-shaped search test passed.
- Uploaded documents remain quarantined until a clean scan result; malicious test content never reaches SharePoint.
- Portal and authenticated records are excluded from optional analytics.

## Secret Scanning

| Scan | Result | Evidence |
| --- | --- | --- |
| Repository policy scanner | Passed | 771 repository files; zero policy findings |
| Gitleaks current working tree | Passed | 3.48 GB scanned with full redaction; zero findings |
| Gitleaks all reachable branches and tags | Passed | All pre-final reachable commits and refs scanned; zero findings |

Gitleaks was run with full redaction. No credential value was printed or added to this report.

## Security Test Results

Passed suites covered authentication, authorisation, customer isolation, CSRF, forced password change, old-password rejection, session restart, session expiry, lockout, rate limiting, secure headers, host/origin enforcement, protected files, database migration, Key Vault reference failure, document quarantine, browser-validation isolation and backup restoration.

The complete `npm run check` workflow passed under Node.js 24.14.0 after the browser remediation. The production dependency advisory query completed against npm and reported zero vulnerabilities. The local browser matrix completed 1,316 page renders and Axe scans with zero findings after remediation.

The owner-local acceptance suite passed 18 customer, 13 employee, 19 board/executive and five administrator routes. It also passed forced password change, old-password rejection, revocation, expiry, logout, lockout, rate limiting, customer isolation, document quarantine and zero-external-request assertions. Existing owner credential material, credential version, password-change state, scopes and active-session set were unchanged across startup.

## Remaining Checks

1. GitHub Actions must repeat the production-readiness and browser workflows against the exact pushed commit.
2. An independent penetration test remains a production requirement; none is claimed here.
3. Azure, Entra, Microsoft Graph, SharePoint ACL, production email, production malware scanning and hosted network controls remain external deployment gates.

## Production Boundary

This report does not constitute an independent penetration test, regulatory approval, production accreditation or SharePoint permission approval. Production identity, Microsoft Graph, SharePoint, email and hosting credentials remain owner-controlled deployment gates.
