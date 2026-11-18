# NovaPharm Intelligence Android — CLIP visual research adapter

**Status: source candidate only; disabled by default.** This directory now contains a Gradle **Kotlin/JVM testable library** and fail-closed unit tests. It does **not** contain an Android application module, APK, manifest, signed package, Play Store release, approved identity bridge, authorised model, or production server.

The `NovaClipVisualSearch.kt` adapter uses `https://portal.novapharmhealthcare.com/gateway/v1/intelligence/visual/search` exclusively and accepts only signed-app-managed sessions from the existing protected portal architecture. It denies redirects, limits input and response sizes, validates request/cookie material and returns unverified image candidates only.

To test the Kotlin code locally with a Gradle 8.14.3 installation and JDK 17:

```sh
gradle -p native/novapharm-intelligence-android test --no-daemon
```

The GitHub `Intelligence CLIP research contract` job runs this build, separately from native Apple package tests. JVM compilation does **not** prove that Android signing, Play distribution, device TLS policies, live Cognito identity, CSRF refresh or secure cookie storage are complete. A real app must establish those lifecycle controls before passing any user session to the adapter.

No camera permission, model weights, patient/medical imagery, private supplier files, background capture or third-party model host is permitted. The model server remains OFF unless a separate, independently verified and legally cleared private research pilot is approved. See `services/clip/README.md` and `docs/intelligence/visual-search-cross-platform-contract.json`.
