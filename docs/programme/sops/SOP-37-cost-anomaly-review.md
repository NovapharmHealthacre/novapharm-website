# SOP-37 — Cost Anomaly Review

Execution status: **REPOSITORY_EXECUTABLE_REHEARSAL_REQUIRED**

## Owner
FinOps Owner

## Purpose
Investigate unexpected platform cost without weakening security, backup, monitoring or reliability as a shortcut.

## Trigger
Budget/anomaly alert, unexplained spend increase or pre-change cost concern.

## Prerequisites
1. Resource/SKU/subscription cost visibility.
2. Recent deployment/change/resource inventory.
3. Approved budget/owner where one exists.

## Permissions
- Read cost/resource data; spend-changing mutations use Change Control and owner approval.

## Steps
1. Quantify anomaly by resource, SKU, region, time window and delta.
2. Correlate with deployments, scale changes, traffic, retention, logging and data growth.
3. Separate expected business growth from accidental/idle/misconfigured spend.
4. Identify safe optimization options and their reliability/security impact.
5. Never disable WAF, backup, monitoring, encryption, private networking or audit solely to reduce cost.
6. Any new recurring spend or contractual commitment remains explicitly owner-gated.
7. Execute accepted optimization through Change Control and verify service/SLO/security invariants.

## Evidence
Cost query/export, affected resources/SKUs, correlated changes, options, owner decision, post-change cost and reliability/security validation.

## Stop Conditions
Optimization would weaken mandated controls; source cost data is incomplete; action creates unapproved recurring spend/contract; resource owner unclear.

A STOP condition blocks the cost change.

## Escalation
FinOps/platform owner; programme owner for recurring spend or contractual commitments.

## Rollback
Restore the prior accepted resource configuration if optimization harms reliability/security/performance.

## Recovery
Re-measure cost and operational signals and document the permanent control/guardrail.

## Review Cadence
Monthly once managed Azure exists and before any material paid-service addition.

### Authorities
- `deployment/deployment-runbook.md`
- `docs/programme/architecture-decision-record.md`
- mandate Section 72 cost discipline / Section 111 financial gate

Repository procedure existence is **not** approval to incur recurring spend.
