# SOP-06 — Security Incident

Execution status: **REPOSITORY_EXECUTABLE_REHEARSAL_REQUIRED**

## Owner
Security Lead

## Purpose
Respond to suspected or confirmed security compromise with fail-closed containment and preserved forensic evidence.

## Trigger
Credential/token exposure, unauthorized privilege, customer-isolation breach, malicious upload release, private document exposure, injection/XSS takeover, data exfiltration or security-control bypass.

## Prerequisites
1. Security Incident severity declared.
2. Security Lead/Incident Commander assigned.
3. Restricted evidence store and current identity/session/secret inventory.

## Permissions
- Security Lead authorizes containment; use read-only forensic access before mutation where practical.

## Steps
1. Preserve logs, audit events, deployment SHA and resource state without copying sensitive payloads into public systems.
2. Revoke exposed credentials, tokens and sessions; invoke SOP-38 for rotation.
3. Restrict affected routes, identities, storage or integration; fail closed when scope is uncertain.
4. Determine impacted data classes, customers, roles and time window.
5. Check Git/history, CI artifacts, logs and external systems for propagation without publishing secret values.
6. Restore only from a verified clean release/data/config state.
7. Validate authentication, authorization, customer isolation, documents/uploads and monitoring.
8. Record breach-assessment and notification decisions with qualified privacy/legal/regulatory owners.

## Evidence
- Restricted incident record, revocation IDs, affected SHA/resources, sanitized audit timeline, recovery tests and notification decision/owner.

## Stop Conditions
- Forensic evidence is at risk; compromise remains active; customer/safety scope is unknown; containment requires unreviewed destructive action; clean recovery point is unverified.

A STOP condition blocks progression. Contain or fail closed.

## Escalation
- Escalate Critical incidents to programme owner immediately; privacy/legal/regulatory and pharmacovigilance obligations remain qualified-owner decisions.

## Rollback
- Roll back code/config only to a verified clean state; otherwise isolate. Never restore a known-compromised secret/token.

## Recovery
- Rotate all potentially exposed credentials, reconcile data/audit, monitor for recurrence and require security acceptance before reopening.

## Review Cadence
- After every security incident; tabletop at least annually.

### Authorities
- `security/incident-response-plan.md`
- `security/identity-and-access-model.md`
- `docs/programme/security-governance-gates.md`

Repository procedure existence is **not** rehearsal or production acceptance evidence.
