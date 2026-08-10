# SOP-08 — Restore Testing

Execution status: **REPOSITORY_EXECUTABLE_STAGING_REHEARSAL_REQUIRED**

## Owner
Database and Recovery Owner

## Purpose
Prove recovery by restoring into isolation and validating data, authorization boundaries and measured recovery time.

## Trigger
Scheduled restore drill, backup-platform change, pre-production acceptance or incident recovery rehearsal.

## Prerequisites
1. Verified backup/restore point.
2. Isolated target with no production traffic.
3. Synthetic or explicitly authorized test data and reconciliation checklist.
4. Approved cleanup plan for the isolated restore.

## Permissions
- Restore permission to the isolated target and a test-app identity only.

## Steps
1. Record source, restore point and start time.
2. Restore to a new isolated database/container; never overwrite the active source during a test.
3. Bind only a test identity/application.
4. Reconcile known records, relationships, audit events and customer isolation.
5. Verify blobs/documents by checksum and authorization state; restored objects do not bypass malware-release status.
6. Measure elapsed recovery time and latest recoverable timestamp; report observed values, not invented RPO/RTO.
7. Capture evidence, then remove the isolated target after approval.

## Evidence
- Restore operation ID, source/target, restore point, start/end time, reconciliation results, isolation evidence and cleanup record.

## Stop Conditions
- Target is not isolated; source/target is ambiguous; confidential data becomes broadly accessible; reconciliation fails; malware/authorization state is lost.

A STOP condition blocks R3/R4 progression.

## Escalation
- Database/Recovery Owner, Security Lead and Release Owner.

## Rollback
- Delete or disable the failed isolated restoration after preserving evidence; active production remains unchanged.

## Recovery
- Correct backup/recovery configuration and repeat from a fresh isolated target until reproducible.

## Review Cadence
- At least quarterly after managed staging exists, after material data-platform changes and before first production acceptance.

### Authorities
- `deployment/backup-and-restore-runbook.md`
- `docs/programme/operations-runbook.md`

Repository procedure existence is **not** rehearsal or production acceptance evidence.
