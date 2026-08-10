# SOP-12 — Database Migration Rollback

Execution status: **REPOSITORY_EXECUTABLE_STAGING_REHEARSAL_REQUIRED**

## Owner
Database Owner

## Purpose
Reverse or contain a failed database migration without destructive guessing or silent data loss.

## Trigger
Migration failure, post-migration integrity defect or application incompatibility requiring database recovery.

## Prerequisites
1. Exact migration version/scripts/checksums.
2. Pre-migration verified backup/restore point.
3. Reconciliation plan for affected tables/invariants.
4. Ability to stop writes or move the application to a safe boundary.

## Permissions
- Time-limited migration identity only; no standing broad application DDL privilege.

## Steps
1. Stop writes or route to safe read-only/fallback as appropriate.
2. Record migration version, errors, schema/data state and affected release SHA.
3. Classify the migration as transactionally reversible, forward-fixable or restore-required.
4. Use a down/reversal only when it is explicitly implemented and tested for this schema; never improvise production SQL.
5. For restore-required recovery, restore the pre-migration point into isolation and reconcile before any approved rebind.
6. Run integrity, audit, customer-isolation and application-compatibility tests.
7. Close migration privilege immediately after recovery.

## Evidence
- Migration ID/version/checksum, backup ID, write-freeze evidence, reconciliation counts, restore/reversal result and privilege revocation.

## Stop Conditions
- No verified backup; reversal untested; new-schema writes cannot be reconciled; customer/audit integrity is uncertain.

A STOP condition blocks cutover.

## Escalation
- Database Owner, Security/Data Owner and Release Owner.

## Rollback
- Use only tested reversal or isolated restore; otherwise contain writes and keep service at the prior safe boundary.

## Recovery
- Reconcile all state and rerun managed-staging acceptance before another migration.

## Review Cadence
- Rehearse every destructive or non-backward-compatible migration in managed staging before production.

### Authorities
- `deployment/backup-and-restore-runbook.md`
- `deployment/deployment-runbook.md`
- `docs/programme/portal-api-migration-acceptance.md`

Repository procedure existence is **not** rehearsal or production acceptance evidence.
