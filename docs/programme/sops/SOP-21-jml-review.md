# SOP-21 — JML Review

Execution status: **REPOSITORY_EXECUTABLE_REHEARSAL_REQUIRED**

## Owner
Identity and Access Owner

## Purpose
Reconcile joiner/mover/leaver access against authoritative records and remove drift.

## Trigger
Scheduled JML review or identity-access discrepancy.

## Prerequisites
1. Authoritative user population sources.
2. Current Entra groups/app roles and application-linkage exports.
3. Previous review evidence.

## Permissions
- Read access for reconciliation; changes execute through SOP-16, SOP-17 or SOP-20.

## Steps
1. Export current identities, groups/app roles and server-side linkages.
2. Classify each subject as active joiner, mover, leaver/suspended, privileged or exception.
3. Compare with authoritative business records.
4. Open one remediation item per mismatch; do not silently bulk-edit ambiguous identities.
5. Execute corrections through the corresponding onboarding/offboarding/role-change SOP.
6. Re-export and prove mismatches closed or explicitly owner-accepted.

## Evidence
- Population timestamp, discrepancy list, remediation links, final reconciliation counts and reviewer.

## Stop Conditions
- Authoritative population unavailable; identity collision; unresolved privileged access; bulk correction could affect unknown users.

A STOP condition blocks bulk mutation.

## Escalation
- Identity Owner for unresolved identities; Security Lead for privileged drift.

## Rollback
- Individual remediation uses the relevant identity SOP; never restore stale leaver access just to match an old export.

## Recovery
- Repeat reconciliation after remediation until residual exceptions are explicitly owned.

## Review Cadence
- Monthly once live; before R3 and R6 acceptance.

### Authorities
- `security/identity-and-access-model.md`
- `docs/programme/security-governance-gates.md`

Repository procedure existence is **not** rehearsal or production acceptance evidence.
