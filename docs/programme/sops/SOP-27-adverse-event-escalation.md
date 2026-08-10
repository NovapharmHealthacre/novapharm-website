# SOP-27 — Adverse Event Escalation

Execution status: **DEPENDENCY_BLOCKED_QUALIFIED_OWNER**

## Owner
Qualified Safety Owner

## Purpose
Preserve and escalate a suspected adverse event promptly without allowing unqualified platform operators or AI/software to decide reportability.

## Trigger
Any Contact, quality complaint, support case or other source contains a possible adverse-event, patient-safety or medicine-safety signal.

## Prerequisites
1. A qualified Safety Owner and approved pharmacovigilance process must exist before this SOP can be production-active.
2. Restricted safety-record storage and approved notification channel.
3. Canonical source case/correlation ID.

## Permissions
- Operators may preserve and escalate only. Reportability, seriousness, expectedness and regulatory submission decisions belong to qualified Safety personnel.

## Steps
1. Preserve the reporter's original wording and timestamp immediately; do not paraphrase away uncertainty.
2. Create/link the restricted safety case and retain source/correlation identifiers.
3. Capture only available facts; do not delay escalation while waiting for completeness.
4. Notify the qualified Safety Owner through the approved channel and record acknowledgement/delivery state.
5. Protect patient/reporter information under least privilege and applicable retention rules.
6. The qualified Safety Owner performs all clinical/reportability/regulatory assessment outside any unqualified automated decision path.
7. Link final qualified disposition back to the source case through an auditable reference where authorized.

## Evidence
Source/correlation ID, safety-case ID, preserved original statement, escalation timestamp/channel, qualified owner acknowledgement and final qualified disposition reference.

## Stop Conditions
No qualified Safety Owner; no approved pharmacovigilance process; unapproved channel; operator/system asked to determine reportability; restricted data cannot be protected.

A STOP condition means the Portal module remains **HIDDEN FOR SAFETY** and the event must be escalated through the organization's approved human safety route.

## Escalation
Qualified Safety Owner immediately; Quality Owner and privacy/legal/regulatory owners as required by the approved safety process.

## Rollback
Safety source records are never deleted to undo routing. Correct ownership/classification with immutable audit history.

## Recovery
Restore the approved qualified escalation path, verify acknowledgement and reconcile all pending safety signals before any pharmacovigilance module activation.

## Review Cadence
After every safety event and whenever the approved pharmacovigilance process changes.

### Authorities
- `packages/portal-contracts/src/module-catalog.json`
- `docs/programme/security-governance-gates.md`
- the owner-approved pharmacovigilance procedure, once supplied/accepted

Repository procedure existence is **not** evidence that the qualified safety dependency exists or that production pharmacovigilance is operational.
