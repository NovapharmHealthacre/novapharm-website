# Lighthouse Report

Status: local production-mode Lighthouse completed; Azure and field measurements pending
Last reviewed: 14 July 2026

Lighthouse 13.4.0 was run against the production-mode Node application with local synthetic data. Lighthouse was removed after the run so its audit-only dependency chain is not shipped or retained in the development lockfile.

| Route | Mode | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Homepage | Desktop | 100 | 100 | 100 | 100 | 0.6 s | 0 | 0 ms |
| Homepage | Mobile | 98 | 100 | 100 | 100 | 2.3 s | 0 | 0 ms |
| Products | Desktop | 100 | 100 | 100 | 100 | 0.3 s | 0 | 0 ms |
| Products | Mobile | 100 | 100 | 100 | 100 | 1.4 s | 0 | 0 ms |
| Contact | Desktop | 100 | 100 | 100 | 100 | 0.3 s | 0 | 0 ms |
| Contact | Mobile | 100 | 100 | 100 | 100 | 1.4 s | 0 | 0 ms |
| Portal login | Desktop | 100 | 100 | 100 | 58 | 0.3 s | 0 | 0 ms |
| Portal login | Mobile | 100 | 100 | 100 | 58 | 1.4 s | 0 | 0 ms |

The portal SEO score is intentionally lower because authenticated and confidential routes are deliberately `noindex`; it is not a public-search regression.

These are genuine laboratory measurements, not estimates, but localhost removes internet, Azure F1 quota/cold-start, TLS edge and geographic latency. Re-run from the generated Azure validation hostname, then collect field Core Web Vitals on the later production domain before asserting production performance.
