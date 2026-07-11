# Technical Audit

## Audited Baseline

The repository used static generated pages, a dependency-light Node HTTP server, Node's built-in SQLite module, one `dotenv` runtime dependency, canonical domain services, private portal shells and early SharePoint/warehouse integration adapters. Public and protected output were generated in one large file, browser requests assumed a same-origin API without a reliable URL contract, and authentication/rate-limit state lived in process memory.

## Issues Found

- Duplicate public rendering logic and content embedded directly in the legacy generator.
- Public deployment on GitHub Pages could not execute `/api`, causing portal and contact failures.
- Sessions and rate limits disappeared on restart; login failures were not persistently auditable.
- Contact and onboarding relied too heavily on browser validation and surfaced low-level errors.
- Uploaded evidence used an ephemeral application path rather than the persistent private volume.
- No deployed email transaction, production Blueprint, container definition or CI workflow.
- Executive Platform source files were local only and could not hydrate a clean production host.
- Test coverage did not exercise the HTTP request, cookie and authentication boundary.

## Implemented Architecture

- One structured public source in `src/content` and one public renderer in `scripts/build-public-pages.mjs`.
- One protected workspace renderer in `scripts/build-pages.mjs`; public routes receive data-free locked shells while working applications are written to `SECURE_CONTENT_ROOT`.
- Canonical SQLite schema for customers, suppliers, products, batches, orders, invoices, purchase orders, users, documents, approvals, regulatory/quality records, warehouse events, CRM, support, notifications and audit logs.
- Persistent credential, scope, session, lockout, rate-limit and security-event records connected to the canonical `users` table.
- Shared browser API client for contact, onboarding, portal, employee and admin applications.
- Controlled contact transaction with consent evidence and optional Resend delivery.
- Server-validated staged account application and expiring evidence-upload token.
- Private persistent document storage, type/extension/signature controls and SharePoint outbox.
- Recursive SharePoint hydration for controlled Executive Platform files.
- Render Blueprint, Dockerfile, health check, rollback guide and GitHub Actions quality gate.

## Verification

- `npm run check` passes.
- 26 public pages and six 900-1,400-word insight articles validated.
- 39 public protected shells contain no live bindings.
- 1,227 local links, assets and anchors validated.
- Domain workflow test covers onboarding, document storage, activation, supplier/product creation, sales order, purchase order, audit and blocked external integrations.
- HTTP integration test covers CSRF, failed and successful login, persistent session, contact, onboarding upload, health and logout.

## Production Constraints

- The sandbox cannot bind a local TCP port, so the server is tested through its exported request handler.
- Browser URL policy prevents a local file preview; production visual and Lighthouse QA must run after deployment.
- SQLite launch topology is single-instance. Managed PostgreSQL is required before horizontal scaling.
