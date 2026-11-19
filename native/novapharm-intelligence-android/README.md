# NovaPharm Intelligence — Android sparse-circuit research prototype

**Status: offline Android application prototype, not a production NovaPharm app.** This prototype contains no model, real pharmaceutical data, patient information, sign-in, network permission, licensed source data or production API. An Android debug build is not a signed Play Store release or customer service.

## Implementation

- `app/src/main/java/com/novapharm/intelligence/research/NovaSparseCircuitReader.kt` — bounded, exact-schema JSON parser for an independently supplied **unverified** research summary. It denies unknown fields, forged production/clinical flags, invalid IDs, counts or non-finite metrics.
- `app/src/main/java/com/novapharm/intelligence/research/NovaSparseCircuitResearchScreen.kt` — accessible read-only Android View with NovaPharm's restrained white/graphite visual hierarchy, research disclaimer and no automatic data capture.
- `app/src/main/java/com/novapharm/intelligence/research/NovaResearchActivity.kt` — offline launcher showing the **no evidence connected** state. It intentionally does not fetch a summary.
- `app/src/main/AndroidManifest.xml` — no INTERNET, camera, audio, location or storage permissions; backups and cleartext disabled.
- `app/src/test/java/com/novapharm/intelligence/research/NovaSparseCircuitReaderTest.kt` — parser and authority-forgery denial tests.
- `.github/workflows/nova-sparse-circuit-android.yml` — pinned-toolchain CI intended to build and test the research-only debug APK.

From a development machine with Android SDK 35, Gradle 8.9 and JDK 17, use:

```sh
cd native/novapharm-intelligence-android
gradle --no-daemon :app:testDebugUnitTest :app:assembleDebug
```

The Android build uses Android Gradle Plugin 8.7.3 and Kotlin 2.0.21 as explicitly versioned compatibility baselines. A trusted developer must run physical device and accessibility tests and review the toolchain before distribution. Do not publish this demonstration package under the production app's identity.

## Future production integration

A signed NovaPharm Intelligence Android app must provide independently authenticated, revocable, server-owned tenant and source permissions; it must verify a versioned service response over TLS, supply explicitly authorised research summaries to the view, and support user correction and abandonment without storing private research records. This prototype intentionally does none of those operations. JSON fields are **not authorisation** and a structurally valid summary is **not causal verification**. There is no built-in model weight access or inference.

Corresponding shared web research contract: `../../src/core/intelligence-sparse-circuit-assurance.mjs`. Research analysis and release gates: `../../docs/intelligence/SPARSE_CIRCUIT_RESEARCH_INTEGRATION_20261118.md`.

## Separate compute-admission Kotlin policy adapter

The directory also includes a non-executing standalone Kotlin compute-admission adapter independent of the Gradle research shell. It does not activate compute, upload information or authorize customer services.

The file `NovaComputePlan.kt` checks candidate workload metadata against bounded resources, region, privacy and estimated cost. Its only positive result is `review-only`; `executionEnabled` is always `false`. It does **not** upload data, train models, access the camera, authenticate a user, manage cloud credentials, make clinical decisions or schedule jobs.

Compile and execute standalone local denial tests with a compatible Kotlin/JDK toolchain:

```sh
kotlinc native/novapharm-intelligence-android/NovaComputePlan.kt \
  native/novapharm-intelligence-android/NovaComputePlanTest.kt \
  -include-runtime -d /tmp/novapharm-android-compute-tests.jar
java -jar /tmp/novapharm-android-compute-tests.jar
```

The signed future Android application must integrate this candidate with its own authenticated API client, Android application lifecycle, device tests, release/Play Store signing, accessibility and local secure storage. Client validation is never an authorization boundary; job approval and budget limits belong to a trusted backend. No billable cloud infrastructure is provisioned.

See `docs/architecture/deep-learning-infrastructure-20261118.md` for architecture and deployment gates.

## Offline L0 hard-concrete reference math

Offline Kotlin test (with a separately installed Kotlin compiler):

```sh
kotlinc native/novapharm-intelligence-android/src/main/kotlin/com/novapharm/intelligence/ml/NovaL0ResearchMath.kt native/novapharm-intelligence-android/src/test/kotlin/com/novapharm/intelligence/ml/NovaL0ResearchMathTest.kt -include-runtime -d /tmp/nova-l0-test.jar
java -jar /tmp/nova-l0-test.jar
```

## Research candidate schema

The Kotlin source also contains `NovaL0ResearchCandidate.score` for deterministic testing of the same versioned sparse-linear artifact consumed by the TypeScript and Swift research sources. This offline function rejects wrong feature keys, duplicate or malformed names, non-finite values, incorrect nonzero counts and any claim of production or customer activation. It is **not** an Android ML runtime, signed app, LiteRT conversion, or user-facing prediction feature. Test with synthetic vector: demand=5, stock=99, lead_time=4; coefficients=(2,0,2), bias=3; expected score=21.

This separate Kotlin research-only scorer does not activate a model, access pharmaceutical data, change the standalone sparse-circuit Android prototype or constitute a signed customer release. Device benchmarks, licence review and independent quality approval remain mandatory.

## Separate offline alignment receipt

The independent `src/main/kotlin/com/novapharm/intelligence/ml/NovaAlignmentResearchReceipt.kt` test candidate is source-only and is not wired to the Android sparse-circuit application. It is a deterministic denial contract, not a production model, data-rights check or signed Android service. See `ALIGNMENT_RESEARCH_README.md` for synthetic tests and independent approval gates.

## Android HIG-inspired adaptive appearance and edge-to-edge correction — 19 November 2026

The offline Android research shell previously declared a permanently light `Theme.Material.Light.NoActionBar` and rendered fixed white canvas / graphite text irrespective of Android Dark Theme. On Android 15, edge-to-edge can also put content behind status/navigation bars without window-inset handling.

The candidate now selects an **original NovaPharm** `NovaResearchTheme` in `res/values/styles.xml` and `res/values-night/styles.xml`, with matching `colors.xml` palettes: light canvas `#FFFFFF`, primary text `#1D1D1F`, secondary text `#424245`, brand red `#E3120B`; dark canvas `#1C1C1E`, primary text `#F5F5F7`, secondary text `#D1D1D6`, readable dark red `#FF6961`. These are original color values, not an Apple font, symbols or Android copy of a UIKit API. The native Activity can be recreated on system-appearance changes; no `configChanges` override suppresses that behaviour.

The read-only `ScrollView` now receives actual system-bar insets with the API 30+ `WindowInsets.Type.systemBars()` contract and an Android 26–29 fallback. Text remains user-scalable SP and accessibility headings are preserved. No INTERNET or sensitive permissions, runtime model service, customer records, or production connection have been added.

The JVM `NovaHigAppearanceContractTest.kt` checks day/night color consistency, 4.5:1 canvas-to-foreground contrast, resource theme pairing, native system-inset handling and offline safety as part of the existing `gradle :app:testDebugUnitTest :app:assembleDebug` job. **This is source and debug-build verification only.** Real Android devices across light/dark toggles, gesture/three-button navigation, landscape, 200% font scaling, TalkBack and Android 15 edge-to-edge still require independent acceptance. No signed Play Store distribution, identity backend, or live pharmaceutical data is implied.
