# NovaPharm Privacy — Apple HIG adaptation and release audit

Date: 16 November 2026  
Scope: `/legal/privacy/` public page and the sitewide privacy-control entry point.  
Status: **source-level design candidate, not live deployment certification or UK legal approval**.

## Design and legal boundary

Apple Privacy is a product-storytelling and control experience; Apple HIG Privacy supplies design principles for permissions, data minimisation, clear disclosure and security. NovaPharm must apply the **principles** to its own pharmaceutical business, not copy Apple's interface verbatim or claim access to Apple-only systems.

Authoritative references:

- [Apple Privacy](https://www.apple.com/in/privacy/)
- [Apple HIG Privacy](https://developer.apple.com/design/human-interface-guidelines/privacy)
- [Apple HIG Design Principles](https://developer.apple.com/design/human-interface-guidelines/design-principles/)
- [Apple HIG Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Apple HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Apple HIG Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- [Apple HIG Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Apple developer: protected resources](https://developer.apple.com/documentation/uikit/requesting-access-to-protected-resources)
- [Apple developer: App Tracking Transparency](https://developer.apple.com/documentation/apptrackingtransparency)
- [Apple developer: Core Location](https://developer.apple.com/documentation/corelocation/requesting-authorization-to-use-location-services)
- [Apple developer: Security](https://developer.apple.com/documentation/security)

## Source-level parity assessment

| Apple principle | Existing NovaPharm behaviour | This follow-up | Release boundary |
|---|---|---|---|
| Privacy by design, minimise collection | Detailed notice and public-form exclusions | Leading plain-language privacy principles | Verify all actual enabled processors and data fields |
| Explain choices before collecting | Consent controls and necessary/optional distinction | Prominent, working Cookie preferences button | Browser/network test on production origin |
| Respect denial/withdrawal | Versioned 180-day consent; reject and withdrawal logic | Prominent choice path without gating access | Verify no optional requests before/reject/after withdraw |
| Show people their data rights | Contact route and rights notice | Prominent personal-data enquiry action | Actual rights request workflow requires owner review |
| Ask for protected device access in context | Notice explains web permission boundaries | Linked, discoverable device-permissions topic | No native iOS system permission prompt or Apple ATT implementation claimed |
| Visual clarity and hierarchy | Dense legal article, metadata sidebar | Editorial introduction, three readable principles, topic navigation | Browser Axe and responsive acceptance |
| Inclusive interaction | Existing focus/contrast contracts | 46px controls, reduced visual clutter, high-contrast and forced-colour styling | 320px/400% zoom, keyboard, VoiceOver/NVDA evidence |
| Accurate legal notice | UK company controller, purposes, lawful bases, transfers, retention and rights | **Existing full legal text and metadata preserved unchanged** | Legal owner must approve actual retention, processors and transfers |

## Implementation

- `legal/privacy/index.html`: a semantic overview before the reviewed legal article with an accessible title, short commitments, topic links and direct preference/rights actions.
- `assets/css/corporate-product-discipline.css`: restrained, typography-led and responsive styles scoped only to the public Privacy page, preserving approved NovaPharm logo and red accent.
- `assets/css/novapharm.bundle.css`: kept source-identical to the CSS bundle that will be built by `scripts/build-css-bundle.mjs`.
- `scripts/test-apple-privacy-editorial.mjs`: tests the reviewed legal article is preserved, correct controls and topic targets exist, CSS parity and adaptive/focus rules.
- `scripts/test-public-pages-browser.mjs`: checks visible heading, action size, accessible topic links and the existing consent dialog in Chromium/WebKit.
- `.github/workflows/apple-privacy-contract.yml`: runs the new source test whenever Privacy HTML or related CSS/test source changes.

## Separate pending obligations

- [PR #743](https://github.com/NovapharmHealthacre/novapharm-website/pull/743) has merged: runtime and SEO publisher restrict GA4 to approved informational pages. **Merging code is not evidence that the new policy is live**, so verify deployment source SHA and that Bag, account and payment pages do not load optional analytics.
- [PR #750](https://github.com/NovapharmHealthacre/novapharm-website/pull/750) reconciles the data map with actual AWS-backed contact and protected application boundaries; exact-head CI, owner data retention/processing evidence and legal review remain independent.
- Private Portal, Founder, Technology, Status, Intelligence and Distribution are separate managed/public applications. A Privacy HTML redesign does not publish those services or certify role isolation, deletion, transfers or processing.
- Neither NovaPharm nor its website may claim Apple's Private Cloud Compute, iOS Keychain, on-device intelligence, native App Tracking Transparency permission or Apple-provided data protections unless those technologies are truly implemented and applicable.
- Record exact deployed SHA, mobile/tablet/desktop browser captures, contrast/keyboard acceptance, cookie/network traces, named reviewers and rollback evidence before closing the estate-wide [privacy acceptance issue #733](https://github.com/NovapharmHealthacre/novapharm-website/issues/733).
