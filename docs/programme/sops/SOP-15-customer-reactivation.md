# SOP-15 — Customer Reactivation

Execution status: **REPOSITORY_EXECUTABLE_REHEARSAL_REQUIRED**

## Owner
Customer Operations Owner

## Purpose
Restore suspended customer access only after the suspension cause and identity/scope have been revalidated.

## Trigger
Approved request to reactivate a suspended customer.

## Prerequisites
1. Suspension reason resolved and documented.
2. Current business approval.
3. Identity reverified.
4. Server-side customer linkage/role reviewed.

## Permissions
- Customer Operations approval plus Identity Owner execution.

## Steps
1. Review original suspension and closure criteria.
2. Reverify customer ID, linked identity and minimum role.
3. Re-enable only the approved identity/linkage; issue no plaintext password.
4. Revoke stale sessions/tokens and require fresh authentication.
5. Run positive own-customer and negative cross-customer/privileged access tests.
6. Record reactivation audit and approved notification.

## Evidence
- Approval, customer/identity IDs, role/linkage, fresh-auth evidence, isolation tests and audit event.

## Stop Conditions
- Original incident unresolved; identity ownership uncertain; role expansion requested; isolation test fails.

A STOP condition keeps the customer suspended.

## Escalation
- Customer Operations Owner and Security Lead as appropriate.

## Rollback
- Re-suspend immediately and revoke sessions.

## Recovery
- Correct root cause and repeat reactivation from fresh identity verification.

## Review Cadence
- Every reactivation.

### Authorities
- `security/identity-and-access-model.md`
- `docs/programme/portal-api-migration-acceptance.md`

Repository procedure existence is **not** rehearsal or production acceptance evidence.
