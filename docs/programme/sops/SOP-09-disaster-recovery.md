# SOP-09 — Disaster Recovery

Execution status: **REPOSITORY_EXECUTABLE_STAGING_REHEARSAL_REQUIRED**

## Owner
Platform Recovery Owner

## Purpose
Recover the estate after a regional/platform disaster in trust-boundary order rather than indiscriminate redeployment.

## Trigger
Loss of primary region/platform, unrecoverable multi-service outage, destructive corruption or declared disaster.

## Prerequisites
1. Major Incident active.
2. Accepted DR architecture/resource inventory and last verified restore evidence.
3. Last accepted application SHA/artifact digests.
4. Owner-approved recovery region/target and cost.

## Permissions
- DR privileges scoped to the recovery target; traffic/DNS rights are separately authorized.

## Steps
1. Declare disaster and freeze unrelated changes.
2. Confirm in-place recovery is unsafe/unavailable and preserve evidence.
3. Recover identity/secret dependencies, then data, then API, Portal and public/status applications in dependency order.
4. Restore data into isolation and reconcile before binding applications.
5. Deploy the last accepted immutable application artifacts and validate authn/authz, customer isolation, private storage, forms/integrations and monitoring.
6. Only after acceptance, invoke SOP-40 to move traffic one hostname/boundary at a time.
7. Record measured recovery time and data point; never publish invented RTO/RPO.

## Evidence
- Disaster declaration, recovery target, backup IDs, SHAs/digests, validation, traffic approvals and measured recovery evidence.

## Stop Conditions
- Recovery target unapproved/unfunded; backup unreconciled; identity/isolation fails; private data exposed; production traffic change lacks owner approval.

A STOP condition keeps protected systems closed or on the last safe fallback.

## Escalation
- Programme owner, Security Lead, Data Owner and affected business owners; legal/regulatory decisions remain qualified-owner controlled.

## Rollback
- If the recovery target is unsafe, keep traffic on the safe fallback/status; restore prior web DNS only if it points to an accepted service.

## Recovery
- Monitor elevated error/security signals, reconcile delayed writes/integrations, then perform a DR review with owned corrective actions.

## Review Cadence
- Tabletop twice yearly; isolated live drill at least annually after managed staging exists.

### Authorities
- `deployment/backup-and-restore-runbook.md`
- `deployment/deployment-runbook.md`
- `docs/programme/domain-trust-runbook.md`

Repository procedure existence is **not** rehearsal or production acceptance evidence.
