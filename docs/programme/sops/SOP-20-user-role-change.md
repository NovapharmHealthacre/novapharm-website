# SOP-20 — User Role Change

Execution status: **REPOSITORY_EXECUTABLE_REHEARSAL_REQUIRED**

## Owner
Identity and Access Owner

## Purpose
Change a user's role without trusting client-side access selection or leaving stale privilege/session state.

## Trigger
Approved responsibility change requiring role increase, decrease or transfer.

## Prerequisites
1. Verified identity/current roles.
2. Approved target role and owner.
3. Customer/business scope where relevant.
4. Privileged-impact assessment.

## Permissions
- Identity/role administration authority; privileged increases require Security/Privileged Access approval.

## Steps
1. Read current authoritative identity/group/app-role and server-side linkage.
2. Verify the target role is approved and minimum necessary.
3. Remove old privilege first for reductions/transfers; prevent toxic combinations.
4. Apply the target role/linkage through authoritative server/identity controls.
5. Revoke sessions where stale claims may persist.
6. Run positive target-role and negative old/higher/cross-customer tests.
7. Record before/after roles, approvals and audit.

## Evidence
- Identity ID, before/after roles/linkage, approval, session revocation, positive/negative tests and audit.

## Stop Conditions
- Role authority ambiguous; toxic combination; customer scope uncertain; negative test fails.

A STOP condition blocks the role change.

## Escalation
- Identity Owner, Security Lead and Data Owner as applicable.

## Rollback
- Restore prior accepted role only if still safe; otherwise disable access pending review.

## Recovery
- Correct mapping and rerun the full role matrix.

## Review Cadence
- Every role change.

### Authorities
- `security/identity-and-access-model.md`
- `packages/portal-contracts/src/module-catalog.json`

Repository procedure existence is **not** rehearsal or production acceptance evidence.
