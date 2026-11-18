# NovaPharm: Apple HIG adoption across website, iOS and Android

**Status:** source-level acceptance matrix, 18 November 2026. **Not** Apple certification,
a signed application, an Android production release or evidence of live deployment.
**Infrastructure constraint:** No AWS access is required for this change and no cloud
resources, customer identities or pharmaceutical source entitlements are modified.

## Policy and product identity

Follow Apple's current [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/getting-started)
as a *design reference*, not a licence to copy Apple-owned material, replace
NovaPharm branding or treat Apple-native APIs as browser/Android APIs.

- NovaPharm's restrained #E3120B accent, white/graphite hierarchy and established
  content identity remain canonical; the web's governed design tokens live in
  `packages/design-system/src/index.ts`.
- Website: semantic HTML, flexible layouts, system-ui font stack, lawful original
  web symbols, readable zoom, visible keyboard focus, reduced-motion/contrast
  adaptation and independently verified authenticated boundaries.
- iOS: use platform-provided typography and controls; native Apple
  resources/features only in supported, appropriately licensed Apple contexts.
  Dynamic Type, VoiceOver, colour appearance, safe areas and actual device
  acceptance remain distinct from an Expo bundle build.
- Android: retain the NovaPharm design language but use native Android/React
  Native conventions, system typography and accessibility. Do not ship Apple's
  downloaded SF font files or SF Symbols as an Android asset library.
- The cross-platform `native/novapharm-intelligence-mobile` project is currently
  an offline **Expo candidate**. The separate Swift Package and Kotlin code are
  research prototypes, not the signed distribution products.

## Attached-resource decision register

This register classifies the supplied filenames for integration decisions.
It does **not** claim that the current attachment bytes were newly unpacked or
that their provenance/licence was verified by this commit. The older, independent
website inspection appears on PR #709 and must not be misrepresented as a new
attachment-level verification.

| Supplied file or group | Approved application of ideas | Not authorised/implemented |
| --- | --- | --- |
| `Bezel-MacBook-Air-M5.dmg` | Desktop presentation reference if terms permit | Not a UI component or customer-live Mac product |
| `Core_AI_Debugger(1).dmg` | Apple developer debugging reference | No native debug tool bundled with website/Android |
| `Icon_Composer_27.3_beta(1).dmg` | Native iOS icon authoring workflow | No generated app icon claimed or distributed |
| `Icons-Siri-AI(2).dmg` | Apple feature reference only | No Apple/Siri assets repurposed as NovaPharm branding |
| `iOS-27-Icon-Templates-Photoshop-Illustrator(2).dmg` | Native app icon design reference | No templates embedded in Android or web |
| `Logo-Sign-in-with-Apple(1).dmg` | Official button treatment only after a working, approved identity service | No fake Apple sign-in button |
| `SF-Pro(1).dmg`, `SF-Compact(1).dmg`, `SF-Mono(1).dmg`, `NY(2).dmg` | OS-native typography roles and legitimate local Apple design/reference use | No raw font binaries committed or served as website/Android fonts |
| `SF-Arabic(2).dmg`, `SF-Armenian(2).dmg`, `SF-Georgian(2).dmg`, `SF-Hebrew(2).dmg` | Script-aware native-layout references | Not evidence of translated, culturally reviewed content |
| `SF-Symbols-27(1).dmg` | Approved native Apple system symbols under applicable terms | Not an Android/web icon redistribution library |
| `Download-on-the-App-Store(1).zip`, `Download-on-the-Mac-App-Store(1).zip` | Official badges only for genuinely released/listed products under Apple marketing rules | No availability claim or premature badge |
| `AnimatingViewsAndTransitions.zip` | Study motion/transition behaviour, respecting Reduce Motion | No unreviewed example shipped |
| `apple-ios-27-ui-kit_assets_2026-10-27_v32(1).zip` | Visual specification/design reference for Apple-native interfaces | No blanket right to embed artwork or claim complete UI parity |
| `ComposingCustomLayoutsWithSwiftUI(1).zip` | Learn native adaptive layout methods with original licence notices if code is reused | Not an executable web/Android framework |

Authoritative references:
[Typography](https://developer.apple.com/design/human-interface-guidelines/typography),
[Layout](https://developer.apple.com/design/human-interface-guidelines/layout),
[Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility),
[Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars),
[SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols),
[Fonts and licensing](https://developer.apple.com/fonts/),
[App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons),
[Sign in with Apple](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple).

## Concrete mobile navigation correction in this candidate

The previously six-way, fixed-width bottom bar crowded labels on narrow screens.
The Expo candidate now keeps **four** labelled, stable top-level routes —
Overview, Workspaces, Sources and More — with Review, Research and Account
available as accessible, 56-point-minimum actions in More. At larger system
text scales (fontScale >= 1.4), the four navigation choices wrap into two
rows and the source directory falls back to one column even on wide screens.
The text styles for descriptions and section introductions now use 17-point
system-scalable defaults, with navigation labels at 14 points and status text
at legible secondary sizes. Larger system text still requires actual
VoiceOver/TalkBack and physical-device testing.
When a nested route
is open, the More tab retains selected semantics. Every route is still reachable.
No bundled Apple assets, web-authentication, live data, model inference or payment
service is activated.

`native/novapharm-intelligence-mobile/tests/apple-hig-navigation.test.mjs`
preserves that source contract and runs under the existing
`intelligence-global-mobile-contracts.yml` workflow. This is *not* a
pixel-perfect native tab-bar implementation or device accessibility test.

## Gate matrix — must not be called 100% complete without evidence

| Gate | Source state / release requirement |
| --- | --- |
| Website foundations | Existing five-app design-system, typography, layouts, motion, privacy, RTL and lawful-symbol contracts; verify current-main exact-head CI and production artefacts |
| Public pages and protected portal | Distinct build, authentication, security, payments, forms, clinical and browser tests; verify actual live target separately |
| iOS Expo candidate | Run Node contracts, typecheck and iOS bundle preflight; then Apple device simulation, Dynamic Type/VoiceOver, sign-in/MFA, signing and App Store review |
| Android Expo candidate | Run Node contracts, typecheck and Android bundle preflight; then TalkBack, screen sizes, system appearance, auth and signing/Play Store release |
| Native Swift/Kotlin prototypes | Separate Xcode/Android toolchain and device acceptance; no assumption they are included in Expo |
| Official pharmaceutical datasets | Independent source rights, regulatory applicability, identity reconciliation, access approvals, provenance, tenant controls and live API acceptance |
| Apple badges/icons/fonts | Audit actual licensing and product availability before use; no raw Apple binaries introduced by this PR |
| Deployment | No AWS touched; GitHub merge alone is not a production release, a mobile store publication or a functional login |

Do not assert 100% platform readiness, source-data coverage, Apple endorsement
or live integration from passing source-level checks. Confirm independently
approved release evidence, protected services, operational and device tests.

## Additional applied guidance — system appearance for Expo iOS and Android

The mobile candidate previously forced `userInterfaceStyle: light`, displayed a fixed light status bar, and hard-coded white/graphite text in the research form. These were concrete deviations from [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [Typography](https://developer.apple.com/design/human-interface-guidelines/typography), and [Color](https://developer.apple.com/design/human-interface-guidelines/color) when a device uses dark appearance.

The scoped correction adds shared original `appearance.ts` semantic tokens (canvas, grouped, raised, border, primary, secondary, tertiary, accent), adopts `useColorScheme()`, and rebuilds the app and research-form styles consistently with the scheme. It also updates the status-bar text style, keeps the selected tab and region state readable, and sets a 17-point source search input while preserving screen-reader labels. A WCAG relative-luminance regression checks at least **4.5:1** for all canvas text roles, the accent and inverse selected navigation, and **3:1** for form/control boundaries, in *both* palettes. Corporate light red remains `#E3120B`, while dark content uses a higher-contrast equivalent to preserve its visual role.

Expo SDK 58 uses `userInterfaceStyle: automatic` and requires `expo-system-ui` for Android's automatic style. The isolated Expo candidate now declares the official `~58.0.7` package and config plugin. The app does not add Apple-owned font binaries, SF Symbols artwork, native Apple-exclusive APIs to Android, proprietary icons, network calls, medical records or model inference.

**Not accepted as live:** Although CI can verify JavaScript/TypeScript, palette calculations, source contracts and offline iOS/Android bundles, real-device iOS dark/Light appearance, TalkBack/VoiceOver, Android system bars, 200% font scaling, keyboard/gesture accessibility and signed store distributions remain separate and require device-level proof. App configuration changes require a fresh native build; Expo source export cannot prove the plugin has installed native runtime assets. No AWS access or production data/identity changes are involved.

References: https://docs.expo.dev/versions/v58.0.0/sdk/system-ui/ ; https://docs.expo.dev/develop/user-interface/color-themes/ .
