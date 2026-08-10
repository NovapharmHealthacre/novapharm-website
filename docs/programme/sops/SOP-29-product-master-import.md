# SOP-29 — Product Master Import

Execution status: **REPOSITORY_EXECUTABLE_STAGING_REHEARSAL_REQUIRED**

## Owner
Product Data Owner

## Purpose
Import product-master data from one approved authority with deterministic validation, dry-run evidence, idempotency and reconciliation.

## Trigger
Approved product-master source file/feed or controlled bulk update is ready.

## Prerequisites
1. Named authoritative source, owner, schema/version and source checksum.
2. Approved mapping/validation rules and target environment.
3. Verified backup/rollback point for material writes.

## Permissions
- Dedicated import role scoped to product-master staging/target tables; no broad unrelated write access.

## Steps
1. Record source, checksum, schema version and owner.
2. Parse/normalize into a staging area; reject malformed identifiers, duplicates and unsupported values.
3. Validate pharmaceutical/regulatory claims against approved evidence; never infer missing regulated facts.
4. Produce a dry-run diff showing creates/updates/rejections and any destructive change.
5. STOP for unexplained deletes, authority conflicts, duplicate identity or missing regulated evidence.
6. Apply idempotently using stable source keys/versioning.
7. Reconcile source vs target counts/identifiers and record rejects separately.
8. Publish downstream change events only after canonical commit/reconciliation.

## Evidence
Source/checksum/schema, dry-run diff, validation/reject report, import batch ID, before/after counts, reconciliation and audit events.

## Stop Conditions
Unknown source authority; duplicate product identity; destructive/unexplained diff; missing regulated evidence; reconciliation mismatch.

A STOP condition prevents canonical publication.

## Escalation
Product Data Owner; Regulatory/Quality Owner for regulated discrepancies; Database Owner for integrity failures.

## Rollback
Use the tested batch reversal/restore path. Never repair an import by silently editing both source and target.

## Recovery
Correct source/mapping, create a new versioned batch, dry-run again and reconcile before re-publication.

## Review Cadence
Every import; mapping/schema review after source changes.

### Authorities
- `docs/product-claims-evidence-register.json`
- `docs/programme/content-model.md`
- `docs/programme/architecture-decision-record.md`

Repository procedure existence is **not** rehearsal or production acceptance evidence.
