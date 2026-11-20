# NovaPharm Intelligence — native Swift and SwiftUI iOS application

**Status (20 November 2026): private, offline iOS source candidate.** This is the **native Swift-first iOS direction**, not a React Native iOS wrapper or published app. It is a new `native/novapharm-intelligence-ios/` project and does not affect Android, website routing, app stores or production.

## Implementation and direct Apple references

| Apple technology | Implementation and acceptance boundary |
| --- | --- |
| [Swift](https://developer.apple.com/documentation/swift/) | Typed native model `App/WorkspaceCatalog.swift`, immutable catalogues and fail-closed `App/ReleasePolicy.swift` |
| [SwiftUI](https://developer.apple.com/documentation/swiftui) | `App/NovaRootView.swift`: native `TabView`, `NavigationStack`, search, grouped lists, detail navigation, adaptive system typography/colors, native buttons |
| [SwiftData](https://developer.apple.com/documentation/SwiftData) | `@Model OfflineBookmark` stores only non-sensitive module identifiers as local navigation preferences; `@Query` reads bookmarks; **no patient, medicine, invoice, order, employee, secret, token or tenant data caching; no CloudKit entitlement** |
| [Swift Testing](https://developer.apple.com/documentation/Testing) | `CoreTests/NovaNativeCatalogTests.swift` checks counts, identities, source-only status and fail-closed per-module release policy; `swift test` for core |
| [Swift Charts](https://developer.apple.com/documentation/Charts) | Native `Chart` shows **documented module counts** (22 / 10 / 9) only, explicitly not operational KPIs, with `LabeledContent` text alternatives |
| [Swift Resources](https://developer.apple.com/swift/resources/) | Xcode / iOS Simulator are the build and verification tools; Swift documentation, Swift open source, debugging and device testing |
| [Swift Playgrounds](https://developer.apple.com/documentation/swift-playgrounds) | Valid prototyping/learning environment but **not** an app store distribution receipt or proof of iOS signing |

Apple SwiftData is supported on iOS 17+, so this prototype targets iOS 17. Our `project.yml` is an XcodeGen project specification, not a precompiled binary. The required `com.example.NovaPharmNativePreview` is **a build-only placeholder**, not NovaPharm's approved bundle ID or a production identity. Signing is disabled.

## Native offline 101-country directory

The iOS app now includes `NovaCountryCatalog` and `NovaCountryDirectoryView` as an additional **Swift-only**, read-only research screen linked from Intelligence. The source is the existing canonical `docs/intelligence/country-101-client-catalog-20261118.json`, not scraped or inferred national medicine facts.

- **101 national geography scopes** by country and region, with search and a filter for source candidates versus further research.
- **77 scopes** with publisher source candidates; **24 geography-only research scopes**.
- **0** licensed/accepted national sources and **0** customer-live countries.
- The app shows only country/ISO/region, candidate reference counts and explicit access-rights warnings; no remote URLs are requested, no licensed datasets or regulator data are loaded, and no country can grant production rights.

`scripts/test-novapharm-native-ios-source-parity.mjs` compares **every country record, in order** against the canonical JSON, protecting against hidden omissions or made-up acceptance. `CoreTests/NovaCountryCatalogTests.swift` verifies all country counts and fail-closed rights using Swift Testing. These additional preview records do not update the 172-topic production HIG acceptance register.

## Build with Xcode, with no paid developer account

On a developer-owned Mac with Xcode and XcodeGen:

```sh
cd native/novapharm-intelligence-ios
swift test
xcodegen generate
xcodebuild -project NovaPharmNative.xcodeproj -scheme NovaPharmNative \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO build
```

The GitHub Actions workflow `.github/workflows/nova-ios-swift-native.yml` runs the canonical catalogue parity test, Swift Testing, generates an Xcode project and builds an **unsigned iOS Simulator .app**. The zipped simulator build is uploaded for a private technical review with a SHA-256 receipt. A simulator app cannot run on an iPhone, is not an IPA, and is neither an App Store/TestFlight release nor a customer-accessible app. Never attempt to submit the placeholder bundle ID. A physical iPhone install needs a reviewed final bundle ID and personal-team provisioning via Xcode; wider distribution needs the paid Apple Developer Program later.

## Canonical cross-platform boundaries

The 22 Intelligence slugs and titles match `apps/portal/data/intelligence-workspaces.ts` exactly. The 10 Customer Portal and 9 Distribution workspaces are **planning navigation only**; their data services are not active. `scripts/test-novapharm-native-ios-source-parity.mjs` compares the native source catalogue to the canonical web catalogue and checks the owner’s release restrictions. Android continues in `native/novapharm-intelligence-mobile` and its Android/Kotlin research prototype; moving **iOS** to Swift does not imply Android adopts Apple frameworks.

The existing native Swift package `native/novapharm-intelligence-apple` is preserved separately. It contains early **Core ML, Create ML, Foundation Models, Vision, Natural Language, Speech, App Intents, MapKit, sparse-circuit, alignment, CLIP and compute admission** candidates; the distinct `native/novapharm-intelligence-storekit` includes a **read-only StoreKit** research component. **None is linked into this new iOS host**, and their source tests do not authorize model execution, camera/microphone use, source licensing, subscriptions or deployment. Integrate only after approved native app identity, purpose, input/data rights, suitable device verification and independently signed-off behavior.

The previous Apple HIG programme is tracked in `docs/design/apple-hig-172-topic-acceptance-register.json`. Prior supplied Apple design DNA requires NovaPharm identity, white/graphite-first semantic interface, restrained red `#E3120B`, legally permitted system typography, readable controls, safe-area/adaptive layouts, Dynamic Type, accessibility, RTL, motion/transparency fallback and real implementation evidence. This prototype uses native controls and no copied Apple artwork or font binaries. **VoiceOver, keyboard, high contrast, 200% Dynamic Type, dark mode, RTL, device orientation, physical iPhone and independent tests are still pending.** No claim of 172 HIG topic production acceptance is implied.

## Deliberate operational denial

- No OAuth or MFA, token persistence, network client, API calls, regulated medicine facts, customer records, warehouse stock, live sales charts or AI inference.
- No payments, App Store products, notifications, background processing, camera, microphone, location or external service integrations.
- Owner production constraints remain `productionSignoff: not_granted` and incremental infrastructure budget **£0**.
- Before live functionality: design and implement a dedicated Cognito public mobile client with system-browser Authorization Code + PKCE, MFA, session revocation, Keychain for permitted tokens, authenticated API Gateway, server-enforced tenant/data rights and independent privacy/security/device tests.

## Native XCUITest interaction validation

The Swift iOS app now defines a native `NovaPharmNativeUITests` XCTest UI-testing bundle alongside the existing Swift Testing unit suite. It is configured in `project.yml`, generated by XcodeGen and invoked on an iPhone Simulator by `.github/workflows/nova-ios-swift-native.yml`. The test evidence is uploaded as a separate Xcode `.xcresult` artifact.

Four interaction journeys are specified for exact-head Simulator acceptance:
1. **Native navigation and protected-workspace denial:** all four tabs exist; Portal Dashboard and Distribution Inventory screens can be opened; protected actions remain unavailable.
2. **Offline country directory:** reach the native directory and an individual country; verify explicit research-only/source-rights disclosures.
3. **Country-source separation:** switch native Research/Candidates filters (24 geography-only scopes; 77 unapproved publisher candidates), verify exclusions, and require source-rights and customer-publication denial.
4. **SwiftData lifecycle:** save a non-sensitive module shortcut, restart the application process, confirm the shortcut persists locally, then remove it.

The tests use stable `accessibilityIdentifier` values and system accessibility elements. SwiftData shortcuts call `modelContext.save()` explicitly; a failed local save gives a non-sensitive user-facing error rather than a false success. This check neither stores customer content nor activates any protected API. It is **not a replacement** for independent VoiceOver, text-scaling, RTL, orientation, device-loss and real-iPhone review.

**Acceptance discipline:** successful source checks, installation and screenshots are not enough to mark interaction journeys passed. Only count them if the corresponding `xcodebuild test` stage completes successfully and its `.xcresult` confirms the tests. A blocked macOS runner or failing UI selector is an actionable failure, not a production-verification receipt.

## Dynamic Type, accessibility and iPad acceptance extension — 20 November 2026

This new **native SwiftUI**, non-production candidate adds Apple XCTest accessibility audits and iPad Simulator launch verification on top of the four separately verified base XCUITest interaction journeys:

- `UITests/NovaPharmAccessibilityUITests.swift` runs Apple's `XCUIApplication.performAccessibilityAudit` for contrast, clipped text, hit region and sufficient element descriptions on Intelligence and Customer Portal screens. These are automated checks on visible screens only, **not manual VoiceOver testing**.
- The macOS workflow uses `xcrun simctl ui <device> content_size accessibility-extra-extra-extra-large` before running the large-text navigation test, and captures the configured size, screenshot and `.xcresult`. A failure fails the exact-head CI job; there is no silent `|| true` or baseline suppression for audit findings.
- The Intelligence Swift Chart gains additional vertical space at accessibility Dynamic Type sizes. The country-reference filter changes from compact segmented controls to a menu at these sizes to avoid truncating the three category labels.
- A separate iPad Simulator is booted, the unsigned native app installed and launched, and a screenshot/launch receipt captured. Missing iPad Simulator capacity is a **failed verification**, not a fabricated iPad pass. This test checks *launch*, not all iPad workspaces or responsive details.
- No customer/patient/employee information, live source data, payments, network calls, model execution or signed IPA are involved. The owner production-denial register and £0 incremental infrastructure cap remain enforced.

Run results must be inspected before claiming any accessibility or iPad coverage. Manual VoiceOver focus/reading order, Switch Control, RTL, landscape/Stage Manager, physical iPhone/iPad and independent production approval remain outside these automated checks.

## Next engineering gates

1. Verify the new SwiftUI app builds under the actual Xcode/iOS Simulator SDK and inspect compiled artifacts.
2. Review app name/bundle ID, original logo/app icon, accessibility and app privacy with the owner.
3. Add native authentication and strongly scoped **non-production** API adapters with isolated integration tests only after the backend is accessible and rights are approved.
4. Run real-device VoiceOver / Dynamic Type / reduced-motion / RTL / dark-mode acceptance, signed artifact verification and independent QA before store registration.
