# Corporate final acceptance

Candidate date: 28 August 2026
Branch: `codex/corporate-product-discipline-rebuild`
Base and current live SHA: `23310988e8fc484375aa10176aa1c1edbf5371a8`
Candidate SHA: uncommitted working tree; exact release SHA not assigned
Release decision: not yet eligible for merge or deploymen

## Current live truth

GitHub Pages reports the custom-domain site as built from `main`, and the deploy job for `23310988e8fc484375aa10176aa1c1edbf5371a8` concluded successfully. Apex and `www` resolve to the GitHub Pages estate. The rebuilt corporate candidate in this branch is not live and must not be confused with that deployed SHA.

## Repository acceptance status

| Gate | Exact candidate result | Status |
| --- | --- | --- |
| Static public build | 58 public pages and 19 Nutraxin product details generated in `PUBLIC_ONLY` mode | Pass on working tree |
| Canonical public routes | 57 indexable canonical routes; account application correctly omitted from public-only sitemap | Pass on working tree |
| Links/assets | 3,198 local references checked | Pass on working tree |
| Claims | Public pharmaceutical claims audit across all 57 indexable pages | Pass on working tree |
| SEO/social/schema | Canonical metadata, sitemaps, crawler policy, 58 page records, article and leadership entities | Pass on working tree |
| Portal public boundary | No credentials, managed API control or protected module is materialised | Pass on working tree |
| Managed Corporate app | Lint, strict typecheck, 59-route content validation, 18 tests and Next.js production build | Pass on working tree |
| Products contract | Products overview, Nutraxin overview, 19 details, redirects and no-commerce boundary | Pass on working tree |
| Visual contracts | New navigation/design/product structural assertions | Pass on working tree |
| CRO/Oncology content | Concise responsibility and no-decoration contracts | Pass on working tree |
| 42 deliverables | 20 governed deliverables, 42 programme rows, 54 Portal rows and 19 product rows | Pass on working tree |
| Chromium and WebKit responsive/Axe | 40 canonical routes plus governed 404, ten viewports, 820 screenshots, 164 Axe runs, two high-density checks and two scriptless checks | Pass on working tree |
| Print/PDF | 12 PDFs, 39 rendered pages, page-content checks and human inspection | Pass on working tree |
| Lighthouse medians | Homepage and Products, desktop/mobile, three-run medians; 100 desktop and 96 mobile, Accessibility/Best Practices/SEO 100, CLS 0 and TBT 0 | Pass on working tree; 2.8-second mobile LCP remains a transparent staging/field follow-up |
| Portal browser/Axe | 54 governed modules, 48 visible modules, 13 viewports, 1,360 screenshots and 230 Axe runs | Pass with isolated synthetic data; not production evidence |
| Requirements | 5,900 records, exactly one allowed final status each, 190 evidence paths, zero stale, ambiguous or undocumented statuses | Pass on working tree |
| Image governance | 801 assets inventoried with exact/perceptual duplicate review classifications | Pass on working tree |
| Security/supply chain | Secret scan, dependency audit, immutable Actions, SBOM/licences, checksums, source-map boundary and reproducible-lock controls | Pass on working tree |
| Complete canonical root suite | Governed Node 24 `npm run check`, including all six applications, backend, identity, migrations, Portal, medicines intelligence and final `PUBLIC_ONLY` rebuild | Pass on working tree |
| Clean checkout | No immutable candidate SHA yet | Pending |
| GitHub exact-head checks | No remote feature branch or PR exists for this working increment | Pending |

## Production-dependent status

- Contact: managed repository workflow exists; no real production enquiry has reached an authorised mailbox.
- Open Account: managed contracts exist; no production application, private upload, scan or review has completed.
- Portal: 48 modules are informational/read-only in repository classification and 6 are hidden; 0 are production-operational.
- Nutraxin commerce: no price, stock, sale approval, merchant, delivery or production transaction authority; no purchase control is shipped.
- Azure: subscription and provider are ready for review, but UK South `Total Regional VMs` remains 0 and no App Service exists.
- DNS: no managed host or record change has been made.

## Release rule

All repository-controlled working-tree gates currently pass. The branch may be committed and pushed for owner review only after the complete diff and generated-artifact set are accepted as the intended candidate. It may be merged and the public Pages site released only after clean-checkout reproduction and exact-head GitHub checks pass. Managed workflows remain unavailable regardless of a public Pages release until their separate live gates pass.
