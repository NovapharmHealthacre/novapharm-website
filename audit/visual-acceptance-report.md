# Visual Acceptance Report

Candidate date: 13 July 2026  
Status: source-level acceptance passed; rendered browser acceptance blocked and not claimed

## Required matrix

| Engine | 1440x900 | 1920x1080 | 1024x1366 | 768x1024 | 390x844 | 430x932 | 375x667 |
|---|---|---|---|---|---|---|---|
| Chromium | Not run | Not run | Not run | Not run | Not run | Not run | Not run |
| WebKit / Safari-compatible | Not run | Not run | Not run | Not run | Not run | Not run | Not run |

## Why this remains blocked

- The sandbox rejects a local HTTP listener with `EPERM`.
- The in-app browser connected successfully, but its URL policy rejects local `file://` navigation; the blocked navigation was not bypassed.
- No standalone Chromium executable or bundled Playwright Chromium/WebKit browser is installed in the accessible runtime.
- Safari is installed, but a supported automated browser session is not available.
- No owner-approved private Render preview URL exists.

No screenshots have been fabricated and Lighthouse or accessibility scores are not estimated.

## Source-level evidence completed

- 33 intended public pages and 40 data-free locked portal shells have mobile viewport declarations.
- Every image has alternative text and intrinsic dimensions; official logo files match approved master hashes.
- Heading order, one-H1 structure, skip links, canonicals, JSON-LD and internal assets pass repository validation.
- CSS includes tablet/mobile breakpoints, stable grid constraints, table overflow containment, mobile form stacking, reduced-motion handling, focus indicators and responsive portal navigation.
- Public pages contain no placeholder content, retired raw browser errors or exposed operational bindings.
- Contact and account forms include accessible summaries/status regions and safety/privacy notices.

## Rendered pages still requiring evidence

The private preview pass must cover Homepage; About; Company; Governance; Leadership index and five profiles; Services; Regulatory; Products; Partners; Technology; Insights index and six articles; Contact; Account application; all six policy pages; portal login; Customer, Employee, Board, Executive and Administrator pages; password change; cookie banner and preference centre; 404; 500; and 503.

Inspect logo sharpness and contrast, header and mobile menu, image quality, typography, wrapping, spacing, forms, tables, cookie controls, focus states, 200% zoom, reduced motion, horizontal overflow and engine-specific differences. Record screenshots and defect resolutions before merge approval.
