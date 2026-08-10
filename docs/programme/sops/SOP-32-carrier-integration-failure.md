# SOP-32 — Carrier Integration Failure

Execution status: **DEPENDENCY_BLOCKED_LIVE_INTEGRATION**

## Owner
Logistics Integration Owner

## Purpose
Contain carrier-integration failure while preserving canonical shipment/order state and preventing duplicate or fabricated delivery updates.

## Trigger
Carrier API/webhook/outbox failure, stale tracking, invalid response or reconciliation mismatch.

## Prerequisites
1. Named carrier authority and accepted endpoint/credentials.
2. Canonical shipment/order records and external-ID mapping.
3. Retry/dead-letter and idempotency controls.

## Permissions
- Integration service identity; operators may replay only through the governed outbox/tooling.

## Steps
1. Confirm canonical shipment/order state remains intact.
2. Record correlation ID, external ID, error class and last successful sync without sensitive payloads.
3. Pause unsafe retries if duplicate actions are possible.
4. Preserve the failed event in controlled retry/dead-letter state with its idempotency key.
5. Check status only through the approved carrier authority; never invent delivery state.
6. Replay only after dependency health and mapping are confirmed.
7. Reconcile canonical vs carrier IDs/status for the entire failed window.
8. If no live carrier authority has been accepted, keep the integration/module dependency-blocked.

## Evidence
Correlation/external IDs, error, retry/dead-letter record, dependency health, reconciliation and final outcome.

## Stop Conditions
No accepted authority; no idempotency; external-ID mismatch; retry could duplicate shipment/action; sensitive payload logging.

A STOP condition disables unsafe replay and preserves last verified state.

## Escalation
Logistics Integration Owner and affected Customer Operations; Security Lead for security/privacy issues.

## Rollback
Disable integration/retries and retain the last verified canonical state; do not roll orders backward blindly.

## Recovery
Repair mapping/credentials, replay from canonical outbox and reconcile all events in the failed interval.

## Review Cadence
After every live failure; quarterly replay rehearsal after a carrier integration is accepted.

### Authorities
- `docs/programme/integration-register.md`
- `docs/programme/operations-runbook.md`

Repository procedure existence is **not** evidence that a live carrier integration is accepted.
