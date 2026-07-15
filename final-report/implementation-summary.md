# Azure Migration Implementation Summary

Status: backend activation candidate implemented and locally validated; production not complete
Branch: `backend/activate-forms-portal-sql`
Last reviewed: 15 July 2026

## Completed in the candidate

- current-state audit, Path A ADR, hosting/cost comparison;
- generated public site preserved with 33 indexable pages, six articles and five leadership profiles;
- eight provenance-registered product photographs materialised through a controlled workflow into 24 validated AVIF/WebP/JPEG derivatives; staging visual and owner crop/content approval remain pending;
- portable async data layer and Azure SQL schema/migration guards;
- managed-identity Azure SQL, private Blob and Microsoft Graph adapters;
- quarantine/malware state machine that advances only clean documents;
- durable transactional-email queue with bounded backoff, Resend idempotency, contact and account acknowledgements, automatic processing and an administrator-only replay route;
- Entra workforce/External ID role mapping and customer approval boundary;
- Azure App Service, SQL, Storage, Key Vault, private endpoints, monitoring and alerts in Bicep;
- OIDC-gated GitHub Actions for infrastructure validation and controlled staging/production-candidate deployment;
- Azure-specific identity, database, deployment, backup, rollback, incident and SharePoint runbooks;
- factual privacy/data-map updates for current GitHub Pages and gated Azure processing;
- durable enquiry references and attribution, a four-stage application with resumable private uploads, immutable review states, separate customer activation, provider-neutral email, administrator review/actions, nine reporting views and separate liveness/readiness health checks.

## Verified locally

`npm run check` passed locally on 15 July 2026. Chromium and WebKit rendered 616 page states at seven viewports with 616 zero-violation Axe scans and 764 screenshots. A separate browser workflow passed contact submission, account application, document upload and administrator review in both engines. Lighthouse measured 97 mobile/100 desktop performance on the homepage and 100 in all four categories on Contact and Account Application mobile. Gitleaks current-tree/reachable-history scans and the production dependency audit reported zero findings.

## Not completed

No Azure resource, Entra application, External ID tenant, Azure SQL data migration, live Blob scan, Key Vault secret, Graph site grant, production sender, Azure staging deployment, penetration test, Azure restore, PR merge, production deployment, slot swap, DNS change or GitHub Pages retirement is claimed.
