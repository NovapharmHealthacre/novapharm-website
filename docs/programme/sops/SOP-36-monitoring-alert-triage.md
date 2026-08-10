# SOP-36 — Monitoring Alert Triage

Execution status: **REPOSITORY_EXECUTABLE_REHEARSAL_REQUIRED**

## Owner
Service Operations Owner

## Purpose
Turn each monitoring alert into an acknowledged, owned diagnostic path without muting genuine failures.

## Trigger
Application, platform, security, identity, data, integration, cost or synthetic-monitor alert fires.

## Prerequisites
1. Alert identifies environment/service/signal and expected owner.
2. Current release SHA/config and recent change history are available.
3. Incident severity criteria exist.

## Permissions
- Monitoring read/acknowledge; remediation uses the relevant change/incident SOP.

## Steps
1. Acknowledge and record alert ID/time/service/environment.
2. Confirm the signal from an independent health/log/metric source where practical.
3. Identify current SHA/config and recent relevant changes.
4. Classify as real degradation, security/control invariant, dependency failure or false/noisy alert.
5. Invoke Incident/Security/Major Incident immediately for material failures; customer-isolation/security alerts are never downgraded for convenience.
6. For false positives, change thresholds/rules only through Change Control with evidence.
7. Verify recovery from service metrics and user-relevant probes before resolving.

## Evidence
Alert ID, signal values, environment/SHA, diagnosis, incident/change link, recovery metrics and resolver.

## Stop Conditions
Customer isolation/security invariant failed; alert requires disabling monitoring to clear; owner/service identity uncertain; evidence conflicts with apparent recovery.

A STOP condition keeps the alert/incident open.

## Escalation
Service Owner; Security Lead for security/control signals; Major Incident path for cross-service impact.

## Rollback
Revert any alert-rule change that suppresses real failures; application rollback follows SOP-42.

## Recovery
Confirm normal metrics over an appropriate observation window and close corrective actions.

## Review Cadence
Daily operational review once live; monthly alert-quality review.

### Authorities
- `docs/programme/operations-runbook.md`
- `security/incident-response-plan.md`

Repository procedure existence is **not** live monitoring or alert rehearsal evidence.
