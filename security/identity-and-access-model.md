# Identity and Access Model

Status: application enforcement implemented and tested locally; Entra tenant configuration pending  
Owner: NovaPharm security owner  
Last reviewed: 14 July 2026

## Identity classes

| Class | Provider | Admission | Required assurance |
|---|---|---|---|
| Employees | Microsoft Entra workforce tenant | Approved group/app-role assignment | MFA; Conditional Access where licensed |
| Board | Microsoft Entra workforce tenant | Explicit Board group/app role | MFA; short privileged session; Board-only content |
| Administrators | Microsoft Entra workforce tenant | Explicit Admin app role | MFA; least privilege; monitored events |
| Customers/partners | Microsoft Entra External ID | Approved account plus invitation/verified email | Appropriate MFA or step-up; strict customer mapping |
| Recovery bootstrap | Local one-time credential | Owner-approved Key Vault/config input | Forced change; blocked from confidential data until changed |

## Authoritative scopes

- `customer`: linked customer account only;
- `employee`: approved operational modules;
- `board`: Board portal and Executive Platform;
- `admin`: identity, approval, integration and security administration.

Vishal Chakravarty is the primary administrator and public Chief Executive Officer. His authorised identity maps to all four scopes. The frontend never grants access: routes, APIs, customer IDs and documents are checked by the server.

## Federated trust boundary

The application accepts `x-ms-client-principal` only when Entra auth is enabled and it is running in the trusted App Service environment. App roles and configured group object IDs are mapped server-side. External identities are denied unless an active or invited user is linked to an approved canonical customer record.

## Session controls

- opaque 256-bit session identifiers stored server-side;
- HMAC-signed cookie value;
- `Secure`, `HttpOnly`, `SameSite=Lax` in production;
- rotation on login/password change;
- credential-version invalidation;
- logout revocation;
- 30-minute inactivity expiry and eight-hour absolute expiry by default;
- rate limiting and progressive lockout for local fallback;
- CSRF and exact-origin validation for state changes;
- `no-store` and `noindex` for protected content.

Conditional Access sign-in frequency must be finalised with the Entra policy owner before production.

## Separation of duties

- GitHub OIDC deployment identity: deploy resources/packages only;
- Azure SQL administrator group: create users and control migration rights;
- App Service managed identity: runtime SQL, Blob, Key Vault and approved Graph access;
- Microsoft 365 administrator: Graph consent and SharePoint site grant;
- NovaPharm administrator: application users/scopes, not tenant-wide secrets;
- Board group: read by default; no implicit employee membership.
