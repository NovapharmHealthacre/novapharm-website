# Apple HIG Content — NovaPharm web implementation and acceptance

Date: 16 November 2026. Scope: corporate website, protected Customer/Intelligence/Distribution views, Technology, Founder and Status. This document is a **web adaptation**, not a claim of native SwiftUI/UIKit/AppKit or a deployed Apple application.

## Source analysis and decision matrix

| Owner-supplied reference | Apple intent | NovaPharm web decision / state |
| --- | --- | --- |
| [Content](https://developer.apple.com/design/human-interface-guidelines/content) | Route to charts, image views, text views, web views | Inventory existing Next.js/HTML display and editable controls; shared additions below |
| [Charts](https://developer.apple.com/design/human-interface-guidelines/charts) | Appropriate marks, axes, titles, legends and accessible exact values | Existing `AccessibleChart` and WMS/Medicines visualisation in progress via separate PR #766; do not duplicate or substitute synthetic data |
| [Swift Charts](https://developer.apple.com/documentation/charts) | Native Apple charting framework | N/A to the browser; use semantic HTML, SVG/approved browser chart implementation and exact-value table |
| [Charting data](https://developer.apple.com/design/human-interface-guidelines/charting-data) | Progressive detail, meaningful labels and accessible summaries | PR #766 addresses chart/table parity; independently test real source/as-at, null observations, zero values and keyboard navigation |
| [Image views](https://developer.apple.com/design/human-interface-guidelines/image-views) | Noninteractive image display, appropriate scaling and alt descriptions | New `ContentImage`; supported responsive `picture/source`, intrinsic dimensions, lazy loading and no forced aspect distortion |
| [Images](https://developer.apple.com/design/human-interface-guidelines/images) | Resolution/format/colour/device inspection | Existing [image audit](apple-images-hig-2026-11-15.md); new shared responsive component; public ICC and per-page device QA still required |
| [Image wells](https://developer.apple.com/design/human-interface-guidelines/image-wells) | User-editable image with replace/remove behavior | New `LocalImageWell` is a **temporary local preview only** with picker, drag-and-drop, image-file paste and clear; no account/profile upload, persistence or scanning is implied |
| [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons#Image-buttons) | Clearly labeled, reachable press actions, not clickable decorative images | New `ImageActionButton` uses native button semantics, a dedicated label and 44px target; action must be supplied by consuming product |
| [SwiftUI Button](https://developer.apple.com/documentation/swiftui/button), [UIButton](https://developer.apple.com/documentation/uikit/uibutton), [NSButton](https://developer.apple.com/documentation/appkit/nsbutton) | Native platforms' button APIs | N/A to browser runtime; native HTML `button type=button` used |
| [SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols) | Familiar symbols, optical weights/scales and appropriate semantics | Reuse audited [web-safe symbols](sf-symbols-web-adaptation.md). Do not redistribute Apple glyphs/fonts or mimic trademarks |
| [SwiftUI Image](https://developer.apple.com/documentation/swiftui/image), [UIImageView](https://developer.apple.com/documentation/uikit/uiimageview), [NSImageView](https://developer.apple.com/documentation/appkit/nsimageview) | Native image representation | N/A to browser; use `img/picture` semantics |
| [Text views](https://developer.apple.com/design/human-interface-guidelines/text-views) | Multiline legible and optionally editable text | Existing editorial markup and governed `textarea`/forms remain web-native; accessibility, line wrapping, selection, readable width and content state need route-level testing |
| [SwiftUI Text](https://developer.apple.com/documentation/swiftui/text), [UITextView](https://developer.apple.com/documentation/uikit/uitextview), [NSTextView](https://developer.apple.com/documentation/appkit/nstextview) | Platform-specific text APIs | N/A to browser; preserve semantic headings, paragraphs, forms, copy/paste and keyboard selection |
| [WebKit](https://webkit.org/), [WKWebView](https://developer.apple.com/documentation/webkit/wkwebview), [Web views](https://developer.apple.com/design/human-interface-guidelines/web-views) | Embedded content and native navigation | Browser web sites **must not** emulate WKWebView. Test actual Safari/WebKit history, origin, consent, keyboard focus and CSP before embedding third-party content |

## Implemented in this focused source candidate

1. `packages/design-system/src/image-content.tsx`: `ContentImage` for noninteractive responsive display, `ImageActionButton` for labeled user actions and `LocalImageWell` for local replace/drop/paste/clear/preview with type and 5 MiB size preflight. SVG is excluded from local preview. No network calls, persistent storage or protected data mutations are present in this component.
2. `packages/design-system/workbench/build.tsx`: use `ContentImage` on the actual shared design workbench hero rather than an ungoverned example. Existing brand artwork and aspect proportions remain unchanged.
3. `packages/design-system/test/image-content.test.tsx`: cover document semantics, native button accessibility and prohibited file selection. A dedicated exact-head GitHub Actions contract runs the focused tests and TypeScript.

## Not yet complete

- The existing Next.js and static image inventory requires **per-route adoption** or explicit evidence that current `img`/`next/image` is already compliant; do not blindly replace optimized Next.js images.
- The local image well has **no authenticated profile, approval or storage integration**. An actual upload needs purpose/rights review, file signature check, malware scanning, authorization, size/dimension checks, content privacy policy, retention and audit trail. Never claim preview means upload.
- PR #766 contains chart adoption, data provenance and table work, not merged here. Image acceptance is separate from its chart/other Patterns CI.
- Text views, embedded content, image buttons, and display issues require URL-by-URL route audits on desktop/mobile (320/390/768/1440/1920px), 1x/2x/3x source density, 200%/400% zoom, high contrast, dark mode, reduced motion, keyboard, screen readers, Safari/WebKit and Chromium.
- Confirm actual deployed artifact SHA on each independently hosted public/protected site **after** the respective deployment workflow. A source PR/merge, a completed Node test or an AWS image build is not proof of production delivery.
- No Apple-owned symbol artwork or unlicensed font assets should be copied into the repo.

## Release gate

Before merging: exact-head Node 24 workspace types, focused tests, repository production/security checks and relevant public/protected browser tests must pass. Reconcile concurrent #766/#774 and other active Apple-HIG pull requests. The runtime remains unchanged until verified deployment.

No AWS changes or deployments are performed by this branch.
