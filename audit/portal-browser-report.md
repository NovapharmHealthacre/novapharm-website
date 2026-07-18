# Enterprise Portal Browser Acceptance Report

**Review date:** 18 July 2026
**Current candidate status:** Passed locally; exact pushed SHA requires the normal PR workflow rerun

## Acceptance Matrix Prepared

The repository browser harness has been expanded to exercise the complete current candidate:

| Area | Routes |
| --- | ---: |
| Public, legal and error pages | 38 |
| Customer modules and password change | 19 |
| Employee modules | 13 |
| Executive Platform and executive modules | 19 |
| Administrator modules | 5 |
| **Total per engine/viewport** | **94** |

The matrix runs in Chromium and WebKit at:

- 1440 × 900
- 1920 × 1080
- 1024 × 1366
- 768 × 1024
- 390 × 844
- 430 × 932
- 375 × 667

It checks response status, unexpected redirects, one-H1 structure, horizontal overflow, text overflow, incomplete/broken images, official-logo presence, console errors, prohibited raw messages, cookie controls, mobile navigation and Axe violations. Customer, employee, board and administrator storage states are authenticated separately.

## Current Candidate Run

The isolated runtime was created with synthetic credentials, local-only email capture, private local document storage and a seeded SQLite database. No credential value was printed or placed in an artefact. Contact submission, the four-stage account application, controlled PDF upload, local email previews and administrator review passed in both Chromium and WebKit before the route matrix ran.

The final matrix completed on 18 July 2026 with:

- 1,316 rendered page states;
- 1,316 Axe WCAG scans;
- 1,464 screenshots;
- 38 public/legal/error routes and 56 protected routes;
- Chromium and WebKit at all seven required viewports;
- zero accessibility, overflow, image, heading, redirect, console, logo or prohibited-message findings.

The first expanded run identified an unseeded CI runtime, Nutraxin caption contrast, one narrow composition row, mobile metric wrapping and owner-review label contrast. The runtime and styles were corrected. A focused 56-page regression then passed with zero issues, followed by the complete zero-issue rerun above.

The machine-readable local report is intentionally ignored with the screenshot set because it contains local validation state. A compact credential-free summary is committed at `audit/evidence/enterprise-portal-browser-summary.json`. GitHub regenerates short-retention evidence for the pushed SHA.

## Visual Review

Representative homepage, Nutraxin, customer account/dashboard, employee CRM/product master, CEO dashboard and administrator owner-review screenshots were inspected after the automated run. The official logo, responsive hierarchy, one-column mobile metrics, catalogue disclosures, controlled status language and table containment were coherent in the reviewed Chromium and WebKit captures.

## Remaining Boundary

This evidence proves the local synthetic candidate, not Azure hosting, production identity, Microsoft Graph, SharePoint permissions, real email delivery, production malware scanning or live pharmaceutical operations. The PR browser workflow must pass again against the exact pushed commit.
