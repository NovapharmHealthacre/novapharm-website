# Apple 27 reference resources — NovaPharm web adaptation

Status: **implemented in a feature branch, pending CI and production deployment**.

This is a web-specific adaptation of the user-supplied Apple developer design resources. It is **not** a claim of Apple affiliation, Apple certification, an iOS 27 native app, or a completed contactless payment integration.

## Supplied reference inventory

| Source | Verified archive contents | Web decision |
| --- | --- | --- |
| `apple-ios-27-ui-kit_assets_2026-10-27_v32.zip` | 151 entries: 150 PNG and one SVG, primarily keyboard states plus color-picker, edit menu and system references | Preserve the browser's native keyboards and controls; apply responsive spacing, control states, input semantics and adaptive text rather than putting keyboard screenshots on the page |
| `apple-macos-27-ui-kit_assets_2026-10-28_v18.zip` | 22 SVG pointer examples | Use native CSS cursor behaviour; do not replace browser cursors with platform image files |
| `tap-to-pay_assets_2026-01-08_v9.zip` | One PNG, `Small Amount - Payment Request.png` | Create a separate, semantic web payment-request summary; never imply that the browser reads contactless cards |
| `app-clips_assets_2026-01-08_v10.zip` | Two PNG examples (Safari and Lock Screen) | Reference only; App Clips require an actual iOS app, native App Clip target and App Store Connect setup |
| `app-clips_assets_2026-01-08_v10.zip 16-51-32-469.zip` | Duplicate of the two example screenshots | Do not add redundant site files |
| `iOS-27-Icon-Templates-Photoshop-Illustrator.dmg` | Apple disk-image icon design template | Design reference for a future NovaPharm native app; no copied Apple branded glyphs, proprietary template layers or binary assets on the website |
| `SF-Arabic.dmg`, `SF-Hebrew.dmg`, `SF-Armenian.dmg`, `SF-Georgian.dmg` | Apple font disk-image packages | Do not embed, redistribute, or self-host these font packages. Prefer OS-provided fonts and open fallbacks. Scope language-specific stacks to marked content |
| `Small Amount - Payment Request.png` | Apple Tap to Pay iPhone payment-request screenshot | Screen layout reference only. Not an implementable browser NFC flow |

## Changes in this branch

1. `assets/css/novapharm-apple-27-web-adaptation.css`: original reusable web styles for touch targets, keyboard focus, browser zoom preservation, safe areas, number alignment, language-aware fallbacks, RTL, contrast, reduced transparency and reduced motion.
2. Both `apps/corporate/app/layout.tsx` and `apps/portal/app/layout.tsx` import the stylesheet last, so those behaviours reach the two actively maintained Next.js estates.
3. `packages/design-system/src/components.tsx`: a read-only `PaymentRequestSummary` component with merchant, ISO-4217 currency, integer minor units, optional invoice reference, server-supplied payment status and optional authorised-provider action.
4. `packages/design-system/src/styles.ts`: corresponding NovaPharm card style with scalable typography and accessible contrast.
5. `packages/design-system/test/payment-request.test.tsx`: HTML semantics, currency formatting, unavailable-value handling and both-root inclusion checks.

Example of using the presentational component **after** a trusted backend supplies payment state:

```tsx
<PaymentRequestSummary
  merchantName="NovaPharm Healthcare"
  currency="GBP"
  amountMinor={1725}
  reference="INVOICE-EXAMPLE"
  state="requested"
  actions={<a href={authorisedProviderUrl}>Continue to secure payment</a>}
/>
```

Never set `state="paid"` in response to a client-side click; only read a verified settlement/payment status from the server. The component does not implement a checkout URL, collect card data, create a charge, or submit payment.

## Native features intentionally NOT described as web-complete

### Tap to Pay on iPhone

Apple's contactless merchant acceptance feature is **not available as an ordinary web browser interaction**. A future iOS merchant app needs a supported PSP in the target market, an Apple entitlement, certified reader integration via the PSP SDK/ProximityReader, payment lifecycle and cancellation support, handling for unreliable connectivity and device-based acceptance testing. Check territory/merchant eligibility and PCI/PSP requirements before proposing a release.

References:
- https://developer.apple.com/design/human-interface-guidelines/tap-to-pay-on-iphone
- https://developer.apple.com/tap-to-pay/
- https://developer.apple.com/documentation/proximityreader

### App Clips

App Clip banners/cards must not be shown as functional unless there is a matching shipped iOS app and a published App Clip experience with a valid invocation URL/domain association. They cannot be activated by including screenshots in a Next.js application.

References:
- https://developer.apple.com/design/human-interface-guidelines/app-clips
- https://developer.apple.com/documentation/appclip/configuring-the-launch-experience-of-your-app-clip

### Apple design resources and fonts

The supplied templates, artwork and downloadable fonts are reference materials governed by Apple's respective licenses. The web implementation uses independent CSS and NovaPharm branding; it does not bundle Apple fonts, SF Symbols or Apple payment UI graphics.

References:
- https://developer.apple.com/design/resources/
- https://developer.apple.com/fonts/

## Outstanding for production readiness

- Run the shared design-system tests and the corporate/portal typecheck, build and browser acceptance suites in CI.
- Review mobile layouts at 320px, 375px, 768px and desktop, keyboard-only navigation, 200% text zoom, screen readers, light/contrast modes, Arabic/Hebrew `lang` + `dir` content, and Safari's reduced-transparency preference.
- Integrate payment-request components into actual order/invoice routes only after payment provider onboarding and server-authorised transaction status are established.
- Verify the deployed corporate and portal environments after merge; the branch alone is **not** a live deployment.

The goal is a high-quality native-feeling **web** experience with honest capability boundaries, not a pixel-for-pixel reproduction of Apple system screens.
