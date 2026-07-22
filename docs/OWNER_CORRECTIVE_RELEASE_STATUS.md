# Owner Corrective Release Status

Updated: 22 July 2026

## Approved corrective scope represented in this branch

- Public Responsible AI, AI Governance and Search & Ask NovaPharm removed from generated pages, routes, assets and discovery files.
- Search control removed from desktop and mobile navigation.
- Prabhakar Vitthal Lahare added to the CRO Senior judgement section alongside Vishal Chakravarty and Dr Girish Shantilal Achliya.
- Three original Oncology-specific editorial visuals added for formulation pathways, evidence continuity and condition control.
- Contact, account-application, secure-portal and Microsoft identity entry points retained and covered by repository activation tests.
- Public Pages publication and live Node-backend activation reported through separate release statuses.
- Generated public output synchronized with the source build before final exact-head validation.

## Release-state meanings

- **Source complete:** corrective source code and tests are present.
- **Generated output synchronized:** committed public HTML, CSS, routes, sitemaps and assets match the deterministic build.
- **Exact-head green:** production, SEO, visual and Chromium/WebKit workflows pass on the same final commit.
- **Pages live:** the static public release is verified on `novapharmhealthcare.com`.
- **Backend live:** `/api/health`, CSRF, forms, portal sessions and Microsoft identity are verified on the production origin.

The pull request remains unmerged until explicit owner approval.
