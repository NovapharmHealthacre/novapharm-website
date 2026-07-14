# Visual Acceptance Report

Candidate date: 14 July 2026  
Status: source-level acceptance passed; rendered browser acceptance blocked and not claimed

## Required matrix

| Engine | 1440x900 | 1920x1080 | 1024x1366 | 768x1024 | 390x844 | 430x932 | 375x667 |
|---|---|---|---|---|---|---|---|
| Chromium | Not run | Not run | Not run | Not run | Not run | Not run | Not run |
| WebKit / Safari-compatible | Not run | Not run | Not run | Not run | Not run | Not run | Not run |

## Why this remains blocked

- The sandbox rejects a local HTTP listener with `EPERM`.
- The in-app browser connected successfully. A direct navigation attempt to `https://novapharmhealthcare.com/` was rejected by the browser safety policy, and the restriction was not bypassed.
- The browser URL policy also rejects local `file://` navigation.
- No standalone Chromium executable or bundled Playwright Chromium/WebKit browser is installed in the accessible runtime.
- Safari is installed, but a supported automated browser session is not available.
- No owner-approved private Azure staging URL exists.

No screenshots have been fabricated and Lighthouse or accessibility scores are not estimated. Repository-level responsive contracts are evidence of implementation, not a substitute for the required rendered matrix.

## Source-level evidence completed

- 33 intended public pages and 40 data-free locked portal shells have mobile viewport declarations.
- Every image has alternative text and intrinsic dimensions; official logo files match approved master hashes.
- Heading order, one-H1 structure, skip links, canonicals, JSON-LD and internal assets pass repository validation.
- CSS includes tablet/mobile breakpoints, stable grid constraints, table overflow containment, mobile form stacking, reduced-motion handling, focus indicators and responsive portal navigation.
- Public pages contain no placeholder content, retired raw browser errors or exposed operational bindings.
- Contact and account forms include accessible summaries/status regions and safety/privacy notices.

## Rendered pages still requiring evidence

The private Azure staging pass must cover Homepage; About; Company; Governance; Leadership index and five profiles; Services; Regulatory; Products; Partners; Technology; Insights index and six articles; Contact; Account application; all six policy pages; portal login; Customer, Employee, Board, Executive and Administrator pages; password change; cookie banner and preference centre; 404; 500; and 503.

Inspect logo sharpness and contrast, header and mobile menu, image quality, typography, wrapping, spacing, forms, tables, cookie controls, focus states, 200% zoom, reduced motion, horizontal overflow and engine-specific differences. Record screenshots and defect resolutions before merge approval.

The controlled GitHub workflow materialised all eight registered Pexels selections at commit `9573972b1f89534006f05dd227c7ae3e6dc8cb88`: 24 AVIF/WebP/JPEG derivatives, each technically validated at 1600x900 with content type, byte size and SHA-256 recorded. The product page now emits responsive `<picture>` elements with those real images. This is technical acceptance only. Direct visual inspection of the repository image host was blocked by browser safety policy, so crop quality, visible third-party branding, contextual suitability and desktop/mobile rendering still require the private staging matrix and owner approval.
