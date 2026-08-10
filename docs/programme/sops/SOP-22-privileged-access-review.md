# SOP-22 — Privileged Access Review

Execution status: **REPOSITORY_EXECUTABLE_REHEARSAL_REQUIRED**

## Owner
Security Lead

## Purpose
Review privileged access for necessity, ownership, MFA and recency and remove unjustified privilege.

## Trigger
Scheduled review, security incident, role change or audit request.

## Prerequisites
1. Complete privileged identity/role/group/service-account inventory.
2. Named owner and business justification for each privilege.
3. Recent auth/audit evidence where available.

## Permissions
- Read identity/audit access; removals through privileged identity authority.

## Steps
1. Enumerate Admin, Azure, GitHub, database migration, Key Vault, Microsoft 365 and other privileged assignments.
2. Verify named owner, purpose, scope and necessity of standing privilege.
3. Verify MFA/conditional access for humans and managed-identity/secret controls for services.
4. Flag dormant, shared, orphaned, direct or excessive assignments.
5. Remove/time-bound unjustified privilege through approved change; revoke sessions where needed.
6. Reconcile and record residual exceptions with expiry/owner.

## Evidence
- Privileged-access export, owner/justification, changes, session revocation, residual exceptions and reviewer/date.

## Stop Conditions
- Unknown owner; shared credential; self-approval; role scope cannot be verified; evidence of misuse.

A STOP condition invokes Security Incident where compromise is plausible.

## Escalation
- Security Lead immediately; programme owner for orphaned critical privilege.

## Rollback
- Erroneous removal is restored only after identity and original approved scope are reverified.

## Recovery
- Rotate credentials where exposure is possible and repeat review of the affected scope.

## Review Cadence
- Monthly once live and after every privileged security incident.

### Authorities
- `security/identity-and-access-model.md`
- `docs/programme/security-governance-gates.md`

Repository procedure existence is **not** rehearsal or production acceptance evidence.
