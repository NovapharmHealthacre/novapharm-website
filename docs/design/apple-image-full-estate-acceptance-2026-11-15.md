# Apple HIG Images — whole-estate release acceptance

This follow-up expands the original scoped image correction in PR #701. It does not claim that applying Apple’s iOS-specific pixel sizes to a public website is correct; the translation is to equivalent web behaviors.

Official reference points:
- https://developer.apple.com/design/human-interface-guidelines/images
- https://developer.apple.com/design/human-interface-guidelines/layout
- https://developer.apple.com/design/human-interface-guidelines/color
- https://developer.apple.com/design/tips/

## Scope and measurable gates

| Requirement | Evidence |
| --- | --- |
| Each public page audited | `scripts/validate-apple-image-estate.mjs` enumerates every tracked public `index.html` (minimum 60, not just seven sampled pages) |
| Every published image placement | Parse markup to inspect `img`, `picture source`, local files, responsive `srcset`, alternative text and intrinsic dimensions |
| Original aspect ratio and non-distortion | Compare natural versus declared aspect ratio; cross-check rendered box and `object-fit` in Chromium and WebKit |
| Product packaging fully visible | Fail browser acceptance when Nutraxin/ESCO product image is not `object-fit: contain` |
| High-density presentations | Run all public sitemap routes at Chromium 390px/3x and WebKit 1440px/2x, record image resolution deficits without silently hiding them |
| Image file metadata and color | Inspect every tracked public raster with Sharp, fail on corrupt files and problematic CMYK/Lab delivery assets |
| Broken and unloaded images | Fail the all-route browser matrix on broken or stalled visible local images |
| Responsive layout | Existing public sitemap geometry catches viewport overflow, heading/form clipping; detailed screenshot suite covers mobile/tablet/desktop |
| Accessibility | Require explicit `alt` and meaningful layout; detailed Axe checks remain in the existing public Pages browser acceptance suite |
| No copyrighted/regulated asset substitutions | Preserve approved logos, packaging, supplier licences and existing content/provenance |

## Acceptance boundaries

Static and automated browser tests can prove observable layout, responsive image decoding and basic accessibility, but **cannot substitute for human visual judgment** about subject choice, photographic art direction, label legibility, subtle color changes between physical displays, or whether an image crop communicates the right message. Do not report 100% human visual acceptance without representative final-browser evidence and review. Record legitimate warnings (e.g., not every asset has a full 3x source) explicitly.

For performance, image variant correctness must be considered in the context of actual rendered CSS box dimensions, not a universal 3x copy of full-bleed hero photographs. Site-wide icon, typography and native SwiftUI/visionOS/tvOS instructions do not apply as literal web CSS specifications.

Deployment is approved only when relevant PR CI passes, the guarded AWS-backed Pages publisher succeeds for the merged SHA, and the public domain returns the expected visual asset version without regressing the contact service.
