# Visual Acceptance Report

Candidate date: 14 July 2026  
Status: local rendered acceptance passed; Azure-hosted acceptance pending

## Executed matrix

| Engine | 1440x900 | 1920x1080 | 1024x1366 | 768x1024 | 390x844 | 430x932 | 375x667 |
|---|---|---|---|---|---|---|---|
| Chromium 149 | Passed | Passed | Passed | Passed | Passed | Passed | Passed |
| WebKit 26.5 (Safari-compatible) | Passed | Passed | Passed | Passed | Passed | Passed | Passed |

The Playwright acceptance run rendered 44 routes in both engines at all seven viewports: 616 page states, 616 axe scans and 764 genuine screenshots. The final run completed with zero recorded layout, console, network, accessibility or responsive-contract issues. Its machine-readable evidence SHA-256 is `fa206af910a1e02d8ad5d74e4b68071b1b6983d7516482ec4e5e6d41c45ad77c`.

Coverage included 37 public routes and seven authenticated/protected states: the homepage; company, governance and leadership content; all five leadership profiles; Services; Regulatory; Products; Partners; Technology; Insights and all six articles; Contact; account application; all legal pages; portal login; Customer, Employee, Board, Executive and Administrator areas; password change; cookie preferences; and 404, 500 and service-unavailable states.

## Defects resolved

- The first rendered run found 70 repeated contrast failures. Product-panel supporting text, portal logout controls, status pills and the administrator eyebrow were corrected and re-tested.
- The Specialty image contained visible branded medicines and the logistics image contained visible third-party branding. Both were replaced with documented Pexels-licensed, neutral pharmaceutical/logistics photography and re-rendered.
- All eight product-card crops were captured separately in both engines and visually reviewed. Their register status is `rendered-and-brand-reviewed`.
- Desktop and mobile navigation, logo rendering, cookie controls, form states, focus indicators, table overflow, reduced motion, long-page wrapping and protected-route states were inspected without a remaining material defect.

## Evidence boundary

Raw screenshots and the full JSON result remain ignored build evidence under `artifacts/visual-acceptance-passed/`; the compact evidence record is committed at `audit/evidence/browser-acceptance-summary.json`. The run used the local production-mode Node application with synthetic users and records. It proves rendered application behaviour, not Azure F1, Azure SQL, Entra, Blob, network latency or the generated Azure hostname. Those hosted checks remain blocked until an eligible protected subscription is available.

No independent screen-reader audit, external accessibility certification or production visual acceptance is claimed.
