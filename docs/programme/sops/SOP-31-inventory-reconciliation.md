# SOP-31 — Inventory Reconciliation

Execution status: **REPOSITORY_EXECUTABLE_REHEARSAL_REQUIRED**

## Owner
Warehouse Operations Owner

## Purpose
Reconcile inventory between canonical stock records and approved warehouse/logistics evidence without silently overwriting discrepancies.

## Trigger
Scheduled reconciliation, inventory import/integration event or discrepancy alert.

## Prerequisites
1. Named authoritative inventory sources.
2. Cut-off timestamp and warehouse/location scope.
3. Approved tolerance and exception rules.

## Permissions
- Warehouse read/reconciliation; corrections require the approved data-owner workflow.

## Steps
1. Freeze one reconciliation cut-off/time window.
2. Export canonical and comparison records using the same product/location/batch scope.
3. Normalize identifiers without changing either source.
4. Calculate differences and classify timing, in-transit, mapping and unknown exceptions.
5. Do not auto-zero or overwrite unexplained differences.
6. Route physical/quality discrepancies to accountable owners.
7. Apply approved corrections through an audited authoritative workflow.
8. Re-run until residual exceptions are explicitly owned.

## Evidence
Source timestamps, extracts/counts, discrepancy list, approved corrections, owners and residual exceptions.

## Stop Conditions
Source authority unclear; product/batch mapping ambiguous; unexplained material variance; correction would bypass quality/quarantine status.

A STOP condition blocks corrective writes.

## Escalation
Warehouse, Product or Quality Owner depending discrepancy.

## Rollback
Reverse an erroneous correction through an audited adjustment; never erase history.

## Recovery
Repeat reconciliation and monitor the next cycle for recurrence.

## Review Cadence
Operational cadence once live and before critical availability reporting.

### Authorities
- `docs/programme/operations-runbook.md`
- `docs/programme/integration-register.md`
- `packages/portal-contracts/src/module-catalog.json`

Repository procedure existence is **not** rehearsal or production acceptance evidence.
