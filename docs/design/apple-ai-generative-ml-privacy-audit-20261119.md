# NovaPharm Intelligence — Apple Generative AI, Machine Learning and Privacy implementation audit

**Source checkpoint:** 19 November 2026; repository `NovapharmHealthacre/novapharm-website`. This review records source-visible facts and gaps, not production certification, an Apple endorsement, or independent clinical validation.

## Source separation

- Public NovaPharm AI Search uses deterministic, extractive **approved published** evidence and a user-enabled browser-local sparse-vector retrieval worker. There is no public generative model or external inference by default (`src/ai/model-registry.mjs`, `src/ai/search-controller.mjs`, `src/ai/privacy-guard.mjs`). A vector similarity score is not calibrated certainty.
- The protected **Nova ML Studio, Nova Core Runtime, Nova Device Intelligence, and Nova Generative Assist** workspaces in `apps/portal/components/nova-ml-workspaces.tsx` and `apps/portal/data/nova-ml-modules.ts` are designed and guarded research previews; adding source paths does not verify protected deployment, real model training, patient-data rights, or native host app availability.
- `native/novapharm-intelligence-apple/` includes Create ML/Core ML/Vision/Natural Language/Speech/Foundation Models research adapters; `native/novapharm-intelligence-mobile/` includes Expo previews. No signed, installed and tested Apple application or approved model artifact was found from these source files.
- `docs/ai-model-register.json`, `docs/ai-use-case-register.json`, `docs/ai-risk-register.md` and `docs/ai-system-card.md` supply governance foundations but are not proof of model operation.
- Prior source releases: PRs #770, #782, #784 and the HIG acceptance program #875, #877, #878, #879. Do not confuse merged source, workflow success, deployed origin, protected authenticated behaviour or signed device distribution.

## Official Apple material: applicability and remaining work

| Official page | Web and Intelligence decision | Native iOS/macOS decision | Evidence / open gate |
| --- | --- | --- | --- |
| [Generative AI](https://developer.apple.com/design/human-interface-guidelines/generative-ai.md) | Disclose generated vs extractive content; allow edit, reject, retry, original-source fallback; require human approval for consequential actions | Request-only eligible-device Foundation Models; do not automate clinical/financial decisions | Draft adapter exists, no operational verified UI/real-device evaluations |
| [Machine learning](https://developer.apple.com/design/human-interface-guidelines/machine-learning.md) | Clear model role and limits; show provenance, optional feedback, calibration and alternatives | Holdout, drift, rights, inference latency, error and fairness evaluation | Source contracts exist; independently measured quality and release sign-off missing |
| [Privacy](https://developer.apple.com/design/human-interface-guidelines/privacy.md) | No private model prompts sent to third parties; minimise transient query handling and expose opt-out | Purpose-specific system permissions, on-device where possible, native privacy manifest review | Browser search lifecycle hardening proposed here; full data-flow and legal review missing |
| [AI and machine learning overview](https://developer.apple.com/documentation/technologyoverviews/ai-machine-learning.md) | Platform and use-case architecture selection | Native framework selection | Architecture planning, not an API/SDK activation |
| [Built-in intelligence](https://developer.apple.com/documentation/technologyoverviews/built-in-intelligence.md) | No unsupported claim that Apple system APIs execute on the server | Vision, Speech, Natural Language are separately permission-/device-gated | Candidate adapters only |
| [Create ML](https://developer.apple.com/documentation/createml.md) | Training governance, not browser Create ML | macOS-only authorized training with leakage-safe evaluation | No approved dataset/real training receipt |
| [Core ML](https://developer.apple.com/documentation/coreml.md) | Not executed by web portal | Approved signed on-device model with schema/version validation | No shipped model/device test |
| [Inclusion](https://developer.apple.com/design/human-interface-guidelines/inclusion.md) | Diverse evaluation cases; avoid demographic/health inference | Inclusive training and cross-language device tests | Independent bias evaluation missing |
| [Apple Style Guide](https://support.apple.com/en-in/guide/applestyleguide/apdcb2a65d68/web) | Clear, humane, localized UX wording | Native interface/copy review | Full text unavailable in this audit (Apple Support fetch rate limited); leave source review open |
| [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility.md) | Keyboard, headings, ARIA status, 200–400% zoom and screen-reader runs | VoiceOver/Dynamic Type; Android TalkBack separately | Automated rules exist; manual and device acceptance missing |
| [Localization](https://developer.apple.com/documentation/xcode/localization.md) | Language-aware source strings and RTL review | Xcode String Catalog, localized purpose strings, region compatibility | No signed native locale acceptance |
| [Loading](https://developer.apple.com/design/human-interface-guidelines/loading.md) | Real progress, cancellation, clear retry and no stale results | Native progress and offline fallback | Source-level search state improved here; browser acceptance outstanding |
| [Foundation Models acceptable use](https://developer.apple.com/support/terms/acceptable-use-requirements-for-the-foundation-models-framework) | Model-specific policy does **not** automatically license public web use | Prohibit high-risk automated healthcare/legal/finance decisions; prevent misuse | Formal policy review and model-specific red-team tests outstanding |
| [Foundation Models](https://developer.apple.com/documentation/foundationmodels.md) | No simulated Apple session in browser | Eligible device, availability, fresh per-request session, discard unapproved drafts | Source-only native candidate |
| [Core AI](https://developer.apple.com/documentation/coreai.md) | **Not applicable to direct browser execution** | Apple silicon framework availability/SDK, model rights and actual performance validation (Core AI documentation currently declares OS 27+) | Do not claim integrated/available on existing devices without SDK and device testing |

## This change — public search privacy and loading correction

1. Clear query text, displayed results, copied answer buffer and in-memory semantic worker on dialog close; restore focus to trigger.
2. Make optional on-device retrieval explicitly disable-able after initialization. Do not falsely claim clearing the *persistent* IndexedDB asset cache when only the worker was stopped; cache deletion remains separately user-controlled.
3. Ignore results from older/out-of-order requests; settle replaced pending worker queries and prevent late responses from re-opening prior data.
4. Reject disallowed generated-answer prompts before loading approved evidence. Preserve conventional search and no-model navigation fallback.
5. Allow a failed source-index/manifest fetch to retry instead of permanently retaining a rejected Promise.
6. Add a narrow, no-deployment GitHub Actions syntax/privacy lifecycle regression. Source tests do **not** replace Chromium/WebKit, VoiceOver, NVDA, real-device, or production checks.

## Remaining release gates

1. Validate exact new PR head in CI and obtain independent security/accessibility review; do not mark 100% based on a regex contract.
2. Run public search in Chromium and WebKit: type/cancel/close/ESC; close/reopen must show blank input; overlapping slow responses cannot appear; disable semantic after enabling; clear optional persistent browser cache; confirm anonymous non-AI fallback.
3. Inspect protected Portal and all five Nova ML routes with authenticated roles, tenant isolation, CSP, prompt injection and no unintended medicine-data snapshot.
4. Approve model and dataset rights, independent nonclinical held-out testing, hallucination/PII/bias/abuse scenarios, incident response, feedback, rollback and human decision authority before model activation.
5. Native: macOS Xcode/SDK build; eligible Apple Intelligence device; iOS/iPadOS/macOS features; permissions, offline tests, VoiceOver/large text; signed distribution and per-OS compatibility; separate Android platform tests.
6. Verify exact public and protected deployed SHAs and release receipts independently; **no AWS, cloud infrastructure, protected production deployment or automatic publishing is authorized by this source-only pull request**.
7. Preserve the 172-topic HIG register's separate source-review, applicability and production-evidence counters; this document cannot increase production-verified totals.

**Owner preference:** minimal NovaPharm design (near-black, white, restrained brand red), clear typography, no decorative AI badges or proprietary Apple mimicry. Apple-native frameworks are not portable web/Android dependencies.
