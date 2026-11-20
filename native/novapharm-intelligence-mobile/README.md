# NovaPharm Intelligence — Android pre-store build and shared research candidate

**Status:** Source scaffold / private prototype only. Not a signed IPA/APK/AAB, TestFlight, Play Store, App Store, production app, customer launch or data integration. Does not call any API, log in, train a model or store private content.

**Native iOS architecture decision (20 Nov 2026):** The production-directed iOS app is being developed in **Swift/SwiftUI** in [PR #917](https://github.com/NovapharmHealthacre/novapharm-website/pull/917), with a separate source tree at `native/novapharm-intelligence-ios/`. This Expo project remains the Android candidate and a historical cross-platform research prototype; it is **not** the iOS release build. Do not ship Expo iOS, run EAS iOS signing or claim the Swift app is a wrapper.

This independent Expo SDK 58 / React Native research project lives in native/ to avoid changing the root package-lock.json, pnpm lock and existing website application deployments. It reads the canonical 22 workspace definitions from apps/portal/data/intelligence-workspaces.ts and the source-candidate register from docs/intelligence/global-pharma-sources-20261117.json. Both are local, non-sensitive metadata; no protected data is shipped.

## On a developer machine

1. Install Node 22.13+ and an Android/iOS build environment as appropriate.
2. Use the committed, isolated `package-lock.json`: run `npm ci --ignore-scripts --no-audit --no-fund` and `npx expo install --check`; review any compatibility findings without silently regenerating the lockfile. Do not bootstrap this isolated app with the root npm/pnpm install.
3. Run npm run typecheck and npm run test:contracts.
4. Run npm start and inspect with Expo Go or an appropriate development build. Real iOS builds/signing require a Mac/Xcode and Apple credentials. Real Android builds require an Android toolchain and signing.
5. Run accessibility/VoiceOver/TalkBack checks, Dynamic Type, text resize, RTL, tablet widths, dark-mode opt-in, offline and low-memory tests before release.

## Portal and Distribution mobile planning navigation — 20 November 2026

The shared Expo research prototype now includes a **private, offline navigation map** for the separate NovaPharm Customer Portal and Distribution workstreams under **More**. It is deliberately explicit about what is not implemented:

- **Customer Portal — 10 planned modules:** Dashboard; My Account; Products; Price Lists; Orders; Invoices; Statements; Delivery Tracking; Documents; Support Tickets.
- **Distribution — 9 planned modules:** Inventory; Batches & FEFO; Quality Assurance; Replenishment; Pick & Pack; Dispatch; Proof of Delivery; Returns; Performance.

Each screen has accessible, responsive module search, module-level detail navigation, required-release prerequisites and a clear *not connected* status. Source: `PrivateOperationsPreviewScreen.tsx`, with `tests/private-portal-distribution-preview.test.mjs` guarding both navigation and the no-network/no-transaction safety boundary.

This is **functional planning navigation**, not a functioning customer portal or warehouse management system. No accounts, invoices, batches, warehouse data or operational services have been integrated. These previews should become operational only after separate identity, source rights, security/quality and device acceptance. Future user-facing Portal and Distribution apps may need separately approved native app identifiers and build profiles; they are not automatically released by the Android preview's private APK profile.

## Private pre-store build profiles — 20 November 2026

We can develop and test before Apple Developer Program enrolment or opening Google Play Console. The committed `eas.json` has **only one pre-store build profile** for Android. **There is no Expo iOS build profile**:

| Profile | Output | Intended use | Store membership required |
| --- | --- | --- | --- |
| `android-private-apk` | installable Android APK | private Android device/emulator testing | No Google Play Console |

The existing Expo app is still **an unconnected NovaPharm Intelligence research prototype**, not a ready customer app. The build profiles do not activate authentication, billing, medical datasets, app submissions or public deployment. There is deliberately no `production` build profile or `submit` configuration. `tests/prestore-build-profiles.test.mjs` checks these non-release boundaries; the existing mobile workflow runs its tests automatically.

### Preparing a private build

1. In this directory, run `npm ci --ignore-scripts --no-audit --no-fund`, `npm run typecheck` and `npm run test:contracts`. The mobile CI performs an offline JavaScript bundle preflight for both platforms. **A JavaScript bundle is not a signed native application.**
2. Before building, choose a company-controlled, unique `expo.android.package` value and review the brand icon/splash/permission settings. Do not invent IDs, insert credentials into Git, or change the owner's release constraints.
3. For Expo-hosted builds, link a user-owned Expo project and approve any build-service usage/costs before running `npx eas-cli build --platform android --profile android-private-apk`. An Expo account and valid project setup may be needed. The separate native Swift iOS app builds with Xcode; there is no supported Expo iOS release profile.
4. For iOS Simulator development, use the new native SwiftUI Xcode project in PR #917; with a free Apple Personal Team, own-device signing remains limited and does not enable TestFlight. Android Studio can compile and test local debug APKs without Play Console.
5. Store actual built artifact hashes, build IDs, device/OS matrices, VoiceOver/TalkBack and keyboard/font-scale results, regression findings and qualified reviewer receipts before advancing the acceptance register. Private APKs still require secure signing/key custody and must never be offered as published/approved apps.

The broader NovaPharm **Customer Portal** (orders, invoices, statements, products, support and authorized account functions) and **Distribution operations** (inventory, batches/FEFO, QA, pick/dispatch/POD) remain **separate planned workstreams**, not live features in this Intelligence app. Reuse the same design system and governed backend contracts where appropriate, but only expose real customer/operational flows after dedicated Cognito mobile OIDC/PKCE, MFA, role/tenant isolation, data rights and service acceptance. The current 22 Intelligence workspaces are UI/source candidates, not 22 production-ready modules. The repository's `productionSignoff: not_granted` and £0 incremental infrastructure cap still apply.

The current navigation is deliberately a research preview: an Overview with six governed pilot journeys, all 22 workspaces, a four-section **Overview / Workspaces / Sources / More** navigation (with research-only **Evidence Review**, **Nova ML research**, and **Enterprise access** and **Model Microscope** under More) covering sparse circuits and Nova ML alignment methods using the shared web/mobile evidence-conflict contract, and a **virtualized**, searchable and region-filtered global source list. The review is manually supplied string comparison, NOT CLIP/OCR inference, sensitive media ingestion, actual product verification or source authorisation. The layout adapts to wider tablets without importing customer records. All 101 source entries carry stable candidate IDs and are marked unapproved/unconnected. Existing read-only web routes are **not** treated as live mobile customer modules. Search filters bundled public candidate metadata only; it does not call regulatory APIs. Enterprise service controls are documented in docs/intelligence/global-source-enterprise-controls-20261117.md.

## Sparse-circuit research preview

The private Expo iOS/Android preview includes a **Research** tab backed by the same `novaMlSparseCircuitAssurance` governance register as the protected web interface. It displays the offline synthetic experiment, explicit nonclinical limitations, and independent release gates. It **does not** load a trained model, execute inference, fetch a server response, access a patient record, authenticate a user, or store data. The research tab is a static source preview, not a shipped mobile feature or clinical/production certification.

## Release blockers

- Approved Intelligence mobile product identity/logo and iOS/Android store identifiers.
- Cognito mobile OIDC client, system-browser Authorization Code + PKCE, verified callback/redirect, optional deep-link handling, fresh MFA, server-issued and revocable tenant-scoped sessions; no WebView login.
- Hardware-backed secure storage policy, session revocation, screenshot/clipboard and diagnostic data review.
- Protected API Gateway per-source access grants with source-specific rights, tenant isolation, quota and immutable audit. No direct mobile calls to regulator APIs.
- First-medicine identity and independently accepted source rights; enforce no licensed, private or health records before acceptance.
- Expo package-lock generated and committed in this isolated directory after compatible dependency install; exact-head build/CI, native Swift iOS and Android simulator/device verification, app signing, official distribution and rollback.

Native/novapharm-intelligence-apple remains a separate Swift Package research prototype. It is not embedded automatically into this Expo app.

Brand tokens follow NovaPharm's light-first white/graphite interface, restrained #E3120B accent and native platform fonts without bundling Apple font binaries.

## Shared representation research and non-release policy

The mobile `MultimodalReviewScreen.tsx` imports the **same** offline research basis as protected web: `src/core/intelligence-multimodal-research-basis.mjs` and the same `intelligence-multimodal-evidence-review.mjs` conflict gate. User-supplied citation positions #1–#22 represent **21 unique papers** (#22 duplicates #15); the research registry groups their engineering implications into seven categories. The source-only app displays this reference count and makes no claim of model execution.

The manually entered, non-sensitive research panel can flag differences in image/text labels, exact product codes, strength, dose form and manufacturer. Its output is **always unverified and not publishable**. All 22 canonical Intelligence workspaces inherit the research-basis version and non-release policy through the shared architecture. The desktop/web and Expo source contracts enforce parity.

Twelve deterministic synthetic probes provide CI regression against misleading text, spoofing, missing consent/provenance, label conflicts and false release claims; they **do not** simulate image attacks or constitute model evaluation. The full [22-reference engineering matrix](../../docs/intelligence/multimodal-22-reference-engineering-matrix-20261118.md) and release-blocker issue #825 govern subsequent licensed datasets, actual image-model benchmarking and iOS/Android on-device verification.

No camera permission, CLIP/ResNet model, OCR, native ML inference, external call, training data, production authentication or patient-data processing is enabled in this source preview.

## Nova ML research preview — 18 November 2026

The **Research** tab reads the existing protected web catalogue from `apps/portal/data/nova-ml-modules.ts` and presents five explicitly unverified research methods: L₀ hard-concrete sparsity, reward-model proxy overoptimisation, critique assistance, instruction conformance and synthetic long-horizon simulation. It also lists the four native-model workspaces as **not enabled**.

No model inference, on-device PyTorch/Core ML/LiteRT, patient data, auth, server API, private evidence, source licences or operational action is performed. No synthetic score is presented as live, and the view does not establish scientific, clinical or commercial validity. Source-only math and governance tests live in PRs #823 and #826; real authorised native inference needs a separately signed and tested app, registered model, data rights and production approval. Run `npm run test:contracts` and the isolated iOS/Android bundle preflight before considering an app build. This is not an app-store release.

## 101-country source coverage (web / Expo iOS / Expo Android)

The Expo **Countries** tab now reads the **exact same immutable, non-sensitive candidate catalogue** as the protected web Data Sources view: `docs/intelligence/country-101-client-catalog-20261118.json`.

The client matrix is generated from the independent 77-country/101-source release ledger plus the 24 additional country research proposals. It contains **101 countries**, **77 countries with one or more original candidate sources**, **24 geography-only country scopes**, and **zero approved/customer-live countries**. The legacy **Sources** tab still presents all 101 original source entries across national (89), EU/EEA (3) and Global (9) labels.

This is bundled public reference **metadata**, not downloaded national medicine datasets. No direct regulator requests, credentials, protected backend authentication, licensed pharmaceutical records, medical recommendations or production deployment were added. The same Expo source runs on both iOS and Android, but **neither mobile binary is signed or distributed**. It is distinct from the separate native Swift/Kotlin research prototypes.

Validate with `node scripts/generate-intelligence-country-client-catalog.mjs --check` and `node --test scripts/test-intelligence-country-client-catalog.mjs` from the repository root. Review privacy, regulatory reuse licences, authentication, tenant isolation, signed app IDs and actual source ingestion before enabling any live API.

## System appearance and legibility — 18 November 2026

The Expo candidate now follows iOS/Android system light and dark appearance using original NovaPharm semantic tokens from `appearance.ts` and React Native `useColorScheme()`. `app.json` selects `userInterfaceStyle: automatic`; the isolated app declares `expo-system-ui` version `~58.0.7` and its config plugin for Android SDK 58 native support. Navigation, status-bar content, source cards, search filters and the offline research review share the same system-responsive palette. The canonical corporate red accent is retained on light canvas; a brighter accessible red variant is used on dark surfaces. System font scaling remains enabled. No raw Apple fonts, SF Symbols, credentials or remote data are introduced.

Source-level WCAG contrast regression checks both palettes, primary/secondary text, placeholders, selected navigation and control borders. These checks do not replace actual iOS/Android dark-mode and enlarged-text device acceptance. Rebuild a native development client after changing the Expo config plugin; source/bundle validation alone does not prove its Android native integration.

Official references: https://developer.apple.com/design/human-interface-guidelines/accessibility and https://developer.apple.com/design/human-interface-guidelines/color ; Expo SDK 58: https://docs.expo.dev/versions/v58.0.0/sdk/system-ui/ and https://docs.expo.dev/develop/user-interface/color-themes/ .

**Safe-area correction:** The Expo candidate now uses `react-native-safe-area-context` `~5.11.1` and a root `SafeAreaProvider` with a native `SafeAreaView` on all four edges, rather than React Native's legacy safe-area component. This is necessary for Android edge-to-edge and iPhone status-bar/notch/home-indicator geometry. Browser/Expo bundle success is not physical-device acceptance. Source: https://docs.expo.dev/versions/v58.0.0/sdk/safe-area-context/ .

## CLIP visual-research workspace (source-only)

The current Expo iOS/Android preview includes a **Visual** research screen and shared `clip-research.ts` contract. It is purposefully visible but disabled: `CLIP_MOBILE_RELEASE.enabled === false`. The prompt cannot be entered or submitted; no session or image data is collected, no native image picker/weights are bundled, and the app makes **no CLIP or external API requests**. The parser independently validates future board-only visual-search responses, discards model-confidence or identity claims and rejects local/private/credentialed source URLs.

The server-side / web and Swift/Kotlin proof-of-concept remains in [CLIP PR #822](https://github.com/NovapharmHealthacre/novapharm-website/pull/822). The Expo app does not automatically embed the Swift Package or Kotlin JVM adapter. Connecting the protected backend requires a reviewed system-browser OIDC authorization code + PKCE/MFA flow, device-bound and revocable session handling, CSRF support, private-runtime readiness and separate legal/quality/security approvals. See [CLIP production acceptance #827](https://github.com/NovapharmHealthacre/novapharm-website/issues/827). Do not mark an Expo bundle as a signed iOS/Android release or as operational CLIP inference.

The preview can be checked without signing or model weights by running `npm run test:contracts`; use Node.js 24 for the zero-dependency TypeScript contract test and follow with `npm run typecheck` and actual-device accessibility acceptance. The isolated package remains unbuilt and unsigned until its application identities, data rights, auth design and release controls are independently accepted.

## Model Microscope research preview

The Inspect tab shares `modelMicroscopeInspectionStages` from `apps/portal/data/nova-ml-modules.ts` with the protected web Intelligence research view. It is not a native inferencing runtime, does not embed an OpenAI Microscope browser, and does not communicate with model internals. The server-side `src/core/ai/model-microscope.mjs` contract is not imported into the client, preventing Node-only authorization and evidence logic from entering mobile bundles. No live model selection or evidence visualisation is advertised.

### Optional synthetic microscope demo

The Inspect tab includes an explicitly labelled, user-initiated, locally computed first-party 4×4 toy-network example. It makes no network request or medicine prediction, uses no private records, and cannot unlock any production model. The same synthetic feature-maximization implementation is used in the protected web preview. Real model inspection still requires separate rights, signed evidence, authenticated services and release gates.

## 24 official research leads (not connected)

The same shared country catalogue now carries a separate `publisherResearchLead` **reference only** for each of the 24 additional geography-only national scopes. Both the protected web country view and the offline Expo Countries tab display the publisher name and why further verification is required. This is not a new source candidate, verified API, commercial reuse licence, medical dataset, national availability record or protected customer feed.

The immutable research references are in `docs/intelligence/country-101-new-24-publisher-research-20261118.json`; their exact country-to-ISO mapping, zero live/rights flags and web/iOS/Android parity are enforced by `scripts/test-intelligence-24-publisher-research.mjs`. No regulator HTTP requests, cookies or authentication are initiated by the Expo app; linking through external source pages in the web UI is ordinary user-directed browsing only. Each country's production ingestion still requires separate legal and technical approval.

## Committed dependency lockfile candidate — 20 November 2026

The **draft PR #889** now includes the exact CI-resolved `package-lock.json` as a **review candidate**, alongside the Expo SDK 58 source scaffold. The isolated CI job requires the checked-in lockfile, checks its package metadata, HTTPS npm-registry-only URLs and SHA-512 integrity, then runs `npm ci --ignore-scripts`, a read-only npm advisory audit that fails on high/critical findings, TypeScript and independent offline iOS and Android JavaScript bundle exports. It **never runs `npm install` or regenerates dependency resolutions**. A seven-day GitHub Actions artifact preserves the checked-in file used by that run. CI does not build signed native binaries or enable live services.

The lockfile came from successful [workflow run 44573070754](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/44573070754) and was inspected and checked into PR #889 without re-resolving versions. It is **245,269 bytes**, SHA-256 `426e3a1b2102a68b0ed38ca01c1e19bd58c3c80adcbd921c08a982dffb98f205`; 503 dependencies plus the root lockfile entry, with 503 SHA-512 integrity values, 503 HTTPS npm-registry URLs and 503 package licence metadata fields. The registry metadata includes 12 MPL-2.0 entries and a dual-licensed `node-forge` entry. Static checks are not proof of current vulnerability status or complete compliance with all licence obligations.

**Reproducibility and security are still pending independent acceptance:** verify the exact SHA and package registry evidence, perform a vulnerability advisory and licence-obligations review, and confirm latest-head `npm ci`, TypeScript and both platform exports succeed with the checked-in file. A committed lockfile improves repeatability of dependency resolution but **does not establish a signed or installed iOS/Android app**, nor provide a mobile authentication flow, protected backend access, licensing permission for medicine data, physical-device accessibility testing or permission for production activation.

## Mobile authentication release hold — 20 November 2026

AWS read-only inventory in eu-north-1 found existing Cognito **web-oriented** code-flow clients, but no separately approved native iOS/Android public client, mobile-owned redirect or signed device acceptance. The staging broker is a confidential client and must not be embedded in mobile apps. A web callback or token-revocation flag cannot substitute for native authorization-code + S256 PKCE validation, MFA, device secure storage, server-revocable tenant-scoped sessions or rights-approved medicine APIs.

The **Enterprise access** screen now uses the in-file `mobileAuthReadiness` catalogue in `App.tsx`: eight immutable, initially unverified evidence gates and explicit `canSignIn: false` / `customerDataEnabled: false` values. This is an **honest disclosure and CI guard**, not a client-side authorizer or a mechanism that can enable login. The Expo app has no login dependencies, no credentials, no callback activation and no network access. Preserve the owner `productionSignoff: not_granted` constraint. Actual integration requires a separate secure backend/client and independent live acceptance; do not bypass the existing AWS protected routing or enable customer access to make a preview appear complete.

