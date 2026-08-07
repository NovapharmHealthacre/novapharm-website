# Domain Trust and Corporate-Filter Runbook

Status: procedure complete; production execution owner-controlled
Review date: 1 August 2026

## Inventory before change

Export all DNS records and record TTL, owner, registrar, current origin, certificate chain, HTTP/HTTPS redirects, canonical host, security headers and public IP/CDN classification. Preserve MX, SPF, DKIM, DMARC, Microsoft 365, CAA and unrelated verification records. Change only approved website records.

## Required trust state

- HTTPS with a valid complete chain and modern protocol configuration.
- Root is canonical; `www` performs one permanent redirect to root.
- Subdomains resolve only to their intended Front Door route.
- No redirect loop, mixed content, stale certificate or alternate-origin split traffic.
- Public apps have direct canonical links and required assets; portal/API/status remain appropriately noindex/private.
- Front Door origins reject direct traffic without the exact profile identifier.
- CSP, HSTS, content type, referrer, permissions and frame controls match application purpose.

## Corporate-network compatibility

Test from an ordinary network and at least one AAH-class managed corporate network. Capture DNS, TLS, redirects, HTTP status, page/assets, security-category result and gateway identifiers. Do not ask a corporate gateway operator to whitelist NovaPharm before correcting genuine DNS, certificate, redirect, reputation, mixed-content, header or hosting inconsistencies.

## Cutover sequence

1. Accept generated Azure/Front Door hostnames and candidate routes.
2. Record DNS and lower only relevant TTLs in an approved window.
3. Add validation records without changing mail records.
4. Wait for managed TLS issuance.
5. Test all hosts through Front Door and direct-origin rejection.
6. Change one public hostname at a time after owner approval.
7. Verify forms, identity callbacks, cookies, CSRF, sitemap, robots and monitoring.
8. Run the AAH retest checklist.
9. Retire GitHub Pages only after stable acceptance and no split traffic.

## Rollback

Restore only recorded website DNS values or the prior accepted Front Door/app release. Keep secure portal/API closed rather than pointing them to static hosting. Never roll back mail records. Record timing, TTL propagation, certificate state and post-rollback tests.

Detailed deployment rollback: `deployment/rollback-plan.md`. AAH evidence template: `docs/programme/aah-retest-checklist.md`.
