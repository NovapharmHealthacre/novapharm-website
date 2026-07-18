# Local Owner Portal Implementation

Date: 18 July 2026
Branch: `backend/activate-forms-portal-sql`
Pull request: PR 10
Environment: zero-cost local validation only

## Implemented

- Private localhost lifecycle at `127.0.0.1:4173`.
- Owner identity `Vishal Chakravarty` with admin role and customer, employee, board and admin scopes.
- One-time cryptographic bootstrap password generated outside Git.
- Mandatory first-login password change and old-session invalidation.
- Automatic deletion of the protected temporary credential handoff after successful password change.
- Owner-only runtime files outside the repository.
- Synthetic SQLite dataset covering customers, contacts, products, suppliers, orders, invoices, purchase orders, leads, account applications, notifications, documents, audit and security events.
- TEST or DEMO naming for every seeded company.
- Local email capture with HTML and text previews; no external delivery.
- Sent, retrying, blocked and replay email states.
- Local document quarantine and explicitly synthetic clean-test transitions.
- No SharePoint event for locally validated document promotion.
- Customer, employee, board, Executive Platform and administrator owner review index.
- Local live and readiness aliases at `/api/live` and `/api/ready`.
- Strict local origin, host, data-root and external-secret controls.
- Automated local owner acceptance test.
- Verified local backup and isolated restore workflow.

## Deliberately Disabled

- Azure and all paid resources.
- Microsoft Entra and External ID.
- Microsoft Graph and SharePoint delivery.
- Resend and external email.
- Production analytics.
- Production DNS and domains.
- GitHub Pages changes.
- Real customer, supplier, employee or board data.
- Production malware scanning.

## Validation Meaning

The local portal proves the application workflows and access boundaries using synthetic data. It does not establish production readiness for live pharmaceutical operations, Microsoft 365 access, real email delivery, production identity, cloud storage, production malware scanning or regulated records.

## Executed Validation

All results below were genuinely executed again on 18 July 2026 using Node.js 24.14.0.

| Validation | Result |
|---|---|
| Locked dependency install | Passed; 265 packages installed from the lockfile |
| Full `npm run check` workflow | Passed |
| Build and generated pages | Passed; 34 public pages, 6 Insights articles and 5 leadership entities |
| Link validation | Passed; 2,145 local links and assets |
| Public claims audit | Passed for 34 indexable pages |
| Local owner acceptance | Passed; 18 customer, 13 employee, 19 board/executive and 5 admin routes |
| Contact workflow | Passed with local capture and no external request |
| Account application | Passed for submit, duplicate protection, upload recovery and controlled upload |
| Password and session controls | Passed for forced change, old-password rejection, revocation, expiry, logout, lockout and rate limiting |
| Document controls | Passed for quarantine, synthetic clean-test promotion and suppression of local SharePoint delivery |
| Browser workflows | Passed in Chromium and WebKit for contact, account application, upload, local email preview and administrator review |
| Full rendered acceptance | Passed; 1,316 page renders, 1,316 Axe scans, 1,464 screenshots and 0 issues across 7 viewports in both engines |
| Dependency audit | Passed; 0 known vulnerabilities reported by npm |
| Current-tree secret scan | Passed; 3.48 GB scanned with no leak finding |
| Git-history secret scan | Passed across all pre-final reachable commits with no leak finding |
| Local lifecycle | Passed; launcher reached both live and ready health gates on `127.0.0.1:4173` |
| Persistent file permissions | Passed; environment, SQLite, WAL, SHM and credential handoff use owner-only permissions |
| Backup and isolated restore | Passed with checksum, integrity, foreign-key and record-count reconciliation |

The generated browser evidence is kept under the ignored local `artifacts/visual-acceptance-local-owner/` directory and is not committed because it contains local review state. GitHub's existing browser-acceptance workflow regenerates short-retention evidence for the pull request.

## Owner Acceptance Gate

The existing owner identity is active with customer, employee, board and administrator scopes. Its credential fingerprint, credential version 2, permanent-password state and active-session set remained unchanged across the verified startup; no bootstrap handoff was created or required. The service is available only on `127.0.0.1:4173` for owner review and remains unsuitable for live records or regulated operations.
