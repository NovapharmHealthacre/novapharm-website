# NovaPharm Intelligence — native app icon acceptance

Brand source: owner-approved Regal Ultramarine #2546D8, source `assets/brand/novapharm-intelligence-favicon.svg`.

The XcodeGen project compiles `App/Assets.xcassets/AppIcon.appiconset`; the source-linked image generation workflow writes light, dark and tinted 1024px square PNG candidates and tests their hashes/dimensions. The iOS 17+ app uses SF Pro/system typography supplied by iOS. The dark-mode label stays semantic rather than being forced to black.

The Android app provides adaptive icon foreground/monochrome and density-specific mipmaps (48/72/96/144/192), with a Royal Ultramarine background and #0B0B0E as light-mode typographic ink. No Apple font binaries or downloaded ZIP assets are redistributed.

**Scope limitation:** this is an offline research app and an unsigned build candidate, not an App Store or Play Store release. Neither application has production credentials, tenant access, signed distribution or live medicine-data acceptance. Releasing an app requires independent review and approval.
