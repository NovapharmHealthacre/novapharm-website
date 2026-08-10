# SOP-38 — Secret Rotation

Execution status: **REPOSITORY_EXECUTABLE_STAGING_REHEARSAL_REQUIRED**

## Owner
Security Lead

## Purpose
Rotate credentials without exposing values, losing consumers or leaving old credentials active.

## Trigger
Scheduled rotation, suspected compromise, owner change, platform policy or incident response.

## Prerequisites
1. Complete consumer/secret inventory and named authority.
2. Approved protected secret store and replacement mechanism.
3. Rollout order and verification plan.

## Permissions
- Secret create/update/revoke permission limited to the named secret; consumers receive only their required reference/access.

## Steps
1. Identify secret/key/certificate ID, authority, all consumers and current expiry without revealing the value.
2. Generate the replacement directly in the approved protected mechanism; never paste it into Git, chat, logs or tickets.
3. Update consumers one boundary at a time and verify authentication/health/audit.
4. When all consumers are confirmed, revoke/expire the old credential.
5. Verify no stale consumer still depends on the old credential and no secret value appears in evidence/logs.
6. If compromise triggered rotation, search for propagation and invoke Security Incident as necessary.

## Evidence
Secret identifier (not value), owner, consumer list, rotation timestamps, consumer validation, old-credential revocation and audit events.

## Stop Conditions
Unknown consumer; secret exposed during handling; replacement would require broader privilege; consumer validation fails; compromised old secret is proposed as rollback.

A STOP condition keeps the affected system contained and prevents unsafe revocation/activation sequencing.

## Escalation
Security Lead and affected platform/integration owner.

## Rollback
For routine non-compromise rotations only, temporarily restore the still-safe prior credential if required. A known/suspected compromised credential must never be restored.

## Recovery
Correct consumer configuration, issue another clean credential if exposure occurred, revoke superseded credentials and repeat validation.

## Review Cadence
According to platform policy and immediately after compromise/ownership change.

### Authorities
- `deployment/environment-variables.md`
- `security/secret-remediation-report.md`
- `docs/programme/security-governance-gates.md`

Repository procedure existence is **not** secret-rotation rehearsal or production acceptance evidence.
