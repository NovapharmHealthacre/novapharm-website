# SOP-07 — Backup Verification

Execution status: **REPOSITORY_EXECUTABLE_STAGING_REHEARSAL_REQUIRED**

## Owner
Database and Recovery Owner

## Purpose
Verify configured backups are real recovery artifacts without inventing RPO/RTO.

## Trigger
Scheduled backup verification, pre-release backup gate or backup-failure alert.

## Prerequisites
1. Authoritative source inventory and backup policy.
2. Known non-confidential verification data/checksum.
3. Backup metadata access.

## Permissions
- Backup read/metadata permission only; restore permission is not required for routine verification.

## Steps
1. Identify source, backup mechanism, timestamp, region/redundancy and retention.
2. Confirm newest restore point is within the currently approved policy; where no approved RPO exists, record age only.
3. Verify encryption, retention, soft-delete/immutability configuration as applicable.
4. Verify checksum for Blob/local artifacts without making private data public.
5. Record gaps; never mark a backup healthy solely because a job succeeded.
6. Schedule SOP-08 Restore Testing after material backup changes and at the approved cadence.

## Evidence
- Source ID, backup/restore-point ID, timestamp/age, retention configuration, checksum/test result, verifier/date.

## Stop Conditions
- Backup missing/corrupt; retention weaker than approved; source identity mismatch; verification requires exposing confidential data.

A STOP condition blocks stateful production changes until recovery is restored.

## Escalation
- Database/Recovery Owner and Release Owner; Security Lead where confidentiality/integrity is affected.

## Rollback
- No destructive rollback during verification; preserve current data and the last verified backup.

## Recovery
- Repair backup configuration, create a fresh backup, repeat verification and then perform an isolated restore test.

## Review Cadence
- Daily/weekly according to criticality and before every stateful production cutover.

### Authorities
- `deployment/backup-and-restore-runbook.md`
- `docs/programme/operations-runbook.md`

Repository procedure existence is **not** rehearsal or production acceptance evidence.
