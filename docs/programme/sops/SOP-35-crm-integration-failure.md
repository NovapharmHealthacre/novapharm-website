# SOP-35 — CRM Integration Failure

Execution status: **DEPENDENCY_BLOCKED_LIVE_INTEGRATION**

## Owner
CRM Integration Owner

## Purpose
Contain CRM integration failure without making CRM an accidental authority for transactional, security or regulated data.

## Trigger
CRM API/auth/outbox failure, duplicate/conflicting record or synchronization mismatch.

## Prerequisites
1. Approved CRM platform/field authority and owner.
2. Stable canonical/external identifiers.
3. Field-level source-of-truth mapping plus idempotent outbox/retry.

## Permissions
- Dedicated least-privilege service identity scoped to approved objects/fields.

## Steps
1. If no CRM authority/field mapping is accepted, STOP and keep the integration dependency-blocked.
2. Preserve NovaPharm canonical transactional/security/regulated data unchanged.
3. Record correlation/external IDs, affected fields/window and error class.
4. Pause non-idempotent retries and move failures into controlled retry/dead-letter state.
5. Compare values using the approved field-authority map; never use blanket last-write-wins.
6. Route genuine conflicts to the owning business/data authority.
7. Replay from canonical outbox after recovery and reconcile all affected IDs/fields.

## Evidence
Approved authority map, correlation/external IDs, error window, conflict/retry records, reconciliation and final owner disposition.

## Stop Conditions
No approved CRM/field authority; identifier collision; retry duplicates business action; CRM would overwrite a higher-authority source; sensitive payload logging.

A STOP condition disables synchronization and preserves canonical data.

## Escalation
CRM Integration Owner and affected Data/Business Owner; Security Lead for privacy/credential issues.

## Rollback
Disable sync/retry and restore prior accepted connector config; do not manually edit both systems to force equality.

## Recovery
Correct authority/mapping, replay canonical events and reconcile conflicts with explicit owner decisions.

## Review Cadence
After every failure; rehearse before first live integration and after schema/field-authority changes.

### Authorities
- `docs/programme/integration-register.md`
- `docs/programme/architecture-decision-record.md`

Repository procedure existence is **not** evidence that a CRM integration is accepted or live.
