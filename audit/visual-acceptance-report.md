# Visual Acceptance Report

Candidate date: 15 July 2026

Status: local rendered acceptance passed; Azure-hosted acceptance pending

Implementation commit: `a1473d7cbf2b789da5e015f8bf9c1fe0cfcd977b`

## Executed matrix

| Engine | 1440x900 | 1920x1080 | 1024x1366 | 768x1024 | 390x844 | 430x932 | 375x667 |
|---|---|---|---|---|---|---|---|
| Chromium 149 | Passed | Passed | Passed | Passed | Passed | Passed | Passed |
| WebKit 26.5 (Safari-compatible) | Passed | Passed | Passed | Passed | Passed | Passed | Passed |

The Playwright acceptance run rendered 44 routes in both engines at all seven viewports: 616 page states, 616 Axe scans and 764 genuine screenshots. The final run completed with zero recorded layout, console, network, accessibility or responsive-contract issues. Its machine-readable evidence SHA-256 is `fd52b861ae247a67a2043313a147465ea77f5e88ea0ca3eb383cdefea5c295c1`.

Coverage included 37 public routes and seven authenticated/protected states: the homepage; company, governance and leadership content; all five leadership profiles; Services; Regulatory; Products; Partners; Technology; Insights and all six articles; Contact; account application; all legal pages; portal login; Customer, Employee, Board, Executive and Administrator areas; password change; cookie preferences; and 404, 500 and service-unavailable states.

## Defects resolved

- The first art-direction subset found one Regulatory roadmap label-contrast defect repeated in six browser/viewport states. The text colour was corrected and the subset then passed 96 page states and 96 Axe scans with zero issues.
- Legacy high-specificity CSS still requested old Product Portfolio backgrounds behind Services, Regulatory, Partners and Technology. Those requests were removed and a regression assertion now rejects their return. Services mobile Lighthouse improved from 88-89 to 99.
- The hero signal panel previously sat below the darkening overlay, making the Insights status panel too muted. Its stacking context was corrected and re-rendered in Chromium and WebKit.
- The first rendered run found 70 repeated contrast failures. Product-panel supporting text, portal logout controls, status pills and the administrator eyebrow were corrected and re-tested.
- The Specialty image contained visible branded medicines and the logistics image contained visible third-party branding. Both were replaced with documented Pexels-licensed, neutral pharmaceutical/logistics photography and re-rendered.
- All eight product-card crops were captured separately in both engines and visually reviewed. Their register status is `rendered-and-brand-reviewed`.
- Desktop and mobile navigation, logo rendering, cookie controls, form states, focus indicators, table overflow, reduced motion, long-page wrapping and protected-route states were inspected without a remaining material defect.

## Evidence boundary

Raw full-matrix screenshots remain ignored build evidence; the compact result is committed at `audit/evidence/browser-acceptance-summary.json`. Targeted before-and-after review screenshots are committed under `audit/evidence/art-direction/`. The run used the local production-mode Node application with synthetic users and records. It proves rendered application behaviour, not Azure F1, Azure SQL, Entra, Blob, network latency or the generated Azure hostname. Those hosted checks remain blocked until an eligible protected subscription is available.

No independent screen-reader audit, external accessibility certification or production visual acceptance is claimed.
