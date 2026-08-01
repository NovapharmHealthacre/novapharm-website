# Corporate Application Migration Acceptance

Status: repository candidate accepted; portal/API repository migration complete, managed deployment pending

Candidate branch: `codex/unified-digital-estate-foundation`

Acceptance date: 1 August 2026

Source baseline: `NovapharmHealthacre/novapharm-website` at `05a517f1ab7058c96d9b95b17612c5168730338d`

## Outcome

The approved NovaPharm Healthcare public property has been migrated into `apps/corporate`, a TypeScript, React and Next.js application within the governed NovaPharm workspace. The migration preserves the approved content, official logo, leadership records, six Insights articles, product imagery and conservative pre-authorisation wording while replacing the static-page source architecture with components, typed content, shared security controls and a production standalone Node artifact.

No live DNS, GitHub Pages deployment, production API, identity provider, database or SharePoint permission has changed. The legacy root remains the rollback source until a managed candidate passes production acceptance.

## Implemented surface

- 26 canonical corporate page records, five leadership profiles and six substantial Insights articles, producing 37 canonical public routes.
- Home, About, Company, Governance, Services, Regulatory, CRO, Oncology, Product Portfolio, Nutraxin, Partners, Technology, AI Governance, Contact, Account Application, Investor, Careers and Legal surfaces.
- Privacy, Cookies, Terms, Accessibility, voluntary Modern Slavery and voluntary Environment and Carbon pages.
- Custom 404, robots, sitemap, RSS feeds and web manifest.
- Canonical Organization, WebSite, WebPage, ProfilePage, Person, Article, Service and Breadcrumb entities connected through persistent absolute identifiers.
- Official SVG used byte-identically from the approved brand source and approved responsive portrait/product assets copied through the governed asset synchronisation step.
- Per-request nonce Content Security Policy, anti-framing controls, restrictive browser permissions, exact host/origin controls and validation-environment `noindex` support from `@novapharm/security`.
- Standalone Node deployment output scanned for source maps, recognised secret patterns, SQLite artifacts and development-only files.

## Public workflow boundary

The contact experience uses the real CSRF and contact API contracts through a narrow same-origin server gateway. Only CSRF, contact and account-application paths are allowed; request sizes are bounded, identity and authorisation headers are never accepted from the browser, and API cookies are relayed without exposing the API origin to client JavaScript. Runtime origin resolution also prevents a candidate-slot hostname from remaining in the browser bundle after promotion. Network, provider and configuration failures become professional accessible messages; raw browser or API exceptions are never displayed. The public page warns visitors not to submit patient-identifiable, adverse-event or urgent medical information.

The account-application page is a controlled expression-of-interest route. It does not expose a document uploader, create an identity or claim that onboarding is complete while the private API, storage quarantine and approval workflow are unavailable.

The public application contains no login or role selector. Its portal link resolves only to the separately configured secure portal origin. Customer, employee, board and administrator functionality must remain disabled until the isolated portal, identity provider and server-side authorisation pass acceptance.

## Consent and privacy controls

- First-layer controls provide equally available Accept all, Reject non-essential and Manage preferences actions.
- The preference dialog supports category-level decisions, focus management, Escape handling and reopening from the global footer.
- No analytics or marketing provider is currently loaded, before or after consent.
- Contact and account routes include layered privacy and pharmaceutical-safety boundaries.
- Legal text remains subject to UK solicitor review and must not be described as legally approved.

## Actual automated results

| Gate | Result |
|---|---|
| Node runtime | Passed on Node `24.14.0` |
| Biome source check | Passed: 42 source files checked |
| TypeScript | Passed after generated Next.js route types |
| Content and claims validation | Passed: 37 canonical routes, 5 leaders and 6 articles |
| Unit and gateway tests | Passed: 11 of 11, including a real local upstream, CSRF cookie relay and malformed-origin failure handling |
| Production build | Passed: 44 generated application routes |
| Standalone packaging | Passed |
| Standalone artifact security scan | Passed: 1,593 files after the same-origin gateway addition |
| Chromium rendered matrix | Passed: 38 route states at 7 required viewports |
| WebKit rendered matrix | Passed: 38 route states at 7 required viewports |
| Screenshot evidence | 532 genuine screenshots captured |
| Automated accessibility | 152 Axe runs; zero serious or critical findings |
| Lighthouse desktop | Performance 100, Accessibility 100, Best Practices 100, SEO 100 |
| Lighthouse mobile | Performance 97, Accessibility 100, Best Practices 100, SEO 100 |
| Desktop lab values | FCP 0.2 s, LCP 0.7 s, CLS 0, TBT 0 ms, 401 KiB transfer |
| Mobile lab values | FCP 0.9 s, LCP 2.7 s, CLS 0, TBT 0 ms, 257 KiB transfer |

Lighthouse results are local laboratory measurements against the production standalone build in public-indexable mode. They are not production field data. The mobile simulated LCP remains 0.2 seconds above the 2.5-second target and is recorded as an optimisation and field-monitoring item, not rounded into a pass.

## Media and visual acceptance

- The homepage LCP visual is an approved local pharmaceutical supply-chain image delivered as a 54,741-byte AVIF with an immediate priority hint and responsive Next.js image generation.
- Product, CRO, oncology, regulatory, partner and technology imagery uses reviewed local assets with recorded provenance and conservative captions.
- Leadership pages use approved portraits where supplied; controlled no-image states remain where an approved portrait is unavailable.
- Representative desktop and mobile captures were manually reviewed for the homepage, contact, regulatory, product portfolio, partners, technology, Vishal Chakravarty profile, an Insights article, mobile privacy page and 404.
- The review found no material clipping, horizontal page overflow, broken media, text collisions, inaccessible contrast, empty grid cells or mobile-menu failures after remediation.

Evidence is stored in `artifacts/corporate-browser` and `artifacts/corporate-lighthouse`.

## Remaining gates

1. Deploy the accepted shared API and isolated secure portal applications in an approved managed staging environment.
2. Deploy managed identity, Azure SQL, private document storage, email delivery and audit persistence in that environment.
3. Verify contact and account workflows end to end against the deployed runtime, including queue/provider failure and persistence.
4. Complete customer, employee, board and administrator role-boundary, session, MFA and customer-isolation acceptance.
5. Complete SharePoint inventory and approved least-privilege changes before exposing Executive Platform documents.
6. Obtain UK solicitor review for legal wording and owner evidence for remaining entity, location and regulated-role facts.
7. Run production-domain crawler, accessibility, security, performance, backup/restore and rollback acceptance before cutover.

The corporate application is repository-ready for the unified public platform, but the NovaPharm estate is not live on the new architecture and is not production-complete.
