# SOP-11 — Container App Rollback

Execution status: **REPOSITORY_EXECUTABLE_STAGING_REHEARSAL_REQUIRED**

## Owner
Application Platform Owner

## Purpose
Return an unhealthy application release to the last accepted immutable revision without implicitly rolling data backward.

## Trigger
Failed health, security, role/isolation, performance or runtime acceptance after deployment.

## Prerequisites
1. Last accepted revision/SHA/package digest.
2. Current traffic/slot mapping.
3. Database migration state known.
4. Rollback approval in the incident/change record.

## Permissions
- Application revision/traffic authority only; database permission is excluded unless SOP-12 is invoked.

## Steps
1. Freeze further application deployments.
2. Record current/prior revisions, SHA/digests and traffic state.
3. Determine whether the defect is code-only or coupled to a data migration.
4. If code-only and schema-compatible, return traffic to the last accepted revision.
5. If data compatibility is unknown, STOP and invoke SOP-12; never guess.
6. Run health, authn/authz, customer-isolation, form/upload, integration and monitoring smoke tests.
7. Preserve the failed revision as evidence until closure permits cleanup.

## Evidence
- Revision IDs, traffic before/after, SHAs/digests, migration-compatibility decision, smoke tests and approver/timestamps.

## Stop Conditions
- Prior revision unavailable/unverified; schema compatibility unknown; rollback reintroduces a security flaw; traffic target is ambiguous.

A STOP condition keeps traffic on the safest accepted boundary.

## Escalation
- Release Owner, Database Owner and Security Lead.

## Rollback
- The traffic return to the accepted revision is the rollback; never automatically reverse database state.

## Recovery
- Reconcile queues/outbox and state created under the failed release; implement a reviewed forward fix.

## Review Cadence
- Rehearse in managed staging before R3 and after deployment-architecture changes.

### Authorities
- `deployment/deployment-runbook.md`
- `deployment/rollback-guide.md`
- `docs/programme/post-pr16-release-control.md`

Repository procedure existence is **not** rehearsal or production acceptance evidence.
