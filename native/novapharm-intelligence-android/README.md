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
