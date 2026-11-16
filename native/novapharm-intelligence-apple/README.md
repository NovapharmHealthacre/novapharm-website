# Nova ML — Apple native companion candidate

These files are **source prototypes** to be incorporated into a future independently signed iOS/macOS NovaPharm Intelligence companion. They are not a Swift Package, Xcode project, App Store binary, server service or current website runtime.

* `NovaCreateMLTrainer.swift`: macOS training with approved CSV datasets, an independent holdout and `MLModelMetadata`. It rejects missing approvals and unaccepted holdout error; no example dataset or automatic training included.
* `NovaCoreMLRuntime.swift`: loads only a compiled, bundled `.mlmodelc` named in the trusted application release manifest. It checks the model version, licence metadata and accepted input schema before making an on-device prediction.
* `NovaFoundationModelsAssist.swift`: on eligible Apple Intelligence devices, prepares a text rewrite candidate only for a deliberately supplied approved public excerpt. No app-managed network inference, automated publication, private document retrieval or transcript persistence. **Foundation Models keeps an in-memory transcript for each live `LanguageModelSession`**; the candidate creates one session per request and does not persist or submit its transcript.
* `NovaDocumentIntelligence.swift`: on-device Vision text recognition of one explicitly selected, approved, non-sensitive image. OCR results must always be verified against the original.
* `NovaResearchAppIntent.swift`: read-only App Intent that can foreground a signed app. It never exports authorised research records to Siri, Shortcuts or Spotlight.

**Do not ship these candidates directly.** The trusted app still needs signed app configuration, revocable session binding, privacy/rights attestation and Xcode/device compilation and tests. The model training permit and source approval inputs in the examples must come from trusted audited application services, not client-request booleans. Do not store an input, transcript or output unless its purpose, permissions and retention are separately approved.

Use [Apple Create ML](https://developer.apple.com/documentation/createml), [Core ML](https://developer.apple.com/documentation/coreml), and [Foundation Models](https://developer.apple.com/documentation/foundationmodels) in the signed application. Apple Intelligence remains an Apple service; Nova ML is NovaPharm's own product architecture.
