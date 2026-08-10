# SOP-18 — Board User Onboarding

Execution status: **REPOSITORY_EXECUTABLE_REHEARSAL_REQUIRED**

## Owner
Board Access Owner

## Purpose
Grant Board access only to specifically approved identities with strong identity controls and no inherited employee/customer scope.

## Trigger
A Board member or approved Board adviser requires Portal access.

## Prerequisites
1. Board Access Owner approval.
2. Verified individual identity.
3. Board-specific app-role mapping and MFA policy.
4. Document/data scope defined.

## Permissions
- Board Access Owner approves; Identity Owner executes. No self-service Board promotion.

## Steps
1. Verify identity and Board approval.
2. Assign only the Board app role/group; do not infer access from email domain or job title.
3. Require MFA/conditional access according to tenant policy.
4. Verify Board routes/documents are accessible as intended.
5. Negative-test Admin, unrelated Employee and Customer scopes.
6. Record identity, role, document scope and audit evidence.

## Evidence
- Identity object ID, approval, Board role/group, positive/negative tests, document authorization test and audit.

## Stop Conditions
- Board approval absent; identity ambiguous; role implies Admin; document authority unavailable.

A STOP condition blocks activation.

## Escalation
- Board Access Owner and Security Lead.

## Rollback
- Remove Board role/group and revoke sessions.

## Recovery
- Correct role/document scope and repeat onboarding from verified approval.

## Review Cadence
- Every Board onboarding; quarterly sensitive-access review once live.

### Authorities
- `security/identity-and-access-model.md`
- `docs/programme/portal-api-migration-acceptance.md`

Repository procedure existence is **not** rehearsal or production acceptance evidence.
