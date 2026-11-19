# NovaPharm app icons, Icon Composer and web icon contract

Reviewed: 16 November 2026. Applies to Healthcare's browser/PWA icon stack now and to a **future** native Apple app only after an Xcode project exists. This is an independent NovaPharm adaptation of Apple's documentation, not an Apple endorsement or a claim of App Store distribution.

## Primary references reviewed

1. [Icon Composer](https://developer.apple.com/icon-composer/) — layered Liquid Glass icon design; default, dark and mono appearance annotation; export flattened artwork for communication; Xcode integration.
2. [Human Interface Guidelines: App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons/) — one memorable symbol; platform masking; simple foreground shapes; consistent identity; controlled appearance variations; platform-specific canvas sizes.
3. [Creating your app icon using Icon Composer](https://developer.apple.com/documentation/xcode/creating-your-app-icon-using-icon-composer) — prepare separate SVG/PNG layers, avoid baked effects, group and annotate inside Icon Composer, import the resulting Icon Composer file into an Xcode target.
4. [Configuring your app icon](https://developer.apple.com/documentation/xcode/configuring-your-app-icon) — Xcode asset-catalog workflow and the native platform targets that use it.
5. [Apple Design Resources](https://developer.apple.com/design/resources/) — platform icon-production templates and grids for real-device review. Design resources are not redistributed with the website.

## Approved NovaPharm identity

The approved small-format mark is the original white **N** plus continuum arc on Economist Red `#E3120B`. Keep it clearly recognizable across appearances. The exact two approved shape paths are split into independently importable, 1024 × 1024, *unmasked* white-vector layers:

- `creative-assets/icon-composer/novapharm-healthcare/01-novapharm-monogram.svg`
- `creative-assets/icon-composer/novapharm-healthcare/02-novapharm-continuum-arc.svg`

The layers are derived from the checksum-governed `assets/brand/favicon.svg`. They do **not** replace or modify the official horizontal logo, the brand pack or the live favicon. Source files have no pre-rendered corner radius, highlight, gradient, shadow, blur or refraction. In Icon Composer, choose a full-bleed opaque red background (`#E3120B`); position the two vectors on the same 1024 × 1024 canvas, grouped in the intended visual order. Keep art inside the central safe area; verify apparent size and optical centering at small rendered sizes and under circular watchOS masking.

For a native project: open **Icon Composer on a compatible Mac**, import these two SVG layers, adjust specular highlights/refraction/translucency in the tool, preview default/dark/mono/clear/tinted appearances, check current Apple templates, then **save and commit the generated Icon Composer file to the native Xcode target**. Use Xcode to render native target sizes, simulator/device-check, and submit through the normal app release process. This repository does **not** contain a generated `.icon` file, Xcode target, signed native build or verified App Store listing, so native rollout is **not** complete. The supplied `Icon_Composer_27.3_beta.dmg` is an installer, not an icon source asset; do not commit or self-host the installer.

Apple's HIG reference sizes are: iOS/iPadOS/macOS 1024 × 1024 square source with system round-rectangle masking; watchOS 1088 × 1088 square source with circular system mask; visionOS 1024 × 1024 square source with circular mask; tvOS 800 × 480 landscape and parallax layers. Do not stretch 1024 artwork to non-square platform ratios; use a platform-specific composition in Xcode where appropriate. A web/PWA is **not** a replacement for native Icon Composer delivery.

## Web production contract

Browser/PWA icons remain the audited owner-approved files in `assets/brand`: `favicon.svg` and `favicon.ico`, a 180 × 180 `apple-touch-icon.png`, 192 × 192 and 512 × 512 install icons, and a 512 × 512 maskable install icon. The static site declares this stack through `index.html` and `manifest.webmanifest`; corporate Next.js declares it through `apps/corporate/app/layout.tsx` and `apps/corporate/app/manifest.ts`. The red accent is branding, not an error semantic. A website cannot display Xcode's system-generated Liquid Glass effects merely by linking an icon or CSS filter.

**Do not** replace Technology's own NIT identity, the Founder identity, PharmaScope marks, the approved Distribution logo or portal brand artwork with the Healthcare monogram. Each distinct product requires its own owner-approved icon production decision. Preserve icons as decorative-only when adjacent to text, and provide a readable name to an icon-only interactive control if a future app genuinely needs one.

## Gate and truthful release status

`npm run design:app-icons:validate` is the automated icon contract: it checks the approved source silhouettes against the prepared SVG layers, dimensional metadata, website manifest references, and key public metadata. It runs as part of `npm run check`, alongside existing checksum-enforced `npm run brand:validate`. CI passing does not certify optical quality; separately inspect 16px through 1024px output, contrast in default/dark/tinted modes, iOS home-screen crop, Safari pinned tabs, Android maskable safe area, WebKit/Chromium install behaviour, real devices, Xcode/Device Hub appearances and deployed URLs.

A PR, passing tests or successful GitHub Pages workflow does not itself prove all NovaPharm environments are live. For any public change, verify exact merge SHA, successful deployment for that SHA and fresh domain fetch before declaring production; private portal and native release require their own independent evidence.
