# NovaPharm Apple HIG — cross-estate remediation and verification

Date: 15 November 2026. Scope: Corporate, Portal (including protected WMS/Intelligence application shell), Technology, Status and Founder.

## Source-backed findings and corrections

The shared 2026 Apple 27 **web adaptation** was already imported by Corporate and Portal, but not the Technology or Status Next.js root. The missing import meant that mobile 16px form inputs, semantic focus, touch manipulation, reduced-transparency fallback and data-table typography were not guaranteed at the shared layer in those two apps.

This change imports the existing reviewed web adaptation into Technology and Status, last in the design CSS import order. It **does not** port SwiftUI, UIKit, native Liquid Glass, SF Symbols artwork or licensed Apple fonts to the web.

Status also kept a 42px refresh control, 12–13px operational link/condition text and an app-specific focus colour. Those are now aligned with the existing 44px control, 0.875rem caption and semantic focus standards. The fixed status presentation retains its independently approved brand colours and information hierarchy.

Founder deliberately retains its separate dark editorial aesthetic, while sharing the already integrated symbols and reduced-motion contract. Replacing its intentionally independent palette with a light corporate theme without independent visual acceptance would be a regression.

## Validation boundaries

The new Node contract checks CSS import parity across four application roots, Founder branding exceptions, Status legibility and interaction sizes, and the absence of Apple-only font and UI package imports. The path-scoped GitHub workflow runs it on the exact PR revision.

This is **repository-source evidence only**, not a claim of completed screenshot review or production rollout. Complete full Chromium/WebKit acceptance on 320/390/768/1440/1920px layouts, 200% and 400% zoom, forced-colours, reduced motion/transparency, keyboard, screen reader and actual signed-in journeys before certifying each independently hosted runtime. Protected API access, role scope and commerce rules are unchanged.

Related: #713 accessibility, #717 managed-runtime verification, #601 portal cutover, #727 search parity and #723 identity provider activation.

Apple official references: https://developer.apple.com/design/human-interface-guidelines/layout ; https://developer.apple.com/design/human-interface-guidelines/typography ; https://developer.apple.com/design/human-interface-guidelines/accessibility ; https://developer.apple.com/design/human-interface-guidelines/color ; https://developer.apple.com/design/human-interface-guidelines/materials .
