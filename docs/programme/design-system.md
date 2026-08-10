# NovaPharm Governed Design System

Status: repository implementation and browser evidence complete; estate-wide adoption remains incremental
Review date: 1 August 2026
Owner: Design System and Accessibility Engineering

## Purpose

`@novapharm/design-system` provides reusable semantic components and one controlled token layer for four distinct experiences: Corporate, NovaPharm Infotech, Founder and Portal. Shared accessibility and interaction behaviour does not erase property-specific composition.

## Implemented families

The registry contains 24 required families: navigation, mega menu, breadcrumbs, hero, editorial section, leadership card, product explorer, data table, accessible chart, timeline, form field, dialog, drawer, tabs, search, filters, error/empty/loading state, portal control bar, file upload, approval status, audit history and document viewer.

Supporting primitives include skip links, buttons and governed forms. Components render semantic HTML, expose labels and state, preserve 44-pixel controls, show visible focus and respect reduced motion.

## Files

| Purpose | Repository path |
|---|---|
| Components and contracts | `packages/design-system/src/components.tsx` |
| Shared CSS | `packages/design-system/src/styles.ts` |
| Public exports and registry | `packages/design-system/src/index.ts` |
| Component tests | `packages/design-system/test/components.test.tsx` |
| Token tests | `packages/design-system/test/design-system.test.ts` |
| Governed workbench generator | `packages/design-system/workbench/build.tsx` |
| Generated review environment | `packages/design-system/workbench/index.html` |
| Browser/axe/visual regression | `scripts/test-design-system-workbench.mjs` |

The workbench is the approved Storybook-equivalent for this repository. It is deterministic, dependency-light, server-rendered, noindex and tested in Chromium and WebKit. It includes actual component examples plus Corporate, NIT, Founder, Portal and mobile examples for all three creative directions.

## Acceptance evidence

- Six component/token tests pass.
- Sixteen Chromium/WebKit screenshots are captured at desktop and mobile sizes.
- Baseline comparison uses decoded pixel differences through Sharp.
- Axe runs report zero violations for the selected sections.
- Horizontal overflow checks pass.
- Approved review evidence and immutable baselines are under `audit/evidence/design-system/`.
- Normal browser runs write fresh screenshots and their report to ignored `artifacts/design-system-browser/`, leaving the committed baseline clean.

Visual regression baselines and committed review evidence must change only through `node scripts/test-design-system-workbench.mjs --update` after a reviewed intentional visual change. Normal CI runs without `--update` and must not modify tracked files.

## Adoption boundary

The package is implemented, but every legacy composition has not yet been replaced by these components. Application migration acceptance documents identify which app consumes shared contracts and which compatibility surfaces remain. A component existing in the package is not evidence that it is deployed or that a corresponding portal workflow is operational.

## Governance

1. Add a component only when it represents a reusable semantic or interaction contract.
2. Include keyboard, focus, error, loading, empty and reduced-motion states where relevant.
3. Use official brand assets and governed media; do not recreate the logo.
4. Never encode regulatory status in colour alone.
5. Do not nest decorative cards or create marketing composition inside operational portals.
6. Run unit, axe, overflow and visual-regression checks before review.
7. Require design and accessibility review for baseline updates.
