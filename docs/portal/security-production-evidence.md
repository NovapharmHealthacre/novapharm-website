# Secure Portal security production evidence

Review date: 22 August 2026
Production status: not deployed or accepted

## Public-host boundary

The public website serves only `/portal/` as a `noindex,nofollow` safety page. It contains no username field, password field, access-type selector, API client, protected route link or simulated authentication. The build and validator reject materialised protected Portal modules in `PUBLIC_ONLY` mode.

## Repository controls

| Boundary | Repository state | Live evidence required |
| --- | --- | --- |
| Authentication | Entra/App Service Authentication and server-session architecture implemented | Approved tenant registration, real authorised identities and sign-in logs |
| MFA and Conditional Access | Integration points documented | Tenant policy export and pass/block test matrix |
| Session security | Secure, HttpOnly, SameSite cookies; expiry, revocation and restart tests | Production cookie/header inspection and revocation exercise |
| CSRF/CORS/CSP | Server enforcement and tests | Production origin, header and negative-request evidence |
| RBAC | Four governed role areas; server is authoritative | Real customer, employee, board and admin test identities |
| Customer isolation | Database and service queries retain customer scope; IDOR tests exist | Production-like data isolation and penetration test |
| Module maturity | 48 informational/read-only; 6 hidden until dependencies exist | Business-owner acceptance and source connection per module |
| Documents | Private storage/document-authority boundary | Blob/SharePoint connection, signed access and customer isolation evidence |
| Upload safety | File validation, quarantine and scan-state contracts | Approved malware scanner detection and release exercise |
| Audit | Authentication, role and governed workflow events | Production telemetry retention and alert evidence |
| Secrets | Key Vault references and managed identities | Resolved references, least-privilege role evidence and no application secret leakage |
| Edge | Front Door Premium/WAF and origin restriction IaC | Deployed resource IDs, allowed/blocked request evidence and origin bypass test |
| Recovery | Backup/restore and rollback procedures | Staging rehearsal and production-ready recovery record |

## Production decision

No Portal module is production-operational. Repository checks, synthetic browser data and local security tests are preparation only. The Portal becomes live after staging, identity, data, storage, WAF, monitoring, backup/restore, independent penetration testing and exact-SHA owner acceptance pass together.
