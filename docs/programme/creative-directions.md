# Unified Estate Creative Directions

Status: three directions prototyped and tested; `Regulated Continuum` selected
Review date: 1 August 2026

The three properties must feel related without becoming copies. Each direction uses the official NovaPharm identity, approved portraits and evidence-safe pharmaceutical imagery. None relies on decorative orbs, generic doodles, fake facilities or unsupported operating claims.

## Direction A - Regulated Continuum (recommended)

### Idea

A composed visual system built around continuity of evidence: product, document, decision and responsibility move through one controlled operating line. The line is expressed through editorial grids, measured red rules, restrained motion and image sequences rather than literal diagrams on every page.

### Property expression

| Property | Expression |
|---|---|
| Corporate | Warm white and graphite editorial surfaces, high-quality pharmaceutical photography, controlled red accents and evidence-led roadmaps |
| NIT | Dark technical field, luminous data lines, precise typography and real process imagery; more kinetic but never speculative |
| Founder | Quiet editorial pages, confident portraiture, primary-source annotations and long-form reading rhythm |
| Portal | Dense, calm operational workspace with persistent navigation, strong table/form hierarchy and minimal decoration |

### Why it fits

- Directly supports the regulatory, quality and supply-chain narrative.
- Extends the strongest product-page photography across weaker areas.
- Keeps NIT visibly innovative without looking like a separate startup.
- Provides a natural visual language for roadmaps, traceability and source-backed Insights.
- Can be implemented with low-motion CSS and responsive images, protecting performance.

### Risks and controls

- A continuous-line motif could become repetitive. Limit it to navigation, process and transition moments.
- Dark NIT panels can reduce readability. Enforce contrast tokens and max line lengths.
- Image-led sections can imply ownership. Captions and nearby copy must identify representative third-party settings where relevant.

## Direction B - Institutional Atlas

### Idea

The estate is presented as a disciplined atlas of regulated markets, capabilities and partnerships. Maps, regional context, documentary photography and structured editorial labels establish international reach and governance.

### Strengths

- Strong for market-entry and cross-border partnership content.
- Supports geographic navigation and market-specific evidence.
- Feels established and investor-ready.

### Risks

- Can overstate geographic operation if target markets are not clearly labelled.
- Maps can become decorative and difficult on mobile.
- Less distinctive for portal operations and technology workflows.

### Appropriate use

Retain selected atlas elements for market and sourcing pages even though it is not the primary system.

## Direction C - Clinical Ledger

### Idea

A modern corporate ledger: precise typography, document fragments, batch labels, evidence stamps and structured tables present NovaPharm as an organisation that makes decisions through traceable records.

### Strengths

- Excellent for regulatory, quality, governance and portal detail.
- Strong source/citation language for Insights and executive authorship.
- Naturally reinforces auditability and controlled documents.

### Risks

- Can feel administrative rather than visionary.
- Overuse of document treatments risks visual clutter and nested-card layouts.
- Less emotionally compelling for the homepage and partnerships.

### Appropriate use

Adopt ledger patterns selectively for regulatory roadmaps, batch integrity, article sources and secure operational views.

## Comparison and scoring

Scores use a five-point scale and reflect multidisciplinary review of the rendered prototypes.

| Criterion | Regulated Continuum | Institutional Atlas | Clinical Ledger |
|---|---:|---:|---:|
| Corporate authority | 5 | 4 | 4 |
| Cross-property flexibility | 5 | 3 | 4 |
| Pharmaceutical truthfulness | 5 | 3 | 5 |
| Mobile clarity | 5 | 3 | 4 |
| Portal utility | 4 | 3 | 5 |
| Editorial warmth | 5 | 4 | 2 |
| Performance restraint | 5 | 3 | 4 |
| Total / 35 | **34** | 23 | 28 |

## Final selection

`Regulated Continuum` is selected as the cross-estate foundation, with carefully limited elements from `Institutional Atlas` and `Clinical Ledger` where they clarify markets or evidence. Its continuous evidence line, editorial imagery and measured contrast communicate movement and control without implying that a pictured facility or regulated activity belongs to NovaPharm.

The selection does not authorise invented media or claims.

## Multidisciplinary critique

| Discipline | Finding | Correction |
|---|---|---|
| Product design | The first desktop layout left too much unused space between direction thesis and examples. | Rebuilt the direction canvas as a disciplined three-column composition: thesis, four property studies and mobile study. |
| Brand | Early headings competed with the property prototypes. | Tightened display scale and preserved the official logo as the only brand mark. |
| Accessibility | Focus, state semantics and compact viewport overflow needed executable evidence. | Added visible focus contracts, semantic component tests, axe checks and horizontal-overflow assertions. |
| Pharmaceutical compliance | Facility photography could imply ownership. | Used representative controlled-supply imagery with neutral wording and explicit governance rules. |
| Portal product | Promotional card language could make the portal look like a marketing dashboard. | Portal prototype uses dense dark operational composition and evidence-oriented language. |
| Performance | A framework-heavy component catalogue would add avoidable dependency and runtime weight. | Built a deterministic server-rendered workbench with existing React, Playwright, axe and Sharp tooling. |

## Prototype and screenshot evidence

The governed workbench is `packages/design-system/workbench/index.html`. It contains high-fidelity Corporate, NIT, Founder, Portal and mobile examples for each direction plus the complete shared component inventory.

Final screenshots are committed under `audit/evidence/design-system/`:

- `chromium-desktop-direction-a.png` and `chromium-mobile-direction-a.png`;
- corresponding Direction B and C captures;
- equivalent WebKit captures;
- component-workbench captures in both engines and sizes;
- immutable review baselines under `audit/evidence/design-system/baselines/`;
- machine-readable results in `visual-regression-report.json`.

The final run produced 16 screenshots, zero axe violations and no horizontal overflow in Chromium or WebKit. This is repository-level visual evidence, not production-browser evidence.

## Shared design rules

- Official NovaPharm logo only; no reconstructed wordmarks or unapproved reversed version.
- Deep midnight navy, warm white, charcoal, cool grey, muted silver and controlled NovaPharm red.
- No more than two licensed/open font families.
- One semantic token system for colour, spacing, type, focus, motion and elevation.
- Cards use tight radii and only where an item genuinely needs a frame.
- Public site body text never drops below an accessible reading size.
- Motion remains under approximately 500 ms and carries no essential meaning.
- `prefers-reduced-motion` disables non-essential animation.
- Image provenance, licence, alt text, crop and ownership implication are reviewed before publication.
- The corporate, NIT and founder properties retain distinct composition and voice.

## Acceptance questions

1. Does each property remain recognisable after shared tokens are applied?
2. Does every image support a factual message without implying ownership or authorisation?
3. Can a keyboard and screen-reader user complete every journey?
4. Does mobile preserve complete words, clear CTAs and adequate consent controls?
5. Do animation and media remain within performance budgets?
6. Does the portal feel operational and scan-friendly rather than promotional?
