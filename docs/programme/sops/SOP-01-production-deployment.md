# SOP-01 — Production Deployment

Execution status: **REPOSITORY_EXECUTABLE_REHEARSAL_REQUIRED**

This procedure is subordinate to the NovaPharm absolute mandate. It must not be used to bypass an owner, legal/regulatory, financial, staging, identity, data-authority or production-cutover gate.

## Owner

Platform Release Owner

## Purpose

Release an exact reviewed NovaPharm SHA through the governed deployment path without bypassing staging, migration, identity, security, accessibility or rollback gates.

## Trigger

An approved release candidate is ready for managed staging or an owner-approved production candidate deployment.

## Prerequisites

1. Exact 40-character reviewed SHA; all required repository checks green on that SHA.
2. Target environment and release mode explicitly recorded.
3. Owner-approved Azure subscription/region/cost for any managed deployment.
4. Known rollback point, migration plan and backup/recovery evidence for any stateful change.

## Permissions

- GitHub Environment deployment authority for the target.
- Azure OIDC deployment role scoped to the approved resource group/subscription.
- Migration identity only during an approved migration window; no standing broad SQL privilege.

## Steps

1. Record SHA, target, release mode and approver before dispatch.
2. Run the controlled deployment workflow in `what-if` first; inspect every create/change/delete and expected cost.
3. STOP on unrelated deletion, public SQL/Blob/Key Vault exposure, unapproved paid resource or drift from the reviewed architecture.
4. Provision infrastructure with migrations disabled; populate secrets only through approved protected mechanisms.
5. Deploy the six applications in the documented order and keep candidate/staging isolated from public production traffic.
6. If migrations are approved, open the least-privilege migration window, apply once, record version/counts, then close the permission window.
7. Run health, authn/authz, customer-isolation, form/upload, document, route, accessibility, browser, security, monitoring and recovery acceptance appropriate to the environment.
8. Record package digests, deployment IDs, evidence and final disposition; do not promote DNS or swap production traffic under this SOP unless the separate cutover SOP is authorized.

## Evidence

- GitHub run URL/ID and exact SHA.
- Azure deployment/what-if IDs and parameter digest.
- Six artifact/package digests and slot/host outputs.
- Migration version/counts if applicable.
- Acceptance results, approver, start/end timestamps and rollback point.

Evidence must be stored in the approved restricted operational/change/incident record as appropriate. Never record secret values, authentication payloads, confidential document contents or unnecessary personal data in GitHub.

## Stop Conditions

- Any secret exposure; failed authorization or customer isolation; failed backup/restore; public private-storage surface; unresolved malware gate; material accessibility/security defect; unexpected charge/deletion; unexplained 5xx/security-event increase.

A STOP condition blocks progression. Contain or fail closed; do not reinterpret a failed control as an informational warning.

## Escalation

- Escalate to Release Owner, Security Lead and the affected data/business owner. Financial or production-cutover decisions require explicit owner approval.

## Rollback

- Keep traffic on the last accepted release.
- Use the separate Release Rollback / Container App Rollback / Database Migration Rollback SOP as applicable.
- Do not assume code rollback reverses database changes.

## Recovery

- Re-run the full affected acceptance boundary on the restored release.
- Reconcile data/audit/outbox state before reopening writes.
- Document root cause and corrective action before a new deployment attempt.

## Review Cadence

- Before every deployment; formally review this SOP after any failed deployment or material platform change.

### Existing authorities / evidence to consult

- `docs/programme/operations-runbook.md`
- `docs/programme/security-governance-gates.md`
- `deployment/deployment-runbook.md`
- `deployment/rollback-guide.md`
- `docs/programme/post-pr16-release-control.md`

### Rehearsal and production acceptance

- Repository procedure existence is **not** rehearsal evidence.
- Rehearsal must record environment, exact SHA/configuration, operator, date, inputs, expected/actual results, STOP conditions exercised where safe, rollback/recovery result and approver.
- Production acceptance remains empty until the applicable mandate release gate explicitly permits it.
