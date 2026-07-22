# CRO Browser Acceptance Report

Candidate date: 18 July 2026

Status: local candidate passed; exact final-head GitHub aggregate is the release gate

## Focused CRO acceptance

- Runtime: Node 24.14.0, Playwright 1.61.1 and Axe Playwright 4.12.1
- Engines: Playwright Chromium and WebKit (Safari-compatible)
- Routes: Home, CRO, Services, Regulatory, Partners, Technology and Contact
- Viewports: 1920x1080, 1440x900, 1366x768, 1280x800, 1280x720, 1024x1366, 768x1024, 430x932, 390x844, 375x667, 360x800 and 320x568
- Additional state: CRO with JavaScript disabled in both engines
- Rendered cases: 170
- Axe scans: 168
- Recorded issues: 0

The run used the final generated HTML, bundled CSS, responsive media and compressed NovaPharm Node runtime.

## Complete repository matrix

The acceptance workflow now uses six isolated shards: Chromium desktop, tablet and mobile, plus WebKit desktop, tablet and mobile. Every viewport inspects all 39 public routes and all 56 protected routes with the correct synthetic role session.

- Routes per viewport: 95
- Engine and viewport combinations: 24
- Page inspections required by the aggregate gate: 2,280
- Axe scans required by the aggregate gate: 2,280
- Curated screenshots: 348
- Material issues in the local working-tree rehearsal: 0

The first local rehearsal shared one synthetic server across all six shards. Its IP-based 16-attempt login budget was correctly exhausted after four shards, so the remaining WebKit tablet and mobile shards were rerun sequentially against a fresh isolated synthetic runtime. No rate limit was weakened. GitHub gives each shard its own runtime and the aggregate gate rejects missing coverage, a dirty checkout, mismatched commit identity, failed cleanup or any recorded issue.

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
- All six sponsor-decision options, including the conventional full-service no-fit route
- CRO enquiry option on Contact
- Core CRO content and disclosure controls without JavaScript
- Correct customer, employee, board and administrator route isolation
- Synthetic runtime and credential-directory cleanup

## Screenshot correction

The failed predecessor workflow tried to capture every route as a full-page PNG. WebKit rejected the 33,362-pixel 320 px CRO page because it exceeded the engine's 32,767-pixel screenshot limit. The corrected harness retains complete rendered and Axe coverage, captures a curated JPEG evidence set and automatically falls back to the viewport if either document dimension exceeds 32,000 pixels.

## Human screenshot review

The committed owner-review package covers full-page desktop, tablet and mobile states; the 1280x800 header; seven signature sections; a media contact sheet; and a true before/after comparison. It was inspected for crop, contrast, typography, CTA fit, logo clarity, header behaviour, hero readability and boundary-caption visibility.

Evidence: `audit/evidence/cro-owner-review/manifest.json`

CI diagnosis: `audit/cro-final-ci-diagnosis.md`

This report does not claim testing on physical Safari hardware, every browser extension configuration or every operating-system font-rendering mode.
