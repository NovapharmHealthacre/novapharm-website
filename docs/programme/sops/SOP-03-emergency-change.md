# SOP-03 — Emergency Change

Execution status: **REPOSITORY_EXECUTABLE_REHEARSAL_REQUIRED**

This procedure is subordinate to the NovaPharm absolute mandate. It must not be used to bypass an owner, legal/regulatory, financial, staging, identity, data-authority or production-cutover gate.

## Owner

Incident Commander

## Purpose

Make urgent changes safely when delay would cause greater harm, without using urgency to bypass evidence, scope or recovery.

## Trigger

Active critical/high incident where a bounded change is needed immediately to contain harm or restore essential service.

## Prerequisites

1. Declared incident and Incident Commander.
2. Known current state and candidate emergency action.
3. Minimum viable rollback/containment path.
4. Security/data owner available for any confidentiality/integrity impact.

## Permissions

- Time-limited emergency privilege scoped only to the affected system; revoke elevated access after execution.

## Steps

1. Declare severity, incident commander, affected service and reason normal change timing is unsafe.
2. Freeze unrelated changes.
3. Capture current SHA/config/resource state and evidence before mutation where safe.
4. Choose the smallest reversible action: disable feature/write path, revoke credential/session, route to accepted release, or isolate dependency.
5. Have a second qualified reviewer verify command/change target when feasible.
6. Execute once; verify containment and critical invariants immediately.
7. If not contained, roll back or isolate and escalate rather than chaining unreviewed changes.
8. Create the full retrospective change record and revoke emergency privilege.

## Evidence

- Incident ID; commander; exact emergency change; before/after state; reviewer; timestamps; validation; rollback/containment result; privileged-access revocation.

Evidence must be stored in the approved restricted operational/change/incident record as appropriate. Never record secret values, authentication payloads, confidential document contents or unnecessary personal data in GitHub.

## Stop Conditions

- Target/resource uncertain; action may destroy evidence; no rollback/containment; change broadens access; command result differs from expectation.

A STOP condition blocks progression. Contain or fail closed; do not reinterpret a failed control as an informational warning.

## Escalation

- Escalate to Security Lead and programme owner immediately; legal/regulatory notification decisions remain owner/qualified-adviser controlled.

## Rollback

- Return to the last accepted release/config if safe; otherwise isolate the affected component and fail closed.

## Recovery

- Run standard change validation; perform incident review and convert any durable fix into normal reviewed change control.

## Review Cadence

- After every use and at least annually in tabletop rehearsal.

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
