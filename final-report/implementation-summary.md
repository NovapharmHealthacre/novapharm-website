# Azure Migration Implementation Summary

Status: repository implementation in progress; production not complete  
Branch: `codex/azure-production-platform`  
Last reviewed: 14 July 2026

## Completed in the candidate

- current-state audit, Path A ADR, hosting/cost comparison;
- generated public site preserved with 33 indexable pages, six articles and five leadership profiles;
- responsive real-media product pipeline and provenance register, with controlled pending state until files are materialised;
- portable async data layer and Azure SQL schema/migration guards;
- managed-identity Azure SQL, private Blob and Microsoft Graph adapters;
- quarantine/malware state machine that advances only clean documents;
- durable transactional-email queue with bounded backoff, Resend idempotency, contact and account acknowledgements, automatic processing and an administrator-only replay route;
- Entra workforce/External ID role mapping and customer approval boundary;
- Azure App Service, SQL, Storage, Key Vault, private endpoints, monitoring and alerts in Bicep;
- OIDC-gated GitHub Actions for infrastructure validation and controlled staging/production-candidate deployment;
- Azure-specific identity, database, deployment, backup, rollback, incident and SharePoint runbooks;
- factual privacy/data-map updates for current GitHub Pages and gated Azure processing.

## Verified locally

`npm run check` passed on 14 July 2026. It covered build, 33 public pages, six articles, 40 locked shells, 1,906 links, claims, syntax, 281 current-tree files, contact and account email failure/replay, onboarding, four portal scopes, bootstrap/change/invalidation, absolute/inactivity expiry, production headers/origin/host checks, preview controls, session restart, legacy database migration, Entra role mapping, unresolved secret rejection, malware state transitions, cookie choices and SQLite backup/restore. Final clean-checkout and GitHub workflow evidence is still required at the release head. Local `npm audit` had no result because DNS access to the npm advisory endpoint was unavailable.

## Not completed

No Azure resource, Entra application, External ID tenant, Azure SQL data migration, live Blob scan, Key Vault secret, Graph site grant, Resend sender, Azure staging deployment, browser acceptance, penetration test, Azure restore, PR merge, production deployment, slot swap, DNS change or GitHub Pages retirement is claimed.
