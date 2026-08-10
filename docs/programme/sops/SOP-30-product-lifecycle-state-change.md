# SOP-30 — Product Lifecycle State Change

Execution status: **REPOSITORY_EXECUTABLE_REHEARSAL_REQUIRED**

## Owner
Product Data Owner

## Purpose
Change product lifecycle state only through the controlled server workflow with authorized transitions and audit.

## Trigger
Approved transition such as draft, active, suspended or retired.

## Prerequisites
1. Canonical product ID/current state.
2. Approved target state/effective timing.
3. Allowed transition in the server domain model.

## Permissions
- Authorized Product/Employee role; direct SQL/client-only state mutation is prohibited.

## Steps
1. Read canonical product/current state and transition history.
2. Verify target state and business/regulatory approval.
3. Submit `POST /api/enterprise/products/{productId}/status` with the governed request/correlation context.
4. Require server authorization and transition validation.
5. Verify canonical state, audit event and downstream visibility/availability impact.
6. Reconcile downstream event/outbox state where applicable.

## Evidence
Product ID, before/after state, approver, request/correlation ID, audit event and downstream reconciliation.

## Stop Conditions
Transition not allowed; approval absent; product identity ambiguous; safety/regulatory consequence lacks an accountable owner.

A STOP condition blocks the transition.

## Escalation
Product Data Owner and Regulatory/Quality Owner as applicable.

## Rollback
Use only an approved reverse transition if business rules allow it; otherwise suspend exposure and raise corrective change.

## Recovery
Reconcile product visibility, orders/inventory and audit before closure.

## Review Cadence
Every lifecycle transition; review transition rules after product-model changes.

### Authorities
- `docs/programme/portal-api-migration-acceptance.md`
- `packages/portal-contracts/src/module-catalog.json`

Repository procedure existence is **not** rehearsal or production acceptance evidence.
