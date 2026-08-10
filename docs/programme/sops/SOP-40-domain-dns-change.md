# SOP-40 — Domain / DNS Change

Execution status: **REPOSITORY_EXECUTABLE_STAGING_REHEARSAL_REQUIRED**

## Owner
Domain and Edge Owner

## Purpose
Change web DNS as a reversible, observable cutover while preserving mail and unrelated verification records.

## Trigger
Approved custom-domain validation, staging/candidate validation or explicitly authorized production web-host cutover.

## Prerequisites
1. Complete before-change DNS export including TTL, A/AAAA/CNAME, MX, SPF, DKIM, DMARC, CAA and verification records.
2. Accepted target route/origin and TLS readiness.
3. Monitoring and rollback target verified.
4. Explicit production authorization for any production traffic change.

## Permissions
- Domain/DNS authority limited to the named web record; no blanket zone mutation.

## Steps
1. Record registrar/DNS authority, exact record, current value/TTL and intended target.
2. Preserve all mail and unrelated verification records unchanged.
3. Lower only the approved web TTL in the planned window when required.
4. Add validation records first and wait for managed TLS/target readiness.
5. Change **one web hostname at a time**.
6. Verify DNS propagation, TLS, redirects, canonical host, security headers, assets, forms, identity callbacks/cookies/CSRF and monitoring.
7. Run AAH/corporate-network retest where applicable.
8. Advance to the next hostname only after the current one is accepted; retire old hosting only after stable no-split-traffic evidence.

## Evidence
Before/after DNS export, TTLs, resolver results, target/edge IDs, TLS/HTTP tests, AAH result, approver and timestamps.

## Stop Conditions
No full DNS inventory; target/TLS not accepted; mail/unrelated record would change; protected Portal/API would be routed to static public hosting; rollback value is unknown.

A STOP condition blocks cutover.

## Escalation
Domain/Edge Owner, Security Lead and programme owner for production cutover.

## Rollback
Restore **only** the recorded prior web DNS values/accepted target. Never roll back or alter mail records.

## Recovery
Verify propagation, TLS, application/auth/form behavior and monitoring after rollback; document TTL propagation and residual split traffic.

## Review Cadence
Before every domain change; formal review after any DNS/TLS incident.

### Authorities
- `docs/programme/domain-trust-runbook.md`
- `docs/programme/aah-retest-checklist.md`
- `docs/programme/azure-front-door-edge-architecture.md`

Repository procedure existence is **not** authorization to change production DNS.
