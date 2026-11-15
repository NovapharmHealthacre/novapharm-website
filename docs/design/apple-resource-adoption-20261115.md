# Apple resource adoption for the NovaPharm website

## Decision

The owner selected Apple Human Interface Guidelines as the design reference on
15 November 2026. This extends the existing NovaPharm typography contract; it does
not replace NovaPharm's identity with Apple's branding, or grant redistribution
rights to Apple's downloaded assets. No downloaded Apple font or artwork is
embedded in this release.

System-provided sans-serif is the primary web typeface. Compact, monospaced and
editorial roles retain the existing platform-native fallbacks. Visitors on
non-Apple platforms receive their own suitable system fonts. Corporate red
`#E3120B`, the approved Intelligence wordmark and the existing human photography
remain unchanged. Native Apple point sizes and Dynamic Type APIs are not CSS
pixel specifications.

## Supplied-resource register

| Resource | Inspection | Website decision |
| --- | --- | --- |
| iOS 27 UI-kit ZIP | ZIP integrity passes; 151 members: 150 PNGs and one SVG; no licence in archive | Native-interface reference only; not a full website component library; provenance and reuse rights not established from filename alone |
| App Store badge ZIP | ZIP integrity passes; 224 SVG and 224 EPS files, plus directories/metadata | Hold until a genuine approved App Store listing and applicable marketing rights are verified |
| Mac App Store badge ZIP | ZIP integrity passes; 224 SVG and 224 EPS files, plus directories/metadata | Same availability and rights gate; no implied Mac app release |
| SwiftUI custom-layout sample ZIP | ZIP integrity passes; 12 Swift source files; MIT licence with copyright retention | Native layout-learning reference; no SwiftUI runtime or sample content transplanted into the web |
| SF Pro | Apple-signed installer; packaged licence inspected without installation | Use OS-native font stack; do not embed downloaded binaries |
| SF Compact | Apple-signed installer; packaged licence inspected without installation | Compact semantic role only; no downloaded web fonts |
| SF Mono | Apple-signed installer; packaged licence inspected without installation | OS-provided monospace and lawful fallbacks for IDs/code |
| New York | Apple-signed installer; packaged licence inspected without installation | Optional local editorial fallback; no downloaded web fonts |
| SF Symbols 27 | Apple-signed installer; packaged licence inspected without installation | Apple-platform restrictions apply; retain existing web icons |
| Sign in with Apple logo DMG | Existing read-only mount and packaged design-resource licence inspected | Do not add a nonworking sign-in option; any future web integration must use the supported web service and its applicable branding terms |
| Siri AI icons DMG | Metadata and checksum recorded; read-only attach cancelled at licence gate | Not adopted as NOVA/Intelligence identity; no agreement accepted |
| MacBook Air M5 bezel DMG | Metadata and checksum recorded; read-only attach cancelled at licence gate | No artwork reuse without applicable terms and genuine product demonstration |
| SF Symbols partial download | Incomplete `.download` directory recorded | Excluded; never installed, executed or substituted for the complete image |

All original files remain unchanged. Hashes, ZIP member lists, package signature
receipts, extracted licence text and cancelled-mount diagnostics are retained in
the local acceptance bundle, outside public assets. Temporary inspection mounts
were read-only and detached; pre-existing user mounts were left alone.

## Implemented correction

The current live contact form had no visible focus outline when forced colours
removed its focus shadow. `assets/css/contact-premium.css` now gives the existing
outer field a real outline and a forced-colour system highlight. Consent checkboxes
have opaque focus rings, and field captions use the existing caption type role.
The shared stylesheet is already imported by the managed corporate app and the
static bundle. No form attributes, consent policy, submission API, mail delivery,
authentication or payment behaviour changes.

The six Insights articles retained a superseded, over-wide navigation header.
The existing corporate presentation generator now applies its current shared
header/footer to those existing article routes too. Article bodies and metadata
are not rewritten by that step; before/after main-content hashes were compared.
`scripts/test-insights-shared-navigation.mjs` validates the built article routes.
The existing visual CI workflow runs the contact checks before the build and the
article navigation checks after the build; its permissions and release gates
are unchanged.

`scripts/test-contact-focus-contrast.mjs` preserves the regression, including the
managed/static composition. `scripts/audit-website-hig-source.mjs` inventories the
generated public HTML for heading/landmark counts, language, user zoom, image
alternatives, stylesheet availability and published font/archive files. Its
results are source checks, not a full accessibility audit or a legal certification.

## Acceptance still required

Review the exact patch, run the registered build/security/browser checks, then
use the existing managed-contact publication pipeline. Never publish a
`PUBLIC_ONLY` preview over the active managed contact route. Recheck the actual
domain after publication. Real WebKit/Firefox, Windows high contrast, assistive
technology and physical mobile-device acceptance remain separate requirements.
Other independently deployed apps require their own release acceptance.

The first static census covers 75 generated HTML files and has one unresolved
finding: the independently owned `technology/workspaces/index.html` prototype
has no main landmark. Preserve the prototype and return this bounded semantic
finding to its owner rather than rewrite its interface in parallel. It prevents
a claim of complete site-wide accessibility acceptance.

## Official references

- [Getting started](https://developer.apple.com/design/human-interface-guidelines/getting-started)
- [Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- [Color](https://developer.apple.com/design/human-interface-guidelines/color)
- [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)
- [Font resources and licence terms](https://developer.apple.com/fonts/)
- [Design resources](https://developer.apple.com/design/resources/)
- [App Store marketing guidelines](https://developer.apple.com/app-store/marketing/guidelines/)
- [Sign in with Apple](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple)
