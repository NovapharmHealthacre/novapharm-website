# SOP-02 — Change Control

Execution status: **REPOSITORY_EXECUTABLE_REHEARSAL_REQUIRED**

This procedure is subordinate to the NovaPharm absolute mandate. It must not be used to bypass an owner, legal/regulatory, financial, staging, identity, data-authority or production-cutover gate.

## Owner

Change Owner

## Purpose

Ensure every material platform change has a single owner, reason, evidence, blast-radius assessment and reversible execution plan.

## Trigger

Any proposed code, infrastructure, identity, data, integration, DNS, certificate, security-policy or production configuration change.

## Prerequisites

1. Change record with scope, owner, reason, affected authorities and risk.
2. Evidence that the change is necessary and simpler alternatives were considered.
3. Rollback/recovery plan and validation plan.
4. Required legal/regulatory/financial approvals if applicable.

## Permissions

- Only the least privilege required to review/execute the specific change; reviewer and executor separation for high-risk production changes where available.

## Steps

1. Classify the change: repository-only, staging, production-candidate, production traffic, identity/data, or emergency.
2. List exact files/resources/records to change and explicit resources that must not change.
3. Record current state and rollback state before mutation.
4. Require exact-SHA CI for code; use `what-if`/preview for infrastructure; use read-before-write for identity/DNS/data changes.
5. Obtain owner approval at the correct gate; execute one bounded change set.
6. Verify expected effect and negative invariants (no privilege expansion, no customer leakage, no unrelated DNS/resource changes).
7. Attach evidence and close only after validation and rollback point are confirmed.

## Evidence

- Approved change record; before/after state; exact SHA/resource IDs; validation results; rollback reference; owner/reviewer identities and timestamps.

Evidence must be stored in the approved restricted operational/change/incident record as appropriate. Never record secret values, authentication payloads, confidential document contents or unnecessary personal data in GitHub.

## Stop Conditions

- Scope cannot be stated precisely; rollback is unavailable; authority/owner is unclear; evidence conflicts; unexpected resource appears; production gate lacks explicit approval.

A STOP condition blocks progression. Contain or fail closed; do not reinterpret a failed control as an informational warning.

## Escalation

- Escalate unresolved authority conflicts to the programme owner; security/data conflicts to Security/Data Owner; financial/legal matters to the relevant owner gate.

## Rollback

- Reverse only the recorded change set using the recorded prior state.
- If reversal could be more destructive than containment, stop writes/traffic and escalate instead.

## Recovery

- Verify invariants and service health after reversal.
- Open corrective follow-up; do not reattempt until root cause and evidence gaps are closed.

## Review Cadence

- Use for every material change; review quarterly and after any change-control failure.

### Existing authorities / evidence to consult

- `docs/programme/operations-runbook.md`
- `docs/programme/security-governance-gates.md`
- `deployment/deployment-runbook.md`
- `deployment/rollback-guide.md`
- `docs/programme/post-pr16-release-control.md`

### Rehearsal and production acceptance

- Repository procedure existence is **not** rehearsal evidence.
- Rehearsal must record environment, exact SHA/configuration, operator, date, inputs, expected/actual results, STOP conditions exercised where safe, rollback/recovery result and approver.
- Production acceptance remains empty until the applicable mandate release gate explicitly permits it.
