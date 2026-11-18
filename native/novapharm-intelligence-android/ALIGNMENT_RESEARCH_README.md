# Nova ML alignment research source for Android

**Source-only / not an Android application.** This folder includes `NovaAlignmentResearchReceipt.kt`, a Kotlin validator for display of offline, unverified four-study research results, and a standalone synthetic smoke test. No Gradle app, installed package, signed APK/AAB, LiteRT runtime, user authentication, permissions, datasets, cloud endpoint or Play Store release is included.

The current research IDs match `src/core/ai/nova-alignment-research.mjs`: `reward_proxy_sweep`, `critique_assistance`, `instruction_conformance`, `offline_multiagent_scenario_scoreboard`. A receipt can be displayed only when it is explicitly marked nonproduction, customer-invisible, unverified as independent ground truth and unverified as to source rights. These **negative flags cannot confer authority**.

With an independently provisioned Kotlin compiler and JDK:

```sh
kotlinc native/novapharm-intelligence-android/src/main/kotlin/com/novapharm/intelligence/ml/NovaAlignmentResearchReceipt.kt native/novapharm-intelligence-android/src/test/kotlin/com/novapharm/intelligence/ml/NovaAlignmentResearchReceiptTest.kt -include-runtime -d /tmp/nova-alignment-test.jar
java -jar /tmp/nova-alignment-test.jar
```

Before a real Android app may consume any research data: build a Gradle/Android Studio host, bind app-level trusted session and role scopes, independently verify rights and immutable model/dataset versions, prohibit private patient data by default, perform real device/instrumented/accessibility and security tests, sign a release and verify rollback. An offline scientific receipt is never a prediction API or automatic pharmacy operation.

See `docs/intelligence/NOVA_AI_ALIGNMENT_RESEARCH_20261118.md` and existing blocked release issue #824.
