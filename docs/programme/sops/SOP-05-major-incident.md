# SOP-05 — Major Incident

Execution status: **REPOSITORY_EXECUTABLE_REHEARSAL_REQUIRED**

This procedure is subordinate to the NovaPharm absolute mandate. It must not be used to bypass an owner, legal/regulatory, financial, staging, identity, data-authority or production-cutover gate.

## Owner

Incident Commander

## Purpose

Coordinate a severe cross-service incident with a single command structure, explicit communications and controlled recovery.

## Trigger

Critical outage, multi-service compromise, destructive data loss, customer-isolation failure, Board/private document exposure or incident requiring multiple teams.

## Prerequisites

1. Incident Response SOP active.
2. Named Incident Commander, Operations Lead, Security Lead, Communications/Business Liaison.
3. Restricted evidence channel and decision log.

## Permissions

- Commander controls emergency changes; functional leads receive only privileges required for assigned recovery actions.

## Steps

1. Declare Major Incident and freeze unrelated releases/changes.
2. Create roles, timeline and affected-service map.
3. Establish 15–30 minute decision cadence until stabilized; record facts vs hypotheses.
4. Contain highest-risk trust boundary first: identity, customer isolation, private data/documents, malicious upload, then availability.
5. Coordinate rollback/restore/integration isolation under the relevant SOPs.
6. Provide factual stakeholder updates without speculative cause or sensitive detail.
7. Define recovery criteria before re-opening writes/traffic.
8. After stability, perform full security/data/role/monitoring validation and owner acceptance.
9. Run post-incident review with corrective actions, owners and dates.

## Evidence

- Major incident record; role assignments; decision log; update log; affected SHAs/resources; recovery evidence; corrective-action register.

Evidence must be stored in the approved restricted operational/change/incident record as appropriate. Never record secret values, authentication payloads, confidential document contents or unnecessary personal data in GitHub.

## Stop Conditions

- No incident commander; evidence integrity uncertain; proposed action widens blast radius; data authority cannot be reconciled; regulated/safety impact lacks qualified owner.

A STOP condition blocks progression. Contain or fail closed; do not reinterpret a failed control as an informational warning.

## Escalation

- Escalate immediately to programme owner, Security Lead and affected executive/business owner; legal/regulatory notification decisions remain qualified-owner controlled.

## Rollback

- Use component-specific rollback SOPs; prefer isolation over destructive reversal when state is uncertain.

## Recovery

- Reintroduce services one boundary at a time and verify before advancing; close only after corrective actions and residual risks are owned.

## Review Cadence

- After every major incident; tabletop twice yearly.

### Existing authorities / evidence to consult

- `docs/programme/operations-runbook.md`
- `docs/programme/security-governance-gates.md`
- `security/incident-response-plan.md`
- `security/identity-and-access-model.md`

### Rehearsal and production acceptance

- Repository procedure existence is **not** rehearsal evidence.
- Rehearsal must record environment, exact SHA/configuration, operator, date, inputs, expected/actual results, STOP conditions exercised where safe, rollback/recovery result and approver.
- Production acceptance remains empty until the applicable mandate release gate explicitly permits it.
