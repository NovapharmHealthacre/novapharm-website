# NovaPharm public website — Apple HIG Images implementation (15 November 2026)

References:
- https://developer.apple.com/design/human-interface-guidelines/images
- https://developer.apple.com/design/human-interface-guidelines/layout
- https://developer.apple.com/design/tips/

## Scope

This is a **web adaptation**, not an implementation of tvOS layered parallax, visionOS spatial photos, or watchOS asset catalogs. Those sections are in Apple's Images article, but do not apply to the NovaPharm corporate website.

| Apple principle | Web implementation | Validation |
| --- | --- | --- |
| High-density raster assets | Preserve approved AVIF/WebP/JPEG responsive source sets; HTML dimensions reserve layout ratio | Existing image inventory and new primary-page contract |
| Bitmap versus vector formats | Keep approved logo SVG fallbacks; use existing photographic AVIF/JPEG/WebP outputs, not stretchable raster logos | Existing brand validation |
| Maintain source aspect ratio | Editorial figures use 16:9 covered photo framing; product packs/equipment use `contain` | New CSS contract and automated test |
| Consistent visual alignment | Media figures honor parent width and allow grid children to shrink without overflow | CSS image presentation contract |
| Prevent clipping in commerce imagery | Nutraxin and ESCO Products hero/panel objects moved within their visible stage | Products editorial CSS |
| Color profiles / fidelity | Do not recolor image files in CSS; existing approved derivatives are preserved | Remaining: inspect ICC/EXIF color metadata for every photo derivative |
| Actual-device inspection | Avoid claiming this automated test represents pixel-level review | Remaining: desktop/mobile Safari/Chrome screenshots at 1x, 2x and 3x |
| Accessibility | Primary public page images have `alt`, intrinsic width and height; decorative `alt=""` remains intentional | New source test |

## Editorial boundaries

- Do not apply product `contain` framing to the homepage's cinematic Earth or oncology editorial photographs.
- Do not use artificial same-size crops across unrelated contexts.
- Do not replace authentic product packaging, medical photos, approved imagery, or leadership portraits with generated substitutes.
- Maintain NovaPharm typography and existing official brand colors and logos.
- No commerce, authentication or regulated-content behavior is changed by this patch.

## Coverage and outstanding acceptance

Changes are applied to the shared corporate CSS bundle and the public Products editorial stylesheet. The source contract inspects seven principal image-heavy routes: home, about, capabilities, leadership, oncology, products and Nutraxin.

**Before claiming sitewide visual parity**, run the full existing image inventory and browser acceptance suites, verify ICC metadata on derivatives, inspect source image focus and cropping, then perform image-by-image review across all routes and screen widths. A passing source test does **not** constitute complete device-based QA or confirmation of production deployment.
