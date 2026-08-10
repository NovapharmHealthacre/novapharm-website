# SOP-13 — Customer Onboarding

Execution status: **REPOSITORY_EXECUTABLE_REHEARSAL_REQUIRED**

## Owner
Customer Operations Owner

## Purpose
Activate a customer only after business approval, identity proofing and server-side customer-account linkage are complete.

## Trigger
An approved Open Account application reaches the activation stage.

## Prerequisites
1. Approved application/case ID and business-owner decision.
2. Verified canonical customer account identifier.
3. Approved external identity/invitation path.
4. Server-side role and customer-scope mapping prepared.

## Permissions
- Customer Operations approves business onboarding; Identity Owner creates/links identity. Client-side access selection never authorizes scope.

## Steps
1. Verify approved case and evidence completeness.
2. Resolve/create the canonical customer account before identity activation.
3. Invite/enable the verified external identity through the approved identity authority; never issue plaintext passwords.
4. Create the server-side identity-to-customer linkage and minimum customer role.
5. Run positive own-customer access and negative cross-customer/privileged-route tests.
6. Confirm activation/linkage audit events.
7. Notify the customer through the approved channel without secrets.
8. Close the case with customer ID, identity object ID, role/linkage and evidence.

## Evidence
- Case ID, approver, identity object ID, canonical customer ID, role mapping, isolation tests and audit event IDs.

## Stop Conditions
- No approved application; customer identity ambiguous; linkage missing; isolation test fails; broader role requested than approved.

A STOP condition prevents activation.

## Escalation
- Customer/Data Owner for account ambiguity; Identity Owner for identity defects; Security Lead for isolation failure.

## Rollback
- Disable the identity/session and remove the server-side customer linkage while preserving canonical customer/business records and audit.

## Recovery
- Correct linkage/role, rerun isolation tests, then use SOP-15 for approved reactivation.

## Review Cadence
- Every onboarding; monthly sample review once live.

### Authorities
- `security/identity-and-access-model.md`
- `docs/programme/portal-api-migration-acceptance.md`
- `packages/portal-contracts/src/module-catalog.json`

Repository procedure existence is **not** rehearsal or production acceptance evidence.
