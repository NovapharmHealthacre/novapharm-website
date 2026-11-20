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

## Next engineering gates

1. Verify the new SwiftUI app builds under the actual Xcode/iOS Simulator SDK and inspect compiled artifacts.
2. Review app name/bundle ID, original logo/app icon, accessibility and app privacy with the owner.
3. Add native authentication and strongly scoped **non-production** API adapters with isolated integration tests only after the backend is accessible and rights are approved.
4. Run real-device VoiceOver / Dynamic Type / reduced-motion / RTL / dark-mode acceptance, signed artifact verification and independent QA before store registration.
