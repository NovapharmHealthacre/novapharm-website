# Nova ML Apple companion — native privacy and release checklist

**Status: candidate only. No signed native application is currently shipped.**
This package must not process medicine, patient, employee, customer or tenant records, nor operate unattended.

| Native capability | Default / permission | Release requirement |
| --- | --- | --- |
| Create ML trainer | Disabled. macOS approved local CSVs only. | Recorded rights, purpose, class balance, separate leakage-reviewed holdout, deterministic validation seed and per-class performance review; human release gate. |
| Core ML | No model bundled by default. No endpoint. | Verified signed-app model manifest, model/rights metadata, approved feature schema, real-device testing, model revocation and fallback. |
| Vision OCR | Explicitly selected public image only. | Independently approved provenance, no sensitive imagery, human confirmation of extracted text and discard. |
| Natural Language | Explicit public text only; no system permission. | Approved source; limited excerpt length; avoid certainty claims for short text; no app-managed persistence. |
| Speech | **Only selected local prerecorded audio**; never live microphone. | Show purpose and system Speech prompt at the point of use, require `NSSpeechRecognitionUsageDescription`, fail closed when `supportsOnDeviceRecognition` is false, set `requiresOnDeviceRecognition = true`, cancel task on demand, compare transcript with recording. |
| Foundation Models | Candidate requires supported/eligible device; user asks each time. | Approved public prompt, per-request session, no app-managed persistence of in-memory transcript, external tools disabled, human accept/reject and source comparison. |
| App Intents | Read-only app open action, without sensitive entities. | Bound installed-app login and workspace authorization; never donate protected patient, corporate or account content to system services. |
| Camera/action classifier | No camera permission, no active capture. | Separate purpose, consent, negative examples, privacy impact assessment and signed research-only release if ever proposed. |

**Native host duties:** independently authenticated owner roles and short-lived scoped access; protect security-scoped document bookmarks; revoke file access; disclose what processes locally; specify permitted retention; no diagnostic capture of source text, audio or model prompts; redact errors; respect system permission revocation; support explicit deletion, cancel and sign-out; review accessibility, performance, battery, offline behavior, localization and device availability. No network fallback is permitted by these candidates.

**Verification:** CI macOS SwiftPM build/tests are compile-and-boundary checks only. They do not prove a real model was trained, signed, installed, licensed or evaluated. Xcode/device, privacy and regulatory approvals remain required before any App Store or enterprise distribution.
