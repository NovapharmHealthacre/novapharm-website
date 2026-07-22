# CRO Performance Report

- Candidate date: 18 July 2026
- Status: final local production-equivalent lab gate passed
- Runtime: NovaPharm Node server, Node 24.14.0, Brotli enabled
- Lighthouse: 13.4.0 using Playwright Chromium 1228
- Test URL: local loopback only; no production claim

## Six-Run Result

| Profile | Runs | Performance | Accessibility | Best Practices | SEO | Median FCP | Median LCP | Median CLS | Median TBT | Median transfer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile | 3 | 100 | 100 | 100 | 100 | 1.204 s | 1.504 s | 0 | 0 ms | 91,884 B |
| Desktop | 3 | 100 | 100 | 100 | 100 | 0.284 s | 0.404 s | 0 | 0 ms | 111,235 B |

Mobile LCP was 1.504 s, 1.505 s and 1.503 s. Desktop LCP was 0.404 s, 0.405 s and 0.403 s. All six runs remained within the stated targets; these are controlled lab observations, not Chrome UX Report field data or a production-network guarantee.

## Transfer and Asset Controls

| Resource | Mobile transfer | Desktop transfer | Control |
| --- | ---: | ---: | --- |
| Hero AVIF | 26,348 B at 960 px | 45,699 B at 1600 px | Preloaded LCP image with responsive `srcset` and intrinsic dimensions |
| Bundled CSS | 31,803 B Brotli | 31,803 B Brotli | One deterministic 176,368-byte source bundle |
| Page JavaScript | 14,339 B combined | 14,339 B combined | Deferred enhancements; no heavy framework |
| Total page transfer | 91,884 B | 111,235 B | No third-party runtime request |

The delivery visual and leadership portraits are lazy loaded below the fold. Portrait derivatives are 480/800-pixel AVIF, WebP and progressive JPEG. The hero is well below the 300 KB mobile and 550 KB desktop budgets. CSS and image dimensions prevent layout shift.

## Evidence

- `audit/evidence/cro-lighthouse-final/mobile-1.json` — `e63d10d1d3884b7ff79e43666659f627b9c0eb14edc79a61f231e0860e8232aa`
- `audit/evidence/cro-lighthouse-final/mobile-2.json` — `767951e1da9e807996fb450d4832a1aaf3b8e935e59773bf6e721b8fcb8da3c2`
- `audit/evidence/cro-lighthouse-final/mobile-3.json` — `b84537ddf17a7518d3cc9dc95e9f7db216ce25855e59b303d9c5a0e179227b12`
- `audit/evidence/cro-lighthouse-final/desktop-1.json` — `52f7a7f65252e6e9b0577a771506c81ceb1f22c2d9ebfffd1d0e071039815001`
- `audit/evidence/cro-lighthouse-final/desktop-2.json` — `1a8545c98509d3bd2723b28f02f0a35569e3eb1677fed82bec54614537dbf758`
- `audit/evidence/cro-lighthouse-final/desktop-3.json` — `272866606e79534c832325622fc3f8e56700c45f4eab0d415b846933e7aa3f20`
- Final CSS bundle — `58ecb2c6c8c31828527e202a2df1b143b8a60e6a096a9d14b9a57dd13b5c9c0a`

The validation runtime intentionally excluded preview/noindex headers for Lighthouse SEO measurement while remaining local and disconnected from production data, email, Microsoft Graph and SharePoint.
