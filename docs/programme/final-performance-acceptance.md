# Final Performance Acceptance

Status: local production-standalone laboratory results; field and managed-staging evidence pending

Measured: 9 August 2026

Runtime: Node 24.14.0, Next.js 16.2.12, Lighthouse 13.4.1

## Public applications

| Application | Profile | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT | Transfer |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Corporate | Desktop | 100 | 100 | 100 | 100 | 0.59 s | 0 | 0 ms | 276 KiB |
| Corporate | Mobile | 95 | 100 | 100 | 100 | 2.91 s | 0 | 4 ms | 258 KiB |
| NIT | Desktop | 100 | 100 | 100 | 100 | 0.58 s | 0 | 0 ms | 252 KiB |
| NIT | Mobile | 97 | 100 | 100 | 100 | 2.61 s | 0 | 3 ms | 244 KiB |
| Founder | Desktop | 100 | 100 | 100 | 100 | 0.61 s | 0 | 0 ms | 208 KiB |
| Founder | Mobile | 97 | 100 | 100 | 100 | 2.61 s | 0 | 4 ms | 195 KiB |

Each value is the median of three consecutive Lighthouse runs against the same production-standalone build. The three mobile LCP observations exceed the 2.5-second target by 0.11 to 0.41 seconds. Performance scores, accessibility, SEO, CLS and blocking time pass their repository regression floors, but the LCP target is not reported as passed.

## Protected and operational applications

| Surface | Profile | Performance | Accessibility | Best practices | LCP | CLS | TBT |
|---|---|---:|---:|---:|---:|---:|---:|
| Portal sign-in | Desktop | 100 | 100 | 100 | 0.50 s | 0 | 0 ms |
| Customer dashboard | Desktop | 100 | 100 | 96 | 0.58 s | 0 | 0 ms |
| Portal sign-in | Mobile | 98 | 100 | 100 | 2.31 s | 0 | 3 ms |
| Customer dashboard | Mobile | 96 | 100 | 96 | 2.78 s | 0 | 0 ms |
| Status | Desktop | 100 | 100 | 100 | 0.46 s | 0 | 0 ms |
| Status | Mobile | 99 | 100 | 100 | 2.08 s | 0 | 2 ms |

SEO is intentionally excluded for the noindex portal and status applications. The portal dashboard mobile LCP and Best Practices score remain staging follow-ups; no production or field result is claimed.

## Controls and next gate

- Responsive images, explicit dimensions and standalone production builds are active.
- No layout shift was recorded in these representative runs.
- A separate constrained-start diagnostic reduced NIT and Founder homepage CLS from `0.3391` and `0.2042` to `0` by executing the nonce-bearing JavaScript-state bootstrap during head parsing; browser acceptance now enforces that contract.
- No production analytics or third-party marketing script was loaded.
- The test runner removes every temporary process after each application.
- Azure Front Door caching, network latency, WAF overhead and real-user performance remain unmeasured.

Run the same scripts on the exact staging release, then monitor 75th-percentile LCP, INP and CLS after an approved production launch. Laboratory scores cannot substitute for field Core Web Vitals.

## Corporate product-discipline continuation

Measured: 22 August 2026

Candidate: local `PUBLIC_ONLY` static output from `codex/corporate-product-discipline-rebuild`, committed unchanged in implementation SHA `9f49161425790596413051a2b00cedeae51905a9`

Method: three first-visit Lighthouse 13.4.1 runs per route/profile; median reported

| Route | Profile | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT | Transfer |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | Desktop | 100 | 100 | 100 | 100 | 0.7 s | 0 | 0 ms | 403 KiB |
| `/` | Mobile | 89 | 100 | 100 | 100 | 3.3 s | 0 | 0 ms | 403 KiB |
| `/products/` | Desktop | 100 | 100 | 100 | 100 | 0.6 s | 0 | 0 ms | 367 KiB |
| `/products/` | Mobile | 91 | 100 | 100 | 100 | 3.2 s | 0 | 0 ms | 385 KiB |

The first focused run exposed a mismatched resource hint: the homepage preloaded a 149-268 KiB JPEG while the rendered `picture` selected a separate 53 KiB AVIF. Matching the preload to the painted AVIF improved the mobile performance median from 83 to 89, reduced first-visit transfer from 552 KiB to 403 KiB, and improved median LCP from 4.1 to 3.3 seconds without changing the visual design. TBT and CLS remained zero.

The repository performance floor passes. The 2.5-second mobile LCP aspiration does not pass in this throttled local-static laboratory profile and is not misreported as production Core Web Vitals. Compression/caching at the accepted host, managed-edge latency and real-user 75th-percentile LCP/INP/CLS remain staging and field-validation items.

Reproduction command: `CORPORATE_LIGHTHOUSE_BASE_URL=http://127.0.0.1:4178 npm run corporate:lighthouse:validate`.

## Exact-final implementation rerun

Measured: 28 August 2026 at `2026-08-28T15:00:19.556Z`

Runtime: governed Node `24.19.0`; local `PUBLIC_ONLY` static corporate output with `PUBLIC_INDEXABLE=true`

Method: Lighthouse 13.4.1, three first-visit laboratory runs per route/profile, median reported

| Route | Profile | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT | Transfer |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | Desktop | 100 | 100 | 100 | 100 | 0.6 s | 0 | 0 ms | 399 KiB |
| `/` | Mobile | 96 | 100 | 100 | 100 | 2.8 s | 0 | 0 ms | 388 KiB |
| `/products/` | Desktop | 100 | 100 | 100 | 100 | 0.6 s | 0 | 0 ms | 358 KiB |
| `/products/` | Mobile | 96 | 100 | 100 | 100 | 2.8 s | 0 | 0 ms | 346 KiB |

The first diagnostic run used `PUBLIC_INDEXABLE=false`, which correctly reduced the SEO score because the validation server was intentionally non-indexable. That result was rejected as an orchestration mismatch, not treated as a product defect. The table above is the subsequent production-equivalent static-public run with canonical indexing enabled. It supersedes the 22 August corporate continuation table for implementation SHA `9f49161425790596413051a2b00cedeae51905a9` while retaining that earlier table as historical optimisation evidence.

All repository performance floors pass. Mobile LCP improved by approximately 0.4-0.5 seconds from the 22 August candidate, but the 2.5-second aspiration remains unproven in this throttled laboratory profile. These values are not field Core Web Vitals and do not prove Front Door, WAF, production-network or real-user performance.
