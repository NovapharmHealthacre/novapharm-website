# SOP-17 — Employee Offboarding

Execution status: **REPOSITORY_EXECUTABLE_REHEARSAL_REQUIRED**

## Owner
Workforce Identity Owner

## Purpose
Remove workforce access promptly while preserving records, audit and service ownership.

## Trigger
Employee termination, contract end, security removal or approved offboarding event.

## Prerequisites
1. Authoritative offboarding instruction/effective time.
2. Inventory of identity, groups/app roles, sessions, service ownership and privileged credentials.

## Permissions
- Identity/session revocation; system-owner permissions only for ownership transfer.

## Steps
1. Verify subject and effective timing.
2. Disable/revoke workforce identity access and active sessions.
3. Remove Entra groups/app roles and direct assignments.
4. Transfer service/integration ownership; never leave shared credentials with the departed user.
5. Check GitHub, Azure, Microsoft 365 and other governed platforms for residual direct access.
6. Verify protected application login is denied while audit/history remains intact.
7. Record completion and unresolved ownership items.

## Evidence
- Identity ID, removed roles/groups, revocation, residual-access review, ownership transfers, denial test and audit.

## Stop Conditions
- Subject ambiguity; removal would orphan a critical service with no owner; retention/legal-hold uncertainty.

A STOP condition requires containment and escalation rather than silent deletion.

## Escalation
- Programme owner for orphaned service ownership; Security Lead for urgent access risk.

## Rollback
- If offboarding was erroneous, re-onboard through SOP-16 rather than silently restoring broad old access.

## Recovery
- Resolve ownership, rotate potentially exposed shared secrets, repeat residual-access review.

## Review Cadence
- Every leaver; validated by SOP-21 JML Review.

### Authorities
- `security/identity-and-access-model.md`
- `docs/programme/security-governance-gates.md`

Repository procedure existence is **not** rehearsal or production acceptance evidence.
