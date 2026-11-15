# NovaPharm typography and interface design contract

## Approved creative direction

The four uploaded download packages inform **roles**, not publicly hosted font files:

| Reference family | NovaPharm purpose | Browser implementation |
| --- | --- | --- |
| SF Pro | Main corporate and application interface | Native `-apple-system` stack with cross-platform readable fallbacks |
| SF Compact | Dense WMS/distribution tables and narrow operational columns | Compact system stack; numeric cells use tabular figures |
| SF Mono | SKU, batch/lot, technical identifiers, audit references and code | Native `ui-monospace` / `SFMono-Regular` / Menlo / Consolas |
| New York | Select editorial pull quotes and long-form emphasis | Locally available `New York`, falling back to Iowan Old Style, Charter or Georgia |

Apple's downloadable DMG files are **not committed, copied, converted, embedded, CDN-served, or distributed** by NovaPharm. A web-wide deployment requires the appropriate rights to any font binary. Native system fonts appear where the visitor's OS provides them; a compatible fallback appears elsewhere.

## Apple-inspired principles, NovaPharm identity

- **Hierarchy:** 1 clear page heading, few visible type sizes, semantic headings, deliberate spacing, concise navigation.
- **Legibility:** readable body copy, practical table sizes, clear contrast, user-controlled zoom and text resize, responsive text wrap.
- **Consistency:** shared UI/compact/mono/editorial typography roles across the public website and separately deployed Next.js apps.
- **Focus:** native focus-visible outlines, distinct active/disabled states, reduced motion, no ornamental typography, and 44px pointer/touch targets where practical.
- **Data clarity:** use `font-variant-numeric: tabular-nums` for quantities, dates and finance; use monospaced type for IDs, not all metrics.
- **Brand distinction:** retain NovaPharm's own logo, red `#E3120B`, photography, product evidence and page-specific designs; no implication of Apple affiliation.

## Usage

For components with otherwise standard typography, apply `data-typography="compact"`, `"mono"`, or `"editorial"` only where the semantic role actually fits. Main interface text inherits system typography without extra classes. Avoid forced condensed type, decorative icon fonts, inaccessible tiny text or global heading replacements. The standalone Technology app has existing `--sans`, `--compact`, `--mono`, and `--serif` mappings.

The static public site bundles styles with `node scripts/build-css-bundle.mjs` as part of `npm run build`. The Next.js apps consume their checked-in app-level CSS directly. Validate source contract with `npm run design:typography:validate` and run the full app and browser acceptance suite before a live deployment. Inspect macOS Safari, Windows Chrome/Edge, Android Chrome and mobile Safari; font appearances will vary by platform.
