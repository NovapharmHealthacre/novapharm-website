# Secure Portal security production evidence

Original review: 22 August 2026. AWS-first production recheck: 14 November 2026.
Full **54-module Next.js Enterprise Portal** production status: **not deployed or accepted**. The existing separate **18-route transitional Customer Workspace** is deployed in the current Nutraxin staging BFF Lambda; that limited release is not proof of 54-module acceptance.

## Public-host boundary — reverified November 2026

`portal.novapharmhealthcare.com` routes through AWS API Gateway HTTP API `wgy9p7ad0d` to the existing customer Lambda. Its root offers a unified customer sign-in; unauthenticated `/portal/dashboard/` redirects to sign-in, `/portal/executive-platform/` denies access, and the compatibility `/products/nutraxin/` remains reachable. The full Next.js runtime has **zero running ECS tasks** and no public ingress. The separate Intelligence customer-session stack is deployed with `CustomerAccessEnabled=false`.

The older `PUBLIC_ONLY` static-site statement from August 2026 applied to the corporate website safety build; it must **not** be cited as the current production behavior of the separate customer subdomain. Equally, the 18-route transitional Lambda is not a production deployment of the 54-module backend and cannot grant staff, board or administrator privileges.

## Historical security architecture controls (August 2026 target, not live acceptance)

The following Entra/Azure SQL/Key Vault/Front Door references document earlier design targets. The current AWS-first rollout requires independent AWS Cognito/session, tenant isolation, durable transaction and document storage, private ingress, WAF, backup, audit, security and zero-incremental-cost evidence before the release owner may assert these controls are live.

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
