# NovaPharm corporate experience: Apple-inspired editorial and global-navigation audit

**Date:** 7 November 2026  
**Scope:** Homepage, About, Capabilities, Products, News & Insights, Technology, shared global navigation.  
**Evidence:** Owner-supplied Apple/NovaPharm Safari screenshots; inspected GitHub `main` page source; exact-head PR checks. The attached exterior warehouse photograph is owner-supplied but legal operating status and image provenance have not been independently checked.

## Design system findings

1. **Navigation hierarchy:** Current global header is one row of seven links. It omits Intelligence entirely, with no Apple-style progressive-disclosure category navigation. New global header adds NovaPharm Intelligence as a first-class category and six consolidated mega menus. Ordinary anchor links survive without JavaScript.
2. **Typography/space:** Use platform-native sans-serif, small quiet chrome, generous large editorial headings, neutral white/grey fields, one restrained NovaPharm red accent and deliberately constrained content widths. Do not copy Apple's protected logos/assets or imply Apple affiliation.
3. **Responsive navigation:** Desktop >1180px uses three-column category flyouts. Tablet/mobile uses the existing expanded stacked menu; keyboard, Escape, focus management, pointer handling, reduced motion and contrast are test gates. Confirm touch targets and sticky-header layout on iPhone 390px and tablet 768px.
4. **Disclosure hierarchy:** Remove repetitive caveat paragraphs from product-hero zones, but preserve accurate statements about WDA(H)/PLPI, operational limits, ownership and stock availability in governance, legal and transactional areas. Neither commercial activity nor a user-provided photograph establishes wholesale authorisation or an owned warehouse.
5. **Source parity:** Static HTML is generated from `scripts/apply-corporate-product-discipline.mjs`; a route change must be reflected in BOTH source and published page output, and its CSS in the bundled public stylesheet. Enforce on build.
6. **Metadata:** On the inspected pages, `og:image` appears twice. Consolidate each route to one canonical primary social image plus the intended secure URL/size metadata in the social-authority build chain, then check linked previews and social-card consistency.
7. **Media governance:** Any warehouse photograph should be optimized into responsive AVIF/WebP derivatives, reviewed for source rights and factual context, and added to the image-inventory/provenance ledger. Do not silently replace the asset inventory to defeat the release gate.

## Route-level editorial audit

| Route | Source evidence | Priority action |
| --- | --- | --- |
| `/about/` | Four main h1-h3 headings, one representative-business image; hero currently emphasizes decisions/scrutiny over story. | Lead with mission, company identity and evidence-led access; follow with leadership, operating principles, partnerships and a quieter governance link. Use verified documentary proof only. |
| `/capabilities/` | One overview, four linked service disciplines and one representative image. | Present distinct image-led service chapters for Sourcing/Market Access, Regulatory/Quality, CRO Coordination and Technology; give every chapter a clear B2B next step and dependency statement. |
| `/products/` | Two portfolio routes (Nutraxin and strategic pharma), two images, one caution-led headline about visibility. | Distinguish sellable supplements from pharmaceutical opportunities; use large authentic pack imagery, navigation to product lines, structured product information and no unsupported stock/approval claims. |
| `/news-insights/` | Six article links, no `<img>` inside main, four heading-level article titles. | Create an editorial lead story with approved image, date/author/topic labels and precise article hierarchy; show four supporting articles plus an accessible view of the remaining archive. Verify sources, canonical URLs and update dates. |
| `/technology/` | Static medicine overview and evidence rail; previously no geography or trends previews. | Illustrate medicine-to-market through geography, trends and forecasts with clear source status. Do not invent demand figures, market forecasts or chart provenance. |

## Medicines Terminal specification

Desktop: **left workspace navigation / central medicine search and Overview·Evidence·Market·More / right evidence rail**. Under the main medicine identity panel: geography by jurisdiction and validated observation period; trend view separating observed history from model forecast, with uncertainty, model version and source lineage. Forecasting, signals, pricing, reimbursement, tenders, supply and portfolio are additional workspaces as their datasets mature. Maintain privacy and least-privilege access to private commercial modules. On mobile, retain the medicine-centric task and surface rail provenance after content.

The current PR adds **non-quantified** geographic and trend layout previews; this is NOT a production data mapping, geographic heatmap or running forecast. Actual indicators must be bound to curated sources and model governance.

## Exact-head release checklist

- [ ] `npm run check` and generated-image provenance inventory pass
- [ ] Public Pages Chromium AND WebKit acceptance pass desktop/tablet/mobile
- [ ] Global navigation keyboard/focus/hit-target, Escape and touch tested
- [ ] WCAG AA contrast, axe serious/critical scan, reduced-motion and no-JS navigation pass
- [ ] SEO metadata deduplicated, canonical/hreflang/breadcrumb verified
- [ ] Product imagery rights and new warehouse-image context vetted
- [ ] CodeQL, supply chain and exact-head source/build parity verified
- [ ] Production environment deployment mapped to exact GitHub SHA and public smoke-tested

**Audit boundary:** A successful repository PR or static HTML check does not establish live deployment, an operating secure portal, regulatory authorisation, owned inventory or a functioning market data integration.
