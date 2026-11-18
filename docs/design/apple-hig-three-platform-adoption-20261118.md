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


## Permanent NovaPharm Apple HIG design DNA — source, implementation and release contract (18 November 2026)

This section is **normative for future NovaPharm design reviews**, not evidence that every app is already compliant. The authoritative 172-row register is `docs/design/apple-hig-172-topic-acceptance-register.json`. Its exact URL, title, section, subsection, priority and Markdown pairs were reconciled against all 172 rows of the owner-supplied `Apple_HIG_Complete_Sectionwise_Index_2026-11-18.csv`; each record now also retains the *owner's* row index, type, description and requested-platform label. Those descriptions and priority/platform labels are **NovaPharm classifications**; they must never be attributed to Apple or treated as full-page legal/technical review.

### Non-negotiable implementation DNA

1. **Purpose and clarity:** Keep a simple, typography-first, minimal appearance; meaningful information before visual effects. Original NovaPharm red `#E3120B`, black/graphite/white and semantic states, not an imitation of Apple's trademarks. Do not add unnecessary icons.
2. **Accessibility by default:** Web interactive controls need independently tested accessible targets (44 CSS px is NovaPharm's target, not a blanket substitution for WCAG target-spacing rules), keyboard operation, visible focus and screen-reader names. Apple's iPhone/iPad default body size is 17 pt with 44×44 pt default controls; check enlarged text to at least 200% and contrast at 4.5:1 for normal text. Android interaction targets must satisfy its independently published 48×48 dp guidance. All values are platform-specific and must be checked in actual rendered interfaces, not merely stylesheet strings.
3. **Adaptive layout:** Preserve content hierarchy, progressive disclosure, readable safe areas/insets, large text, tablet split views, 320–1920 px responsive coverage and right-to-left Arabic/Hebrew reading order without hiding content. Respect locale, language and zoom; don't silently mark a screen translated because an Arabic/Hebrew font is available.
4. **System appearance and motion:** React Native must follow system light/dark and system text scaling; web needs high contrast, reduced motion, forced colours where applicable and true responsive reflow. Test both appearances with screen readers and physical devices. Do not suppress unavoidable animations/notifications without user controls.
5. **Input and trust:** Provide explicit error, empty, loading, cancellation and undo/recovery states. No misleading sign-in buttons, Apple Pay, availability, app-store links, live medicines data or medical claims. Authentication/MFA, customer and patient data, pharmaceutical rights, invoicing and payments require independent real-service admission.
6. **Brand and licensing:** Use system-native fonts and symbols only through each platform's permitted APIs; **never copy Apple SF font/NY or SF Symbols binaries into public web/Android assets** or into trademarks/logos. Apple marketing badges require an actual approved store listing and current legal rules. Original NovaPharm web artwork and Android-native equivalents are separate assets.
7. **Cross-platform review:** Each applicable HIG topic must have a source-specific design decision, a code location, a failing regression case before repair where practical, and Chromium/WebKit and/or VoiceOver/TalkBack physical-device verification. Inapplicable topics need a reason (e.g., tvOS, watchOS, visionOS or CarPlay when no product targets them). A machine-readable indexed URL alone is *not* a reviewed guideline.
8. **Promotion gate:** Protected source and public delivery are distinct: exact PR head CI, security, accessible route/viewport test evidence, source rights and native signing, then verified deployed origin/build SHA or signed store receipt. Do not infer go-live from `git merge`, an Expo bundle, a screenshot or a design mockup. Do not connect AWS or change cloud infrastructure as part of this asset/source audit.

### MapKit, MapKit JS and IMDF — explicit applicability boundary

The official [Apple Maps HIG](https://developer.apple.com/design/human-interface-guidelines/maps.md) covers searchable/filterable interactive maps, legible marker clusters, selected location states, sufficient contrast and visible Apple logo/legal attribution when Apple map data is used. These are design requirements, **not proof of a deployed map**. [MapKit](https://developer.apple.com/documentation/mapkit) is iOS-native, [MapKit JS](https://developer.apple.com/documentation/mapkitjs) is a separately configured web integration with credentials/terms, and [IMDF](https://register.apple.com/resources/imdf/) is indoor mapping exchange data, not a substitute for an authorized live map source. Android should use an appropriate Android-supported map solution and its own accessibility conventions, not MapKit. No map API credentials, network geocoding, geographic partner listings or IMDF contents were activated or verified in this change.

### Original attachment and source-index audit inventory

**Metadata evidence:** 24 uniquely named Apple-related resources visible in the uploaded conversation/Library inventory (20 original DMG/ZIP uploads, the later IMDF ZIP and three HIG index files). Listed names and sizes are metadata only; this audit has **not opened, mounted, executed, unpacked or licensed** any supplied DMG or ZIP. The CSV's 172 metadata records were actually read and reconciled. The Markdown index was read; the workbook's parsed overview was sampled, but not every spreadsheet tab was revalidated. Never call these resources installed, operational, byte-inspected or rights-approved merely because they are listed.

| Original attachment | Role | Actual inspection state |
| --- | --- | --- |
| `Bezel-MacBook-Air-M5.dmg` | Apple development/presentation tool | bytes not opened; provenance and licence unverified |
| `Core_AI_Debugger(1).dmg` | Apple development/presentation tool | bytes not opened; provenance and licence unverified |
| `Icon_Composer_27.3_beta(1).dmg` | Native icon, sign-in or Siri design resource | bytes not opened; provenance and licence unverified |
| `Icons-Siri-AI(2).dmg` | Native icon, sign-in or Siri design resource | bytes not opened; provenance and licence unverified |
| `iOS-27-Icon-Templates-Photoshop-Illustrator(2).dmg` | Native icon, sign-in or Siri design resource | bytes not opened; provenance and licence unverified |
| `Logo-Sign-in-with-Apple(1).dmg` | Native icon, sign-in or Siri design resource | bytes not opened; provenance and licence unverified |
| `NY(2).dmg` | Apple system font/symbol distribution | bytes not opened; provenance and licence unverified |
| `SF-Arabic(2).dmg` | Apple system font/symbol distribution | bytes not opened; provenance and licence unverified |
| `SF-Armenian(2).dmg` | Apple system font/symbol distribution | bytes not opened; provenance and licence unverified |
| `SF-Georgian(2).dmg` | Apple system font/symbol distribution | bytes not opened; provenance and licence unverified |
| `SF-Compact(1).dmg` | Apple system font/symbol distribution | bytes not opened; provenance and licence unverified |
| `SF-Hebrew(2).dmg` | Apple system font/symbol distribution | bytes not opened; provenance and licence unverified |
| `SF-Pro(1).dmg` | Apple system font/symbol distribution | bytes not opened; provenance and licence unverified |
| `SF-Mono(1).dmg` | Apple system font/symbol distribution | bytes not opened; provenance and licence unverified |
| `SF-Symbols-27(1).dmg` | Apple system font/symbol distribution | bytes not opened; provenance and licence unverified |
| `Download-on-the-App-Store(1).zip` | Apple store-badge artwork | bytes not opened; provenance and licence unverified |
| `Download-on-the-Mac-App-Store(1).zip` | Apple store-badge artwork | bytes not opened; provenance and licence unverified |
| `AnimatingViewsAndTransitions.zip` | Apple native sample code | bytes not opened; provenance and licence unverified |
| `apple-ios-27-ui-kit_assets_2026-10-27_v32(1).zip` | iOS design UI kit | bytes not opened; provenance and licence unverified |
| `ComposingCustomLayoutsWithSwiftUI(1).zip` | Apple native sample code | bytes not opened; provenance and licence unverified |
| `IMDF.zip` | Indoor Mapping Data Format reference | bytes not opened; provenance and licence unverified |
| `Apple_HIG_Complete_Sectionwise_Index_2026-11-18.csv` | User-supplied HIG source index | 172/172 metadata rows read and reconciled |
| `Apple_HIG_Sectionwise_Guide_2026-11-18.md` | User-supplied HIG source index | section map read; summaries are interpretive |
| `Apple_HIG_Complete_Sectionwise_Index_2026-11-18.xlsx` | User-supplied HIG source index | parsed overview sampled; remaining workbook tabs unverified |

**Remaining asset prerequisites:** For every archive, independently inspect a local raw copy in a capable isolated environment; inventory its files, signatures/hashes, manifests, README and licence/redistribution terms; scan for unexpected executable/network instructions and confirm platform applicability. Escalate any asset with no proven redistribution rights. Keep all downloadable Apple-owned binary assets out of this GitHub change and public website. Where a tool is macOS-only, do the audit on a Mac instead of treating a Linux parse error as evidence of safety.
