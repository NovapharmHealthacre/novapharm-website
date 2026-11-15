# Official Apple App Store badges — NovaPharm release contract

**Status: prepared, not published.** No NovaPharm iPhone/iPad or Mac App Store listing URL was verified in this implementation. The presence of a browser portal, PWA, TestFlight build or internal pilot does not establish App Store availability.

Authoritative references:
- https://developer.apple.com/app-store/marketing/guidelines/
- https://developer.apple.com/design/human-interface-guidelines/branding
- https://developer.apple.com/design/human-interface-guidelines/layout

## Approved marketing assets

Use only Apple's unchanged preferred black App Store artwork at the following published URLs:
- `/assets/marketing/apple/app-store-black.svg` — iPhone and iPad App Store
- `/assets/marketing/apple/mac-app-store-black.svg` — Mac App Store

The uploaded ZIP archives are **not** silently considered published or independently verified. First review their internal files, licensing and checksums, then copy only the needed original localization byte-for-byte into the website's served assets. Do not check the full multilingual artwork archives into the website. Do not redraw Apple's badge or create an imitation.

## Publication gates

1. Confirm the specific iPhone/iPad or Mac app has been released on Apple's store and obtain its actual direct `https://apps.apple.com/.../app/.../idNNN` listing URL.
2. Examine the official ZIP and identify the unchanged preferred black artwork. Preserve the gray border, logo, type, color and proportions. Record its source and checksum.
3. Serve the approved asset at the exact matching `/assets/marketing/apple/` path. Verify the artifact is HTTP 200 from the actual production origin before enabling a badge.
4. After verifying that both the supplied badge archives and the actually deployed files are original, serve HTTP 200 and match the recorded checksums, set `NOVAPHARM_APP_STORE_ASSETS_VERIFIED=true`; never set this flag merely because an asset path is configured.
5. Call `AppleAppStoreBadges` from `@novapharm/design-system` with real listing objects and explicitly set `approvedForPublication={true}` only after release verification.
6. Keep minimum onscreen height 40 px and surrounding clear space one-quarter of badge height. Keep it subordinate to the primary content, not as a main hero logo or red button. If both platform badges appear, put iPhone/iPad App Store first.
7. Check the exact live page for keyboard focus, spoken link labels, layout overflow at 320 px, contrast, links and no broken images. Verify required Apple trademark acknowledgements.

The component hides badges by default, only accepts direct Apple product URLs, does not allow custom art URLs or theme adjustments, and orders iPhone/iPad before Mac. It does not itself prove that an app is on the App Store.

## Open release dependencies

Actual native application URLs and store listing IDs, verified unchanged assets from both source ZIPs, publication consent and asset checksums, live image requests, and real-device/browser acceptance remain pending. Do not describe the public website or Intelligence pilot as an Apple-distributed native app without that evidence.

## Trademark credit

Where Apple download badges are displayed, the corporate wrapper prints the Apple / Apple logo trademark credit and the App Store service-mark credit. These credits must remain visible and readable; do not imply Apple sponsors, endorses or distributes NovaPharm's web portals.

## Readiness checklist

- Current default publication state: OFF (`NOVAPHARM_APP_STORE_PUBLISHED` unset).
- Artwork attestation state: OFF (`NOVAPHARM_APP_STORE_ASSETS_VERIFIED` unset).
- Enable only after a specific app's direct official product URL and the matching original Apple badge artwork both pass the live checks above.
- This contract is not equivalent to releasing a native iPhone, iPad or Mac app.
