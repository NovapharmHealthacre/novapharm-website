# Unique Module Art Direction Report

Status: implementation and local rendered acceptance passed; owner review and merge pending

Reviewed: 15 July 2026

Implementation commit: `a1473d7cbf2b789da5e015f8bf9c1fe0cfcd977b`

## Executive Summary

NovaPharm's approved cinematic homepage hero has been preserved and refined with a clear red United Kingdom marker and stronger supporting-copy contrast. The hard-coded media assignment system has been replaced by `config/module-art-direction.json`, a route-aware source of truth for purpose, subject, hero and secondary media, crops, alt text, captions, provenance, reuse limits and structured-data relationships.

The 16 principal modules now have 15 unique hero assets plus one approved leadership portrait composition. Three-Pillar Sourcing, Partner Ecosystem, Batch Integrity, Services, Regulatory, Partners, Technology and Insights have been rebuilt as distinct editorial systems. Decorative editorial SVGs are retired from production placements.

## Duplicate-Media Audit

The baseline contained five exact duplicate principal-hero groups, six excess hero assignments and 11 routes inside duplicate groups. Eleven non-product modules also used Product Portfolio photography as a generic fallback. The exact groups and routes are recorded in `audit/module-art-direction-issue-matrix.json`.

The candidate has zero duplicated principal heroes, zero byte-identical registered assets, zero perceptual pairs at or below the Hamming-distance threshold of eight, zero unregistered production media and zero product-photo fallback violations. No photo is permitted on more than two public routes, and every second use has an explicit editorial relationship.

## Changed Routes

`/`, `/about/`, `/about/company/`, `/about/governance/`, `/leadership/`, `/services/`, `/regulatory-services/`, `/product-portfolio/`, `/partner-with-us/`, `/technology/`, `/news-insights/`, `/contact/`, `/investor-information/`, `/careers/`, `/account-application/`, `/legal/`, and all six existing Insights article routes.

## Media And Provenance

- 29 registered art-direction assets: 26 generated, two existing Pexels-licensed product photographs and one approved existing homepage asset.
- Generated media has AVIF, WebP and JPEG at 1600x900 and 960x540, with byte counts and SHA-256 hashes in `creative-assets/module-media-asset-register.json`.
- Full route, source, creator, licence, acquisition, modification and review records are in `docs/media-provenance-register.json`.
- Module assignments and reuse limits are in `docs/module-media-register.json`.
- No asset has unresolved provenance. No video was added; the approved image-led motion hero remains lighter, more accessible and more truthful than a generic stock loop.
- Approved leadership portraits for Vishal Chakravarty, Prabhakar Vitthal Lahare and Dr Girish Shantilal Achliya were preserved. No synthetic executive portrait was introduced.

## SEO And GEO

Article, module and social imagery is now route-specific. The image sitemap and social-image register were regenerated, article schema continues to reference each article's representative image, and the canonical organisation, person, author and breadcrumb relationships remain intact. `npm run seo:validate` passed across 33 canonical pages, six articles and five leadership entities.

## Visual Evidence

- Baseline: 24 Chromium screenshots at 1440x900 and 390x844.
- Candidate: 48 Chromium and WebKit screenshots at 1440x900 and 390x844.
- All candidate evidence used `prefers-reduced-motion: reduce`.
- Manifests: `audit/evidence/art-direction/before/manifest.json` and `audit/evidence/art-direction/after/manifest.json`.
- Full acceptance: 616 rendered page states, 616 Axe scans and 764 screenshots across Chromium, WebKit and all seven required viewports; zero issues.

## Actual Validation

| Check | Result |
|---|---|
| `npm ci --ignore-scripts` | Passed; 265 packages installed; zero vulnerabilities reported |
| `npm run check` | Passed |
| Build and generated-page validation | Passed; 33 public pages, six articles, five leadership entities |
| Link check | Passed; 2,021 local links and asset references |
| Module-media validator | Passed; 16 modules, 29 assets, 26 generated sets |
| Exact and perceptual duplicate scan | Passed; zero prohibited pairs |
| Claims audit | Passed for 33 indexable pages |
| Current-tree secret scan | Passed |
| Gitleaks current tree | Passed; no leaks found |
| Gitleaks full history | Passed; 177 commits, no leaks found |
| `npm audit --omit=dev --audit-level=high` | Passed; zero vulnerabilities |
| Browser and accessibility acceptance | Passed; 616 states, 616 Axe scans, zero issues |
| Integration, security, sessions, cookies, documents, backup/restore | Passed |

Local Lighthouse results are recorded in `performance/lighthouse-report.md`. This report does not claim live field performance, search rankings, regulatory approval, current supply, facility ownership or active partnerships.

## Owner Review

Review the homepage hero and UK marker; Three-Pillar Sourcing; Partner Ecosystem; Services; Regulatory; Products; Partners; Technology; Insights; Contact; and About at the committed evidence paths. There are no unresolved media-rights items or forced design choices. The remaining decision is approval of the complete visual direction before merge.

No production merge, deployment, DNS change, SharePoint permission change or live-site cutover occurred in this phase.
