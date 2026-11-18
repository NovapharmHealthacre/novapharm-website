# Nova ML Android research adapter — not an Android application

This folder contains a **pure Kotlin hard-concrete reference implementation** and a dependency-free synthetic test. There is no Android Studio project, Gradle application, Android package, release signing, Play Store build, embedded pharmaceutical model, trained weights or customer-facing interface in this repository. This source **must not be represented as an installed or live Android app**.

Use after connecting an independently reviewed NovaPharm Intelligence Android app repository and its signed release manifest:

1. Keep model training in an approved, private, audited training workflow; do not train or accept models from untrusted app input.
2. For Android on-device inference, evaluate Google's current [LiteRT guidance](https://developer.android.com/ai/custom) and approved conversion/quantisation. The Kotlin reference math alone is **not** LiteRT inference, a trained model or proof of latency benefit.
3. Require signed model identity/version, verified source licences and rights, immutable feature schema and preprocessing, tenant-scoped access to sensitive business features, provenance, temporal holdout, subgroup tests, drift alarms and revocation.
4. Benchmark actual CPU/GPU/NPU devices against a dense baseline. Unstructured weight zeros **do not guarantee** speedups; structured feature/channel sparsity and supported deployment kernels are preferred.
5. Keep feature disabled and customer-facing prediction calls unavailable until independent model, security, privacy, regulatory and product approval. For clinical/safety decisions, a separate regulated-system assessment is required.

Offline Kotlin test (with a separately installed Kotlin compiler):

```sh
kotlinc native/novapharm-intelligence-android/src/main/kotlin/com/novapharm/intelligence/ml/NovaL0ResearchMath.kt native/novapharm-intelligence-android/src/test/kotlin/com/novapharm/intelligence/ml/NovaL0ResearchMathTest.kt -include-runtime -d /tmp/nova-l0-test.jar
java -jar /tmp/nova-l0-test.jar
```

## Research candidate schema

The Kotlin source also contains `NovaL0ResearchCandidate.score` for deterministic testing of the same versioned sparse-linear artifact consumed by the TypeScript and Swift research sources. This offline function rejects wrong feature keys, duplicate or malformed names, non-finite values, incorrect nonzero counts and any claim of production or customer activation. It is **not** an Android ML runtime, signed app, LiteRT conversion, or user-facing prediction feature. Test with synthetic vector: demand=5, stock=99, lead_time=4; coefficients=(2,0,2), bias=3; expected score=21.

## Compute-admission research candidate

This directory contains **Kotlin source only**, not a Gradle/Android project or a signed Android application. It is an initial portable Android policy adapter based on the shared non-executing Nova ML compute contract.

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
