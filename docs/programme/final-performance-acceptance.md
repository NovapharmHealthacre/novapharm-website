# Final Performance Acceptance

Status: local production-standalone laboratory results; field and managed-staging evidence pending

Measured: 7 August 2026

Runtime: Node 24.14.0, Next.js 16.2.12, Lighthouse 13.4.0

## Public applications

| Application | Profile | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT | Transfer |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Corporate | Desktop | 100 | 100 | 100 | 100 | 0.56 s | 0 | 0 ms | 274 KiB |
| Corporate | Mobile | 97 | 100 | 100 | 100 | 2.61 s | 0 | 3 ms | 257 KiB |
| NIT | Desktop | 100 | 100 | 100 | 100 | 0.57 s | 0 | 0 ms | 252 KiB |
| NIT | Mobile | 97 | 100 | 100 | 100 | 2.68 s | 0 | 2 ms | 244 KiB |
| Founder | Desktop | 100 | 100 | 100 | 100 | 0.63 s | 0 | 0 ms | 208 KiB |
| Founder | Mobile | 97 | 100 | 100 | 100 | 2.60 s | 0 | 0 ms | 195 KiB |

The three mobile LCP observations exceed the 2.5-second target by 0.10 to 0.18 seconds. Performance scores, accessibility, SEO, CLS and blocking time pass their repository regression floors, but the LCP target is not reported as passed.

## Protected and operational applications

| Surface | Profile | Performance | Accessibility | Best practices | LCP | CLS | TBT |
|---|---|---:|---:|---:|---:|---:|---:|
| Portal sign-in | Desktop | 99 | 100 | 100 | 0.51 s | 0 | 94 ms |
| Customer dashboard | Desktop | 100 | 100 | 96 | 0.58 s | 0 | 0 ms |
| Portal sign-in | Mobile | 98 | 100 | 100 | 2.38 s | 0 | 2 ms |
| Customer dashboard | Mobile | 96 | 100 | 96 | 2.78 s | 0 | 0 ms |
| Status | Desktop | 100 | 100 | 100 | 0.46 s | 0 | 0 ms |
| Status | Mobile | 99 | 100 | 100 | 2.01 s | 0 | 6 ms |

SEO is intentionally excluded for the noindex portal and status applications. The portal dashboard mobile LCP and Best Practices score remain staging follow-ups; no production or field result is claimed.

## Controls and next gate

- Responsive images, explicit dimensions and standalone production builds are active.
- No layout shift was recorded in these representative runs.
- No production analytics or third-party marketing script was loaded.
- The test runner removes every temporary process after each application.
- Azure Front Door caching, network latency, WAF overhead and real-user performance remain unmeasured.

Run the same scripts on the exact staging release, then monitor 75th-percentile LCP, INP and CLS after an approved production launch. Laboratory scores cannot substitute for field Core Web Vitals.
