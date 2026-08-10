# SOP-42 — Release Rollback

Execution status: **REPOSITORY_EXECUTABLE_STAGING_REHEARSAL_REQUIRED**

## Owner
Platform Release Owner

## Purpose
Return an unsafe release to the last accepted application/configuration state while treating data and DNS as separate authorities.

## Trigger
Post-deployment acceptance failure or incident requiring release reversal.

## Prerequisites
1. Last accepted SHA/artifact digests/revision/configuration.
2. Current release and database migration state.
3. Known rollback blast radius and traffic state.
4. Incident/change owner.

## Permissions
- Release/revision authority only; database and DNS changes require SOP-12 and SOP-40 respectively.

## Steps
1. Freeze further releases and record current SHA/configuration/traffic.
2. Identify the last accepted release and confirm it does not contain the triggering defect/security issue.
3. Determine database/data/integration backward compatibility before moving traffic.
4. Roll application revision/slot back using SOP-11.
5. If schema/data recovery is required, invoke SOP-12; never assume application rollback reverses data.
6. Do not change DNS unless separately authorized under SOP-40.
7. Run affected health, security, role/customer-isolation, form, accessibility, performance and monitoring checks.
8. Reconcile writes/outbox/events created during the failed release and record the corrective forward-fix plan.

## Evidence
Current/prior SHA/digests, revision/traffic changes, database-compatibility decision, test results, reconciliation, owner and timestamps.

## Stop Conditions
Prior release is unverified/unsafe; schema incompatible; data loss risk; rollback widens security exposure; DNS/data action lacks separate authority.

A STOP condition contains/fails closed rather than forcing a rollback.

## Escalation
Release Owner, Database Owner, Security Lead and programme owner.

## Rollback
This SOP is the governed rollback. If the last accepted release cannot be restored safely, isolate/fail closed and invoke Disaster Recovery where applicable.

## Recovery
Stabilize monitoring, reconcile data/integrations and deliver a reviewed corrective release through normal Change Control.

## Review Cadence
Rehearse in managed staging before R3 and review after every production rollback.

### Authorities
- `deployment/deployment-runbook.md`
- `deployment/rollback-guide.md`
- `docs/programme/post-pr16-release-control.md`

Repository procedure existence is **not** rollback rehearsal or production acceptance evidence.
