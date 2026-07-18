# CRO Browser Acceptance Report

Candidate date: 18 July 2026

Status: passed

## Executed coverage

- Runtime: Node 24.18.0, Playwright 1.61.1 and Axe Playwright 4.12.1
- Engines: Playwright Chromium and WebKit (Safari-compatible)
- Routes: Home, CRO, Services, Regulatory, Partners, Technology and Contact
- Viewports: 1920x1080, 1440x900, 1366x768, 1280x800, 1280x720, 1024x1366, 768x1024, 430x932, 390x844, 375x667, 360x800 and 320x568
- Additional state: CRO with JavaScript disabled in both engines
- Rendered cases: 170
- Axe scans: 168
- Recorded issues: 0

The run used the final generated HTML, bundled CSS, responsive media and compressed NovaPharm Node runtime.

## Contracts checked

- Successful response and one visible H1
- Official logo load and intrinsic dimensions
- Desktop navigation and mobile menu breakpoint behaviour
- No horizontal document or text overflow
- No broken images
- No browser console errors
- No third-party runtime requests
- Reduced-motion operation
- CRO signature-section and content counts
- All six sponsor-decision options, including the no-fit full-service route
- CRO enquiry option on Contact
- Core CRO content and disclosure controls without JavaScript

## Human screenshot review

The committed Chromium and WebKit desktop, tablet and mobile screenshots were inspected for crop, contrast, typography, CTA fit, logo clarity, header behaviour, hero readability and boundary-caption visibility. No material defect remains in the captured first viewport.

Evidence: `audit/evidence/cro-browser/cro-browser-acceptance.json`  
Evidence SHA-256: `08d8d92e5da8002dfa0a234f55766427a6abc7a1e9cece80d5b255a798ca2064`

This report does not claim testing in physical Safari hardware, every browser extension configuration or every operating-system font-rendering mode.
