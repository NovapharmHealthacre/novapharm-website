# NovaPharm Backend Activation Matrix

**Status:** Baseline verified; repository activation candidate implemented
**Reviewed:** 15 July 2026
**Repository baseline:** `e6ece8954f57aa9d6d05216e821bde9ecff3d377`
**Public host observed:** GitHub Pages (`server: GitHub.com`)

## Verified live cause

The approved public pages return `200` from GitHub Pages, including `/contact/`,
`/account-application/`, `/portal/` and the locked `/admin/dashboard/` shell.
The legitimate workflow request to `/api/security/csrf` returns the branded public
`404` because GitHub Pages cannot execute `server.mjs`. Contact and account forms
therefore enter their explicit outage fallback, and portal login reports that the
secure service is unavailable. This is the source of the reported 404 workflow;
it is not a missing public navigation page.

## Activation decisions

| Workflow | Frontend implementation | Backend endpoint | Database dependency | Identity dependency | Email dependency | Storage dependency | Current live result | Missing configuration | Required owner action | Security risk | Activation decision |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Contact enquiry | Accessible validated form in `assets/js/novapharm.js` | `GET /api/security/csrf`, `POST /api/contact` | Lead, consent, audit and notification records | None for applicant; admin session for review | Resend and Microsoft Graph adapters implemented | None | CSRF route is a GitHub Pages 404; outage email fallback is shown | Node host, SQL, sender and recipient | Approve provider and enter protected credentials; later approve host cutover | Submission cannot persist on static host | Implemented in candidate: public reference, attribution, consent evidence and sensitive-content rejection |
| Account application | Four-stage form in `assets/js/account-application.js` | `POST /api/account-applications` | Application, status, audit and notification records | None for applicant; admin session for review | Internal and acknowledgement templates exist | Private store required for documents | CSRF route is a 404; outage email fallback is shown | Node host, SQL and private storage | Configure Azure/Entra only through protected owner-controlled steps | Static hosting cannot persist or recover a partial application | Implemented in candidate: idempotent submission, immutable status history and partial-upload recovery |
| Supporting documents | Multiple constrained file inputs | `POST /api/account-applications/:id/documents` | Document, link, audit and scan-event records | Short-lived applicant upload and resume authorisations | None | Local private store or private Azure Blob quarantine | No upload occurs on GitHub Pages | Node host and private storage | Approve Azure resources only after zero-cost gate | Static host cannot store files; unscanned files must never leave internal storage | Implemented in candidate: hashed durable grants, expiry, 10-file limit, duplicate-safe retry and fail-closed scan gate |
| Customer portal | Role selector and protected portal shell | Auth and portal APIs | Users, scopes, sessions and customer mapping | Entra External ID target; hardened local validation path | Invitation notification | Private documents through authorised server routes | Portal health API is unavailable; no login is attempted | Node host, External ID registration and approved customer identity | Microsoft interactive sign-in, consent and validation user | Static hosting cannot enforce sessions or customer isolation | Keep locked shells on Pages; activate only on same-origin Node service |
| Employee portal | Protected generated modules | Auth, dashboard and operational APIs | Users, scopes, sessions and operational records | Entra workforce app and employee group/role | None | Authorised operational documents | Locked shell only | Node host and Entra app role/group | Microsoft administrator consent | Frontend links alone are not authorisation | Existing server scope checks remain authoritative; validate every route |
| Board and Executive Platform | Protected generated executive modules | Auth, portal and document APIs | Users, scopes, sessions and audit records | Entra board group/role | None | Controlled SharePoint libraries | Locked shell only | Node host, Entra and SharePoint least privilege | Approve Microsoft consent and complete permission change | Broad Visitors read and Members write inheritance is verified | Keep fail-closed; restrict SharePoint through the complete administrator rollback procedure before confidential use |
| Administrator portal | Generated private dashboard | `/api/admin/*` and integration worker APIs | Leads, applications, documents, notifications, sessions and audit | Entra admin role/group; local bootstrap for controlled validation | Replay queue | Private document metadata | Public locked shell exposes no records | Node host and administrator identity | Protected bootstrap or Entra setup; never share a secret in chat | Public hosting must expose no operational records | Implemented in candidate: server-authorised lead/application detail, transitions, activation, replay and session revocation |
| Microsoft sign-in | Button is conditionally enabled from safe health state | `POST /api/auth/federated` behind App Service authentication | Federated identity linkage, scopes and sessions | Entra ID / External ID | None | None | Unavailable on GitHub Pages | App registrations, redirect URIs, roles/groups and admin consent | Microsoft interactive sign-in and consent | Untrusted identity headers must never be accepted | Preserve trusted-runtime header enforcement and fail closed until configured |
| Transactional email | Accessible in-page status; no client provider key | Notification outbox and retry worker | Durable idempotent notification queue | Admin session for replay | Resend and Microsoft Graph MIME adapters | None | Not executed on static host | Provider selection, sender, recipient and protected credential | Confirm sender permission or Resend domain without new unapproved cost | Email failure must not roll back a valid form record | Implemented in candidate: persist first, bounded retry, safe blocked state, administrator replay and HTML/plain-text output |
| Health and readiness | Portal probes safe API state | `/api/health`, `/api/health/live`, `/api/health/ready` | Provider readiness and migration state | Reports configuration only | Reports configuration only | Reports configuration only | Public API path is a branded 404 | Node host | None for local validation; cloud access for deployment | A static `200` page can be mistaken for backend health | Implemented in candidate: separate process liveness and dependency readiness with safe state names |
| Azure SQL migration | No browser dependency | Migration scripts and runtime provider | Azure SQL is the authoritative target | Managed identity preferred | None | None | Not deployed | Azure login, eligible subscription, SQL free offer or later paid approval | Select subscription interactively; do not share credentials | Provisioning without verified cost controls is prohibited | Three ordered migrations are statically validated; real Azure execution remains owner-gated |

## Host and tooling decision

The development host is Apple Silicon macOS. Docker is not installed, and no
local SQL Server installation is required. SQLite remains the isolated local
test provider; Azure SQL remains the managed target. Repository checks run with
the bundled Node.js 24 runtime. Azure CLI is installed but currently has no
authenticated account or visible subscription, so no Azure resource may be
provisioned in this phase without the owner-controlled interactive gate.

## Microsoft 365 read-only verification

The delegated NovaPharm Microsoft profile and company SharePoint site were
available for read-only verification on 15 July 2026. The Executive Platform
folder remains present and inherits site Owners, Visitors read and Members
write permissions; no anonymous sharing link appeared in the effective folder
permission response. This confirms the existing least-privilege gap. No
permission, file or mailbox-content change was made because the available
connector does not provide a complete stop-inheritance and rollback operation.
