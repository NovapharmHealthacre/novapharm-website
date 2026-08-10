# SOP-16 — Employee Onboarding

Execution status: **REPOSITORY_EXECUTABLE_REHEARSAL_REQUIRED**

## Owner
Workforce Identity Owner

## Purpose
Provision workforce access from approved employment/business need using Entra groups/app roles and least privilege.

## Trigger
Approved employee joiner/start or system-access request.

## Prerequisites
1. Verified workforce identity.
2. Manager/business-owner approval.
3. Job role mapped to approved Entra group/app roles.
4. MFA/conditional-access requirements defined by Identity Owner.

## Permissions
- Workforce Identity Owner assigns approved groups/roles; privileged role cannot be self-approved.

## Steps
1. Verify identity and approval source.
2. Assign the minimum approved groups/app roles; avoid direct one-off privilege where a governed group exists.
3. Confirm MFA/conditional access per tenant policy.
4. Verify server-side claim-to-role mapping.
5. Run positive expected-role and negative higher-role/customer-only tests.
6. Record group/role object IDs and audit evidence.

## Evidence
- Workforce identity ID, approval, group/app-role assignments, auth test, negative role test and audit event.

## Stop Conditions
- Identity ambiguous; role not in approved model; privileged access lacks separate approval; required security policy cannot be satisfied.

A STOP condition blocks activation.

## Escalation
- Identity Owner/business owner; privileged requests to Security Lead.

## Rollback
- Remove newly assigned groups/app roles and revoke sessions.

## Recovery
- Correct mapping and repeat onboarding with fresh verification.

## Review Cadence
- Every joiner; ongoing access governed by SOP-21 JML Review.

### Authorities
- `security/identity-and-access-model.md`
- `docs/programme/security-governance-gates.md`

Repository procedure existence is **not** rehearsal or production acceptance evidence.
