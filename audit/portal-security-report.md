# Enterprise Portal Security Report

**Review date:** 17 July 2026  
**Assessment:** Automated application controls passed; two external checks pending

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
| Repository policy scanner | Passed | Current candidate tree; zero policy findings |
| Gitleaks current working tree | Passed | Approximately 1.04 GB scanned; zero findings |
| Gitleaks all reachable branches and tags | Passed | All reachable candidate history; zero findings |

Gitleaks was run with full redaction. No credential value was printed or added to this report.

## Security Test Results

Passed suites covered authentication, authorisation, customer isolation, CSRF, forced password change, old-password rejection, session restart, session expiry, lockout, rate limiting, secure headers, host/origin enforcement, protected files, database migration, Key Vault reference failure, document quarantine, browser-validation isolation and backup restoration.

The complete `npm run check` workflow also passed from a detached clean checkout under Node.js 24.14.0. Regeneration caused no tracked-file drift.

## Pending Checks

1. `npm audit --omit=dev --audit-level=high` could not contact the official npm advisory service because external network permission was unavailable. It is **not reported as passed**.
2. The current Chromium/WebKit acceptance run could not start its isolated localhost server because the desktop environment denied the port-opening action. It is **not reported as passed**.

## Production Boundary

This report does not constitute an independent penetration test, regulatory approval, production accreditation or SharePoint permission approval. Production identity, Microsoft Graph, SharePoint, email and hosting credentials remain owner-controlled deployment gates.
