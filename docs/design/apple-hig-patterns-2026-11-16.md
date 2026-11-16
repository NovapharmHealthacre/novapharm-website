# NovaPharm — Apple Human Interface Guidelines Patterns: web adaptation and acceptance matrix

Date: 16 November 2026. Scope: public Corporate site; managed Corporate app; protected Portal/Intelligence; Distribution/WMS; Technology; Founder; Status; future native apps. This is an implementation contract **and phased gap register**, not a statement that all routes are compliant or deployed.

Primary source: https://developer.apple.com/design/human-interface-guidelines/patterns
Swift Charts reference: https://developer.apple.com/documentation/charts

## Principles of adaptation

1. Apply Apple's **interaction and comprehension principles**, not Apple's proprietary visuals or unrelated iOS-specific APIs. Use semantic HTML and existing NovaPharm branding and design tokens. Preserve the approved healthcare communications, privacy and regulatory boundaries.
2. For each pattern, validate keyboard, pointer, touch, assistive technology, 320–1440 px responsive layouts, right-to-left flow where applicable, browser-supported dark/contrast/reduced-motion preferences and real API error handling.
3. Never represent sample or projected data as observed operational truth. Charts show scope, source, units, freshness, accessible summaries, exact values, missing-data states and truthful drill-down permissions.
4. All regulated actions must preserve existing server-side authorisation, consent, immutable audit trails, safety gating, CSRF protections and validated write contracts. Design components cannot replace those controls.
5. A pattern may be *not applicable*: introducing fitness, haptics, app ratings, system notification APIs, SharePlay or Swift Charts into the web estate without a user task is counterproductive.
6. Track source, implementation, test, merged SHA, published SHA, hostname and authenticated browser proof separately. "Code merged" does not mean "live".

## Section-by-section applicability

| Official Apple section | NovaPharm website interpretation | Applicability and acceptance |
|---|---|---|
| [Charting data](https://developer.apple.com/design/human-interface-guidelines/charting-data) | Accessible labels, comparison scales, colour-independent semantics, exact tables, truthfulness, units and provenance; reuse chart styles across Intelligence/Distribution | **Initial code in this PR**: WMS hypothetical scenario and recorded source chart tables; medicine chart excludes unavailable metrics instead of displaying false zeroes; unique SVG labels and shared chart provenance. Other charts require inventory and browser tests |
| [Collaboration and sharing](https://developer.apple.com/design/human-interface-guidelines/collaboration-and-sharing) | Authorised link/file sharing, clearly scoped recipient permissions, revocation, send-copy versus collaborate, no public private URLs | **Future security-gated**: identify supported back-end permissions and audit endpoints first |
| [Drag and drop](https://developer.apple.com/design/human-interface-guidelines/drag-and-drop) | Support accepted file drops where there is a secure upload endpoint; always provide equivalent accessible file picker or move/copy controls | **Initial code in this PR**: reusable selection-only keyboard picker/drop target with client-side format/size checks and no network transfer; governed server upload and malware scanning still required |
| [Entering data](https://developer.apple.com/design/human-interface-guidelines/entering-data) | Labelled fields, browser autofill, format hints, dynamic validation, accessible required/errors, native keyboard patterns, no prefilled passwords | **Existing and improved components**: FormField now preserves nested ARIA descriptions, required and invalid state; broader form review pending across contact, account, returns, quality and pricing |
| [Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback) | Inline noninterruptive status for routine changes, actionable error for failure, confirmation only for verified important mutation | **Existing components; broader review pending**, including live ARIA feedback |
| [File management](https://developer.apple.com/design/human-interface-guidelines/file-management) | Explicit filename, owner, revision, date, source, preview and download permissions, user-cancellable uploads and accessible browse controls | **Initial reusable local file-selection primitive**; secure preview, save, versions, downloaded copies and API entitlements still require governed endpoint review |
| [Going full screen](https://developer.apple.com/design/human-interface-guidelines/going-full-screen) | Opt-in fullscreen for dense chart/workspace views where browser API supports it; clear escape route and controls | **Initial code in this PR**: optional native-browser full screen on WMS scenario with visible exit; real Chromium/WebKit interaction verification pending |
| [Launching](https://developer.apple.com/design/human-interface-guidelines/launching) | Fast first meaningful content, stable layout, no fake splash, resilient unauthenticated/authorised routes | **Existing performance acceptance; live first paint remains to verify** |
| [Live-viewing apps](https://developer.apple.com/design/human-interface-guidelines/live-viewing-apps) | Only if legitimate live streaming or monitored operations require an immersive real-time feed | **Not currently applicable** to Corporate; any WMS live feeds require evidence of real telemetry |
| [Loading](https://developer.apple.com/design/human-interface-guidelines/loading) | Skeleton or text placeholders, accurate busy/status, avoid layout shifts, progress only when measurable, retries without duplication | **Existing patterns; broader verification pending** |
| [Managing accounts](https://developer.apple.com/design/human-interface-guidelines/managing-accounts) | Allow public browsing without login; separate account interest from invitation/approval; maintain Cognito MFA, role and organisation controls | **Existing work in parallel PRs; security/live verification pending** |
| [Managing notifications](https://developer.apple.com/design/human-interface-guidelines/managing-notifications) | Explicit user choice, quiet defaults, category and urgency, accurate audit/history; browser push requires separate permission and opt-in | **Future consent/security-gated**; never enable push automatically |
| [Modality](https://developer.apple.com/design/human-interface-guidelines/modality) | Short decision-focused modal, contained focus, Escape dismissal, explicit close, restore focus; never show routine info as blocking | **Initial shared ModalDialog in this PR**; controlled consumer adoption and browser proof pending |
| [Multitasking](https://developer.apple.com/design/human-interface-guidelines/multitasking) | Preserve draft/context across navigation when safe, avoid surprise refresh, safe focus return; no storage of clinical or private credentials | **Initial code in this PR**: Intelligence local draft notes warn before leaving until a saved download is confirmed; no browser/server notes persistence. Broader tab-navigation and workspace state review pending |
| [Offering help](https://developer.apple.com/design/human-interface-guidelines/offering-help) | Local contextual help, concise inline hints, support route, role-specific help without leaking private state | **Existing help; quality and relevance audit pending** |
| [Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding) | Short optional task guidance; do not replace genuine account/consent/role verification with a decorative tour | **Existing customer flow; acceptance pending** |
| [Playing audio](https://developer.apple.com/design/human-interface-guidelines/playing-audio) | Native media controls, no unrequested autoplay, captions/transcripts for essential messages, device volume respected | **Conditional on real media** |
| [Playing haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics) | Web vibration is unreliable, potentially intrusive and not a substitute for visible/audible feedback | **Not applicable by default**; no vibration added |
| [Playing video](https://developer.apple.com/design/human-interface-guidelines/playing-video) | User-controlled playback, captions, poster, reduced motion, keyboard/PiP where available and licensed | **Conditional on approved actual videos** |
| [Printing](https://developer.apple.com/design/human-interface-guidelines/printing) | Accessible browser print, A4 invoice/statement/quality document styling, hide navigation, preserve essential IDs and dates | **Initial shared A4 print CSS in this PR**; actual invoices, statements and authorised documents require route-by-route print proof |
| [Ratings and reviews](https://developer.apple.com/design/human-interface-guidelines/ratings-and-reviews) | App Store review solicitation applies to an eligible native app, not regulated wholesale procurement dashboards | **Not applicable to current web estate**; never invent customer testimonials |
| [Searching](https://developer.apple.com/design/human-interface-guidelines/searching) | Clearly state authorised search scope, predictable clear, live count and empty state; no private history by default | **Existing shared search specification**; live medicine and orders checks pending |
| [Settings](https://developer.apple.com/design/human-interface-guidelines/settings) | Prioritise meaningful account, accessibility, language, notification, privacy and consent preferences; reflect true persisted state | **Existing partial implementation**; test preference semantics and safe storage |
| [Undo and redo](https://developer.apple.com/design/human-interface-guidelines/undo-and-redo) | Reversible local changes where safe; clearly identify undo target and result; no optimistic undo of server-side QA, payment or regulated actions | **Initial WMS scenario undo reset in this PR**; larger governed actions require server design |
| [Workouts](https://developer.apple.com/design/human-interface-guidelines/workouts) | Dedicated fitness or wearable interface would be a new product, not a feature of NovaPharm’s current estate | **Not applicable** |

**Swift Charts clarification:** https://developer.apple.com/documentation/charts is a Swift framework, not a JavaScript package. Do not add it to Next.js. Adapt data-visualisation guidelines via accessible web libraries or semantic HTML; preserve chart semantics and data evidence.

## First candidate in this branch

- Shared chart component: optional truthful source/as-at provenance; exact-value table remains accessible even if visual marks are decorative.
- Shared FormField preserves original accessible instructions, required/invalid field semantics; shared tables display explicit scoped empty results.
- Shared document/data-table print CSS now includes A4 page size, clean page boundaries and repeated table headers; original account/invoice provenance must remain server-authoritative.
- Intelligence investigation report drafts now warn on navigation with unexported notes and ask for explicit confirmation of a downloaded copy. Draft text is not placed in localStorage/sessionStorage.
- Shared RTL-aware tabs: ArrowLeft/ArrowRight/Home/End support; panel focus.
- New web-native `ModalDialog`: browser `showModal()` focus containment; Escape handling, explicit close, focus restoration.
- Authenticated WMS capacity scenario: proportional illustrative zone bars, visible numeric text, an exact-value HTML table; multi-step in-memory undo/redo of edits and reset without a server write.
- Authenticated WMS recorded source chart: exact counts and source-unavailable states in a keyboard-scrollable table, without inferring 3PL inventory/throughput totals.
- Medicines Intelligence trend chart: preserve true recorded zeroes but reject missing/null/non-finite metric points; use unique SVG title/description IDs. This is presentation-only and does not alter governed data ingestion.
- Source tests for form/empty tables, WMS charts and medicine observed values; path-scoped GitHub Actions; existing production checks still required.

## Domain-specific acceptance still required

| Property | Required verification before production closure |
|---|---|
| Corporate static and managed | Header and form semantics, cookie and privacy controls, published CSS provenance, browser navigation, print, accessibility |
| Intelligence | Clinical/medicines source, units and dates on charts; no unsourced predictions; authenticated access; no private data in public graphs |
| Distribution/WMS | Scenario versus live segregation, keyboard chart navigation and readout, mobile overflow, reset/undo behaviour; no inventory mutation |
| Customer/employee portal | 54-module role matrix, authenticated search/actions, in-flight state, tickets/returns/quality statuses and page focus |
| Technology | Dense information hierarchy, accessible datasets, document sharing boundaries |
| Founder | Reading flow, media captions, accessible links and distraction-free layouts |
| Status | Real incident timestamps/changes, source of truth, notification opt-in and no fabricated uptime |

## Release gates (do not skip)

1. Recheck head SHA and conflicts with concurrently open Writing/RTL/Motion/Privacy PRs.
2. Run design-system typecheck/tests, portal WMS pattern/unit tests, production readiness, CodeQL and all required browser/public portal checks.
3. Review high contrast, RTL, keyboard, touch, screen-reader announcements, native Escape/focus restoration and reduced-motion at real browser runtime.
4. Merge only if all required checks pass. Verify successful publisher run for exact merged SHA and test each independent live domain. Never infer a private AWS deployment from a GitHub source merge.
5. For remaining 25-topic audit, create measured follow-up PRs tied to actual pages and allowed data sources rather than adding unsafe untested features.

## Source policy

All cited official pattern pages live under https://developer.apple.com/design/human-interface-guidelines/patterns. Preserve Apple's copyright and do not copy native assets or proprietary interaction code.


## Controlled document access presentation (additional source candidate)

A new `ControlledDocumentViewer` component displays a private document preview only when a **server-provided**, document/version-specific access decision is verified and `mayRead` is true. Version, sharing scope and content stay hidden when access is unverified or revoked. The download link also requires `mayDownload` and a local relative URL, and must be independently re-authorised by the serving private endpoint. This does **not** create a sharing or revocation API, expose private document storage, verify a recipient, or demonstrate live permission enforcement. Secure previews, version histories, recipient revocation and audit records remain backend acceptance work.

No real document contents may be passed to this component before the server has verified the current tenant, user, document and version. Never infer permission from the UI props alone.

## Notification settings — verified-receipt presentation (additional source candidate)

The new `NotificationPreferenceEditor` renders only a **server-verified** record, with revision, optional topics and server-defined immutable categories. If access has not been verified or a save service has not been supplied, the form stays unavailable/read-only. Saving is explicit and stays unconfirmed until the authorised service returns `ok: true` and a nonempty revision. Errors never become successful preferences. No browser notification permission prompt, push, email or SMS delivery is initiated.

Production activation requires: authenticated tenant-specific source, persisted preference API with CSRF/authorisation, optimistic concurrency, opt-in consent evidence, audit records, separate delivery policy and security/critical alerts protected against inappropriate opt-out. Do not represent this code as an active customer settings service or live opt-in.

The controlled document viewer introduced earlier is likewise only a fail-closed presentation boundary. It does not establish a production share, revoke permissions, upload, or directly deliver confidential files.
