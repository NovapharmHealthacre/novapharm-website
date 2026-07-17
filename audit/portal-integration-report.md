# Enterprise Portal Integration Report

**Review date:** 17 July 2026  
**Branch:** `backend/activate-forms-portal-sql`  
**Status:** Repository implementation complete; rendered acceptance pending

## Scope

The enterprise portal is implemented as one governed application rather than a collection of independent dashboards. The module catalogue contains 54 routed contracts covering the 50-section owner brief:

| Audience | Modules | Data boundary |
| --- | ---: | --- |
| Customer | 18 | Authenticated customer ID and account-authorised records |
| Employee | 13 | Employee scope and canonical operational records |
| Board / executive | 18 | Board scope and read-only executive evidence |
| Administrator | 5 | Administrator scope and security-controlled actions |

## Unified Architecture

- Migration `database/sqlite/004_integrated_enterprise_portal.sql` adds the normalized enterprise domain to SQLite.
- Migration `database/azure/004_integrated_enterprise_portal.sql` preserves the same domain boundary for the Azure SQL target.
- `src/core/enterprise-domain-service.mjs` is the shared server-side read/write boundary.
- `src/core/portal-module-catalog.mjs` is the authoritative route and module register.
- `assets/js/enterprise-app.js` renders all module payloads without injecting API HTML.
- Domain events, outbox records, audit records, approvals and workflow instances retain cross-module traceability.

## Implemented Business Chains

The synthetic validation dataset exercises:

1. Product onboarding and controlled catalogue import.
2. Lead to customer, application review and account activation.
3. Order to cash, including inventory, shipment, invoice, payment and statement relationships.
4. Procure to pay, including purchase order, receipt and three-way matching.
5. Quality complaint, investigation, CAPA and recall-assessment boundaries.
6. Document control, quarantine, scan state, approval and authorised access.

## Nutraxin Catalogue

- 19 products across six catalogue ranges are recorded from the owner-supplied PDF.
- 95 responsive media assets are registered with checksums and provenance.
- 84 composition rows preserve the catalogue transcription.
- Price, stock, availability and public health claims are not imported.
- Every item remains draft, not marketed and subject to classification/evidence review.
- The public catalogue is an indexable B2B reference page, not a shop or product-availability claim.

## Actual Verification

The following commands completed successfully on 17 July 2026:

- `npm run check`
- `npm run test:integration`
- `npm run test:backend-activation`
- `npm run test:production-security`
- `npm run test:preview-security`
- `npm run test:session-restart`
- `npm run test:database-migration`
- `npm run test:azure-sql-migrations`
- `npm run test:enterprise-migrations`
- `npm run test:enterprise-portal`
- `npm run test:entra-identity`
- `npm run test:secret-resolution`
- `npm run test:document-scans`
- `npm run test:cookies`
- `npm run test:backup-restore`

The test run confirmed 34 public pages, six Insights articles, five leadership entities, 41 locked public shells, 54 enterprise module contracts, 94 documented tables and 2,145 valid local links/assets.

## External Boundaries

NHS data, PLPI, pharmacovigilance, tenders, Microsoft 365, AI and capital-planning modules use explicit planned or external-dependency states. No live NHS supply, granted licence, operational safety system, deployed AI, SharePoint connection or commercial performance is invented.

## Remaining Gate

The current candidate has not yet completed the expanded Chromium/WebKit matrix after the enterprise and Nutraxin changes because the desktop environment did not permit opening the isolated localhost validation port. The prior committed browser evidence relates to an earlier commit and is not treated as current evidence.
