# SOP-04 — Incident Response

Execution status: **REPOSITORY_EXECUTABLE_REHEARSAL_REQUIRED**

This procedure is subordinate to the NovaPharm absolute mandate. It must not be used to bypass an owner, legal/regulatory, financial, staging, identity, data-authority or production-cutover gate.

## Owner

Incident Commander

## Purpose

Contain, investigate and recover from platform incidents while preserving evidence, privacy and service truth.

## Trigger

Monitoring alert, user report, failed security/control invariant or operational event indicating service, data, identity, integration or security degradation.

## Prerequisites

1. Incident severity criteria available.
2. Restricted incident evidence location.
3. Current deployment SHA/environment/resource inventory.
4. On-call or accountable operational owners identified.

## Permissions

- Read access to logs/monitoring; write/containment access only when explicitly assigned by Incident Commander.

## Steps

1. Open an incident record and assign severity/commander.
2. Preserve evidence; never place secrets/personal data in public GitHub issues.
3. Identify affected users/services/data authorities and the last known good state.
4. Contain: restrict route, identity, storage, integration or release as required; revoke exposed sessions/credentials.
5. Assess confidentiality, integrity, availability and customer-isolation impact.
6. Recover only from a verified clean release/data/config state.
7. Run health, identity, authorization, isolation, document/integration and monitoring validation.
8. Record timeline, root cause, corrective actions, owner and any notification decision.

## Evidence

- Incident record; timestamps; exact SHA/config; relevant sanitized audit/monitoring evidence; containment actions; recovery validation; closure approval.

Evidence must be stored in the approved restricted operational/change/incident record as appropriate. Never record secret values, authentication payloads, confidential document contents or unnecessary personal data in GitHub.

## Stop Conditions

- Evidence would be destroyed; customer isolation failure persists; credential exposure unresolved; safety/quality event lacks qualified owner; recovery source is unverified.

A STOP condition blocks progression. Contain or fail closed; do not reinterpret a failed control as an informational warning.

## Escalation

- Escalate Critical/High to Security Lead/programme owner; privacy/legal/regulatory decisions to qualified owners/advisers; quality/safety events to Quality/Safety Owner.

## Rollback

- Rollback application/configuration to verified state where safe; otherwise isolate and fail closed.

## Recovery

- Confirm monitoring is stable, access is least privilege, data is reconciled and affected owners accept recovery before closure.

## Review Cadence

- After every incident; tabletop at least annually.

### Existing authorities / evidence to consult

- `docs/programme/operations-runbook.md`
- `docs/programme/security-governance-gates.md`
- `security/incident-response-plan.md`
- `security/identity-and-access-model.md`

### Rehearsal and production acceptance

- Repository procedure existence is **not** rehearsal evidence.
- Rehearsal must record environment, exact SHA/configuration, operator, date, inputs, expected/actual results, STOP conditions exercised where safe, rollback/recovery result and approver.
- Production acceptance remains empty until the applicable mandate release gate explicitly permits it.
