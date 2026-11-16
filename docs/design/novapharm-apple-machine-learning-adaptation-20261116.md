# NovaPharm Intelligence — Apple machine-learning adoption and native integration

**Review date:** 16 November 2026  
**GitHub implementation:** `codex/apple-hig-machine-learning-20261116`  
**Status:** source implementation candidate; NOT production deployed, native compiled or independently accepted.

## Product decision

Build **Nova ML** as a NovaPharm-branded, governed set of four modules in the existing protected Medicines Intelligence platform. Keep the 22 canonical research workspaces unchanged. Treat Apple SDKs as dependencies of a separate signed native companion, not as browser/server packages and never represent Apple Intelligence as owned by NovaPharm. The web portal must not pretend to train an Apple model or use Apple device inference.

| Nova ML module and protected slug | Apple capability | Real source delivered | What is not active |
| --- | --- | --- | --- |
| Nova ML Studio — `nova-ml-studio` | Create ML, model metadata, splitting, evaluation | Protected module, Apple HIG design contracts, fixed-seed Create ML trainer candidate and macOS Swift Package build/test workflow | No signed training app, approved dataset, model, independent holdout or training run |
| Nova Core Runtime — `nova-core-runtime` | Core ML on-device inference | Protected module, model-permit and input-schema-checked Swift adapter | No bundled approved model or live native inference |
| Nova Device Intelligence — `nova-device-intelligence` | Vision/VisionKit, Natural Language, Speech | Protected module, native single-image Vision OCR candidate and permission/data requirements | No live camera, microphone, browser OCR, auto-upload, speech permission or production device runtime activation |
| Nova Generative Assist — `nova-generative-assist` | Foundation Models, App Intents, Writing Tools | Protected module, explicit-request native draft adapter, read-only native app-opening App Intent candidate | No native app, model session in production, installed App Intent, Siri or protected-data access |

The protected routes are:

`/portal/executive-platform/nova-ml/nova-ml-studio/`

`/portal/executive-platform/nova-ml/nova-core-runtime/`

`/portal/executive-platform/nova-ml/nova-device-intelligence/`

`/portal/executive-platform/nova-ml/nova-generative-assist/`

The existing Medicines Intelligence subview addresses remain compatible as protected aliases, but the Nova ML address family is the dedicated entry.

**Isolated web UX:** Nova ML renders its own model-governance toolbar and full-width layout rather than exposing the medical search input, record filters, analytics context rail, medicine-specific notices or medicine-identifier deep-link restoration. The shared navigation and verified portal session remain intact. This prevents an unrelated medicine query from being automatically restored when an authorised user opens a Nova ML route; no ML candidate consumes the medicine search state. Both routes use the same server-side authorization gate.

They resolve through the existing `executive.nhs-data` protected module and server-verifiable session. Do not create public endpoints or bypass current role gating. A web deep link is an implementation path, not evidence that a live deployment contains it.

## Source-by-source Apple guidance review

The duplicate Generative Models URL in the owner list is one source, reviewed once.

| Owner-supplied URL | Scope and what to implement | Status |
| --- | --- | --- |
| https://developer.apple.com/design/human-interface-guidelines/machine-learning | Distinguish critical/complementary, private/public, proactive/reactive; opt-in, calibration, feedback, mistakes, correction, multiple options, attribution, limitations; hide uncalibrated numeric confidence | Web model-readiness contract and source-first/no-claim boundary created; live scenario validation pending |
| https://developer.apple.com/design/human-interface-guidelines/privacy | Purpose-specific data minimisation, clear consent, device processing and permission timing | No collection, training, capture, network inference or persistence in new module; final privacy/legal review pending |
| https://developer.apple.com/documentation/technologyoverviews/ai-machine-learning | Choose system intelligence, native/developer models and appropriate model lifecycle | Platform separation and native candidates added |
| https://developer.apple.com/documentation/technologyoverviews/built-in-intelligence | Vision, VisionKit, Natural Language, Speech and other embedded frameworks | Native Vision OCR, Natural Language and strictly offline, user-file-only Speech candidates; no deployed native host or camera/microphone capture |
| https://developer.apple.com/documentation/technologyoverviews/apple-intelligence | App Intents, app entities, Writing Tools, Siri/Shortcuts/Spotlight, optional images | Native integration path documented; do not claim private data are donated to Siri, or that proprietary Apple services are copied into NI |
| https://developer.apple.com/documentation/technologyoverviews/generative-models | Foundation Models, guided output, Core ML, Core AI and custom models | Native Foundation Models draft candidate; no LLM, server inference or Core AI shipped |
| https://developer.apple.com/documentation/createml | Training, evaluation, model tasks and export | macOS text-classification trainer candidate and testable lifecycle contract |
| https://developer.apple.com/documentation/createml/create-ml-utilties | Apple's original legacy/irregularly spelled URL is titled **Data visualizations** in the live page; useful for training-data visual review, not an API integration prerequisite | Reviewed as training-dataset tooling guidance; no visual model analysis implemented |
| https://developer.apple.com/documentation/createml/detecting-human-actions-in-a-live-video-feed | Vision pose/frame classification sample; live camera permission and high error consequences | **Excluded from initial pharmaceutical web release.** No monitoring of workers, patients, faces or bodies |
| https://developer.apple.com/documentation/createml/recording-or-choosing-training-videos | Video quality, negative examples, diverse positions and consistent capture | Documented as optional future native research only; datasets and lawful purpose absent |
| https://developer.apple.com/documentation/createml/mlcreateerror | Training cancellation, data mutation, parameter mismatch, I/O and type errors | Mapped cancellation, dataset mutation, invalid parameter/type, I/O and generic errors to redacted native failures; device and runtime tests pending |
| https://developer.apple.com/documentation/createml/mlmodelmetadata | Provenance metadata such as author, version, licence and description | Native Create ML export includes author, licence, version and purpose; signed register pending |
| https://developer.apple.com/documentation/createml/mlsplitstrategy | Fixed or automatic split; holdout must be independent and leakage-safe | Fixed-ratio, fixed-seed internal validation via MLSplitStrategy; requires a separate independent holdout CSV and external class-balance/leakage review. Real dataset tests still pending |
| https://developer.apple.com/documentation/coreml | On-device model format, predict, computed hardware, app-bound model lifecycle | Native Swift adapter can load a bundled compiled model under permit and schema checks; no trained artifact shipped |

Apple SDK availability is device-, OS- and region-dependent. Use the currently installed Apple SDK/Xcode to revalidate signatures and test on eligible devices; GitHub source alone does not compile or deploy an Apple application.

**Foundation Models transcript caveat:** Apple's `LanguageModelSession` internally maintains a transcript of prompt/response interactions for the life of the session. The prototype constructs a fresh session per deliberate request and does not save or upload that transcript. This is different from claiming that no in-memory transcript exists. Any native production app must prohibit unapproved persistence, crash-report exposure, diagnostics capture and retained session reuse. See https://developer.apple.com/documentation/foundationmodels/languagemodelsession.

**Core ML provenance gate:** The Core ML adapter checks the bundled model's version and licence metadata against its trusted signed-app permit, in addition to its expected input names. This is not a substitute for independent signed release verification, model-file integrity attestation and app binary signing.

## Apple HIG user-experience acceptance — explicit controls

Each of the four protected Nova ML pages now renders **ten** user-facing requirements for the future signed-app interaction: role, input/privacy, interaction and learning cadence, voluntary feedback, calibration, corrections, attribution, confidence, limitations and manual fallback. These requirements are module-specific and do not imply a model ran.

The role distinction is *complementary*, not essential to pharmaceutical service continuity; interactions are reactive by default. Never infer a user's consent to training from the fact they browsed a page. When a native candidate does operate, require clear source attribution, immediate ability to reject or correct its output, no unsupported probability scores and a reversible source-first fallback. For consequences such as medicines, purchases, customers, access control, medical decisions or regulatory status, the approved workflow must remain human-led.

**Speech:** never ask for microphone access for file-only transcription. Ask for the operating system's Speech recognition permission in context only when needed, use a user-selected local file, and disable the feature when on-device-only recognition is not supported. Do not silently use network recognition, store transcripts, or treat recognizer text as authoritative.
**Natural Language:** keep raw text in the native process, only for approved public excerpts; do not infer a confident language on very short text. Both APIs are candidates pending native application support.
**Video/action classification:** Apple's sample expects a continuously running camera and actual device, but is out of scope for NovaPharm's initial pharmaceutical product. Document the training-video best practices for an optional consented future research study (single participant, complete body, good lighting, varied examples, negative class) without building or activating workplace, patient or employee surveillance.

## Private-only publication guard

The existing `.github/workflows/dispatch-approved-aws-contact-release.yml` is triggered by every main push and otherwise can contact AWS to republish the public contact application. A private Nova ML-only merge does not change that public artifact. The workflow now checks the merge's first-parent changed paths and skips both the AWS contact health request and publication dispatch **only when every change is within the specific protected Portal, Nova ML Swift package, documentation, test or ML CI files (including the guard itself)**. Mixed/public changes follow the existing guarded publisher without relaxation. This prevents unrelated publication and is not a protected Intelligence deployment or Apple-native installation.

## Native package and CI acceptance

`native/novapharm-intelligence-apple/Package.swift` declares a Swift Package with the seven candidate adapters. `Tests/NovaMLAppleTests.swift` exercises unapproved data/model/speech denial before touching an external source, and `.github/workflows/nova-ml-native-apple.yml` requests a macOS GitHub runner to compile the package and run those denial tests.

This **is not** an Xcode app target, signed app, licensed model package, physical-device test, customer installation or live runtime. The CI run must complete successfully; source presence alone is not evidence that the native code compiles. The full permission and privacy impact checklist is at `native/novapharm-intelligence-apple/APP_PRIVACY_CHECKLIST.md`.

## Required validation before release

1. Review accepted lawful basis, copyright/data-use rights, licence, representative dataset and sensitive health-data exclusion for every model.
2. Choose a qualified human owner for each task. No medication recommendation, diagnosis, pharmacovigilance action, stock guarantee, PLPI approval prediction, credit decision, automated supplier rejection or outbound customer contact is granted.
3. Add a signed app project/bundle identifier, identity binding and protected session handoff (Swift Package alone does not provide an app). Native code must not accept a browser-provided approval flag in place of verified authority.
4. Build and sign with current Xcode on macOS. Compile and run real Create ML training on permitted nonpatient data with an independent, leakage-safe test set.
5. Bind model metadata, SHA-256/rights receipts, platform versions, dataset provenance, calibrated quality metrics and a revocable release gate.
6. Test Core ML inference on actual compatible devices for correctness, memory, latency, offline fallback, model removal and account sign-out.
7. Evaluate Foundation Models availability and region/device fallback; every drafted result needs visible source, correction and human approval.
8. Add end-to-end Chromium/WebKit keyboard, VoiceOver, reduced-motion, 320–1440 px responsive and privacy tests to the protected portal; assess whether prompts/queries are ever logged by surrounding infrastructure.
9. Explicitly approve any future Vision/Speech permission usage; never turn on cameras or microphones as part of release by default.
10. Obtain Security, Privacy, Quality, Regulatory and application-owner sign-off; merge only after checks pass, deploy via existing allowed workflow, and separately verify authenticated live sessions and all four route responses.

## Existing AI foundation preserved

The public source-backed search and its browser-side lexical-semantic worker continue to have their own model register and safety boundaries. The protected NOVA internal gateway continues to default to provider `none`. None of this release adds a server-side generative endpoint, changes accepted evidence, moves medicine/customer records across tenants, or alters the canonical 22-workspace completion figures.

## Acceptance and rollback

Run `node --test scripts/test-nova-ml-apple-adaptation.mjs` in CI. Run the existing Portal TypeScript, design system, governance and production readiness suites before a merge. If runtime checks fail, leave the PR open. Roll back by reverting the new route-registration and module UI commits; keep all native candidates behind the independent signed application release gate.
