# NovaPharm Intelligence — Android sparse-circuit research adapter

This is a **source-only Kotlin candidate**, not an Android app, APK, signed AAB, Play Store submission, running screen, or production integration.

- `NovaSparseCircuitReader.kt` parses a bounded **unverified** server-generated summary for read-only display.
- Uses Android's `org.json`; does not fetch, execute, train or inspect models on-device.
- It is deliberately incapable of granting rights, customer access, AI inference, source ingestion or clinical decisions.
- Do not treat JSON flags as trusted: production integration must bind a response to an authenticated and authorised service session, verify integrity and use server-controlled entitlement checks.
- A real Android Studio/Gradle project, Kotlin/JVM tests, UI, device testing, app signing and release review are **not present here** and must be completed separately.

Contract implementation and boundaries: `../../src/core/intelligence-sparse-circuit-assurance.mjs` and `../../docs/intelligence/SPARSE_CIRCUIT_RESEARCH_INTEGRATION_20261118.md`.
