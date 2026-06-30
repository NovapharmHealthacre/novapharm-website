# Technical Audit

## Current State Reviewed

- Public website routes generated through `scripts/build-pages.mjs`.
- Secure Node runtime in `server.mjs`.
- Canonical data model in `database/schema.sql`.
- Domain services in `src/core`.
- SharePoint and Polar Speed integration boundaries in `src/integrations`.
- Customer portal, employee portal, admin portal and protected Executive Platform modules.
- Architecture documents under `/architecture`.
- Deployment, security, SEO, GEO and final reports.

## Previous Issues Found

- Public website and executive dashboards were not connected to a unified master data model.
- Private portal, admin and operating apps were previously static or partially duplicated.
- Customer, supplier, product, order, invoice, PO, document and workflow data did not share one canonical model.
- SharePoint was described conceptually but did not have a working Graph client/outbox boundary.
- Warehouse/Polar Speed integration had no clear contract boundary.
- The Executive Platform used non-deterministic chart values in a few areas.
- `/portal/settings` was promised but not consistently generated.
- The website GitHub checkout exists separately and is not writable in the current sandbox session.

## Implemented

- Added master architecture docs: master data model, system relationships, data flows and ER diagrams.
- Added canonical SQLite schema for customers, suppliers, products, orders, invoices, purchase orders, users, employees, documents, SharePoint links, audit logs, approvals, regulatory/quality records, stock/warehouse transactions, CRM, tickets and notifications.
- Added domain services for account applications, activation, product master, supplier master, orders, purchase orders, leads, dashboards and audit reporting.
- Added secure server APIs with CSRF, rate limiting, HMAC session signing, protected private routes and no-store API responses.
- Added SharePoint document folder/upload outbox and Graph API client.
- Added Polar Speed/Marken integration adapter and outbox processor that blocks safely until the API contract and credentials exist.
- Linked onboarding documents forward from account applications to activated customer records.
- Added generated customer, employee and admin portal routes.
- Reintegrated all Executive Platform pages inside `/portal/executive-platform/` with portal-local assets.
- Added merge script for copying this consolidated tree into the GitHub website checkout once writable.

## Verification

- `node --check server.mjs`
- JS/MJS syntax checks across `src`, `scripts` and `assets/js`
- `node scripts/validate-site.mjs`
- `node scripts/validate-app.mjs`
- `node scripts/validate-domain.mjs`

## Open Technical Constraints

- Local server binding is blocked by the current sandbox with `listen EPERM`; this is an environment restriction, not a validation failure.
- The actual website checkout at `/Users/vishalchakravarty/Documents/Novapharm InfoTech/novapharm-website` is read-only in this session, so direct merge, commit and push are blocked here.
- Production live deployment to `novapharmhealthcare.com` needs hosting, DNS and GitHub write/deploy credentials.
