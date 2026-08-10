# SOP-24 — Contact Enquiry Triage

Execution status: **REPOSITORY_EXECUTABLE_REHEARSAL_REQUIRED**

## Owner
Customer Operations Owner

## Purpose
Turn every managed-runtime Contact submission into one canonical, owned and recoverable case with no silent delivery loss.

## Trigger
A validated Contact submission reaches the managed API.

## Prerequisites
1. Managed Contact API and canonical case persistence are active.
2. Audit/correlation IDs and retry/dead-letter outbox are enabled.
3. An approved routing owner exists; PUBLIC_ONLY remains non-submitting.

## Permissions
- Case triage/read/update only; no privilege to alter identity, customer scope or regulated records.

## Steps
1. Validate server-side and reject malformed/abusive content without echoing sensitive payloads.
2. Persist the canonical case **before** attempting email/notification.
3. Record correlation ID, received time, source and delivery state.
4. Classify and assign an accountable owner/SLA category.
5. Route quality/safety indicators to SOP-26/SOP-27 immediately.
6. Queue notification through the approved outbox; retry idempotently and dead-letter persistent failures.
7. Confirm the case remains queryable even if notification fails.
8. Close only with disposition, owner and audit evidence.

## Evidence
Case/correlation ID, owner, classification, persistence result, outbox/delivery state, timestamps and audit event.

## Stop Conditions
No canonical case exists; persistence failed; malicious payload suspected; safety signal has no qualified owner; data leaks into logs/notification.

A STOP condition fails closed and blocks silent processing.

## Escalation
Customer Operations; Quality/Safety Owner for regulated indicators; Security Lead for abuse/data exposure.

## Rollback
Reassign/reclassify only with audit. Never delete the source case to undo a routing error.

## Recovery
Replay notification from the canonical case/outbox after the dependency is healthy; reconcile duplicate delivery using correlation/idempotency keys.

## Review Cadence
Monthly once live and after any lost/duplicate enquiry incident.

### Authorities
- `docs/programme/operations-runbook.md`
- `docs/programme/portal-api-migration-acceptance.md`
- `docs/programme/integration-register.md`

Repository procedure existence is **not** rehearsal or production acceptance evidence.
