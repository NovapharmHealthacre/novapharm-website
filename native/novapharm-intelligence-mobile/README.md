# NovaPharm Intelligence — iOS and Android native candidate

**Status:** Source scaffold / private prototype only. Not a signed IPA/APK/AAB, TestFlight, Play Store, App Store, production app, customer launch or data integration. Does not call any API, log in, train a model or store private content.

This independent Expo SDK 58 / React Native project lives in native/ to avoid changing the root package-lock.json, pnpm lock and existing website application deployments. It reads the canonical 22 workspace definitions from apps/portal/data/intelligence-workspaces.ts and the source-candidate register from docs/intelligence/global-pharma-sources-20261117.json. Both are local, non-sensitive metadata; no protected data is shipped.

## On a developer machine

1. Install Node 22.13+ and an Android/iOS build environment as appropriate.
2. From this directory run npm install, then npx expo install --check. Resolve any version mismatch before continuing. Do not use the root npm/pnpm install to bootstrap this isolated app.
3. Run npm run typecheck and npm run test:contracts.
4. Run npm start and inspect with Expo Go or an appropriate development build. Real iOS builds/signing require a Mac/Xcode and Apple credentials. Real Android builds require an Android toolchain and signing.
5. Run accessibility/VoiceOver/TalkBack checks, Dynamic Type, text resize, RTL, tablet widths, dark-mode opt-in, offline and low-memory tests before release.

The current navigation is deliberately a research preview: an Overview with six governed pilot journeys, all 22 workspaces, a four-section **Overview / Workspaces / Sources / More** navigation (with research-only **Evidence Review**, **Nova ML research**, and **Enterprise access** under More) covering sparse circuits and Nova ML alignment methods using the shared web/mobile evidence-conflict contract, and a **virtualized**, searchable and region-filtered global source list. The review is manually supplied string comparison, NOT CLIP/OCR inference, sensitive media ingestion, actual product verification or source authorisation. The layout adapts to wider tablets without importing customer records. All 101 source entries carry stable candidate IDs and are marked unapproved/unconnected. Existing read-only web routes are **not** treated as live mobile customer modules. Search filters bundled public candidate metadata only; it does not call regulatory APIs. Enterprise service controls are documented in docs/intelligence/global-source-enterprise-controls-20261117.md.

## Sparse-circuit research preview

The private Expo iOS/Android preview includes a **Research** tab backed by the same `novaMlSparseCircuitAssurance` governance register as the protected web interface. It displays the offline synthetic experiment, explicit nonclinical limitations, and independent release gates. It **does not** load a trained model, execute inference, fetch a server response, access a patient record, authenticate a user, or store data. The research tab is a static source preview, not a shipped mobile feature or clinical/production certification.

## Release blockers

- Approved Intelligence mobile product identity/logo and iOS/Android store identifiers.
- Cognito mobile OIDC client, system-browser Authorization Code + PKCE, verified callback/redirect, optional deep-link handling, fresh MFA, server-issued and revocable tenant-scoped sessions; no WebView login.
- Hardware-backed secure storage policy, session revocation, screenshot/clipboard and diagnostic data review.
- Protected API Gateway per-source access grants with source-specific rights, tenant isolation, quota and immutable audit. No direct mobile calls to regulator APIs.
- First-medicine identity and independently accepted source rights; enforce no licensed, private or health records before acceptance.
- Expo package-lock generated and committed in this isolated directory after compatible dependency install; exact-head build/CI, iOS and Android simulator/device verification, app signing, official distribution and rollback.

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

## System appearance and legibility — 18 November 2026

The Expo candidate now follows iOS/Android system light and dark appearance using original NovaPharm semantic tokens from `appearance.ts` and React Native `useColorScheme()`. `app.json` selects `userInterfaceStyle: automatic`; the isolated app declares `expo-system-ui` version `~58.0.7` and its config plugin for Android SDK 58 native support. Navigation, status-bar content, source cards, search filters and the offline research review share the same system-responsive palette. The canonical corporate red accent is retained on light canvas; a brighter accessible red variant is used on dark surfaces. System font scaling remains enabled. No raw Apple fonts, SF Symbols, credentials or remote data are introduced.

Source-level WCAG contrast regression checks both palettes, primary/secondary text, placeholders, selected navigation and control borders. These checks do not replace actual iOS/Android dark-mode and enlarged-text device acceptance. Rebuild a native development client after changing the Expo config plugin; source/bundle validation alone does not prove its Android native integration.

Official references: https://developer.apple.com/design/human-interface-guidelines/accessibility and https://developer.apple.com/design/human-interface-guidelines/color ; Expo SDK 58: https://docs.expo.dev/versions/v58.0.0/sdk/system-ui/ and https://docs.expo.dev/develop/user-interface/color-themes/ .

**Safe-area correction:** The Expo candidate now uses `react-native-safe-area-context` `~5.11.1` and a root `SafeAreaProvider` with a native `SafeAreaView` on all four edges, rather than React Native's legacy safe-area component. This is necessary for Android edge-to-edge and iPhone status-bar/notch/home-indicator geometry. Browser/Expo bundle success is not physical-device acceptance. Source: https://docs.expo.dev/versions/v58.0.0/sdk/safe-area-context/ .
