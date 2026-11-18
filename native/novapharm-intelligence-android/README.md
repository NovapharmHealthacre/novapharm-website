# NovaPharm Intelligence — Android Kotlin integration candidate

This directory contains **Kotlin source only**, not a Gradle/Android project or a signed Android application. It is an initial portable Android policy adapter based on the shared non-executing Nova ML compute contract.

The file \`NovaComputePlan.kt\` checks candidate workload metadata against bounded resources, region, privacy and estimated cost. Its only positive result is \`review-only\`; \`executionEnabled\` is always \`false\`. It does **not** upload data, train models, access the camera, authenticate a user, manage cloud credentials, make clinical decisions or schedule jobs.

Compile and execute standalone local denial tests with a compatible Kotlin/JDK toolchain:

\`\`\`sh
kotlinc native/novapharm-intelligence-android/NovaComputePlan.kt \
  native/novapharm-intelligence-android/NovaComputePlanTest.kt \
  -include-runtime -d /tmp/novapharm-android-compute-tests.jar
java -jar /tmp/novapharm-android-compute-tests.jar
\`\`\`

The signed future Android application must integrate this candidate with its own authenticated API client, Android application lifecycle, device tests, release/Play Store signing, accessibility and local secure storage. Client validation is never an authorization boundary; job approval and budget limits belong to a trusted backend. No billable cloud infrastructure is provisioned.

See \`docs/architecture/deep-learning-infrastructure-20261118.md\` for architecture and deployment gates.
