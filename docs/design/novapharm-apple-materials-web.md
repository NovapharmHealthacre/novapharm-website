# NovaPharm | Apple HIG Materials web implementation

**Date:** 15 November 2026  
**Change:** Semantic materials layer (web interpretation, not native Apple Liquid Glass)  
**Scope:** Corporate Next.js, technology Next.js, secure portal shell, legacy static corporate website, shared design-system package.

## Primary Apple sources reviewed

| Apple documentation | What applies to the web | What must not be misrepresented |
| --- | --- | --- |
| [HIG: Materials](https://developer.apple.com/design/human-interface-guidelines/materials) | Use materials to distinguish a *functional navigation layer* from an opaque content layer; keep contrast legible, use sparingly | Liquid Glass is not a decorative background for content/cards/tables |
| [Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass) | Preserve hierarchy, spacing, safe-area awareness, navigation clarity, user display preferences, contrast and responsive reflow | Automatic system adoption occurs only in supported native UI components, not web CSS |
| [SwiftUI View.glassEffect(_:in:)](https://developer.apple.com/documentation/swiftui/view/glasseffect(_:in:)) | Inspiration for custom compact navigation surfaces and meaningful shape separation | SwiftUI glassEffect is unavailable in a Next.js browser |
| [SwiftUI Material](https://developer.apple.com/documentation/swiftui/material) | Use semantic material thickness, with more opaque layers for more text | SwiftUI Material values are not standardized CSS material values |
| [UIKit UIVisualEffectView](https://developer.apple.com/documentation/uikit/uivisualeffectview) | Layer blurred surfaces behind foreground labels, never blur labels themselves | UIKit effect views are unavailable to regular HTML |
| [AppKit NSVisualEffectView](https://developer.apple.com/documentation/appkit/nsvisualeffectview) | Contextual background blending and contrast matter more than a specific blur radius | macOS system vibrancy and blending modes cannot be reproduced exactly in a browser |

## Architecture and implementation

- **Single source of truth:** `assets/css/novapharm-hig-materials.css` exports semantic CSS variables for solid and translucent navigation and menu surfaces, plus neutral content surfaces. `packages/design-system/src/index.ts` exposes equivalent semantic tokens for reusable components.
- **Corporate Next.js:** `apps/corporate/app/layout.tsx` imports the shared stylesheet *after* existing corporate colour and editorial layers. The global header and mobile navigation remain clear and text-forward.
- **Technology Next.js:** Only `.site-header.is-scrolled::before` adopts a subdued material. The purposefully transparent header over a dark hero stays as designed.
- **Secure Portal:** `.workspace-topbar` and `.portal-topbar` may use a minimally translucent navigation surface. The workspace sidebar, forms, medicine terminal, ordering tables, status values, dashboards and WMS content retain solid backgrounds.
- **Static site:** `assets/css/novapharm.css` imports the layer; `scripts/build-css-bundle.mjs` includes it last so `assets/css/novapharm.bundle.css` (used by the root site) can be regenerated deterministically.
- **Design-system components:** The reusable `.np-navigation` and `.np-mega-menu` follow the same restrained treatment. Dialogs, documents, forms, product cards and data surfaces remain opaque.
- **No Apple assets copied:** Do not embed Apple native frameworks, Apple's proprietary blur shaders, licensed font binaries, or branded Apple artwork.

## Material behavior and accessibility

1. **Fallback first:** Solid, opaque surfaces are the default. Only browsers supporting `backdrop-filter` receive a subtle saturation/blur layer.
2. **Reduce transparency:** `prefers-reduced-transparency: reduce`, `prefers-contrast: more`, and `forced-colors: active` remove blur. `<html data-np-transparency="reduce">` is an explicit supported override for QA or a future user-facing preference.
3. **Contrast:** Labels use existing high-contrast NovaPharm semantic text tokens; translucency never replaces an opaque backing layer.
4. **Reduced motion:** No material morphing or parallax is introduced, and `prefers-reduced-motion` disables any new transitions.
5. **Progressive enhancement:** No JavaScript detection, WebGL, SVG filter, third-party dependency, system fingerprinting, or native API bridge is introduced.
6. **Colour discipline:** No glass tint on every card, product tile, KPI or medicine record. Keep branded red limited to established actions and status usages.
7. **Dark mode:** Tokens support existing explicit `data-np-color-scheme="dark"` and opt-in `system`; do not force dark mode on light-only routes.

## Testing checklist

- Run `node scripts/test-apple-hig-materials.mjs` to verify semantic CSS source, the three Next.js layouts, the shared design-system package and generated legacy bundle.
- Run `node scripts/build-css-bundle.mjs` and check there is no difference in the committed generated bundle.
- Run normal corporate, portal, technology, and design-system CI, including lint/typecheck and browser acceptance at 320px, 390px, 768px, 1024px and 1440px.
- Check Safari/WebKit, Chromium and Firefox, including browser versions without backdrop filter.
- Inspect header over photo, plain white page, busy article, dense portal data and dark technology hero; confirm logo, nav links, focus rings and dropdowns remain readable.
- Inspect keyboard navigation, 200% zoom, forced-colours, high contrast, reduced motion and reduced transparency.
- Verify actual public deployment URLs separately after merge. A merged PR, CI pass, or static bundle update alone is **not** proof of a live domain update.

## Boundaries

Apple's native Liquid Glass is not available in HTML/CSS. This patch applies relevant visual and accessibility *principles* in the web estate. It does not claim 1:1 native rendering, iOS/macOS SDK adoption, exact perceptual parity, or complete manual visual validation on every device. Performance checks and production deployment verification remain release gates.
