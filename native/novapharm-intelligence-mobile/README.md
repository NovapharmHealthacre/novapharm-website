# NovaPharm Intelligence — iOS and Android native candidate

**Status:** Source scaffold / private prototype only. Not a signed IPA/APK/AAB, TestFlight, Play Store, App Store, production app, customer launch or data integration. Does not call any API, log in, train a model or store private content.

This independent Expo SDK 58 / React Native project lives in native/ to avoid changing the root package-lock.json, pnpm lock and existing website application deployments. It reads the canonical 22 workspace definitions from apps/portal/data/intelligence-workspaces.ts and the source-candidate register from docs/intelligence/global-pharma-sources-20261117.json. Both are local, non-sensitive metadata; no protected data is shipped.

## On a developer machine

1. Install Node 22.13+ and an Android/iOS build environment as appropriate.
2. From this directory run npm install, then npx expo install --check. Resolve any version mismatch before continuing. Do not use the root npm/pnpm install to bootstrap this isolated app.
3. Run npm run typecheck and npm run test:contracts.
4. Run npm start and inspect with Expo Go or an appropriate development build. Real iOS builds/signing require a Mac/Xcode and Apple credentials. Real Android builds require an Android toolchain and signing.
5. Run accessibility/VoiceOver/TalkBack checks, Dynamic Type, text resize, RTL, tablet widths, dark-mode opt-in, offline and low-memory tests before release.

The current navigation is deliberately a research preview: an Overview with six governed pilot journeys, all 22 workspaces, and a **virtualized**, searchable and region-filtered global source list. The layout adapts to wider tablets without importing customer records. All 101 source entries carry stable candidate IDs and are marked unapproved/unconnected. Existing read-only web routes are **not** treated as live mobile customer modules. Search filters bundled public candidate metadata only; it does not call regulatory APIs. Enterprise service controls are documented in docs/intelligence/global-source-enterprise-controls-20261117.md.

## Release blockers

- Approved Intelligence mobile product identity/logo and iOS/Android store identifiers.
- Cognito mobile OIDC client, system-browser Authorization Code + PKCE, verified callback/redirect, optional deep-link handling, fresh MFA, server-issued and revocable tenant-scoped sessions; no WebView login.
- Hardware-backed secure storage policy, session revocation, screenshot/clipboard and diagnostic data review.
- Protected API Gateway per-source access grants with source-specific rights, tenant isolation, quota and immutable audit. No direct mobile calls to regulator APIs.
- First-medicine identity and independently accepted source rights; enforce no licensed, private or health records before acceptance.
- Expo package-lock generated and committed in this isolated directory after compatible dependency install; exact-head build/CI, iOS and Android simulator/device verification, app signing, official distribution and rollback.

Native/novapharm-intelligence-apple remains a separate Swift Package research prototype. It is not embedded automatically into this Expo app.

Brand tokens follow NovaPharm's light-first white/graphite interface, restrained #E3120B accent and native platform fonts without bundling Apple font binaries.
