# CRO Accessibility Report

Candidate date: 18 July 2026

Status: automated and manual candidate checks passed; no independent WCAG certification is claimed

## Implemented accessibility

- Semantic header, navigation, main, section, article, list, figure and footer structure
- One clear H1 and ordered heading hierarchy
- Keyboard-operable links, details disclosures and decision controls
- Visible focus states inherited from the NovaPharm system
- Core content present and usable without JavaScript
- `aria-current` for the active navigation and active lifecycle stage
- Polite status announcement for lifecycle and decision enhancements
- Accurate image alt text, captions and intrinsic dimensions
- Explicit reduced-motion behaviour
- Stable two-column mobile lifecycle navigation rather than hidden horizontal scrolling
- Clear link and button labels; no icon-only CRO actions
- Contact safety warning and contextual enquiry option

## Test evidence

Playwright 1.61.1 and Axe Playwright 4.12.1 scanned 168 rendered route/viewport/engine states. Chromium and WebKit covered 320 px through 1920 px widths. Zero Axe issues remained. Two no-JavaScript CRO states were inspected separately and passed the content and visibility contracts.

Manual screenshot and keyboard-oriented review confirmed readable hero contrast, visible captions, usable mobile menu, stable focusable controls, no clipped text and no horizontal page overflow.

## Defects corrected

- Challenge-panel eyebrow contrast
- Services dark editorial-label contrast
- Technology status-grid text overflow
- Mobile lifecycle navigation discoverability

## Boundary

Automated testing cannot establish full WCAG 2.2 AA conformance. An independent assistive-technology review with representative users remains recommended before describing the section as fully conformant.
