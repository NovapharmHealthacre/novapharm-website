# CRO Performance Report

Candidate date: 18 July 2026

Status: local production-equivalent lab acceptance passed

## Runtime and method

- Lighthouse: 13.4.0
- Runtime: NovaPharm Node server on Node 24.18.0 at `http://127.0.0.1:4181/cro/`
- Compression: Brotli accepted and returned by the application server
- Mobile: three independent Lighthouse runs
- Desktop: one Lighthouse run using the desktop preset at 1440 x 900
- No third-party runtime requests were permitted by the browser acceptance harness

## Results

| Profile | Runs | Performance | Accessibility | Best practices | SEO | FCP | LCP | CLS | TBT | Transfer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile compressed runtime | 3 | 100 median | 100 | 100 | 100 | 1.20 s median | 1.50 s median | 0 | 0 ms | 91,989 B |
| Desktop compressed runtime | 1 | 100 | 100 | 100 | 100 | 0.28 s | 0.40 s | 0 | 0 ms | 111,340 B |

Mobile LCP results were 1502.96 ms, 1502.56 ms and 1503.19 ms. The median is 1502.96 ms.

## Compression control

The same final page served by an uncompressed Python static server scored 94 for mobile performance with 2.78-second LCP and a 322,868-byte transfer. Lighthouse identified the 172,333-byte uncompressed stylesheet as the render-blocking cause. The actual Node runtime returns `Content-Encoding: br`; the compressed transfer met the 2.5-second LCP target without hiding or deleting public content.

## Asset budget

| Asset | Raw bytes | Runtime behaviour |
| --- | ---: | --- |
| Deterministic site CSS bundle | 172,333 | Brotli/Gzip compressed and cached |
| CRO-specific source CSS | 20,856 | Included in the bundle |
| CRO enhancement JavaScript | 1,923 | Deferred; core content works without it |
| Hero AVIF, 960 px | 25,561 | Preloaded LCP candidate |
| Delivery AVIF, 960 px | 23,523 | Lazy loaded below the fold |

Two image concepts are delivered as responsive 640, 960 and 1600 px AVIF, WebP and JPEG derivatives. Intrinsic dimensions are present. The hero alone receives high fetch priority; the second image is lazy loaded.

## Evidence

- `audit/evidence/cro-lighthouse/mobile-compressed-1.json`
- `audit/evidence/cro-lighthouse/mobile-compressed-2.json`
- `audit/evidence/cro-lighthouse/mobile-compressed-3.json`
- `audit/evidence/cro-lighthouse/desktop-compressed.json`
- Mobile evidence SHA-256 values: `4b411728e044caa3715e048c7fb9daabc9e304ae419ea4a09789228e63913f85`, `48a2a2f69bb81c12d63ae0052f2998341af64796bcc45b023b25802c38127443`, `045d758b47f80fb045dc956d3d11905e3444bbe79ae985947d34643a5dea161e`
- Desktop evidence SHA-256: `81501fd123a9aedd4804e6dce5931a77d299fb2f1aa4e56a6f9c6966d0758f59`
- CSS bundle SHA-256: `910acfe6c53628ccf45064a6d74a088f89bc8ce5d2f198e43361d41146fc3e5d`

These are controlled local lab results, not Chrome UX Report field data or a guarantee of production network performance.
