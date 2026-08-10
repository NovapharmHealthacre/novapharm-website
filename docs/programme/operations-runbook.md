# Unified Estate Operations Runbook

Status: repository procedure complete; live ownership and alert tests pending
Review date: 1 August 2026

## Daily review

1. Check public, portal, API and status health without logging confidential payloads.
2. Review Front Door origin health, WAF blocks and rate-limit patterns after deployment.
3. Review authentication failures, lockouts, privileged actions and customer-isolation alerts.
4. Review database connectivity, storage/quarantine failures and disk/retention state.
5. Review email queue and Graph/SharePoint/Polar Speed outbox dead letters.
6. Escalate incidents under `security/incident-response-plan.md`.

## Release operation

- Deploy immutable packages from reviewed `main` through GitHub OIDC.
- Confirm expected commit SHA and all six artifact digests.
- Apply database migrations through the migration identity before application promotion.
- Promote API, portal, corporate, Technology, founder and status in that order.
- Run health, security, route and role smoke tests after each boundary.
- Stop and roll back on migration, authz, isolation, private-file, form, upload or critical security failure.

## Identity operation

- Add workforce users through approved Entra groups/app roles.
- Invite external users only after approved customer onboarding and SQL account linkage.
- Review privileged membership regularly; revoke access and sessions promptly after role change.
- Never issue or display plaintext passwords through the admin interface.
- Treat bootstrap authentication as temporary recovery/activation only and remove its secret after use.

## Data and document operation

- Azure SQL is authoritative for transactional/security data.
- SharePoint is authoritative for approved controlled binaries/version history where designated.
- Reconcile outbox events and external IDs; never repair by silently editing both systems.
- Keep uploads quarantined until a qualified scanner marks them releasable.
- Do not place databases, backups or private documents in public directories.

## Backup and recovery

Follow `deployment/backup-and-restore-runbook.md`. Record actual RPO/RTO only from a deployed restore drill. Restore into isolation, reconcile, verify role/customer/document access, then approve any rebind.

## Change and evidence

Every production change records ticket/approval, owner, commit, package digests, infrastructure deployment, migrations, start/end, tests, alerts and rollback point. Owner-controlled external configuration is never inferred from repository state.
