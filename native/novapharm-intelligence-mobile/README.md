# NovaPharm Intelligence — iOS and Android native candidate

**Status:** Source scaffold / private prototype only. Not a signed IPA/APK/AAB, TestFlight, Play Store, App Store, production app, customer launch or data integration. Does not call any API, log in, train a model or store private content.

This independent Expo SDK 58 / React Native project lives in native/ to avoid changing the root package-lock.json, pnpm lock and existing website application deployments. It reads the canonical 22 workspace definitions from apps/portal/data/intelligence-workspaces.ts and the source-candidate register from docs/intelligence/global-pharma-sources-20261117.json. Both are local, non-sensitive metadata; no protected data is shipped.

## On a developer machine

1. Install Node 22.13+ and an Android/iOS build environment as appropriate.
2. From this directory run npm install, then npx expo install --check. Resolve any version mismatch before continuing. Do not use the root npm/pnpm install to bootstrap this isolated app.
3. Run npm run typecheck and npm run test:contracts.
4. Run npm start and inspect with Expo Go or an appropriate development build. Real iOS builds/signing require a Mac/Xcode and Apple credentials. Real Android builds require an Android toolchain and signing.
5. Run accessibility/VoiceOver/TalkBack checks, Dynamic Type, text resize, RTL, tablet widths, dark-mode opt-in, offline and low-memory tests before release.

The current navigation is deliberately a research preview: an Overview with six governed pilot journeys, all 22 workspaces, an offline **Multimodal Review** tab using the shared web/mobile evidence-conflict contract, and a **virtualized**, searchable and region-filtered global source list. The review is manually supplied string comparison, NOT CLIP/OCR inference, sensitive media ingestion, actual product verification or source authorisation. The layout adapts to wider tablets without importing customer records. All 101 source entries carry stable candidate IDs and are marked unapproved/unconnected. Existing read-only web routes are **not** treated as live mobile customer modules. Search filters bundled public candidate metadata only; it does not call regulatory APIs. Enterprise service controls are documented in docs/intelligence/global-source-enterprise-controls-20261117.md.

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


## New research tab (iOS/Android prototype)

The unsigned Expo application now shares the existing **Research** tab backed by the same read-only `apps/portal/data/nova-signals-research.ts` source register proposed for the protected web ML workspace. The sparse-circuit review remains a separate, offline panel in the same tab. The Signals panel presents fifteen OpenAI study and technology references, supports category filtering, shows each study's NovaPharm application and explicit limitation, and launches original `openai.com` or `cdn.openai.com` references **only after a user taps a link**. No report bytes, CSV data, OpenAI credentials, patient inputs, microphone access, AI inference or GPU workload are included.

This is **not** a live API integration, native iOS/Android app signing, imported Signals dataset or AI assistant. The linked 2026 Signals v3 dictionary enumerates 24 data tables; in the accompanying source-only research candidate only three aggregate tables have a bounded local, non-persistent preview parser, while the other 21 remain metadata-only. The mobile screen displays this limitation without importing data.

`npm run typecheck`, `npm run test:contracts` and offline `npx expo export --platform ios/android` must pass on the exact candidate SHA; then simulator/device accessibility, deep links, outward navigation, performance and signed-store reviews remain separate release gates. Code-level access to original public research does not confer permission to access protected NovaPharm Intelligence or clinical data.

**Release ordering:** this mobile candidate is coordinated with deep-learning infrastructure PR #820 and OpenAI Signals PR #828. Do not merge until the canonical source register, private-only release routing and all shared tests are reconciled on the latest `main`; other in-progress research/mobile PRs may modify the same application.
