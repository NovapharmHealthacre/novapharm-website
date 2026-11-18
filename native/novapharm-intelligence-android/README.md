# NovaPharm Intelligence Android visual retrieval candidate

This is Kotlin **source only**, not an Android application, Gradle project, APK, Play Store build or active production integration.

`NovaClipVisualSearch.kt` calls the existing private Portal BFF only after a trusted app-managed authenticated session has been established. It includes no model weights, no camera permission, no inference credentials and no analytics or persistence. The calling application must provide secure authentication, CSRF/session lifecycle, transport security, coroutine dispatching, cancellation, UI, accessible attribution, revoked-session handling and real-device tests.

The API is disabled by default, limited to approved public product-image research and requires human verification. Do not pass patient photos, prescriptions or supplier/private records. Read `services/clip/README.md` and `docs/intelligence/OPENAI_CLIP_CROSS_PLATFORM_RESEARCH_20261118.md` before considering a private research pilot.
