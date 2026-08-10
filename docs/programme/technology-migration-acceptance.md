# Technology Application Migration Acceptance

Status: repository candidate accepted; shared form API and deployment pending

Candidate branch: `codex/unified-digital-estate-foundation`

Acceptance date: 30 July 2026

Source baseline: `NovapharmHealthacre/novapharm-innovation-technology` at `47143bae56410f058cfcfb58d1d9c9db327300ea`

## Outcome

The approved Novapharm Innovation Technology public property has been migrated into `apps/technology`, a TypeScript, React and Next.js application within the governed NovaPharm workspace. Its distinct advisory identity, content and interactive network visual are preserved while security policy, canonical entity relationships, dependency governance and deployment packaging now use shared platform controls.

No live DNS or deployment has changed. The source repository remains available as migration provenance.

## Implemented surface

- Home, Expertise, Sectors, How we work, Insights, About, Contact, Privacy and Terms routes.
- Three approved Insights articles under stable canonical URLs.
- Custom 404, robots, sitemap and web-manifest routes.
- Canonical NIT Organization and WebSite entities linked to the parent NovaPharm Healthcare entity.
- Article schema linked to the canonical NIT publisher identity.
- Approved NIT SVG used byte-identically in the header, footer, metadata and manifest.
- Per-request nonce Content Security Policy, anti-framing controls, restrictive browser permissions and validation-environment `noindex` support from `@novapharm/security`.
- Standalone Node deployment output scanned for source maps, recognised secret patterns and development-only artifacts.

## Form and data boundary

The project brief is an explicit local email-preparation workflow. It validates required fields in the browser, prepares a message in the visitor's email application and clearly states that no form data is uploaded or stored by the site. It is not represented as an API submission.

Server persistence, consent evidence, notification queuing and provider retries remain part of the shared corporate API migration. The email handoff must not be described as that future end-to-end workflow.

## Remediations completed during acceptance

- Removed a stale nested React type dependency and aligned the application with the monorepo lockfile.
- Added a keyboard-focusable labelled wrapper to the horizontally scrollable mobile decision horizon.
- Replaced an incompatible `article`/`tabpanel` combination with a semantically neutral tab panel.
- Declared the approved NIT SVG for browser and application identity, removing the missing-favicon request.
- Made first-viewport headlines and identity content visible immediately instead of delaying the largest content element behind entrance animation.
- Kept reduced-motion behavior and verified the animated canvas is nonblank in the rendered application.

## Actual automated results

| Gate | Result |
|---|---|
| Node runtime | Passed on Node `24.14.0` |
| Clean npm install | Passed using `npm ci --ignore-scripts` |
| Production dependency audit | Passed, zero reported vulnerabilities |
| Biome source check | Passed |
| TypeScript | Passed after generated Next.js route types |
| Content validation | Passed: 11 route sources, 3 articles and official logo hash |
| Unit tests | Passed: 3 of 3 |
| Production build | Passed: 17 generated application routes |
| Standalone packaging | Passed |
| Standalone artifact security scan | Passed: 1,337 files |
| Chromium rendered matrix | Passed: 13 routes at 7 required viewports |
| WebKit rendered matrix | Passed: 13 routes at 7 required viewports |
| Screenshot evidence | 182 genuine screenshots captured |
| Automated accessibility | 52 Axe runs; zero serious or critical findings |
| Lighthouse desktop | Performance 78, Accessibility 100, Best Practices 100, SEO 100 |
| Lighthouse mobile | Performance 95, Accessibility 100, Best Practices 100, SEO 100 |
| Desktop lab values | LCP 2.7 s, CLS 0.022, TBT 10 ms |
| Mobile lab values | LCP 2.9 s, CLS 0, TBT 10 ms |

Lighthouse results are local laboratory measurements against the production standalone build in public indexable mode. They are not production field data. The large desktop canvas remains a measured performance optimisation opportunity; the application does not yet have enough real-user data to establish 75th-percentile Core Web Vitals.

## Manual visual review

Representative Chromium desktop and WebKit mobile captures were inspected for the homepage, contact page and Insights article. The review confirmed:

- no clipping, horizontal page overflow, broken media or text collisions;
- readable logo and navigation at desktop and mobile widths;
- coherent dark hero composition and nonblank network canvas;
- restrained first-viewport motion with essential text immediately available;
- clear contact-form labels and data-boundary copy;
- stable article hierarchy and legible long-form typography.

## Remaining gates

1. Shared API integration if NIT contact submissions are to be persisted rather than prepared locally.
2. Owner verification of the published address and the formal relationship between NIT and NovaPharm Healthcare.
3. Managed hosting, environment configuration and production-domain mapping.
4. Production real-user performance monitoring and further canvas optimisation if field LCP exceeds the agreed target.
5. Search Console/Bing ownership and post-deployment crawler checks.
6. Post-deployment functional, accessibility, security and performance smoke testing.

The technology application is repository-ready for the unified platform, but it is not declared live or production-complete.
