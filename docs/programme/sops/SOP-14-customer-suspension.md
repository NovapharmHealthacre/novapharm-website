# SOP-14 — Customer Suspension

Execution status: **REPOSITORY_EXECUTABLE_REHEARSAL_REQUIRED**

## Owner
Customer Operations Owner

## Purpose
Suspend customer access promptly without deleting canonical data, records or audit.

## Trigger
Approved business suspension, fraud/security concern or identity compromise.

## Prerequisites
1. Customer ID and all linked identities resolved.
2. Authorized suspension request or incident record.
3. Impact on active orders/workflows understood.

## Permissions
- Customer Operations/Security-authorized suspension and identity/session revocation only.

## Steps
1. Verify target customer and linked identities.
2. Record reason, authority and effective time.
3. Disable customer access server-side and/or at the identity authority; revoke active sessions when security-related.
4. Preserve orders, invoices, complaints, documents and audit unchanged.
5. Verify protected routes deny the target and other customers remain unaffected.
6. Notify accountable internal owner and customer through approved channels.

## Evidence
- Customer/identity IDs, reason/authority, revocation evidence, denial/isolation tests and audit events.

## Stop Conditions
- Target ambiguity; suspension would delete regulated records; cross-customer impact detected.

A STOP condition blocks mutation.

## Escalation
- Security Lead for compromise; Quality/Regulatory Owner for regulated-record conflict.

## Rollback
- Wrong-target suspension is reversed only after identity/customer re-verification and approval.

## Recovery
- Use SOP-15; rerun isolation and fresh-authentication tests.

## Review Cadence
- Every suspension; monthly review of suspended accounts once live.

### Authorities
- `security/identity-and-access-model.md`
- `docs/programme/portal-api-migration-acceptance.md`

Repository procedure existence is **not** rehearsal or production acceptance evidence.
