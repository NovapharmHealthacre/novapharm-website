# Azure Deployment Runbook

Status: automated workflow implemented; no Azure run executed

## Staging release

1. Confirm branch CI and infrastructure validation pass.
2. Confirm `azure-staging` non-secret variables are present.
3. Run `Controlled Azure deployment`: `staging`, `what-if`, migrations off.
4. Review changes and obtain cost/tenant approval.
5. Run again with `provision` to create infrastructure without deploying the application.
6. Enter staging-only Key Vault secrets and create the least-privilege SQL identities through the approved private path.
7. Confirm staging SQL migration identity permission and an empty staging database.
8. Run again with `deploy`; enable schema migration only during the approved migration window.
9. Require `/api/health` HTTP 200, database ready and noindex headers.
10. Run contact, account, transactional-email delivery/retry, role, upload, visual, accessibility, security and recovery acceptance using test-only data.

## Production candidate

1. Merge only after repository blockers pass and owner approves the pull request.
2. From `main`, run target `production-candidate`, action `what-if`.
3. Review the exact Azure change set.
4. Run `provision`, seed independent candidate secrets and identities, then run `deploy` to the candidate slot. Perform production data migration only after a verified final backup.
5. Confirm Key Vault references, Entra/MFA, Azure SQL, Blob scanning, SharePoint least privilege, Resend delivery plus queued replay, monitoring and alerts.
6. Complete the production acceptance report.

## Slot swap and DNS

Slot swap, custom-domain binding, DNS edits and GitHub Pages retirement are separate owner-controlled actions. Record current DNS first; preserve MX, SPF, DKIM, DMARC, Microsoft 365 and verification records. Change only conflicting website records. Keep the previous Azure package and GitHub Pages details for rollback.

## Abort conditions

Abort for any secret exposure, failed authorisation/customer isolation, unhealthy database, public Blob/document access, missing malware gate, unresolved Key Vault reference, failed backup restore, broken canonical routes, material visual/accessibility defect or unexplained 5xx/error-rate increase.
