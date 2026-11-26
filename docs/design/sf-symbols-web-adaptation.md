# NovaPharm web symbol design contract

**Primary source:** [Apple Human Interface Guidelines — SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols) (reviewed 15 November 2026).

## Rights boundary — important

SF Symbols 27 is a macOS design application, not a license to copy its symbol glyphs or export and publish them across a public, cross-platform website. Do **not** commit the provided DMG, extract its proprietary drawings, export/trace/convert SF Symbol glyphs to SVG for web deployment, or bundle an SF Symbols font. Use the legally separate, web-licensed **Lucide** package already present in the secure portal, or the independently drawn, source-controlled `NovaSymbol` primitives in the shared design system. Do not use Apple product imagery or make Apple-like trademark or app icons. Apple's visual *principles* are our reference, not Apple artwork.

## Product contract

| SF Symbols HIG section | NovaPharm web application |
| --- | --- |
| Rendering modes | Monochrome by default using `currentColor`; restrained semantic tones; optional filled enclosure only for meaningful status/selection. No ornamental multicolour or gradients. |
| Gradients | Not used for small operational controls; preserve flat, legible symbols in all backgrounds. |
| Variable colour | Numeric state stays as real text and/or a labelled meter; don't rely on layered colour to encode medical, stock or compliance state. |
| Weights and scales | Small/medium/large tokens (14/18/24 CSS px at the standard root size) and light/regular/strong strokes. Match neighbouring text optically; never use scale alone as a hierarchy substitute. |
| Variants | Default outline; filled status only for clearly selected or important states. Do not make an unavailable action visually appear actionable. |
| Localization | Do not mirror asymmetric or semantic icons by default; use text labels and logical CSS properties for RTL. Numbers, units and scripts remain real localized text, not glyph drawings. |
| Animations | Animate only confirmed feedback or ongoing activity; never simulate successful operations; reduced motion removes spinner animation. |
| Custom symbols | Create simple, recognizable, inclusive, purpose-specific original SVG artwork; no Apple product replica, no extraction from templates. |
| Accessibility | Decorative symbols use `aria-hidden`; meaningful stand-alone symbols need a readable `label`; icon-only buttons need their own accessible name; minimum 44 × 44 CSS-pixel functional targets. |
| Responsiveness | Test at 320/375/390/768/1024/1440 CSS px, high contrast, zoom, Safari/WebKit, Chrome/Chromium, Firefox where practical. |

## Implementation

- Source tokens: `assets/css/symbol-system.css` loaded by the static website CSS bundle and all five Next.js apps (Corporate, Portal, Technology, Founder and Status). Operational symbol tones inherit the reviewed semantic colour palette where available, with independent fallbacks.
- React primitive: `packages/design-system/src/symbols.tsx`, exported by `@novapharm/design-system`. It renders only original vector geometry, never SF Symbols.
- Portal: existing Lucide SVG assets are assigned the shared `.np-symbol` treatment on core navigation, search, refresh, sign-out and authentication controls. Lucide remains installed and web-licensed; do not import a second icon font.
- Public corporate site: text-first navigation remains text-first; do **not** add decorative icons solely to demonstrate the design system.
- Actual NovaPharm logos/favicon/brand marks are exempt from symbol rules and must remain original.

## Release and audit protocol

Check SSR hydration and React rendering, keyboard/focus names, contrast/forced-colours, preferred reduced motion, mobile tap areas, and icons at normal/200% zoom. After merges, run existing CI and app-specific deployment smoke tests. A merged PR is not confirmation that the public website and protected portal are both deployed.

### Automated regression contract

Run `node scripts/test-sf-symbols-web-contract.mjs`. The dedicated `SF Symbols web-safe contract` GitHub Actions workflow verifies cross-app stylesheet imports, semantic colours, accessible focus and motion behavior, independent symbol artwork, and exact generated-bundle parity. It is a source contract, not a replacement for rendered-browser acceptance or production deployment evidence.

### Remaining estate audit

This is the shared foundation and a focused treatment of high-frequency portal controls; it is **not** a claim that every page, icon, application or browser scenario has been visually accepted. Inventory any remaining inline SVG, emoji, icon fonts, branded/regulated imagery and third-party icons before extending the contract to all standalone apps.
