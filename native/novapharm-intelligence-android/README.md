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
