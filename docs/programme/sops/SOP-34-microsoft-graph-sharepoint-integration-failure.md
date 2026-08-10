# SOP-34 — Microsoft Graph / SharePoint Integration Failure

Execution status: **DEPENDENCY_BLOCKED_LIVE_INTEGRATION**

## Owner
Microsoft 365 Platform Owner

## Purpose
Contain Microsoft Graph/SharePoint failures while keeping document and metadata authorities explicit and permissions least-privilege.

## Trigger
Graph/SharePoint auth, API, permission, versioning, outbox or reconciliation failure.

## Prerequisites
1. Approved tenant consent and Microsoft 365 Platform Owner.
2. Accepted Graph scopes/site/library authority.
3. Canonical SQL metadata/external-ID linkage and retry/dead-letter controls.

## Permissions
- Dedicated least-privilege application/managed identity; no scope broadening during incident recovery.

## Steps
1. If tenant consent/integration authority is not accepted, STOP and keep `executive.microsoft-365` hidden.
2. Identify whether failure is identity/token, scope, site/library, API throttling, object/version or network.
3. Preserve canonical SQL transaction/security metadata and SharePoint document authority separately.
4. Record correlation/external document IDs and failed operation without document contents/secrets.
5. Queue failed writes/notifications for idempotent retry; never last-write-wins across conflicting authorities.
6. Verify permissions/site scope before replay; never solve a 403 by granting broad tenant access.
7. Reconcile external ID/version/hash and canonical metadata for every affected item.
8. Remove temporary diagnostic privilege and record final state.

## Evidence
Tenant/site/app identifiers, approved scopes, correlation/external IDs, error class, retry/reconciliation and privilege cleanup.

## Stop Conditions
No tenant authority; proposed scope expansion exceeds approval; private documents become broadly accessible; external/version mapping conflicts; secret appears in logs.

A STOP condition disables the integration and preserves the last verified authority state.

## Escalation
Microsoft 365 Platform Owner, Security Lead and affected Document/Data Owner.

## Rollback
Disable connector/retry and restore prior accepted app permission/config where safe; do not delete canonical metadata or SharePoint history.

## Recovery
Correct scope/configuration, replay idempotently and reconcile all documents/metadata before reactivation.

## Review Cadence
After every failure; rehearse before first live activation and after consent/scope changes.

### Authorities
- `docs/programme/integration-register.md`
- `docs/programme/operations-runbook.md`
- `security/identity-and-access-model.md`

Repository procedure existence is **not** evidence that Microsoft 365 integration authority has been accepted.
