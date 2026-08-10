# SOP-23 — Customer Data Isolation Review

Execution status: **REPOSITORY_EXECUTABLE_REHEARSAL_REQUIRED**

## Owner
Security and Data Owner

## Purpose
Prove customer data isolation is enforced server-side across reads, writes, documents and audit—not by UI filtering.

## Trigger
Pre-staging/production acceptance, customer-scope change, security review or suspected isolation defect.

## Prerequisites
1. At least two synthetic/authorized customer accounts with distinct data.
2. Server-side identity-to-customer linkage.
3. Portal/API role test harness and audit visibility.

## Permissions
- Test identities only; production customer data requires explicit production-test authorization.

## Steps
1. Authenticate as Customer A and exercise every customer-scoped module/API/document surface.
2. Attempt direct identifiers/routes for Customer B and require denial/not-found without metadata leakage.
3. Exercise write-capable workflows and verify created records bind to Customer A from server context.
4. Repeat as Customer B.
5. Verify audit/logs do not reveal other-customer content.
6. Verify employee/admin access only through approved roles—not by changing a browser selector.
7. Record zero cross-customer leakage as a hard invariant.

## Evidence
- Test identities/customer IDs, routes/endpoints, positive/negative results, created record IDs, audit evidence, exact SHA/environment.

## Stop Conditions
- Any cross-customer data/metadata leakage; client customer ID overrides server context; audit/log leakage; inconsistent document authorization.

A STOP condition immediately blocks progression under Section 109.

## Escalation
- Security/Data Owner immediately.

## Rollback
- Disable affected customer route/write path or protected Portal/API; return to the last accepted isolation behavior where known safe.

## Recovery
- Fix server-side scoping and rerun the entire customer module/isolation matrix before reactivation.

## Review Cadence
- Every managed-staging acceptance, production cutover, customer-scope architecture change and isolation incident.

### Authorities
- `security/identity-and-access-model.md`
- `docs/programme/portal-api-migration-acceptance.md`
- `packages/portal-contracts/src/module-catalog.json`

Repository procedure existence is **not** rehearsal or production acceptance evidence.
