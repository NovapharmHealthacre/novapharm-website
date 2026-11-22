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
- **Brand distinction:** retain NovaPharm's own logo, Royal Cochineal Crimson `#9D1B32`, Royal Mineral White `#FBFAEF`, Royal Porcelain White `#F8F7F3` and Sovereign Black `#0B0B0E`, photography, product evidence and page-specific designs; no implication of Apple affiliation.

## Usage

For components with otherwise standard typography, apply `data-typography="compact"`, `"mono"`, or `"editorial"` only where the semantic role actually fits. Main interface text inherits system typography without extra classes. Avoid forced condensed type, decorative icon fonts, inaccessible tiny text or global heading replacements. The standalone Technology app has existing `--sans`, `--compact`, `--mono`, and `--serif` mappings.

The static public site bundles styles with `node scripts/build-css-bundle.mjs` as part of `npm run build`. The Next.js apps consume their checked-in app-level CSS directly. Validate source contract with `npm run design:typography:validate` and run the full app and browser acceptance suite before a live deployment. Inspect macOS Safari, Windows Chrome/Edge, Android Chrome and mobile Safari; font appearances will vary by platform.

## 2026 Apple Human Interface Guidelines typography audit

Official source: https://developer.apple.com/design/human-interface-guidelines/typography
Accessible Apple DocC source: https://developer.apple.com/tutorials/data/design/human-interface-guidelines/typography.json

The document has the following chapters. These are **web translations** of Apple's
principles, not a claim that iOS Dynamic Type or SwiftUI text styles operate in a browser.

| Apple guidance section | Governed NovaPharm website implementation |
| --- | --- |
| Ensuring legibility | System font first; 16–17px equivalent body text; no ultra-light UI text; readable contrast; caption token at 0.875rem; cross-device audits |
| Conveying hierarchy | One consistent type scale for display, section, lead, body and caption; brand red reserved for identity or meaningful action |
| Using system fonts | Native browser font families, including `system-ui` and local SF-family fallbacks where available; optical sizing automatic; no redistribution |
| Using custom fonts | No bundled Apple font files; vendor-approved custom web font only with verified embedding and redistribution rights, language coverage and accessibility tests |
| Supporting Dynamic Type | Responsive reflow and browser text zoom, with wrapping rather than silent ellipsis; readable content takes priority over fixed-height columns |
| Platform considerations | macOS/Safari, Windows/Edge, iPadOS/iOS Safari, Android/Chrome inspected at multiple widths; native iOS/macOS/tvOS/visionOS/watchOS-specific APIs not copied into web CSS |
| Specifications | Apple point-size/tracking tables inform hierarchy, not literal CSS pixel conversion; browser text retains automatic optical sizing and locale-sensitive shaping |

### Semantic type system and responsibilities

- **UI:** `--np-type-ui`, rendered by the platform's system sans-serif; navigation, form controls, menus and action descriptions
- **Compact:** `--np-type-compact`, only for WMS and terminal layouts, never as a reason to make labels unreadably small
- **Mono:** `--np-type-mono`, for references, medicine batch/lot IDs, SKU, source code and audit records, with ligatures disabled
- **Editorial:** `--np-type-editorial`, occasional quotes and long-form emphasis; must not replace functional labels
- **Text styles:** `--np-type-body-size`, `--np-type-caption-size`, `--np-type-lead-size`, `--np-type-display-size`, `--np-type-section-size`
- **Leading and measure:** `--np-type-reading-leading`, `--np-type-interface-leading`, `--np-type-measure`; long prose has generous leading, operational controls retain compact but readable line spacing
- **Attributes:** `data-typography="reading|lead|caption|compact|mono|editorial"` opt a component into a semantically appropriate role; do not use decorative type in transactional text
- **Data:** `font-variant-numeric: tabular-nums` where numeric alignment matters; avoid automatically monospacing every price or metric

### Accessibility and release acceptance

Test at 100%, 150%, and 200% browser zoom, and with OS text-size settings where
supported. Test narrow mobile (320/375px), tablet (768px), and wide desktop
(1440px+). Confirm text wraps without clipping, tabular data stays interpretable,
focus indicators are visible, rows can grow, form errors remain readable, and
the same primary content remains accessible. Test reduced motion and increased
contrast. Do not remove important values through `text-overflow: ellipsis` unless
a separate complete-value view is available.

All four downloaded reference families (SF Pro, SF Compact, SF Mono, New York)
retain the original font rights requirements. The approved release uses only
native fonts provided by each visitor's platform and legal fallbacks.
The site does not claim Apple sponsorship, and no downloaded `.dmg`, `.ttf`,
`.otf`, or converted `.woff` of an Apple font is published.

### Scope and rollout

The source-level contract covers `assets/css/tokens.css` and
`assets/css/corporate-product-discipline.css` (including the generated
`novapharm.bundle.css`), corporate app, customer portal and private WMS,
Technology app, Status app, founder app and shared React design system.
Independent apps must still be individually redeployed and smoke-tested to
assert their own live URLs; a public GitHub Pages release does not deploy them.
