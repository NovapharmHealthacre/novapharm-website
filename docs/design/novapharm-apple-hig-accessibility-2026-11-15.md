# NovaPharm accessibility — Apple HIG to WCAG 2.2 AA web implementation
**Audit and source implementation:** 15 November 2026  
**Status:** code candidate in feature branch. **Not a claim of live deployment or WCAG certification.**

## Primary source interpretation

- [Apple HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) — intuitive, perceivable, adaptable interfaces; vision, hearing, mobility, speech and cognitive accessibility.
- [Apple Accessibility documentation](https://developer.apple.com/documentation/accessibility) — native feature domains, assistive technologies, accessibility testing, Apple platform APIs.
- [Apple VoiceOver](https://developer.apple.com/design/human-interface-guidelines/voiceover) — accurate element descriptions, meaningful images, proper heading/group hierarchy, changes of context.
- [Apple accessibility testing](https://developer.apple.com/documentation/accessibility/performing-accessibility-testing-for-your-app) — per-task matrix with display preferences, VoiceOver, Voice Control and Switch Control.
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) — testable web acceptance criteria, target Level AA.

The Apple Accessibility framework is a **native Apple-platform API**, not a script, dependency or styling system to embed in a website. Web equivalents use semantic HTML, CSS media queries, browser accessibility-tree semantics, WAI-ARIA where appropriate, and WCAG acceptance tests. Do not copy Apple proprietary icons/fonts, claim Apple's endorsement, install native Xcode libraries into web pages, or advertise App Store accessibility labels for a website.

## Current-slice implementation

| Domain | Reviewed web adaptation | Source evidence | Acceptance |
| --- | --- | --- | --- |
| Vision / colour | Default semantic colour tokens already exist; stronger keyboard focus, high-contrast outlines, and forced-colour keyboard styling added | `assets/css/novapharm-hig-accessibility.css`, `assets/css/novapharm-hig-colours.css` | New contract test; comprehensive computed contrast scan remains required |
| Larger text | Existing responsive typography, headings and reflow foundations retained; anchor targets offset from sticky header | `assets/css/novapharm-hig-accessibility.css` | 200%/400% zoom and 320px reflow evidence pending |
| VoiceOver / navigation | Correct current-page states only for exact primary links, descriptive menu-button name, focus return on Escape | `assets/js/novapharm.js` | Browser assertions added; manual VoiceOver pending |
| Mobility / touch / switch | 44px minimum menu and mobile primary-navigation target; existing link alternatives retained | `assets/css/novapharm-hig-accessibility.css` | Browser assertions and device Switch Control pending |
| Cognitive / motion | Reduce Motion preserves legibility and disables navigation transitions/smooth scrolling; menu closes predictably | `assets/css/novapharm-hig-accessibility.css`, `assets/js/novapharm.js` | Browser computed-style assertion; manual review pending |
| Speech / voice input | Explicit accessible menu button names; native link/button activation retained | `assets/js/novapharm.js` | Voice Control label-in-name/manual testing pending |
| Hearing / media | Do not convey critical state only by sound | Existing designs; no media change in this patch | Inventory audio/video, captions/transcripts/audio descriptions pending |
| Regression prevention | Static source/bundle/landmark contract added and browser flows extended | `scripts/test-apple-hig-accessibility.mjs`, `scripts/test-public-pages-browser.mjs`, `package.json` | GitHub exact-head CI and release artifacts pending |

## WCAG 2.2 AA traceability

- **1.1.1 Non-text Content:** verify useful image alt text, decorative images empty alt or hidden, and nonvisual data alternatives for charts; existing image inventory is not final certification.
- **1.2.1–1.2.5 Media:** applicable captions, transcripts and audio descriptions where video/audio exists.
- **1.3.1–1.3.5 Info and relationships:** headings/landmarks, form labels, logical reading order and autocomplete meaning.
- **1.4.1 / 1.4.3 / 1.4.11:** never communicate availability, errors, or statuses by colour alone; test 4.5:1 normal text, 3:1 large text and non-text contrast.
- **1.4.4 / 1.4.10 / 1.4.12:** 200% text sizing, 400% zoom/reflow and user-defined spacing without lost content or interactions.
- **2.1.1 / 2.1.2:** keyboard-only workflows, no focus traps, meaningful Escape and focus return.
- **2.2 / 2.3:** no unexplained disappearing feedback or problematic flashing/motion; respect Reduce Motion.
- **2.4.1 / 2.4.3 / 2.4.7 / 2.4.11:** bypass navigation, logical focus sequence, visible unobscured focus.
- **2.5.3 / 2.5.7 / 2.5.8:** Voice Control labels match visible names, gesture alternatives and adequate target sizing/spacing.
- **3.2 / 3.3:** predictable controls, accessible errors, confirmations for high-impact changes, non-redundant entry, accessible sign-in, reversible edits.
- **4.1.2 / 4.1.3:** semantics, states, values and announced asynchronous updates.

## Task-by-task release matrix (must be evidenced, not inferred)

1. **Public corporate:** browse home, menu, products, accessibility statement and contact with mouse, keyboard, Safari VoiceOver and NVDA; cookie banner dismiss/reopen, correct focus order and live feedback.
2. **Nutraxin / ESCO / unified ordering:** navigate product collection, add/remove Bag line, edit quantities, sign in, account details, select delivery address and submit only authorized orders. No live card charges during acceptance.
3. **Distribution / WMS:** review dispatch, tables, charts and search, accessible table headers and chart descriptions, keyboard-only workflows and secure authorization.
4. **Intelligence / Medicines Terminal:** sign in with MFA, traverse all 22 modules, search/filter, inspect tables/charts, distinguish evidence completeness from access claims and announce async updates without leaking private data.
5. **Display/browser matrix:** Chromium, Firefox, WebKit/Safari, iOS Safari; 320, 360, 390, 430, 768, 1024, 1440 and 1920px; 200% text scaling, 400% zoom/reflow; forced colours, high contrast, reduced motion and reduced transparency.
6. **Assistive technology:** macOS/iOS VoiceOver, Windows NVDA, Voice Control and Switch Control. Test primary tasks with accessibility preferences one at a time, including cognitive load and time constraints.
7. **Security/production:** exact PR SHA checks, unchanged contact fail-closed conditions, no bypass of account authorization, no real payments or shipping, verified immutable published artifact and rollback.

## Known incomplete items

This slice does **not** assert that the public site, the AWS-backed customer portal, WMS, or NovaPharm Intelligence passes every item above. Pending: computed colour audit across *all* interactive states; 200%/400% real browser zoom/reflow; physical-device VoiceOver/Voice Control/Switch Control; alt-text/chart audits; captions/media inventory; cart, address, MFA and 22-module end-to-end accessibility; and deployed SHA parity. The source branch is reviewable but not a verified live release.

**Change discipline:** do not weaken existing accessibility, privacy, regulatory, payment or production test gates to force a green status.
