# NovaPharm Intelligence Android — CLIP and compute-admission source adapters

**Status: source candidate only; disabled by default.** This directory now contains a Gradle **Kotlin/JVM testable library** and fail-closed unit tests. It does **not** contain an Android application module, APK, manifest, signed package, Play Store release, approved identity bridge, authorised model, or production server.

The `NovaClipVisualSearch.kt` adapter uses `https://portal.novapharmhealthcare.com/gateway/v1/intelligence/visual/search` exclusively and accepts only signed-app-managed sessions from the existing protected portal architecture. It denies redirects, limits input and response sizes, validates request/cookie material and returns unverified image candidates only.

To test the Kotlin code locally with a Gradle 8.14.3 installation and JDK 17:

```sh
gradle -p native/novapharm-intelligence-android test --no-daemon
```

The GitHub `Intelligence CLIP research contract` job runs this build, separately from native Apple package tests. JVM compilation does **not** prove that Android signing, Play distribution, device TLS policies, live Cognito identity, CSRF refresh or secure cookie storage are complete. A real app must establish those lifecycle controls before passing any user session to the adapter.

No camera permission, model weights, patient/medical imagery, private supplier files, background capture or third-party model host is permitted. The model server remains OFF unless a separate, independently verified and legally cleared private research pilot is approved. See `services/clip/README.md` and `docs/intelligence/visual-search-cross-platform-contract.json`.


## Compute-admission candidate (review only)

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
