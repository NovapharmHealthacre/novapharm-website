# SOP-39 — Certificate Renewal / TLS Incident

Execution status: **REPOSITORY_EXECUTABLE_STAGING_REHEARSAL_REQUIRED**

## Owner
Domain and Edge Owner

## Purpose
Renew or recover TLS without hostname confusion, private-key exposure, redirect breakage or unrelated DNS change.

## Trigger
Certificate expiry warning, failed managed issuance, hostname mismatch, incomplete chain or TLS outage.

## Prerequisites
1. Authoritative hostname/domain inventory and certificate owner.
2. Current Front Door/custom-domain binding and DNS validation state.
3. Last accepted DNS/TLS configuration and rollback values.

## Permissions
- Certificate/custom-domain authority; DNS changes are executed separately under SOP-40.

## Steps
1. Identify exact hostname, certificate source, expiry/issuer/chain and affected edge route.
2. Prefer approved managed certificate lifecycle where configured; never export/private-copy a key unnecessarily.
3. If domain validation is required, use SOP-40 and change only the required web validation record.
4. Verify issuance/binding before directing production traffic.
5. Test hostname match, full chain, modern TLS, HSTS/security headers, canonical redirect and application assets.
6. Verify all six hostnames independently when shared edge configuration changes.
7. Record renewal/incident evidence and next expiry/ownership.

## Evidence
Hostname, certificate/binding IDs, expiry, validation record, chain/TLS tests, affected route, owner and timestamps. Never record private key material.

## Stop Conditions
Hostname/owner ambiguous; private key would be exposed; mail/unrelated DNS must change; certificate chain or origin identity remains invalid.

A STOP condition keeps the affected hostname off production traffic where necessary.

## Escalation
Domain/Edge Owner and Security Lead; programme owner for production traffic impact.

## Rollback
Restore the last accepted custom-domain/certificate binding or safe web DNS target; never roll back mail records.

## Recovery
Verify TLS/redirect/security headers from ordinary and managed/corporate networks and monitor certificate/edge health.

## Review Cadence
At least monthly certificate inventory and after every TLS incident.

### Authorities
- `docs/programme/domain-trust-runbook.md`
- `docs/programme/azure-front-door-edge-architecture.md`

Repository procedure existence is **not** managed TLS/production acceptance evidence.
