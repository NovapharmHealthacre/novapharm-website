# Founder Application Migration Acceptance

Status: repository candidate accepted; deployment pending

Candidate branch: `codex/unified-digital-estate-foundation`

Acceptance date: 30 July 2026

## Outcome

The approved Vishal Chakravarty public corpus has been migrated from a standalone ESM static-page builder into `apps/founder`, a TypeScript, React and Next.js application within the governed NovaPharm workspace. The legacy repository remains available as provenance and no live DNS or deployment has changed.

The application preserves the founder property's editorial identity while consuming the shared NovaPharm entity and SEO packages. It publishes the approved executive designation `Chief Executive Officer`; the founder relationship remains a separate governance fact.

## Implemented surface

- Home, About, Ventures, Thinking, Media, Gallery, Speaking and partnerships, Facts, Contact and Privacy pages.
- Ten approved essays under stable canonical URLs.
- Custom 404 and safe runtime error experiences.
- `facts.json`, `feed.json`, RSS, sitemap, robots and web-manifest routes.
- Canonical Person, Organization, ProfilePage, WebPage, BlogPosting and Breadcrumb entity relationships.
- Browser-only, source-bound evidence retrieval over an approved public corpus, with citations, abstention and medical/private/instruction-boundary controls.
- Approved portrait derivatives in AVIF, WebP and progressive JPEG with responsive selection and explicit dimensions.
- Standalone Node deployment output for a managed runtime.
- Per-request nonce Content Security Policy, anti-framing controls and restrictive browser permissions.

## Content boundary

Only ten public essay records, seven approved managed-page records, the approved portrait, registered social artwork and the public evidence corpus were migrated. Private drafts, source portrait files, unused gallery alternatives and previously generated HTML were excluded.

The website does not provide accounts or collect form submissions. Contact remains an explicit email handoff. This avoids presenting a non-functional or simulated workflow before the shared API is deployed.

## Actual automated results

| Gate | Result |
|---|---|
| Node runtime | Passed on Node `24.14.0` |
| Clean npm install | Passed using `npm ci --ignore-scripts` |
| Production dependency audit | Passed, zero reported vulnerabilities |
| Biome source check | Passed; informational style diagnostics remain non-blocking |
| TypeScript | Passed with no emit |
| Managed-content validation | Passed: 10 essays, 7 managed pages and approved evidence corpus |
| Unit tests | Passed: 7 of 7 |
| Production build | Passed: 28 generated routes |
| Standalone packaging | Passed |
| Standalone artifact security scan | Passed: 1,406 files; no source maps or recognised secret patterns |
| Chromium rendered matrix | Passed: 21 routes at 7 required viewports |
| WebKit rendered matrix | Passed: 21 routes at 7 required viewports |
| Screenshot evidence | 294 genuine screenshots captured |
| Automated accessibility | 84 Axe runs; zero serious or critical findings |
| Lighthouse desktop | Performance 100, Accessibility 100, Best Practices 100, SEO 100 |
| Lighthouse mobile | Performance 98, Accessibility 100, Best Practices 100, SEO 100 |
| Desktop Core Web Vitals lab values | LCP 0.6 s, CLS 0, TBT 0 ms |
| Mobile Core Web Vitals lab values | LCP 2.5 s, CLS 0, TBT 10 ms |

Lighthouse results are local laboratory measurements against the production standalone build, not production field data. They do not establish live Core Web Vitals.

## Security and indexing checks

- Public framework assets are crawlable; APIs remain disallowed in the founder crawler policy.
- OAI-SearchBot is permitted for public search discovery while model-training crawlers are governed separately.
- All article-to-page entity links use absolute canonical identifiers.
- No raw Markdown HTML enters the renderer.
- External Markdown links are limited to safe approved protocols.
- CSP, frame denial, MIME sniffing protection, referrer policy, permissions policy and cross-origin policies were observed on the running candidate.
- Generated build output, TypeScript caches, browser artifacts and local test databases are excluded from Git.
- Production standalone packaging removes server source maps and rejects recognised secret-bearing or development artifacts before completion.

## Remaining gates

1. Owner review of the candidate experience and biography wording.
2. Managed hosting and environment configuration.
3. Production-domain mapping and HTTPS acceptance.
4. Search Console and Bing ownership actions.
5. Post-deployment smoke, accessibility, performance and crawler validation.
6. Intentional retirement or archival decision for the legacy founder repository only after stable cutover.

The founder application is repository-ready, but it is not declared live or production-complete.
