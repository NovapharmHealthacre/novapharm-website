# SOP-19 — Admin User Onboarding

Execution status: **REPOSITORY_EXECUTABLE_REHEARSAL_REQUIRED**

## Owner
Privileged Access Owner

## Purpose
Provision privileged Admin access as a separately approved, least-privilege and auditable security event.

## Trigger
A named administrator requires platform administration access.

## Prerequisites
1. Verified workforce identity.
2. Explicit Privileged Access Owner and Security Lead approval.
3. Defined admin duties and review/expiry date.
4. MFA/conditional-access-capable identity.

## Permissions
- Separate privileged role-assignment authority; no self-approval.

## Steps
1. Verify named individual and business need.
2. Use the dedicated privileged group/app role; avoid permanent global privileges outside defined scope.
3. Set review/expiry where supported.
4. Require MFA/conditional access and prohibit plaintext/shared passwords.
5. Verify Admin routes work and Board/Employee/Customer boundaries remain intentional.
6. Record assignment and privileged audit event.
7. Add the identity to SOP-22 Privileged Access Review population.

## Evidence
- Identity, dual approval, privileged role/group, scope/expiry, auth/role tests and audit event.

## Stop Conditions
- Self-approval; shared account; MFA unavailable; privilege cannot be bounded; bootstrap secret would remain standing.

A STOP condition blocks activation.

## Escalation
- Security Lead and programme owner.

## Rollback
- Remove privileged role/group and revoke sessions; rotate any admin-only secret if exposure occurred.

## Recovery
- Re-provision only through this SOP after the approval/root-cause defect is corrected.

## Review Cadence
- Every Admin onboarding; at least monthly privileged review once live.

### Authorities
- `security/administrator-bootstrap-guide.md`
- `security/identity-and-access-model.md`
- `docs/programme/security-governance-gates.md`

Repository procedure existence is **not** rehearsal or production acceptance evidence.
