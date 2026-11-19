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

## 19 November continuation — eleven remaining Critical primary-source reviews and real public rendered samples

Apple's current official Markdown versions were inspected individually (the Markdown link from each Apple source page was followed). Exactly **11 previously pending Critical entries** now have topic-specific reading notes and web/iOS/Android applicability rationales. The proposed programme ledger rises from **57/172 article-level source reviews to 68/172 (39.5%)**, and from **171/516 platform decisions to 204/516 (39.5%)**. All **Critical-priority source entries** are documented as reviewed, but this only establishes design-source review, not the implementation or production quality of those entries.

| Official primary source | Document type | Concrete applicability / implementation acceptance still required |
| --- | --- | --- |
| [Foundations](https://developer.apple.com/design/human-interface-guidelines/foundations.md) | Collection index | Child links for Accessibility, Appearance, Layout, Privacy, RTL, Writing and more; each child requires its own acceptance |
| [Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode.md) | Article | Verify system appearance switching, semantic contrast, image assets and Increase Contrast / Reduce Transparency independently on supported platforms |
| [Charting data](https://developer.apple.com/design/human-interface-guidelines/charting-data.md) | Article | Accessible chart values, textual summaries and data tables, progressive details, series continuity and authorized pharmaceutical data |
| [Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback.md) | Article | Inline state/recovery, proportional alerts, irreversible-loss warning and screen-reader announcements; never show false transaction or clinical success |
| [Components](https://developer.apple.com/design/human-interface-guidelines/components.md) | Collection index | Content, Layout, Menus, Navigation, Presentation, Selection, Status and System Experiences are separate component families, not one UI implementation |
| [Layout and organization](https://developer.apple.com/design/human-interface-guidelines/layout-and-organization.md) | Collection index | Independent tables/disclosures/sidebar/split/tab child-topic contracts, responsive reading order and keyboard semantics |
| [Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables.md) | Article | Descriptive headings, accessible row selection, sort state, truncated identifiers, compact/dense alternatives and screen reader access to real rows |
| [Split views](https://developer.apple.com/design/human-interface-guidelines/split-views.md) | Article | Persistent hierarchy and selected state; compact single-pane phone fallback, adaptive iPad/tablet panes, focus and restoration |
| [Menus](https://developer.apple.com/design/human-interface-guidelines/menus.md) | Article | Succinct labels, disabled action explanations, clearly indicated toggle state, logical grouping, accessible keyboard/Escape and limited submenu depth |
| [Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars.md) | Article | Main actions and titles visible across widths, sensible More overflow, leading navigation and trailing actions, native touch/keyboard/VoiceOver/TalkBack |
| [Selection and input](https://developer.apple.com/design/human-interface-guidelines/selection-and-input.md) | Collection index | Inputs, pickers, toggles, sliders and virtual keyboards need distinct platform-appropriate form/validation/accessibility evidence |

**Important:** The four collection indexes are not standalone components that a NovaPharm stylesheet could make live. Apple-native platform-specific controls cannot be declared implemented in browser or Android source merely because the index names them. Documentation records how each child should be scoped, not that any child has passed.

### New proven read-only public-browser evidence

The already merged [Apple HIG run 44540795085](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/44540795085), actual job **135618272024**, completed 12 of 12 read-only Chromium/WebKit observations across home, contact and legal accessibility pages, mobile 390 and desktop 1440. The job log reported **zero bounded gaps** and preserved [JSON/screenshots artifact 14539093077](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/44540795085/artifacts/14539093077). The test checked HTTP response, document structure, overflow, the *first* keyboard-focus target and serious/critical automated axe findings on three mobile Chromium routes. No public form was submitted; off-origin and non-GET/HEAD requests were blocked.

Recorded the same run as **one partial Accessibility observation** and **one partial Layout observation**, not two distinct workflows. Combined with earlier public RTL/Capabilities/Oncology evidence, there are **4 distinct successful read-only live workflows supporting 6 partial topic-platform records**. **Direct artifact read-back:** The full `results.json` inside [artifact 14539093077](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/44540795085/artifacts/14539093077) was downloaded and inspected, not inferred from CI status. All **12/12** result rows reported HTTP 200, one main H1, English language, visible initial keyboard focus, **0 horizontal overflow**, **0 automated axe rule violations across the three mobile Chromium scans**, no sampled errors and **0 blocked unsafe/off-origin requests**. All 12 public HTML responses exposed the same observed production source SHA `d00b2eee866d4a2dd2ff7d87ded583be0d7cab98`, which is deliberately different from the source-only PR head. This is a scoped direct public-origin provenance observation, not proof of all-route deployment, complete WCAG or native production release. There is **no complete independent accessibility, all-routes/roles acceptance, protected customer journey, manual assistive-technology session or native signed package evidence**. As of this proposal, **0/172 topics are production verified** and the recorded production owner signoff remains `not_granted`.

Neither the register nor this documentation change modifies live services, code that users execute, medicine rights, payments, AWS/DNS, native signing or the protected production release hold.

## 19 November — additional 12 reviewed Apple motion, content and input guidelines (stacked)

This is a **source-only dependent branch**, following the complete Critical-source review candidate PR #880, not a separately deployed feature. Each official Apple Markdown article below was read on 19 November 2026 and assigned three separate web/iOS/Android applicability decisions. Important: an applicable Apple design concept is **not** proof its native API exists on Android or the website; `not_applicable` records the Apple-native component exclusion, not a claim that related user experience needs no accessible alternative.

| Apple primary article | Distinct findings and NovaPharm decision |
| --- | --- |
| [Motion](https://developer.apple.com/design/human-interface-guidelines/motion.md) | Make motion optional, purpose-driven, brief and cancellable; use explicit status alternatives and reduced-motion support. Live transition/focus behavior is not yet accepted. |
| [Collaboration and sharing](https://developer.apple.com/design/human-interface-guidelines/collaboration-and-sharing.md) | Permission summaries, discoverable share, membership changes and management; no CloudKit or clinical-record sharing assumed, tenant/data-rights checks mandatory. |
| [Boxes](https://developer.apple.com/design/human-interface-guidelines/boxes.md) | Visually bound only logically related material, avoid giant/nested decorative panels, and use succinct group titles to support navigation. |
| [Collections](https://developer.apple.com/design/human-interface-guidelines/collections.md) | Familiar grid/row for images and tables for text; stable layout, selection and keyboard focus for catalogues. |
| [Outline views](https://developer.apple.com/design/human-interface-guidelines/outline-views.md) | Hierarchical first column, sortable/resizable and restorable state. Native Apple component is **macOS-only**; not native iOS or Android. Accessible web treegrid is a separate analogy. |
| [Edit menus](https://developer.apple.com/design/human-interface-guidelines/edit-menus.md) | Preserve standard editing actions, appropriate copy permission and undo, short verb labels and touch/keyboard contexts. Never expose protected medical/customer data to uncontrolled copy/share. |
| [Token fields](https://developer.apple.com/design/human-interface-guidelines/token-fields.md) | Mac-only recipient/filter token chips, suggestions and contextual actions; **no Apple-native iOS or Android TokenField**. A web tag input must pass its own keyboard and screen-reader acceptance. |
| [Combo boxes](https://developer.apple.com/design/human-interface-guidelines/combo-boxes.md) | Native macOS editable text + choice list with sensible default/label, no truncated suggestions. Apple explicitly excludes iOS/iPadOS; browser ARIA combo behavior is separately applicable. |
| [Digit entry views](https://developer.apple.com/design/human-interface-guidelines/digit-entry-views.md) | **tvOS-only** secure digit-entry full-screen interface, requiring descriptive prompt and masked digits. Not applicable to NovaPharm's public web, iPhone or Android scope; separate MFA/OTP fields are not a TVUIKit implementation. |
| [Steppers](https://developer.apple.com/design/human-interface-guidelines/steppers.md) | Increment/decrement value must be visible; pair with editable numeric field for larger changes, accessible bounds and quantity feedback. |
| [Toggles](https://developer.apple.com/design/human-interface-guidelines/toggles.md) | Binary on/off states must be explicit beyond color; iOS prefers switches in lists versus toggle-buttons elsewhere; Mac also distinguishes mixed-state checkboxes and radio options. |
| [Pointing devices](https://developer.apple.com/design/human-interface-guidelines/pointing-devices.md) | Preserve OS gestures and complementary touch/keyboard/trackpad input, meaningful standard pointers and sufficient target padding. iPadOS pointer highlight/lift effects are not portable Android or web APIs. |

**Proposed cumulative audit:** **80/172 (46.5%) documented topic reviews**, **240/516 (46.5%) applicability decisions**, leaving **92 source reviews and 276 platform decisions**. All 172 production implementation statuses remain `not_verified`; there are still only 6 bounded partial public topic/platform observations from four real first-party live workflow runs. Production owner signoff remains `not_granted`. Source reviews, CI and a screenshot artifact cannot certify authenticated Portal/Intelligence, sitewide accessibility or signed native app distribution.

**Dependency:** The current branch must merge **after** PR #880 and exact-head CI/reviewer approval; the original PR #880 stays unchanged until its checks and independent Quality/Security approval are complete. This branch makes no AWS, release, licensed data, medicine, customer or signing changes.

## 19 November — ten more Apple platform, commerce and productivity sources

This is a **source-only dependent HIG review candidate**, stacked on PR #881, which itself depends on PR #880. The following original Apple Markdown guideline content was read individually (not scraped from a category list). Each row has distinct public/protected-web, iOS and Android applicability reasoning in the register; native-only technologies are not silently treated as available on other platforms.

| Official Apple HIG article | What was read and the concrete acceptance boundary |
| --- | --- |
| [Designing for iPadOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-ipados.md) | Larger displays, changing window size and orientation, combined touch/keyboard/trackpad/Pencil inputs; Apple iPadOS platform implementation is iOS-app scope, while iPad browser responsiveness is separate and Android tablets use Android standards |
| [Multitasking](https://developer.apple.com/design/human-interface-guidelines/multitasking.md) | Persist/restore working context during switching and interruptions; native iPad windows must adapt without taking over OS multitasking; a web page or signed app needs its own actual lifecycle tests |
| [Keyboards](https://developer.apple.com/design/human-interface-guidelines/keyboards.md) | Standard shortcuts, Full Keyboard Access, visual focus and safe native activation; must not override OS keyboard shortcuts or claim single-Tab tests constitute end-to-end keyboard accessibility |
| [Drag and drop](https://developer.apple.com/design/human-interface-guidelines/drag-and-drop.md) | Copy vs move, accessible alternative commands, reversible operations and clear destination feedback; never rely exclusively on gestures to move protected warehouse/order records |
| [Widgets](https://developer.apple.com/design/human-interface-guidelines/widgets.md) | WidgetKit system-sized, glanceable OS surfaces with adaptive appearance and data minimization; **not** a website dashboard card or an Android App Widget implementation |
| [Apple Pay](https://developer.apple.com/design/human-interface-guidelines/apple-pay.md) | Actual compatible browser/PassKit capability, legitimate payment button/brand marks, physical-goods shopping, merchant/shipping/total display and genuine failed/successful transaction handling; a source test alone cannot certify payment or delivery |
| [Apple In-App Purchase](https://developer.apple.com/design/human-interface-guidelines/apple-in-app-purchase.md) | Native digital premium goods and subscriptions: StoreKit, localized pricing and trial terms, restore/refund help, system confirmation, product classification and current App Review Rules; **not** the same as Apple Pay or an arbitrary Stripe web link |
| [Content](https://developer.apple.com/design/human-interface-guidelines/content.md) | Category **collectionGroup** for Charts, Image views, Text views and Web views; each child source needs separately accepted route-specific behavior and licensed data |
| [Status](https://developer.apple.com/design/human-interface-guidelines/status.md) | Category **collectionGroup** for Activity rings, Gauges, Progress indicators and Rating indicators; an activity ring is not a pharmacy inventory KPI mandate |
| [Inputs](https://developer.apple.com/design/human-interface-guidelines/inputs.md) | Category **collectionGroup** of Apple hardware/input modalities including Watch Crown/TV Remote/Pencil/Camera Control; unsupported device hardware must never be marked as implemented on web or Android |

**Highest-risk classification:** The existing Nutraxin physical-goods website payment flow and a future native Intelligence *digital subscription* are different use cases. Before any iOS digital subscription checkout is activated, a qualified owner reviewer must resolve the actual App Review category, jurisdiction/entitlement, StoreKit products, trial disclosures and payment/restoration evidence. Existing web checkout/Stripe is not proof that Apple has approved in-app digital subscription payment. No price, API, payment provider, credentials, billing, app-store offering or live native integration was modified.

**Cumulative proposed source-readiness after PRs #880 → #881 → this candidate:** **90/172 (52.3%)** documented primary source reviews and **270/516 (52.3%)** platform decisions. Remaining: **82 official topic reviews**, **246 three-platform decisions**. The evidence audit retains **6 partial public topic-platform observations from 4 independent first-party live runs**, and **0/172 full production-verified implementations**. Browser screenshots and GitHub status are not native/tenant/complete HIG release receipts. Production signoff remains `not_granted`.

**Safe workflow:** Merge #880 only after its current-head CI and independent reviewer approval; then reconcile #881 against merged `main` and independently approve; then reconcile this stacked source-only candidate against the new `main` with its own exact-head CI and Quality/Security review. No AWS, public deployment, paid infrastructure, customer activation or clinical content rights changed in this batch.

### Programme completion metric — confirmed implementation versus approved not-applicable

It is inaccurate to require **172 deployed platform-native implementations** when several of Apple's 172 indexed topics describe watchOS/tvOS/visionOS/macOS-only features that cannot exist as native web, iOS or Android APIs. It is also inaccurate to count a proposed `not_applicable` rationale as independent release approval.

The durable gap report now separates:
1. **Production-verified implementations:** topic-level `implementation: verified` only after real scoped releases, live/physical-device evidence and independent approvals for every applicable platform.
2. **Independently accepted out-of-scope topics:** `implementation: not_applicable` only when all three platform decisions are justified as not applicable and an authorized independent reviewer accepts that scope disposition (not yet recorded for any topic).
3. **Candidate out-of-scope topics:** all platforms assessed `not_applicable` but implementation still `not_verified`. These are **pending** reviewer disposition, not delivered/verified features.
4. **Unresolved topics:** missing source reviews, unresolved platform decisions, platform implementation proofs or acceptance receipts.

The Apple tvOS-only [Digit entry views](https://developer.apple.com/design/human-interface-guidelines/digit-entry-views.md) example is a candidate out-of-scope topic for NovaPharm web/iOS/Android, **not** a verified Apple TV component; native iPhone OTP/MFA is a distinct feature with separate security and accessible input acceptance. Once the user explicitly authorizes the relevant scope and a genuinely independent reviewer records acceptance, it can receive a `not_applicable` topic disposition without ever increasing the `production-verified implementations` count. The programme-wide final signoff must require every topic to be independently dispositioned, all in-scope implementations live-verified, appropriate platform-level evidence and `productionSignoff: granted` from the owner. None of these conditions is met simply by merging source-review PRs.

At this source-only checkpoint: **0/172 production-verified**, **0/172 independently accepted out-of-scope dispositions**, and programme certification **false**. No native code or production authorization was changed.

## 19 November — nine more directly inspected Apple media/native-system topics

This extra review is included in the **existing PR #883** instead of introducing a fourth dependent pull request. All nine original official Apple HIG Markdown articles were read individually on 19 November 2026 and assigned distinct web/iOS/Android acceptance decisions. Review documentation does **not** establish that a native system feature, web app, customer transaction or protected app has been released.

| Official Apple source | Distinct finding / production boundary |
| --- | --- |
| [Printing](https://developer.apple.com/design/human-interface-guidelines/printing.md) | Discoverable Print when possible; use actual system print options and sensible page controls, no visible action where printing is unavailable. Browser print or Android PrintManager are analogous but different native APIs; protect confidential orders/invoices. |
| [Web views](https://developer.apple.com/design/human-interface-guidelines/web-views.md) | WKWebView is an embedded native web presentation, with explicit forward/back where needed and no pointless second full browser. The corporate site is **not** WKWebView; Android's WebView is a different implementation. |
| [Image views](https://developer.apple.com/design/human-interface-guidelines/image-views.md) | Primarily noninteractive image containers. Interactive images should be buttons, text overlays need contrast, and visual images need proper crop and accessibility alternatives. |
| [App Shortcuts](https://developer.apple.com/design/human-interface-guidelines/app-shortcuts.md) | App Intents can expose up to **10** important actions in Siri/Spotlight/Shortcuts; short activation phrases, clear parameters and audio descriptions. Native Apple App Shortcuts are **not** HTML links or Android assistant intents. |
| [Live Activities](https://developer.apple.com/design/human-interface-guidelines/live-activities.md) | In-progress, bounded tasks, minimal/small/expanded/Lock Screen design, preferably short-medium duration; do not show promotions or sensitive details. A public live delivery status widget is not an ActivityKit extension. |
| [Status bars](https://developer.apple.com/design/human-interface-guidelines/status-bars.md) | System-owned iPhone/iPad time/connectivity/battery must not be obscured by interactive content; hiding it is temporary for immersive media, not a default app appearance. Browser progress bars are not Apple status bars. |
| [Home Screen quick actions](https://developer.apple.com/design/human-interface-guidelines/home-screen-quick-actions.md) | Up to **four** high-value app-icon actions, concise predictable localized labels and appropriate monochrome iconography; iOS/iPadOS app-icon shortcuts, not PWA menus or Android launcher actions. |
| [Going full screen](https://developer.apple.com/design/human-interface-guidelines/going-full-screen.md) | Optional task-appropriate immersion, keep essential controls/exit accessible, preserve working context and respect system UI/gestures; browser Fullscreen API and Android immersive mode require separate testing. |
| [Playing video](https://developer.apple.com/design/human-interface-guidelines/playing-video.md) | Prefer system media controls and original aspect ratio, avoid baked-in letterbox bars, preserve familiar keyboard/transport behaviour. Apply captions/transcript accessibility and approved medical content rights separately before any user-facing video. |

**Scope exclusions are explicit:** native Apple Web views, App Shortcuts, Live Activities, iOS/iPadOS system status bars and Home Screen quick actions are not web or Android-native Apple APIs; analogous web/Android experiences are separate and need their own acceptance. A source entry labelled `applicable` means review obligations are relevant; it does not assert a shipped implementation.

**Updated proposed cumulative register:** **99/172 official source reviews (57.6%)**, **297/516 platform applicability decisions (57.6%)**, **73 remaining review topics and 219 remaining platform decisions**. Six partial public observations from four genuine GitHub-origin live workflows remain unchanged; 0/172 fully production-verified implementations and 0 independently approved out-of-scope topic dispositions. The owner release signoff remains `not_granted`.

PR #883 remains dependent on #881 and #880. Merge/reconcile in order with exact-head CI, a genuine independent Quality/Security approval and all external production release gates. No AWS, paid infrastructure, app-store, data rights, payment account, customer transaction or native signing was changed.

## 19 November — native iOS/Android source audit versus signed release evidence

This review inspects **actual files on merged `main`**, not an inferred native-device deployment. All are legitimate source candidates, but **none supplies an independently signed and installed production NovaPharm Intelligence iOS/Android app receipt**.

| Source tree | What exists in GitHub | What cannot be claimed |
| --- | --- | --- |
| `native/novapharm-intelligence-apple/` | Swift 6 `Package.swift` exposes a **library** `NovaMLApple` with macOS 14 and iOS 17 minimums. Files cover gated Core ML, Create ML, Apple Foundation Models assistance, Vision, Language, Speech, App Intents and MapKit research plus separate Swift tests. The package README expressly states it is **not a signed iOS/macOS app**. | An iPhone app bundle, authenticated workspace, provisioning/signing, TestFlight distribution, Apple Store approval, real-device VoiceOver/Dynamic Type or approved model/data rights |
| `native/novapharm-intelligence-android/` | Android research `com.novapharm.intelligence.research`, version `0.1.0-research`, with offline bounded sparse-circuit research UI and unit tests. The manifest denies backup and cleartext traffic and declares **no INTERNET permission**; a debug APK build target may exist. | Signed Play Store AAB, production tenant sign-in/API, medical/pharma data, physical TalkBack/keyboard verification, permitted model inference or distribution to real customers |
| `native/novapharm-intelligence-mobile/` | Independent private Expo/React Native scaffold, currently version 0.1.0, `expo.start`/typecheck/source contract tests, tablet and system appearance settings, and 22 research workspace metadata. The app configuration has no recorded iOS production bundle identifier or Android package ID, and README expressly denies released IPA/APK/AAB. | Production iOS and Android app builds, native signing, protected user onboarding, real-time connected source licences, App Store/Google Play review, device-level HIG validation or customer go-live |

A static source inspection can prove **the current repository is a prototype**, but cannot prove an app was never independently signed or released outside this GitHub repository; that would require platform/developer account evidence and a verified installed binary. No such accepted external platform receipt is part of the current 172-topic register. The Android and Apple CI workflows are useful **compilation/source-test evidence**, not proof of native commercial deployment.

The HIG contract test now checks the true package types, Android research package/manifest and Expo configuration and refuses to equate these source candidates with 172 verified production HIG implementations. It changes neither the app's actual logic nor the owner's source-rights, AWS and production-signoff hold. **Production signoff remains `not_granted`; 0/172 independently production-verified**.

Remaining signed mobile acceptance: known authorized Apple and Google developer identities, actual distributable app artifacts and their signatures/digests, Apple/Play review or controlled internal distribution evidence, device matrix (phone/tablet/RTL/text scaling/dark mode/keyboard/VoiceOver/TalkBack), authenticated tenant and permission boundary tests, crash/upgrade/offline diagnostics, data rights and independent Quality/Security approval. Every topic must be approved as applicable-and-verified or independently accepted as out of scope; do not count unsupported Apple APIs as shipped Android features.
