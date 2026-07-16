# Local Owner Portal Implementation

Date: 16 July 2026
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

All results below were genuinely executed on 16 July 2026 using Node.js 24.14.0.

| Validation | Result |
|---|---|
| Locked dependency install | Passed; 265 packages installed from the lockfile |
| Full `npm run check` workflow | Passed |
| Build and generated pages | Passed; 33 public pages, 6 Insights articles and 5 leadership entities |
| Link validation | Passed; 2,069 local links and assets |
| Public claims audit | Passed for 33 indexable pages |
| Local owner acceptance | Passed; 18 customer, 13 employee, 19 board/executive and 5 admin routes |
| Contact workflow | Passed with local capture and no external request |
| Account application | Passed for submit, duplicate protection, upload recovery and controlled upload |
| Password and session controls | Passed for forced change, old-password rejection, revocation, expiry, logout, lockout and rate limiting |
| Document controls | Passed for quarantine, synthetic clean-test promotion and suppression of local SharePoint delivery |
| Browser workflows | Passed in Chromium and WebKit for contact, account application, upload, local email preview and administrator review |
| Full rendered acceptance | Passed; 616 page renders, 616 axe scans, 764 screenshots and 0 issues across 7 viewports in both engines |
| Dependency audit | Passed; 0 known vulnerabilities reported by npm |
| Current-tree secret scan | Passed |
| Git-history secret scan | Passed; 40 reachable commits scanned with no leak finding |
| Local lifecycle | Passed; launcher reached both live and ready health gates on `127.0.0.1:4173` |
| Persistent file permissions | Passed; environment, SQLite, WAL, SHM and credential handoff use owner-only permissions |
| Backup and isolated restore | Passed with checksum, integrity, foreign-key and record-count reconciliation |

The generated browser evidence is kept under the ignored local `artifacts/visual-acceptance-local-owner/` directory and is not committed because it contains local review state. GitHub's existing browser-acceptance workflow regenerates short-retention evidence for the pull request.

## Owner Acceptance Gate

The local service is technically ready. The remaining owner step is to use the protected temporary handoff, sign in, and complete the mandatory password change. Until that owner-only step occurs, the temporary handoff remains on the Mac with mode `0600`. The application deletes it automatically when the change succeeds.
