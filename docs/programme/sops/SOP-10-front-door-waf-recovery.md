# SOP-10 — Front Door / WAF Recovery

Execution status: **REPOSITORY_EXECUTABLE_STAGING_REHEARSAL_REQUIRED**

## Owner
Edge Platform Owner

## Purpose
Recover Front Door/WAF routing or policy without exposing origins or weakening security as a shortcut.

## Trigger
Front Door outage, bad route, false-positive WAF block, unhealthy origin or edge-security regression.

## Prerequisites
1. Current Front Door routes/origins/WAF inventory.
2. Last accepted edge configuration and direct-origin rejection evidence.
3. Domain Trust Runbook.

## Permissions
- Edge configuration authority only; DNS permission is separate.

## Steps
1. Confirm impact and affected hosts from ordinary and managed/corporate networks where possible.
2. Identify whether failure is DNS, TLS, route, origin health, WAF rule or application.
3. Capture current profile/policy/rule IDs before mutation.
4. Prefer reverting the specific recent edge change; never disable WAF globally merely to restore traffic.
5. Verify origins remain private/direct-origin rejected.
6. Test HTTPS, redirects, security headers, cookies/CSRF, static assets, forms and auth callbacks.
7. Run the AAH retest checklist when corporate-filter compatibility is implicated.
8. Record recovery and residual risk.

## Evidence
- Host/rule IDs, before/after configuration, origin health, WAF evidence, TLS/redirect/security tests and AAH result where applicable.

## Stop Conditions
- Only proposed fix disables WAF/origin lockdown broadly; certificate identity is unclear; mail/unrelated DNS would be touched; protected origin would become public.

A STOP condition blocks progression.

## Escalation
- Security Lead and Domain/Edge Owner; DNS changes require SOP-40 and owner approval.

## Rollback
- Reapply the last accepted Front Door/WAF configuration and keep protected Portal/API closed rather than route them to static/public hosting.

## Recovery
- Verify edge/security headers/origin lockdown, then observe WAF/error rates before closure.

## Review Cadence
- After every edge incident and quarterly configuration review.

### Authorities
- `docs/programme/domain-trust-runbook.md`
- `docs/programme/azure-front-door-edge-architecture.md`
- `docs/programme/aah-retest-checklist.md`

Repository procedure existence is **not** rehearsal or production acceptance evidence.
