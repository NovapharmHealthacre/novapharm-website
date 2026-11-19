# NovaPharm — Apple HIG complete-estate design source audit

**Checkpoint:** 17 November 2026  
**Reference main SHA:** bbdd955e5f4ecb143fed0b5f265224179659e8ca  
**Repository:** https://github.com/NovapharmHealthacre/novapharm-website  
**Status:** Source-level review and selected public live verification; NOT estate-wide production acceptance.

## Operating interpretation

Apple HIG and Apple Design Resources set quality, hierarchy, interaction and accessibility principles. They do not grant a licence to copy Apple's visual identity, fonts, SF Symbols artwork, product screenshots, native controls or source code. Native SwiftUI/UIKit/AppKit APIs and downloaded .dmg application/tool installers cannot be transplanted into React or public HTML/CSS. This estate must remain recognisably NovaPharm: owner-approved marks, predominantly white and neutral surfaces, graphite text, restrained #E3120B corporate accent, legitimate product imagery, clear legal disclosures and deliberate Founder dark-theme exception.

**No blanket pixel-identical Apple claim** is authorised. Use principles where applicable and verify browser-native equivalents, not native-platform fidelity.

## Evidence used, and its limits

1. Current default branch at SHA above, CSS entrypoints, generated bundle, shared Next.js app layouts, tests, documentation and GitHub PRs/issues.
2. Official Apple HIG pages for colour, typography, images, layout, materials, accessibility, buttons, menus/actions and SF Symbols, plus Apple Design Resources.
3. Public website pages: https://novapharmhealthcare.com/ , /about/ , /capabilities/ , /products/nutraxin/ and https://portal.novapharmhealthcare.com/ . Text/HTML inspection and public CI receipts are NOT equivalent to human-completed screenshots of all states.
4. Current GitHub Actions evidence on the reference SHA: Corporate live Chromium/WebKit/Firefox (run 44011006829), Live Capabilities (44011006907), Oncology live custom domain (44011006818), public Pages browser (44010649628), RTL live proof (44011006877), image (44010649547), typography (44010649453), materials (44010649215), motion (44010649725), production-readiness source gate (44010649414). These successes are scoped to each workflow.
5. Original binary Apple .dmg / asset bundles were not available as mounted binaries to inspect or execute in this audit. Apple Design Resources were reviewed as public documentation; absence of downloadable artefact inspection is explicitly **not** a completed binary audit.

## 21-part Apple-to-NovaPharm verification matrix

| # | Discipline | Confirmed source / observation | Unclosed acceptance requirement |
|---:|---|---|---|
| 1 | Brand identity and logo | Approved NovaPharm red branding; #802/#803 footer mark fixes merged | Verify original logo renders correctly at every relevant origin and viewport |
| 2 | Palette and colour tokens | assets/css/novapharm-hig-colours.css provides semantic light/dark/contrast tokens; accent #E3120B | Browser-computed colours and 4.5:1 text contrast for each actual state |
| 3 | Gradients and art direction | Generated public CSS contains 86 gradient-function occurrences (raw code, not 86 active visual effects); a light Earth/sky gradient is intentionally authored | Evaluate actual applied gradients, remove unapproved decoration, keep only meaningful hero/image contrast |
| 4 | Typography and hierarchy | assets/css/tokens.css defines licensed system fallback stacks, fluid type roles and tabular numbers | Audit computed font sizes/line-height/weight/baselines at every route and zoom level |
| 5 | Small text and caption legibility | Generated public CSS has 185 literal 10–13px font-size declarations (raw CSS occurrences, not 185 confirmed defects) | Determine which legacy declarations remain active; remediate inaccessible labels, footers, forms and locale help |
| 6 | Section hierarchy and reading measure | Shared 1200px layout contract and 68ch reading measure | Verify section order, contrast, line breaks and whitespace at mobile/tablet/desktop |
| 7 | Content grids, alignment and safe areas | assets/css/apple-hig-layout.css contains responsive grids/logical gutters/safe-area handling | Prove no sticky-header overlap, horizontal overflow, misalignment or content clipping per route |
| 8 | Buttons, links and states | Shared minimum 44px touch rules, focus styling and button/action semantics | Verify computed target sizes, primary/secondary hierarchy, loading/disabled/hover and destructive confirmation |
| 9 | Forms and data entry | Shared labels, field sizing, keyboard and focus safeguards exist | Test actual input hints, invalid/errors, async loading, submit, retry and zoom states |
| 10 | Main navigation / menus | #798, #799 and #793 merged; compact desktop and responsive menu sources exist | All links, menu keyboard control, RTL, popup return focus and real live click paths |
| 11 | Footer and disclosures | #791, #797, #802 and #803 merged; new footer and logo browser regression tests | Reconcile sitewide legal/company links, appearance parity, keyboard, full-page image load and independent managed app footers |
| 12 | Photography and hero art | image presentation contracts and genuine approved product pack imagery | Retina/width descriptors, right crop, product containment, attribution/rights, alt, failure/loading |
| 13 | App icons and web symbols | Web-safe original symbol system and Icon Composer governance, no proprietary native SF artwork | Optical scale and intent, no gratuitous icons; native app icon use gated on native app reality |
| 14 | Transparency, materials and shadows | materials stylesheet restricts blur to navigation/menus, with solid content and fallbacks | Browser-computed readability across transparency/high contrast/backdrop support |
| 15 | Motion and reduced effects | Motion contract exists, recent CI success | Verify real motion is purposeful and reduced-motion/forced-colour settings behave correctly |
| 16 | Cards, collections, disclosures, tabs | Shared layout-organization primitives and accessible menu/actions patterns merged | Test interaction, focus order, list semantics, search, resize, touch, undo and modal escape |
| 17 | Tables, charts and dense workspaces | Data tables use bounded horizontal regions; accessibility/chart patterns exist | Real data/provenance, row headers, table alternatives, keyboard and screen reader review |
| 18 | Accessibility and inclusivity | Source WCAG design tokens, keyboard/role/focus tests exist | Independent WCAG 2.2 AA computed audit; VoiceOver/NVDA and 200–400% zoom signed-in acceptance |
| 19 | Locale, language and RTL | Arabic/Hebrew source foundation, live public RTL browser workflow success | Full translation/real content and private route RTL acceptance: issue #772 |
| 20 | Consent, privacy and regulatory copy | Source safeguards; public compliance and legal content present | User-visible consent, persistence, legal claims and authenticated boundaries: issues #733, #713 |
| 21 | Production provenance and true module operation | GitHub main and scoped tests pass for named public routes | Compare deployed SHA/assets/aliases and perform authorized signed-in role checks across every real Portal/WMS/Intelligence module: #717, #601 |

**Important reading rule:** 86 gradient occurrences and 185 under-14px font declarations above are non-deduplicated static counts of text patterns in the generated bundle. They are *triage indicators* (may include old, overridden, hidden, responsive or deliberate styles), not a count of affected pages, or independently reproduced visual bugs.

## Confirmed source gap fixed on this branch

The maintained alternate public stylesheet assets/css/novapharm.css had semantic colours, accessibility, layout, materials and motion imports, but lacked the shared assets/css/novapharm-apple-27-web-adaptation.css import. The generated assets/css/novapharm.bundle.css **did** already include this adaptation, and the independently hosted Next.js roots imported it. This branch inserts the missing public entrypoint import after materials and before motion, matching the generated bundle, and expands scripts/test-apple-27-cross-estate-parity.mjs so both public CSS entrypoints and the bundle builder must retain this ordered design layer.

This is a **source parity correction**, not proof that a live route was missing this layer or that it was previously a visible page defect. The bundle is not being regenerated because its design layer already exists. No customer data, identity, payments, medicines, infrastructure, AWS or protected service is changed.

## Current merge vs live distinction

- Merged: footer #802 and wordmark follow-up #803. Main exact SHA above has green public and design CI gates described in the evidence.
- Open: #367 (18-point visual/production forensic acceptance), #717 (protected app acceptance), #713 (full accessibility), #772 (complete multilingual RTL), #733 (privacy), #804 (footer cross-estate acceptance).
- Open PR #789 documents a 16 November managed Intelligence sign-in copy divergence: a source update in #785 was not seen at that managed public origin. PR #789 only repairs the fail-closed verifier, not the managed deployment.
- The 30 August 2026 “48 section” and “54 module” autogenerated audits are **historical**, not dated production certificates. Existing 54-module source catalogue and 22 Intelligence-workspace listings do not imply those private modules are active or accepted.
- No claim of 100% live, no native Apple DMG execution, and no protected-user activity is made by this review.

## Exit criteria for claiming 100% within a defined scope

Each page/module requires: (a) exact route and user role, (b) intended design tokens, computed screenshots at 320/390/768/1024/1440/1920, (c) Chromium/WebKit plus Firefox where supported, (d) keyboard, focus, contrast, assistive-technology and 200–400% zoom, (e) forms/buttons/menus/links/empty-loading-error/RTL states, (f) lawful assets and clinical/commercial data rights, (g) immutable tested commit SHA and deployed build/alias with independent customer-origin receipts and rollback. A hidden/nondeployed or default-deny module must be marked as such instead of “complete”.

## Official Apple source families consulted

- https://developer.apple.com/design/human-interface-guidelines/
- https://developer.apple.com/design/human-interface-guidelines/color
- https://developer.apple.com/design/human-interface-guidelines/typography
- https://developer.apple.com/design/human-interface-guidelines/images
- https://developer.apple.com/design/human-interface-guidelines/layout
- https://developer.apple.com/design/human-interface-guidelines/layout-and-organization
- https://developer.apple.com/design/human-interface-guidelines/materials
- https://developer.apple.com/design/human-interface-guidelines/buttons
- https://developer.apple.com/design/human-interface-guidelines/menus-and-actions
- https://developer.apple.com/design/human-interface-guidelines/sf-symbols
- https://developer.apple.com/design/human-interface-guidelines/accessibility
- https://developer.apple.com/design/resources/
- https://developer.apple.com/app-store/marketing/guidelines/

## Implementation priorities

**P0:** Prove independently deployed managed Intelligence/Portal/WMS runtime SHAs and privacy/security/role boundaries; investigate #789, #717, #601, #733.  
**P1:** Close #367 page-by-page and #713 accessibility using current full-page browser captures and actual computed styles; map small text/gradients only where used.  
**P2:** Complete RTL/localisation across real workflows (#772), full document/media rights, optical/pixel alignment, and post-release regression evidence.

Do not merge overlapping historical PRs merely to advance a completion percentage. The code fix in this branch should be merged only when latest-head mandatory checks pass; recheck public bundle/entrypoint parity and actual production publication separately.
