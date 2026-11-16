# NovaPharm Intelligence — Apple machine-learning adoption and native integration

**Review date:** 16 November 2026  
**GitHub implementation:** `codex/apple-hig-machine-learning-20261116`  
**Status:** source implementation candidate; NOT production deployed, native compiled or independently accepted.

## Product decision

Build **Nova ML** as a NovaPharm-branded, governed set of four modules in the existing protected Medicines Intelligence platform. Keep the 22 canonical research workspaces unchanged. Treat Apple SDKs as dependencies of a separate signed native companion, not as browser/server packages and never represent Apple Intelligence as owned by NovaPharm. The web portal must not pretend to train an Apple model or use Apple device inference.

| Nova ML module and protected slug | Apple capability | Real source delivered | What is not active |
| --- | --- | --- | --- |
| Nova ML Studio — `nova-ml-studio` | Create ML, model metadata, splitting, evaluation | Protected module, planning checklist, macOS trainer candidate | No signed training app, approved dataset, model, independent holdout or training run |
| Nova Core Runtime — `nova-core-runtime` | Core ML on-device inference | Protected module, model-permit and input-schema-checked Swift adapter | No bundled approved model or live native inference |
| Nova Device Intelligence — `nova-device-intelligence` | Vision/VisionKit, Natural Language, Speech | Protected module, native single-image Vision OCR candidate and permission/data requirements | No camera, microphone, browser OCR or production device permission activation |
| Nova Generative Assist — `nova-generative-assist` | Foundation Models, App Intents, Writing Tools | Protected module, explicit-request native draft adapter, read-only native app-opening App Intent candidate | No native app, model session in production, installed App Intent, Siri or protected-data access |

The protected routes are:

`/portal/executive-platform/nova-ml/nova-ml-studio/`

`/portal/executive-platform/nova-ml/nova-core-runtime/`

`/portal/executive-platform/nova-ml/nova-device-intelligence/`

`/portal/executive-platform/nova-ml/nova-generative-assist/`

The existing Medicines Intelligence subview addresses remain compatible as protected aliases, but the Nova ML address family is the dedicated entry. Both routes use the same server-side authorization gate.

They resolve through the existing `executive.nhs-data` protected module and server-verifiable session. Do not create public endpoints or bypass current role gating. A web deep link is an implementation path, not evidence that a live deployment contains it.

## Source-by-source Apple guidance review

The duplicate Generative Models URL in the owner list is one source, reviewed once.

| Owner-supplied URL | Scope and what to implement | Status |
| --- | --- | --- |
| https://developer.apple.com/design/human-interface-guidelines/machine-learning | Distinguish critical/complementary, private/public, proactive/reactive; opt-in, calibration, feedback, mistakes, correction, multiple options, attribution, limitations; hide uncalibrated numeric confidence | Web model-readiness contract and source-first/no-claim boundary created; live scenario validation pending |
| https://developer.apple.com/design/human-interface-guidelines/privacy | Purpose-specific data minimisation, clear consent, device processing and permission timing | No collection, training, capture, network inference or persistence in new module; final privacy/legal review pending |
| https://developer.apple.com/documentation/technologyoverviews/ai-machine-learning | Choose system intelligence, native/developer models and appropriate model lifecycle | Platform separation and native candidates added |
| https://developer.apple.com/documentation/technologyoverviews/built-in-intelligence | Vision, VisionKit, Natural Language, Speech and other embedded frameworks | Requirements only; no capture or classification without a native host |
| https://developer.apple.com/documentation/technologyoverviews/apple-intelligence | App Intents, app entities, Writing Tools, Siri/Shortcuts/Spotlight, optional images | Native integration path documented; do not claim private data are donated to Siri, or that proprietary Apple services are copied into NI |
| https://developer.apple.com/documentation/technologyoverviews/generative-models | Foundation Models, guided output, Core ML, Core AI and custom models | Native Foundation Models draft candidate; no LLM, server inference or Core AI shipped |
| https://developer.apple.com/documentation/createml | Training, evaluation, model tasks and export | macOS text-classification trainer candidate and testable lifecycle contract |
| https://developer.apple.com/documentation/createml/create-ml-utilties | Apple's original legacy/irregularly spelled URL is titled **Data visualizations** in the live page; useful for training-data visual review, not an API integration prerequisite | Reviewed as training-dataset tooling guidance; no visual model analysis implemented |
| https://developer.apple.com/documentation/createml/detecting-human-actions-in-a-live-video-feed | Vision pose/frame classification sample; live camera permission and high error consequences | **Excluded from initial pharmaceutical web release.** No monitoring of workers, patients, faces or bodies |
| https://developer.apple.com/documentation/createml/recording-or-choosing-training-videos | Video quality, negative examples, diverse positions and consistent capture | Documented as optional future native research only; datasets and lawful purpose absent |
| https://developer.apple.com/documentation/createml/mlcreateerror | Training cancellation, data mutation, parameter mismatch, I/O and type errors | Native Swift typed failure and explicit approval/holdout failure; full parity pending |
| https://developer.apple.com/documentation/createml/mlmodelmetadata | Provenance metadata such as author, version, licence and description | Native Create ML export includes author, licence, version and purpose; signed register pending |
| https://developer.apple.com/documentation/createml/mlsplitstrategy | Fixed or automatic split; holdout must be independent and leakage-safe | Candidate requires separate holdout CSV; real split-policy and group/time validation pending |
| https://developer.apple.com/documentation/coreml | On-device model format, predict, computed hardware, app-bound model lifecycle | Native Swift adapter can load a bundled compiled model under permit and schema checks; no trained artifact shipped |

Apple SDK availability is device-, OS- and region-dependent. Use the currently installed Apple SDK/Xcode to revalidate signatures and test on eligible devices; GitHub source alone does not compile or deploy an Apple application.

## Required validation before release

1. Review accepted lawful basis, copyright/data-use rights, licence, representative dataset and sensitive health-data exclusion for every model.
2. Choose a qualified human owner for each task. No medication recommendation, diagnosis, pharmacovigilance action, stock guarantee, PLPI approval prediction, credit decision, automated supplier rejection or outbound customer contact is granted.
3. Add a signed app project/bundle identifier, identity binding and protected session handoff. Native code must not accept a browser-provided approval flag in place of verified authority.
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
