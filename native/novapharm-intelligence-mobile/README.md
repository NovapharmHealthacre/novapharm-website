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

## 24 official research leads (not connected)

The same shared country catalogue now carries a separate `publisherResearchLead` **reference only** for each of the 24 additional geography-only national scopes. Both the protected web country view and the offline Expo Countries tab display the publisher name and why further verification is required. This is not a new source candidate, verified API, commercial reuse licence, medical dataset, national availability record or protected customer feed.

The immutable research references are in `docs/intelligence/country-101-new-24-publisher-research-20261118.json`; their exact country-to-ISO mapping, zero live/rights flags and web/iOS/Android parity are enforced by `scripts/test-intelligence-24-publisher-research.mjs`. No regulator HTTP requests, cookies or authentication are initiated by the Expo app; linking through external source pages in the web UI is ordinary user-directed browsing only. Each country's production ingestion still requires separate legal and technical approval.

## OpenAI Signals research preview (unsigned iOS/Android Expo candidate)

The **More → Nova ML research** screen now includes a read-only OpenAI Signals research panel alongside existing sparse-circuit and Nova ML workspaces. It uses the same canonical 15-source `apps/portal/data/nova-signals-research.ts` register as protected-web research PR #828: human-readable findings, limitations, categories and original-source links opened only after a user tap. Nothing is downloaded or automatically sent to OpenAI, and no data, patient records, microphones, credentials, models or GPU workloads are activated.

The Signals v3 publisher dictionary describes 24 tables; only three aggregate schemas are candidates for a separate bounded, offline, nonpersistent review under the parent research source work. The remaining 21 are metadata-only. Neither source code nor offline Expo exports prove signed iOS or Android release, store availability, protected-service operation, live data, or clinical acceptance.

Release ordering: PR #820 is a merged infrastructure foundation; PR #828 is the prerequisite research source candidate. Reconcile PR #832 with the latest #828 and `main`, require exact-head CI (TypeScript, mobile contracts, offline iOS/Android bundles, CodeQL and Chromium/WebKit), and independently verify publisher routing and signed-device acceptance before any release. No AWS/cloud provisioning or additional spend is authorized.
