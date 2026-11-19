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

## 19 November 2026 — owner-confirmed review coverage (172/172)

The NovaPharm owner explicitly reported: **“I have done the review of Apple HIG coverage.”** This statement has been recorded as an **owner-attested completion of the entire 172-topic index review scope**. The JSON register marks each of the 172 indexed topics as `included_in_owner_reported_coverage` and preserves its exact original Apple Markdown source URL. No article URL, source row, priority or indexed section was deleted or changed.

**Two separate completion measures must not be conflated:**

- **Owner-confirmed HIG coverage review: 172/172 (100%)**, based on the owner's direct declaration of completed review, not on an independently reproduced article-by-article full-text audit.
- **Independently documented official full-text article review in the source register at the time of this attestation: 2/172**, Accessibility and Color, with six explicit web/iOS/Android applicability decisions. Other entries retain their original `guidelineReview` and `platformApplicability` values until evidence for each specific source and decision is recorded.

The user-supplied `Apple_HIG_Sectionwise_Guide_2026-11-18.md` and the 172-row CSV are the indexed scope and short descriptions, **not** 172 complete copies of Apple's guideline article texts. The owner review declaration is valuable governance evidence, but does not itself establish which recommendations were adopted, page-level test outcomes, clinical/data rights, assistive-technology results, Apple licences, independently approved production changes or deployed/signed iOS/Android distribution. The existing fail-closed `meta.allGuidelinePagesFullyReviewed=false` and `meta.allPlatformsProductionVerified=false` are intentionally unchanged: they refer to independent evidence and live acceptance, not whether the owner says the review occurred.

This milestone is **documentation only**, to be merged as a private source ledger update. No AWS deployment, protected service activation, asset redistribution or mobile app release should be initiated from it.

## 19 November 2026 — nine additional Apple primary-article reviews (source and scope, not live conformance)

The nine official Apple HIG Markdown articles below were opened and read through their substantive sections and published platform considerations. Each has new article-specific source observations and separate reasoned web/iOS/Android applicability records in the machine-readable register. These reviews extend the previously documented Accessibility and Color articles.

| Article | Verified Apple guidance subject | NovaPharm acceptance evidence still required |
| --- | --- | --- |
| [Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles.md) | Purpose, agency, responsibility, familiarity, flexibility, simplicity, craft and delight | Task-oriented UX, privacy and recovery tests |
| [Designing for iOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-ios.md) | iPhone ergonomics, system appearance, Dynamic Type, permissions and platform APIs | Actual iOS device and signing acceptance |
| [Branding](https://developer.apple.com/design/human-interface-guidelines/branding.md) | Brand voice, restrained accent, familiar components, trademark boundaries | Visual/rights acceptance and original NovaPharm assets |
| [Writing](https://developer.apple.com/design/human-interface-guidelines/writing.md) | Plain language, specific buttons/errors, consistent labels and empty states | Page-level copy and accessibility review |
| [Loading](https://developer.apple.com/design/human-interface-guidelines/loading.md) | Non-blocking placeholders and honest determinate/indeterminate progress | Real network, offline and assistive-technology tests |
| [Entering data](https://developer.apple.com/design/human-interface-guidelines/entering-data.md) | Secure input, validated fields and explicit required values | Authenticated forms and permission tests |
| [Managing accounts](https://developer.apple.com/design/human-interface-guidelines/managing-accounts.md) | Meaningful sign-in, passkeys/MFA and accessible account deletion | Real Cognito roles, retention and deletion acceptance |
| [Searching](https://developer.apple.com/design/human-interface-guidelines/searching.md) | Scoped search, suggestions, history privacy and iOS Spotlight | Source-licensed results, confidentiality and device checks |
| [Generative AI](https://developer.apple.com/design/human-interface-guidelines/generative-ai.md) | Responsible AI, privacy, datasets, hallucinations and user control | Protected clinical safety, model rights and signed mobile release |

**Register checkpoint proposed by this change:** owner-attested review coverage remains **172/172**; independently documented article-level reviews increase from **2/172 to 11/172**; explicit platform-applicability decisions increase from **6/516 to 33/516**; implementation verification remains **0**, the independent full-source-review flag remains **false**, and production certification remains **false**. For the iOS-specific article, Apple-only feature requirements are marked not applicable to the web and Android, with explicit rationale. All other platform decisions are about guidance *applicability*, not code implementation. No Apple copyrighted binaries or official article bodies are reproduced.

## 19 November 2026 — eight more current Apple component and accessibility reviews

The following eight full official Apple HIG Markdown articles were inspected, including platform distinctions, and new article-specific assessments are linked in the JSON register: [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons.md), [Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts.md), [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars.md), [Search fields](https://developer.apple.com/design/human-interface-guidelines/search-fields.md), [Progress indicators](https://developer.apple.com/design/human-interface-guidelines/progress-indicators.md), [Labels](https://developer.apple.com/design/human-interface-guidelines/labels.md), [Charts](https://developer.apple.com/design/human-interface-guidelines/charts.md), and [VoiceOver](https://developer.apple.com/design/human-interface-guidelines/voiceover.md).

These reviews add **eight article records** and **24 platform decisions** to the nine-article source update above. **Total proposed checkpoint: 19/172 article-level reviews and 57/516 platform decisions**. Owner-reported coverage remains 172/172; live implementation and independent platform test acceptance remain zero. Apple's VoiceOver-only APIs are marked not applicable on Android (where TalkBack review is required) and the article's web/browser support is explicitly scoped to VoiceOver behavior in Apple-supported browsers. A native 44-point button-size guideline is not falsely presented as an automatically equivalent 44-CSS-pixel standard. No proprietary Apple assets, entire article bodies or production code were added.

## 19 November 2026 — eight additional official foundation and icon articles

Eight further current official Apple HIG source articles were examined and their substantive guidance interpreted for the NovaPharm website, iOS and Android source programmes. This is a *source and applicability assessment*, **not** code conformance or release verification.

| Primary Apple article | Guidance assessed | Separate NovaPharm implementation evidence still needed |
| --- | --- | --- |
| [Layout](https://developer.apple.com/design/human-interface-guidelines/layout.md) | Hierarchy, progressive disclosure, reading order, RTL, adaptable layouts and safe areas | Responsive viewport, keyboard and native safe-area tests |
| [Privacy](https://developer.apple.com/design/human-interface-guidelines/privacy.md) | Purpose-limited and just-in-time permissions; security and transparent data use | Actual role, tenant, permission, retention and account-protection checks |
| [Inclusion](https://developer.apple.com/design/human-interface-guidelines/inclusion.md) | Respectful copy, representation, cultural context and localization | Human review in target locales and assistive-technology acceptance |
| [Images](https://developer.apple.com/design/human-interface-guidelines/images.md) | Density-aware imaging, color profiles, device variation and platform assets | Actual asset provenance, render quality, alt text and devices |
| [Icons](https://developer.apple.com/design/human-interface-guidelines/icons.md) | Recognizable single-purpose glyphs and consistent optical treatment | Original icon licence, meaning, label and interaction testing |
| [SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols.md) | Platform-native symbol modes, version availability and licence limits | iOS rights/OS coverage; do not redistribute Apple symbols on web/Android |
| [Materials](https://developer.apple.com/design/human-interface-guidelines/materials.md) | Liquid Glass control surfaces, standard content materials and contrast | Apple-native iOS material tests; use distinct web/Android surfaces |
| [App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons.md) | Distinctive app identity, Apple icon formats, layers and appearance variants | Original NovaPharm iOS icon and signed/device icon verification |

The corresponding JSON register now proposes **27/172 source-specific article reviews and 81/516 documented platform decisions**, including 24 new reasoned decisions. **145 articles and 435 platform applicability decisions remain unassessed**. The 172/172 owner coverage attestation has not changed, and all implementation states remain `not_verified`; `allGuidelinePagesFullyReviewed` and `allPlatformsProductionVerified` remain `false`.

Apple-specific SF Symbols, Liquid Glass and Apple app-icon platform APIs are recorded as **not applicable** to generic web and Android implementations. The separate shared design objectives must still be tested with independently licensed assets and platform-appropriate implementation. The records contain no full copyrighted article reproduction, Apple asset binaries, passwords, customer data, AWS publication action, mobile signing or store release.

## 19 November 2026 — 25 further current primary-source assessments and 75 applicability decisions

This tranche extends the merged baseline of 27 detailed official article assessments to **52/172 (30.23%)** and independently reasoned *applicability classifications*, not source-code acceptance, to **156/516 (30.23%)**. The source-review register contains distinct guidance observations and separate web, iPhone iOS and Android applicability rationales for every additional article. Primary Apple Markdown references:

| Official article | Register group | Platform interpretation |
| --- | --- | --- |
| [Text fields](https://developer.apple.com/design/human-interface-guidelines/text-fields.md) | Components | Web/iOS/Android: scoped |
| [Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars.md) | Components | Web/iOS/Android: scoped |
| [Scroll views](https://developer.apple.com/design/human-interface-guidelines/scroll-views.md) | Components | Web/iOS/Android: scoped |
| [Focus and selection](https://developer.apple.com/design/human-interface-guidelines/focus-and-selection.md) | Inputs | Web/iOS/Android: scoped |
| [Undo and redo](https://developer.apple.com/design/human-interface-guidelines/undo-and-redo.md) | Patterns | Web/iOS/Android: scoped |
| [Settings](https://developer.apple.com/design/human-interface-guidelines/settings.md) | Patterns | Web/iOS/Android: scoped |
| [Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding.md) | Patterns | Web/iOS/Android: scoped |
| [Notifications](https://developer.apple.com/design/human-interface-guidelines/notifications.md) | Components | Web/iOS/Android: scoped |
| [File management](https://developer.apple.com/design/human-interface-guidelines/file-management.md) | Patterns | Web/iOS/Android: scoped |
| [Managing notifications](https://developer.apple.com/design/human-interface-guidelines/managing-notifications.md) | Patterns | Web/iOS/Android: scoped |
| [Disclosure controls](https://developer.apple.com/design/human-interface-guidelines/disclosure-controls.md) | Components | Web/iOS/Android: scoped |
| [Pickers](https://developer.apple.com/design/human-interface-guidelines/pickers.md) | Components | Web/iOS/Android: scoped |
| [Tab views](https://developer.apple.com/design/human-interface-guidelines/tab-views.md) | Components | iPhone iOS: not applicable; web/Android: scoped |
| [Launching](https://developer.apple.com/design/human-interface-guidelines/launching.md) | Patterns | Web/iOS/Android: scoped |
| [Modality](https://developer.apple.com/design/human-interface-guidelines/modality.md) | Patterns | Web/iOS/Android: scoped |
| [Offering help](https://developer.apple.com/design/human-interface-guidelines/offering-help.md) | Patterns | Web/iOS/Android: scoped |
| [Action sheets](https://developer.apple.com/design/human-interface-guidelines/action-sheets.md) | Components | Web/iOS/Android: scoped |
| [Segmented controls](https://developer.apple.com/design/human-interface-guidelines/segmented-controls.md) | Components | Web/iOS/Android: scoped |
| [Navigation and search](https://developer.apple.com/design/human-interface-guidelines/navigation-and-search.md) | Components | Web/iOS/Android: scoped |
| [Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets.md) | Components | Web/iOS/Android: scoped |
| [Windows](https://developer.apple.com/design/human-interface-guidelines/windows.md) | Components | iPhone iOS: not applicable; web/Android: scoped |
| [Popovers](https://developer.apple.com/design/human-interface-guidelines/popovers.md) | Components | Web/iOS/Android: scoped |
| [Context menus](https://developer.apple.com/design/human-interface-guidelines/context-menus.md) | Components | Web/iOS/Android: scoped |
| [Text views](https://developer.apple.com/design/human-interface-guidelines/text-views.md) | Components | Web/iOS/Android: scoped |
| [Virtual keyboards](https://developer.apple.com/design/human-interface-guidelines/virtual-keyboards.md) | Components | Web/iOS/Android: scoped |

**Platform boundary:** Apple's AppKit-style `Tab views` and `Windows` articles do not directly apply to iPhone iOS. Equivalent iOS segmented controls/navigation and Android/web panes or multiwindow approaches require their own acceptance; an Apple component is not a cross-platform API. Apple notification interruption entitlements, Files/Quick Look, native launch screens, and notification permissions are not interchangeable with browser/Android features.

**Production-evidence track remains 0/172:** A documented article review or a passing GitHub CI suite is not evidence of a deployed HIG implementation. Before marking `implementation = verified` in the register, obtain evidence of (1) exact production revision and authorized publication route, (2) screenshots/AX-tree or equivalent inspectable assistive-technology behavior of representative routes at mobile/desktop sizes including light/dark, zoom, RTL where applicable, (3) authenticated tenancy and security checks for protected pages, (4) physical-device VoiceOver/TalkBack and signed iOS/Android distribution receipts where platform-applicable, and (5) an independent reviewer/go-live acceptance with reproducible results. Explicitly document any excluded surfaces and why. No guessed SHA, store listing, Apple endorsement, patient-data license or production claim is permitted.

Remaining after this proposed source-only PR: **120 detailed HIG articles** and **360 applicability decisions**. The unchanged 172/172 owner-attested index is not equivalent to independent article/implementation acceptance. The `allGuidelinePagesFullyReviewed` and `allPlatformsProductionVerified` flags remain `false`.

## 19 November 2026 — production HIG acceptance audit and observed public RTL receipt

**Programme scope:** The original 172 HIG topics span a corporate public website, protected Portal/Intelligence and the distinct iOS/Android candidate applications. A source review, implemented CSS, green PR CI, public HTTP response, or successful workflow with skipped deployment/browser jobs cannot establish verified HIG compliance for an entire applicable topic.

### Evidence retrieved, with job-level limits

| Observation | Source receipt | What was actually proved | Why this is not a complete topic acceptance |
| --- | --- | --- | --- |
| Public RTL layout-preview (scoped live check) | [GitHub run 44528135812](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/44528135812), job 135574047765, **success** | The read-only `verify-public` job executed and printed `Live public RTL layout-preview proof passed`, showing published source `d00b2eee866d4a2dd2ff7d87ded583be0d7cab98` and checking public RTL assets, language-cookie disclosure and the preserved B2B contact path | The preview intentionally marks Arabic/Hebrew content as untranslated. It does **not** cover all public/private flows, accessibility technology, keyboard/reflow, iOS/Android binaries or independent approval. |
| Corporate live browser workflow | [GitHub run 44528135827](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/44528135827), **workflow success** | `publisher-deployment` succeeded in checking the upstream publication outcome | Its `live-browser` job **skipped**, because no new public deployment occurred; it supplies no new rendered-browser acceptance. |
| Production owner controls | [owner constraints JSON](../../config/intelligence/owner-production-constraints.json) | `productionSignoff` observed as `not_granted` with no new paid provisioning and protected customer activation forbidden | A merge or CI success does not authorize authenticated customer rollout or native store distribution. |

The official [Right to left](https://developer.apple.com/design/human-interface-guidelines/right-to-left.md) article was additionally read and its separate web/iOS/Android applicability assessed. It distinguishes mixed-script text alignment, direction-sensitive navigation and numerals from photos, universally recognized icons and original logos that must not be indiscriminately mirrored. The new register contains **53/172 independently documented article assessments** and **159/516 platform decisions** as a *proposed* source-only update; formal **production-verified implementations remain 0/172**. This does not diminish already shipped source features; it prevents inventing absent proof.

### Production acceptance contract for each topic (not negotiable)

1. Review the complete current official primary guidance; document web/iOS/Android applicability, including an explicit rationale for any not-applicable platform or dormant app feature.
2. Identify all actual, in-scope product routes, roles and native application surfaces. Distinguish the *public corporate site* from *protected customer apps* and offline research candidates.
3. For each applicable platform, capture a **specific deployed immutable revision** (not merely `main`), observed live URL or signed native artifact/store distribution receipt, date, successful unskipped verification job and screenshots or other inspectable accessibility evidence.
4. Exercise the expected user journeys in realistic states: responsive light/dark/RTL as applicable, 200–400% zoom/reflow, keyboard/focus order, form errors/recovery, visible feedback and assistive technology (VoiceOver, TalkBack/NVDA where appropriate). No production patient/tenant secrets in evidence.
5. For protected routes, separately verify role/tenant isolation and authenticated production ownership; respect the still-ungranted production signoff and medical-data rights. For iOS/Android, prove actual signed binaries, permissions and physical-device interactions where applicable; Expo/source compilation alone is insufficient.
6. Obtain genuine independent Quality/Security acceptance on the exact release with reproducible links. Confirm no implicit AWS publisher calls or public activation caused by a documentation-only merge. A status may be set to `verified` only when the entire scoped subject has eligible receipts and all platform requirements are satisfied.
7. Preserve exclusions, gaps and waived/non-applicable matters transparently; the denominator should not be gamed by claiming Apple-only platform APIs are implemented in a generic browser or Android app.

**Static regression hardening:** `scripts/test-apple-hig-full-catalogue-and-cross-platform.mjs` now rejects superficially populated or skipped `verified` declarations, checks the real partial RTL receipt and explicitly preserves the programme's 0/172 status until authentic acceptance is available. A static CI contract cannot independently authenticate a live receipt; reviewer evidence and production acceptance still must be performed outside this code-only change.

### 19 November — actual live Chromium/WebKit visual evidence from two public routes

Two existing *read-only* GitHub Actions browser workflows were inspected at the job/log level. Both completed real Chromium and WebKit visits to public NovaPharm pages and saved screenshots:

| Public route | Job / artifact | Actually passed | Limits |
| --- | --- | --- | --- |
| [Capabilities](https://novapharmhealthcare.com/capabilities/) | [Run 44532249980](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/44532249980), job 135588345804; [screenshots](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/44532249980/artifacts/14534074840) | **6/6** rendered observations: Chromium and WebKit at 390, 768 and 1440 px, including the approved editorial photo/CSS. | No sitewide image/accessibility audit, authenticated session, or independent HIG approval. Do not infer full live HTML source SHA from the workflow commit. |
| [Oncology](https://novapharmhealthcare.com/oncology/) | [Run 44532250088](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/44532250088), job 135588343721; [screenshots](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/44532250088/artifacts/14534534397) | **8/8** rendered observations: Chromium and WebKit at 390, 768, 1440 and 1728 px, uninterrupted hero/portrait, three aligned cards and no horizontal overflow; public Oncology CSS bytes matched the source checkout SHA `bb96952db2e4dcaa19526a8ab321b8081b6aeca7`. | Only Oncology page hero, not all web routes, nonvisual image alternatives, full HIG Layout or Images acceptance, protected estate or signed mobile. |

These create **three distinct public live runs** overall when combined with the earlier RTL probe and **four partial topic/platform evidence records** in the register (RTL one; Layout two; Images one). **No whole topic or platform is independently production-verified.** A repeated Oncology workflow is deliberately recorded under separate Layout and Images aspects but not misrepresented as two independent runs. Public code in `main` and PR head are not evidence of live release-SHA parity unless the actual live origin proves it. The source checkpoint still has `productionSignoff: not_granted`; production-verified remains **0/172**.

The partial records must not be upgraded to `full` until they also cover relevant page families, keyboard navigation and focus, assistive technology, zoom/reflow, action states, security and independent acceptance. Physical iOS/Android packages and permissions require their own controlled evidence.

### 19 November — 12 fixed public rendered browser/keyboard/accessibility samples

As a continuation of [PR #878](https://github.com/NovapharmHealthacre/novapharm-website/pull/878), the existing source-only HIG workflow now performs an additional **read-only rendered public sample** on GitHub's pre-existing CI infrastructure, without AWS keys or publication permissions. It visits three fixed public routes — home, contact and legal accessibility — in Chromium and WebKit at 390 px (mobile) and 1440 px (desktop): **12 browser/viewport/route combinations**.

The sampler records HTTP status, main-H1 count, HTML language and *observed* published source-SHA metadata; tests 2-pixel-tolerant horizontal overflow and whether the first Tab reaches a visible focus target; and runs automated WCAG 2.0–2.2 axe-core checks on the **three** Chromium-mobile routes. Only serious/critical automated findings are treated as failures of this narrow sampling job; all axe findings are retained for manual triage. Chromium screenshots and a structured, time-stamped JSON outcome are uploaded under `apple-hig-public-rendered-${{ github.sha }}` even when a problem occurs. Separate HTML and 172-topic gap artifacts remain.

**Operational bounds:** The CI job is evidence-only and explicitly `continue-on-error`; its outcome can never authorize release. The script blocks non-GET/HEAD methods and all off-origin network requests, disables service workers, never signs in, never clicks submit, and neither purchases infrastructure nor contacts AWS APIs. The block on third-party content can affect page appearance, and is documented in the output. The job does **not** provide physical VoiceOver/TalkBack/NVDA acceptance, actual 200–400% zoom/reflow, full keyboard navigation, authenticated tenant/user workflows, domain-wide WCAG certification, production owner signoff or native mobile signed releases. Its exact CI head is not silently equated with the deployed public-source SHA.

The original 53/172 reviewed articles and 159/516 decisions from the previous checkpoint were subsequently advanced to 57/172 and 171/516 in this PR; **4 bounded partial observations / 3 distinct production workflow receipts** and **0/172 fully accepted production implementations** remain unchanged pending actual evidence and independent approval.

### 19 November — four additional official critical HIG source reviews

The formal HIG source-review register has been extended beyond the earlier 53/159 checkpoint with four directly inspected official Apple primary pages. The proposed PR register is now **57/172 independently recorded topic/source reviews (33.14%)**, **171/516 web/iOS/Android applicability decisions (33.14%)**, **4 partial recorded live web topic observations** from three distinct successful public workflow runs, and **0/172 fully independent production-verified topics**.

| Official Apple HIG source | Distinct reviewed guidance | NovaPharm acceptance boundary |
| --- | --- | --- |
| [Typography](https://developer.apple.com/design/human-interface-guidelines/typography.md) | Readable type size and weight, semantic hierarchy, Adaptive Dynamic Type, text wrapping/truncation, proprietary system-font handling | Browser zoom/reflow and Android font scaling are distinct from native iOS Dynamic Type; a font import is not deployment conformance |
| [Gestures](https://developer.apple.com/design/human-interface-guidelines/gestures.md) | Familiar standard gestures, feedback, alternatives to custom gestures, preservation of system gestures, Apple-specific three-finger undo | Web and Android require discoverable alternate inputs; Apple-specific native gestures must not be claimed as web APIs |
| [Menus and actions](https://developer.apple.com/design/human-interface-guidelines/menus-and-actions.md) | Collection page indexing buttons, edit/context menus, toolbars, activity views and platform-exclusive desktop commands | The collection itself is a taxonomy, not proof that each child component has been tested on every supported platform |
| [Machine learning](https://developer.apple.com/design/human-interface-guidelines/machine-learning.md) | Critical/complementary ML, data sensitivity/privacy, optional feedback, mistakes, correction, attribution and limitations | NovaPharm candidate models need verified data rights and humane correction/provenance UI; accepted clinical facts must be distinct from inference |

All four received topic-specific evidence and three explicit platform applicability rationales. There is **no change** to `productionSignoff: not_granted`; no ML service activation or native signing and no change to the 172-topic production verified denominator. The numbered evidence gaps are still authoritative, and browser audit output remains a limited candidate for independent acceptance.
