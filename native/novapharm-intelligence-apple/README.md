# Nova ML — Apple native companion candidate

These files are **source prototypes packaged as an Apple Swift Package** for macOS/Xcode compile and denial tests. This is **not** a signed iOS/macOS app, distributable binary, App Store submission, server service or active website runtime. No model, user data or application entitlements are included.

Run `swift test --package-path native/novapharm-intelligence-apple` from a **macOS machine with Xcode**. The dedicated GitHub macOS workflow runs compile and fail-closed unit tests. It does not validate real devices, app signing, the Apple Intelligence eligible-device requirement or any model quality.

* `NovaCreateMLTrainer.swift`: macOS training with approved CSV datasets, a fixed-seed `MLSplitStrategy` validation split, an independent holdout, error sanitisation for `MLCreateError` and `MLModelMetadata`. It rejects missing approvals and unaccepted holdout error; no example dataset or automatic training included.
* `NovaCoreMLRuntime.swift`: loads only a compiled, bundled `.mlmodelc` named in the trusted application release manifest. It checks the model version, licence metadata and accepted input schema before making an on-device prediction.
* `NovaFoundationModelsAssist.swift`: on eligible Apple Intelligence devices, prepares a text rewrite candidate only for a deliberately supplied approved public excerpt. No app-managed network inference, automated publication, private document retrieval or transcript persistence. **Foundation Models keeps an in-memory transcript for each live `LanguageModelSession`**; the candidate creates one session per request and does not persist or submit its transcript.
* `NovaDocumentIntelligence.swift`: on-device Vision text recognition of one explicitly selected, approved, non-sensitive image. OCR results must always be verified against the original.
* `NovaLanguageIntelligence.swift`: local Natural Language recognition and word tokenization of a separately approved public excerpt. Rejects unapproved or oversized inputs; withholds guessed language for short snippets. No raw text is retained by this adapter.
* `NovaSpeechIntelligence.swift`: opt-in Speech transcription of one user-picked local audio file only, after the system Speech authorization is already granted. Enforces `supportsOnDeviceRecognition` and `requiresOnDeviceRecognition = true`; rejects any language/device combination that needs network recognition. The calling app must cancel the returned `SFSpeechRecognitionTask` when requested and must never auto-save a transcript.
* `NovaResearchAppIntent.swift`: read-only App Intent that can foreground a signed app. It never exports authorised research records to Siri, Shortcuts or Spotlight.

See [APP_PRIVACY_CHECKLIST.md](APP_PRIVACY_CHECKLIST.md) for native permission, retention, revocation, application governance and Xcode test requirements.

**Do not ship these candidates directly.** The trusted app still needs signed app configuration, revocable session binding, privacy/rights attestation and Xcode/device compilation and tests. The model training permit and source approval inputs in the examples must come from trusted audited application services, not client-request booleans. Do not store an input, transcript or output unless its purpose, permissions and retention are separately approved.

Use [Apple Create ML](https://developer.apple.com/documentation/createml), [Core ML](https://developer.apple.com/documentation/coreml), and [Foundation Models](https://developer.apple.com/documentation/foundationmodels) in the signed application. Apple Intelligence remains an Apple service; Nova ML is NovaPharm's own product architecture.
