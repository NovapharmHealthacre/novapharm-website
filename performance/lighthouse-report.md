# Lighthouse Report

Status: local Node-runtime Lighthouse completed; Azure and field measurements pending
Last reviewed: 15 July 2026

Lighthouse 12.8.2 was run against the public experience and backend-entry pages on the local Node application with synthetic data. Lighthouse was invoked ephemerally and is not shipped in the application dependency graph.

| Route | Mode | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Homepage | Desktop | 100 | 100 | 100 | 100 | 0.7 s | 0 | 0 ms |
| Homepage | Mobile | 97 | 100 | 100 | 100 | 2.6 s | 0 | 10 ms |
| Services | Mobile | 99 | 100 | 100 | 100 | 1.6 s | 0 | 0 ms |
| Regulatory | Mobile | 98 | 100 | 100 | 100 | 2.3 s | 0 | 0 ms |
| Partners | Mobile | 97 | 100 | 100 | 100 | 2.6 s | 0 | 0 ms |
| Technology | Mobile | 98 | 100 | 100 | 100 | 2.3 s | 0 | 40 ms |
| Insights | Mobile | 100 | 100 | 100 | 100 | 1.5 s | 0 | 0 ms |
| Contact | Mobile | 100 | 100 | 100 | 100 | 1.5 s | 0 | 0 ms |
| Account application | Mobile | 100 | 100 | 100 | 100 | 1.5 s | 0 | 0 ms |

The Services route initially scored 88-89 with 3.8 s LCP. Inspection found an inactive-looking but still downloaded legacy product-photo pseudo-background. Removing the legacy request raised the re-run to 99 with 1.6 s LCP. The result is covered by a regression assertion in the module-media validator.

These are genuine laboratory measurements, not estimates, but localhost removes internet, Azure quota/cold-start, TLS edge and geographic latency. The Contact and Account Application results were rerun on 15 July 2026 after backend activation. The Homepage and Partners LCP values are close to the 2.5 s target under synthetic mobile throttling. Re-run from the approved hosted validation environment and collect field Core Web Vitals before asserting production performance.
