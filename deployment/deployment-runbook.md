# Unified Azure Deployment Runbook

Status: six-application workflow implemented; no Azure run executed
Last reviewed: 1 August 2026

## Staging release

1. Confirm production-readiness, browser-acceptance and infrastructure workflows pass on the exact reviewed SHA.
2. Confirm the owner approved the Azure subscription, region and complete cost estimate.
3. Configure the protected `azure-staging` GitHub Environment and repository-scoped Azure OIDC credential.
4. Run **Controlled unified Azure deployment** with `staging`, `what-if`, the full 40-character SHA and migrations off.
5. Review the change set. Abort for unrelated deletion, public SQL/Blob/vault access or an unapproved paid service.
6. Run `provision` with the same SHA to create infrastructure without application packages.
7. Enter staging-only secrets in the separate API and portal vaults through the protected Azure screen. Remove the temporary `/32` vault rule immediately.
8. Create least-privilege staging SQL users, test SharePoint access and synthetic email routing. Use no production data or credentials.
9. Run `deploy` with the same SHA. Enable migrations only during the reviewed temporary migration-permission window.
10. Require all six generated hosts to pass health/noindex smoke checks.
11. Run contact, account, notification retry, role, customer-isolation, upload/quarantine, visual, accessibility, security and recovery acceptance using synthetic data.

## Production candidate

1. Merge only after the pull request is current, reviewed and all repository blockers pass.
2. Dispatch from current `main` with target `production-candidate`, action `what-if` and the exact current main SHA.
3. Review cost and every Azure change. Then run `provision` using the same SHA.
4. Enter independent production and candidate secrets; configure production and candidate SQL identities separately.
5. Create and verify the final source backup before any approved production migration.
6. Run `deploy` to all six `candidate` slots. The workflow cannot swap slots.
7. Validate Entra/MFA, role boundaries, Azure SQL reconciliation, private Blob quarantine, approved malware scanning, SharePoint least privilege, transactional delivery/replay, monitoring, backup restoration, visual/browser acceptance and live security controls.
8. Complete and approve the production acceptance report.

## Promotion and DNS

Candidate-to-production slot swaps, custom-domain bindings, certificates, DNS edits and GitHub Pages retirement are separate owner-controlled actions. Record all DNS first and preserve MX, SPF, DKIM, DMARC, Microsoft 365 and unrelated verification records. Change only the six approved web host records. Verify each application after promotion before moving to the next boundary.

## Abort conditions

Abort for a secret finding, unexpected infrastructure charge, failed authorisation or customer isolation, unhealthy/reconciled database, public Blob or document access, missing malware release gate, unresolved required vault reference, failed backup restore, broken canonical/redirect contract, material visual/accessibility defect, unsupported pharmaceutical claim or unexplained 5xx/security-event increase.

## Evidence record

Record the reviewed SHA, GitHub run ID, Azure deployment ID, parameter digest, six package digests, resource outputs, slot names, database migration version/counts, backup/restore points, acceptance results, approver and start/end time. Never include a secret value.
