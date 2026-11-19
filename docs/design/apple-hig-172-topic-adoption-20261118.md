# Apple HIG 172-topic adoption — NovaPharm repository checkpoint

**18 November 2026.** Scope: NovaPharm corporate estate, protected Portal/Intelligence, Expo candidate for iOS and Android, separate Swift/Kotlin research work. This is **not** a certification, universal implementation, verified live deployment or store release.

## Official scope and source-evidence policy

The owner provided the complete, section-wise 172-link index. The machine-readable [topic register](apple-hig-172-topic-acceptance-register.json) contains all 172 parent and child pages: **Getting started (10), Foundations (19), Patterns (26), Components (73, including 8 component groups), Inputs (14), Technologies (30)**. Original priorities: 42 Critical, 61 High, 24 Medium, 45 Later.

Every topic currently starts as **pending full-text review / implementation not verified** even when the repository contains earlier related work. Existing source-level tests, archived audit notes, a package-build result or an interface image do not independently prove that the full guideline was read, that each relevant user journey conforms or that live release acceptance passed. Mark a topic verified only after linking the exact official article review, relevant source and test evidence, browser/device and assistive-technology evidence, and an independently observed deployed or signed distribution receipt. Inapplicable topics require an explicit reason.

Sample primary sections inspected for this correction: [Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles.md), [Layout](https://developer.apple.com/design/human-interface-guidelines/layout.md), [Materials](https://developer.apple.com/design/human-interface-guidelines/materials.md), [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility.md), [Typography](https://developer.apple.com/design/human-interface-guidelines/typography.md), [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars.md), and [Generative AI](https://developer.apple.com/design/human-interface-guidelines/generative-ai.md). Their review here is selective, not exhaustive.

## Platform-specific interpretation

| Guideline family | Web / Portal | iOS Expo candidate and native Swift | Android Expo candidate and Kotlin | Remaining release gate |
| --- | --- | --- | --- | --- |
| Getting started, Foundations | Clear hierarchy, brand tokens, keyboard focus, responsive grid and semantic HTML | Native-feeling navigation, Dynamic Type, safe areas, VoiceOver and light/dark appearance | Platform conventions, font scaling, TalkBack, system insets and appearance | Computed rendering and accessibility across devices |
| Patterns | Explicit form outcomes, loading/empty/error recovery, accessible search and undo | Contextual navigation, native input and system feedback as supported | Android-native navigation and feedback conventions | Exercised end-to-end journeys, not static text |
| Components: Content; Layout and organization | Semantic tables and chart alternatives, responsive split views | Screen-reader labels and scrollable content | Screen-reader labels and responsive content | Contrast, voice and large-text testing |
| Components: Menus and actions; Navigation and search | Keyboard-operable menus and 44px controls | Reduced tab complexity and labelled destinations | Material/Android-compatible labels and destination behaviour | Tab and focus state device acceptance |
| Components: Presentation; Selection and input; Status | Field errors, dialogs, progress, empty states | Local form semantics, clear choices and status announcements | TalkBack and Android form/status semantics | Form-error and announcement verification |
| Components: System experiences | Only relevant web permissions, no counterfeit Apple system UI | Add native widgets/notifications/Shortcuts only when real capabilities exist | Use Android system APIs for equivalent approved features | Product scope, entitlements and signed builds |
| Inputs | Keyboard/mouse/touch/RTL focus and input | Touch, voice input and adaptive type | Touch, keyboard, TalkBack | Real device and assistive-tech acceptance |
| Technologies | AI disclosure, source provenance, privacy and fail-closed protected routes | No fake Apple Pay or Sign in with Apple; no unlicensed Apple asset redistribution | No Apple-only frameworks/assets embedded in Android | Actual identity, payments, rights and platform review |

Official platform guidance is a **reference**: Apple-native Liquid Glass, proprietary typeface binaries and SF Symbols are not general-purpose web or Android assets. Keep NovaPharm ownership and the restrained red #E3120B accent; prefer text over decorative icons. Android needs independent platform-native conformance rather than Apple pixel duplication.

## Concrete source corrections in this pull request

- Portal stylesheet: the search-dismiss control was **34×34px**, user-menu action **42×42px**, and an icon command had a **42px** minimum height. These now use a **44px** hit region; user-summary grid reserves matching space.
- Offline Expo multimodal-research form: increase regular body/label/checkbox text from 13 to 16, form input from 14 to 17, and action/result copy to 16; provide explicit privacy and research-only action hints and Android polite live-region status announcement. No customer, patient or licensed pharma data is enabled.
- Add a deterministic Node regression checking 172 links, all section/category counts and priorities, evidence-gated completion states, interactive sizes, mobile readability and non-network source contract. Integrate with a dedicated GitHub Actions path-scoped workflow; the existing Expo typecheck and two-bundle preflight remain independent.

## Evidence required before any 100%-ready statement

1. Review every applicable official Markdown page and record a source-specific implementation decision, not merely a category-level label.
2. Run all source tests, code scanning, security and application builds against the **latest exact pull request head**. No cancelled, queued or old-head check counts as a pass.
3. Inspect every relevant route and protected module at small and large widths, 200–400% text/zoom, keyboard/focus, RTL, light/dark, high contrast and reduced motion/transparency in Chromium/WebKit and on actual iOS/Android devices with VoiceOver and TalkBack.
4. Verify independent protected API/session/role/data-rights and commercial/medical acceptance. A mock/source list does not count as live medicine data integration.
5. Confirm exact deploy SHA and public origin response for each hosted app; confirm App Store/Play Store signed installations separately. AWS was deliberately **not accessed** and these production receipts are **not present** in this change.

See related PR [#854](https://github.com/NovapharmHealthacre/novapharm-website/pull/854) for an independent compact-navigation candidate. Do not merge overlapping work blindly; a green static assertion alone is not a substitute for human device acceptance.

## 18 November 2026 — unintended public contact dispatch after HIG-only merge

Source-only PR #855 merged into main at `05bc77810c75967a9dae2888762ad52721cbb0b0`. Its first-parent change-set contained only protected Portal styles, Expo offline form UI, HIG documentation and source tests. Nevertheless, the main push dispatcher [run 44350963585](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/44350963585) initiated a [workflow_dispatch publisher run 44350994908](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/44350994908), which reached build-and-verify. The previously deployed AWS contact endpoint was checked automatically by the dispatcher; this did **not** originate from the user connecting AWS in ChatGPT. Do not infer a new public deployment from either workflow's initiation.

Root cause: both private-only change classifiers omitted newly introduced exact HIG documentation/mobile/test paths, and the publisher unconditionally considered **all workflow_dispatch invocations** public even when initiated by the dispatcher for a private-only SHA.

Correction: explicitly classify the seven reviewed internal HIG paths in **both** dispatch and publisher classifiers, but never hide actual public site styles, contact scripts, mixed private/public changes or arbitrary documentation behind a blanket wildcard. The publisher must inspect the **exact first-parent diff of the checked-out `expected_sha`** on both push and workflow_dispatch, validate its 40-character SHA and reject a source mismatch. A manual dispatch alone never authorises unrelated public publication. Preserve manual recovery for genuinely public changes and independent immutable release/rollback checks. New regression fixtures cover the PR #854 and #855 file sets, this routing fix's own changes, and genuine public/mixed changes.

This source correction is not an AWS API/CLI connection, an infrastructure deployment or a claim of public go-live. Verify its exact-head GitHub CI, the post-merge dispatcher and any publisher run outcomes independently before declaring the incident contained. If an already-running publisher from the old commit completes, its release receipts must be reviewed separately; updating workflow source does not retroactively cancel it.


## 18 November 2026 — 210-link article/anchor/resource/MapKit/IMDF audit protocol

The actual user-supplied `Apple_HIG_Complete_Sectionwise_Index_2026-11-18.csv` text and the `Inside article links` and `Apple resources` tabs of the XLSX workbook were inspected and 172 distinct rows were matched to this repository's 172 topics using exact official URLs, titles, section/subsection, priorities and Markdown links: **172 matched; zero mismatches or duplicate URLs**. Each topic now preserves the owner's short description, platform label, type and original row index. Those fields are source *metadata*, not verbatim Apple text or proof of full-article implementation.

The existing `.github/workflows/apple-hig-cross-platform-detail.yml` has a **separate, opt-in `workflow_dispatch` input `remote_check`**. When manually enabled it requests the 172 Apple Markdown URLs, 30 exact section anchors from the supplied workbook, its five supporting Apple resources, and three additional references (MapKit, MapKit JS and IMDF), creates an exact-URL HTTP status report with fetched content hashes and the first 40 headings; for each of the 30 direct in-page anchors it retrieves the parent Markdown and separately checks whether the named heading exists, and uploads `apple-hig-210-link-reachability-<commit-sha>`. The manual job does not run on pull requests, does not require AWS, and does not publish web, iOS or Android applications. Unknown, blocked, bad redirects, unexpected article content or missing URLs remain review findings, never automatic approval.

**Separate human review still required:** inspect each complete applicable article (including page sections, examples, platform notes and licence constraints) in its original Apple context, compare with an actual NovaPharm page/module and native device, link source-level fixes plus rendered/assistive-technology evidence in the topic register, then independently verify live or signed release. A successful network response or SHA-256 hash is not a guideline interpretation, accessibility certification or production sign-off. The separately supplied 21 ZIP/DMG archives are *metadata listed but their binary contents were not inspected*.

The supplied XLSX contains 30 direct section anchors and 5 additional supporting URLs. These 35 links are preserved exactly, independently of the 172 page URLs, in `inPageAnchors` and `supportingResources` in the JSON register. The resulting **207 original workbook references** plus three separately requested MapKit/MapKit JS/IMDF links make **210 URL/anchor checks**. A parent page's HTTP 200 does not establish that `#Section` exists; the manual audit explicitly compares section headings and reports `anchor_unverified` when absent. This workbook inventory is not a claim that every source section has been read or implemented.


## 19 November 2026 — observed 210-link remote audit and one stale workbook anchor

The GitHub-only [210-link Apple reference audit run 44448141447](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/44448141447) made real HTTPS requests for the original 172 Apple HIG article Markdown pages, all 30 workbook section anchors, five official supporting resources, and three MapKit/MapKit JS/IMDF URLs. Its artifact is `apple-hig-210-link-reachability-b927b3451854723fa7aaf7de9caf04dd5bb86727`. **209 original references passed**. The single issue was the owner's Siri anchor `https://developer.apple.com/design/human-interface-guidelines/siri#Shortcuts-and-suggestions`: Apple currently returns the Siri page, but its Markdown no longer contains that section heading. The article's change log records a **June 8, 2026 Siri AI revision**; the now-current related heading is `Getting your app to work with Siri` at `#Getting-your-app-to-work-with-Siri`.

The exact original supplied URL remains unchanged in `inPageAnchors`, marked `original_anchor_missing` with the observed date and separate `replacementReference`; its `sectionVerified` flag remains **false**. The next audit must independently inspect the replacement heading from the same Apple Markdown body, require all 209 other references to continue to pass, and record `source_anchor_drift` for the old link. This is an explicit source evolution finding, not a successful original anchor, not a waiver for any new broken URL, and not evidence of full HIG page review or application conformance.

Apple article source: [Siri](https://developer.apple.com/design/human-interface-guidelines/siri.md). The raw attached archives have not been byte-inspected, and no Apple system resource was redistributed or any AWS endpoint accessed by this audit.
