# SOP-33 — Polar Speed Integration Failure

Execution status: **DEPENDENCY_BLOCKED_LIVE_INTEGRATION**

## Owner
Logistics Integration Owner

## Purpose
Handle a future Polar Speed integration failure without fabricating logistics state or losing canonical transaction/audit ownership.

## Trigger
Accepted Polar Speed API/feed/outbox becomes unavailable, invalid, stale or inconsistent.

## Prerequisites
1. Owner-approved Polar Speed integration authority, endpoint and contractual/data scope.
2. Canonical shipment/order IDs plus accepted external-ID mapping.
3. Idempotent retry/dead-letter controls.

## Permissions
- Approved service identity with the minimum Polar Speed scope; no shared human credential.

## Steps
1. If no Polar Speed authority has been accepted, STOP: keep the integration dependency-blocked.
2. Preserve canonical NovaPharm order/shipment state and the last verified external state.
3. Record correlation/external IDs, failure class and affected window without confidential payloads.
4. Pause retries that could duplicate bookings/status events.
5. Put failed events into controlled retry/dead-letter state with idempotency keys.
6. After dependency recovery, replay in order and reconcile every external ID/status in the affected window.
7. Surface staleness explicitly to authorized users; never present assumed delivery state.

## Evidence
Accepted integration authority, external/correlation IDs, error window, retry/dead-letter state, replay and reconciliation result.

## Stop Conditions
No approved authority; mapping conflict; non-idempotent retry; duplicate booking risk; data scope exceeds approval.

A STOP condition keeps the integration disabled/dependency-blocked.

## Escalation
Logistics Integration Owner; programme owner for contractual/authority gaps; Security Lead for credential/data issues.

## Rollback
Disable the connector and preserve last verified status; do not edit canonical orders to mimic an external rollback.

## Recovery
Repair credentials/mapping/endpoint, replay canonical events and reconcile before removing the stale/degraded state.

## Review Cadence
After every failure; rehearse before first production activation and after integration changes.

### Authorities
- `docs/programme/integration-register.md`
- `docs/programme/operating-status-and-logistics-evidence.md`

Repository procedure existence is **not** evidence that Polar Speed is live or contractually authorized.
