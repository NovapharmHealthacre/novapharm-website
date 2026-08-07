# ADR-001: NovaPharm Unified Digital Estate Architecture

Status: implemented in repository; external deployment gates pending
Date: 1 August 2026
Decision owners: NovaPharm Healthcare Ltd and the implementation programme

## Context

NovaPharm currently operates three independently built public properties and a capable but undeployed corporate Node backend. GitHub Pages reliably serves public content, but it cannot execute authentication, protected forms, persistent transactions or controlled document workflows. The master specification requires a coordinated estate without erasing the distinct purposes of the corporate, NIT and founder experiences.

The programme compared:

- hardening each existing repository independently;
- replacing all properties in one immediate rewrite;
- creating a fourth orchestration repository;
- incrementally converting the corporate repository into the canonical workspace while preserving production until acceptance.

## Decision

Use the corporate repository as the canonical NovaPharm monorepo and migrate through a controlled strangler pattern.

The target source architecture is:

```text
apps/
  corporate/
  technology/
  founder/
  portal/
  api/
  status/
packages/
  accessibility/
  auth/
  claims/
  config/
  content/
  design-system/
  forms/
  platform-mode/
  portal-contracts/
  security/
  seo/
infra/
  modules/
  unified-estate.bicep
```

Use:

- strict TypeScript;
- npm workspaces with one exact lockfile and Turborepo available for package-level orchestration;
- Next.js 16.2.12 or a later security-patched release within the approved Active LTS line at implementation time;
- React 19;
- Next.js App Router, server rendering and static generation according to route needs;
- accessible semantic HTML as browser output;
- shared typed facts, claims, people, routes, forms, integrations and security contracts;
- distinct visual compositions for corporate, NIT, founder and portal experiences.

The existing corporate static generator and Node service remain available as migration reference implementations until parity and rollback evidence is complete. They are not the long-term source architecture.

## Runtime topology

| Boundary | Responsibility | Target |
|---|---|---|
| Public applications | Corporate, Technology and founder content; corporate form gateway when API health is confirmed | Three isolated Next.js applications on a shared public Azure App Service plan |
| Portal | Customer, employee, board and administrator experiences | Dedicated Next.js/Node portal origin, never deployed to static hosting |
| API | Forms, workflows, identity linkage, transactions, documents and integrations | Dedicated Node/TypeScript API service |
| Status | Sanitised public service state only | Separate minimal application with no confidential telemetry |
| Edge | TLS, redirects, host policy, WAF/rate controls and safe caching | Azure Front Door Premium and Azure WAF are implemented in the paid-estate IaC; deployment and live acceptance remain owner-controlled |

Azure App Service for Linux is preferred for the conventional persistent Node/Next.js workload because it offers a simpler operating model than container orchestration. Azure Container Apps remains a measured alternative only if independent services, event processing or scale characteristics create a demonstrated advantage.

The implemented Azure contract uses six independently packaged App Services on two plans. Corporate, Technology, founder and status share the public plan. Portal and API share a separate secure plan but retain separate managed identities. Only the API identity receives Azure SQL and private Blob access. Portal and API use separate Key Vaults so the portal cannot read session, email or bootstrap secrets. Production uses candidate slots and separate candidate SQL/Blob resources; staging uses a separate resource group and no production data. Azure Front Door Premium gives every application an isolated production and candidate route under one prevention-mode WAF policy. Origins accept only the Front Door backend service tag and exact profile identifier. Regional failover remains deliberately disabled until a second accepted regional estate exists.

The corporate browser submits contact and account workflows through a narrow same-origin gateway. That gateway permits only public form endpoints and resolves the API origin at runtime, preventing a candidate API hostname from being frozen into JavaScript during slot promotion. The portal signs every App Service-authenticated principal handoff to the API with a short-lived HMAC assertion. The API checks timestamp, method, path, selected access type and a database-backed nonce before trusting the identity header.

## Authoritative data boundaries

| Data | Authority | Notes |
|---|---|---|
| Identity linkage, roles, scopes, sessions, applications, customers, transactions, consent, audit and document access | Azure SQL Database | Parameterised queries, schema migrations, constraints, least privilege and restore evidence required |
| Application uploads and generated private files | Private Azure Blob Storage | Quarantine, scanning state, private access and controlled delivery |
| Board, approved quality, regulatory, contract and controlled corporate documents | SharePoint document libraries | Versioning, least privilege, no anonymous links |
| Microsoft 365 business registers and review views | SharePoint Lists where operationally useful | Every field has one named authority; immutable SQL identifiers and idempotent sync |
| Individual drafts | OneDrive only as personal working storage | Never an application database, integration identity or controlled repository |
| Public content and evidence metadata | Versioned typed repository records | Published only after claims/evidence gates pass |

SharePoint is the controlled-document backbone, but it does not replace the transactional or security authority of Azure SQL.

## Identity decision

- Microsoft Entra ID for employees, board members and administrators.
- Microsoft Entra External ID for approved customers and partners.
- Server-side app-role and scope validation on every protected request.
- MFA for privileged workforce identities, subject to available licensing and tenant policy.
- Invitation or approved onboarding for external pharmaceutical accounts.
- No client-side-only authorisation and no unrestricted privileged self-registration.
- A one-time bootstrap credential may exist only for controlled activation, must force password replacement and must be removed after Entra acceptance.

The canonical scopes are `customer`, `employee`, `board` and `admin`. Administrative navigation does not confer document or record access; every resource remains independently authorised.

## Deployment modes

One typed deployment-mode contract governs build output and runtime behaviour:

- `PUBLIC_ONLY`: public content only; no login, password, upload, account or secure-workflow interfaces.
- `FULL_PLATFORM`: public properties plus healthy API, portal, identity, persistence and integrations.
- `MAINTENANCE`: controlled public notice and explicitly available safe functions only.
- `INCIDENT`: deny secure workflows, minimise exposure and display approved incident communications.

Builds fail when a route or control violates the selected mode. This resolves the present static-hosting boundary failure.

## Security and secrets

- Managed identities are preferred for Azure resources.
- Azure Key Vault is the production secret authority.
- Portal and API use distinct vault boundaries; the gateway signing secret is rotated coherently in both vaults while unrelated secrets remain isolated.
- GitHub Actions uses workload identity federation rather than long-lived deployment credentials.
- Credentials, tokens and session material never enter client bundles, logs, analytics, screenshots or documentation.
- Private files are never stored under a public web root.
- The portal and API are non-indexable, non-cacheable and protected independently of crawler rules.
- Security headers, exact host/origin validation, CSRF, session rotation, rate limits, lockout, audit logging and fail-closed integration behaviour are shared contracts.

## Claims and content governance

All properties consume one typed registry for:

- canonical organisation and person identities;
- visible titles and separate governance facts;
- regulated appointments;
- operational, planned, target and subject-to-authorisation states;
- evidence source, review owner, jurisdiction and review date;
- publication approval and expiry.

An absent or expired evidence state prevents publication of the associated regulated claim. Schema and visible content must resolve to the same records.

## Search and accessibility

- Important public content is present in server-rendered or generated HTML.
- Canonicals, sitemaps, RSS, metadata and JSON-LD derive from the route/content source of truth.
- Persistent entity `@id` values connect organisation, people, services and articles.
- Secure routes and documents are excluded from sitemaps and protected by authentication, not robots rules alone.
- Shared components target WCAG 2.2 AA and include keyboard, focus, reduced-motion, contrast and screen-reader contracts.

## Migration approach

1. Correct current public/static boundary defects without taking production offline.
2. Introduce shared typed packages and CI gates.
3. Migrate one public property at a time with route, content, metadata and visual parity. Founder, Technology and corporate migrations are now represented in `apps/` with acceptance evidence.
4. Deploy isolated Azure staging with synthetic data.
5. Activate API, forms, portal, identity, database and private documents behind generated staging origins.
6. Rehearse migration, backup, restore and rollback.
7. Obtain owner acceptance and explicit DNS approval.
8. Cut over without changing Microsoft 365 mail records.
9. Retire GitHub Pages only after production acceptance and traffic verification.

## Rejected alternatives

### Independent hardening only

Rejected as the long-term model because it preserves duplicated facts, security logic, accessibility patterns and deployment controls. It is used only for immediate risk reduction during migration.

### Immediate big-bang rewrite

Rejected because it creates unnecessary availability, search-equity and rollback risk. The current public sites must remain available until replacement acceptance.

### Fourth orchestration repository

Rejected because it would create another silo. The corporate repository already contains the broadest public, backend, integration, evidence and infrastructure assets.

### Static Web Apps as the whole platform

Rejected because a static delivery model cannot honestly represent protected sessions, transactional forms, secure uploads and controlled portal data without separate managed services. Static generation remains valid for public routes within the unified applications.

### SharePoint or OneDrive as the application database

Rejected for identity, session, customer isolation, transactional and audit-integrity requirements. SharePoint remains the controlled-document and selected business-register layer.

## Consequences

Positive:

- one factual and security authority across three distinct brands;
- phased migration with production continuity;
- server-rendered search and accessible output;
- managed identity, data and document boundaries;
- reusable tested controls rather than duplicated site-specific implementations.

Costs and risks:

- meaningful migration effort and temporary dual operation;
- Azure, Entra, Graph, legal and DNS actions remain external gates;
- evidence reconciliation is required before publishing changed regulated titles;
- production cannot be declared complete from repository tests alone.

## Acceptance conditions

This ADR is fully realised only when:

- all six applications build from one lockfile;
- route/capability mode tests pass;
- all public URLs and redirects are reconciled;
- all protected routes pass role and customer-isolation tests;
- forms, uploads and integrations pass real staging acceptance;
- Azure SQL and private documents pass backup and isolated restore;
- Chromium and WebKit acceptance passes at required viewports;
- accessibility, security, dependency, secret, SEO and schema gates pass;
- owner-controlled production deployment, DNS and Microsoft approvals are complete.
