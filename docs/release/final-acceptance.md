# Corporate final acceptance

Candidate date: 30 August 2026
Branch: `codex/corporate-product-discipline-rebuild`
Base and current live SHA: `23310988e8fc484375aa10176aa1c1edbf5371a8`
Implementation SHA: `9f49161425790596413051a2b00cedeae51905a9`
Candidate: Draft PR [#70](https://github.com/NovapharmHealthacre/novapharm-website/pull/70); exact implementation checks passed
Release decision: repository candidate accepted; not merged or deployed, and managed production remains blocked

## Current live truth

GitHub Pages reports the custom-domain site as built from `main`, and the deploy job for `23310988e8fc484375aa10176aa1c1edbf5371a8` concluded successfully. Apex and `www` resolve to the GitHub Pages estate. The rebuilt corporate candidate in this branch is not live and must not be confused with that deployed SHA.

## Repository acceptance status

| Gate | Exact candidate result | Status |
| --- | --- | --- |
| Static public build | 58 public pages and 19 Nutraxin product details generated in `PUBLIC_ONLY` mode | Pass at implementation SHA |
| Canonical public routes | 57 indexable canonical routes; account application correctly omitted from public-only sitemap | Pass at implementation SHA |
| Links/assets | 3,198 local references checked | Pass at implementation SHA |
| Claims | Public pharmaceutical claims audit across all 57 indexable pages | Pass at implementation SHA |
| SEO/social/schema | Canonical metadata, sitemaps, crawler policy, 58 page records, article and leadership entities | Pass at implementation SHA |
| Portal public boundary | No credentials, managed API control or protected module is materialised | Pass at implementation SHA |
| Managed Corporate app | Lint, strict typecheck, 59-route content validation, 18 tests and Next.js production build | Pass at implementation SHA |
| Products contract | Products overview, Nutraxin overview, 19 details, redirects and no-commerce boundary | Pass at implementation SHA |
| Visual contracts | New navigation/design/product structural assertions | Pass at implementation SHA |
| CRO/Oncology content | Concise responsibility and no-decoration contracts | Pass at implementation SHA |
| 42 deliverables | 20 governed deliverables, 42 programme rows, 54 Portal rows and 19 product rows | Pass at implementation SHA |
| Chromium and WebKit responsive/Axe | 40 canonical routes plus governed 404, ten viewports, 820 screenshots, 164 Axe runs, two high-density checks and two scriptless checks | Pass at implementation SHA |
| Print/PDF | 12 PDFs, 39 rendered pages, page-content checks and human inspection | Pass at implementation SHA |
| Lighthouse medians | Homepage and Products, desktop/mobile, three-run medians; 100 desktop and 96 mobile, Accessibility/Best Practices/SEO 100, CLS 0 and TBT 0 | Pass at implementation SHA; 2.8-second mobile LCP remains a transparent staging/field follow-up |
| Portal browser/Axe | 54 governed modules, 48 visible modules, 13 viewports, 1,360 screenshots and 230 Axe runs | Pass with isolated synthetic data; not production evidence |
| Requirements | 5,900 records, exactly one allowed final status each, 190 evidence paths, zero stale, ambiguous or undocumented statuses | Pass at implementation SHA |
| Image governance | 801 assets inventoried with exact/perceptual duplicate review classifications | Pass at implementation SHA |
| Security/supply chain | Secret scan, dependency audit, immutable Actions, SBOM/licences, checksums, source-map boundary and reproducible-lock controls | Pass at implementation SHA |
| Complete canonical root suite | Governed Node 24 `npm run check`, including all six applications, backend, identity, migrations, Portal, medicines intelligence and final `PUBLIC_ONLY` rebuild | Pass at implementation SHA |
| Clean checkout | Fresh detached worktree, lockfile-only install and complete governed Node 24 `npm run check`; no unexplained generated diff | Pass at implementation SHA |
| GitHub exact-head checks | The npm-workspace lock failure and later managed-account live-region failure were both repaired; every check at the exact implementation head concluded successfully | Pass at implementation SHA |

## Production-dependent status

- Contact: managed repository workflow exists; no real production enquiry has reached an authorised mailbox.
- Open Account: managed contracts exist; no production application, private upload, scan or review has completed.
- Portal: 48 modules are informational/read-only in repository classification and 6 are hidden; 0 are production-operational.
- Nutraxin commerce: no price, stock, sale approval, merchant, delivery or production transaction authority; no purchase control is shipped.
- Azure: subscription and provider are ready for review, but UK South `Total Regional VMs` remains 0 and no App Service exists.
- DNS: no managed host or record change has been made.

## Release rule

All repository-controlled implementation gates pass at `9f49161425790596413051a2b00cedeae51905a9`, and Draft PR 70 preserves that candidate for owner review. The PR may be merged and the truthful `PUBLIC_ONLY` Pages site released only after explicit owner merge/release authority and final-head verification. Managed workflows remain unavailable regardless of a public Pages release until their separate infrastructure, identity, data, security and live-transaction gates pass.
