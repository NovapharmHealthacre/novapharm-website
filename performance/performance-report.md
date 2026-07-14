# Azure Performance Readiness Report

Status: performance controls implemented; hosted Lighthouse and field data pending  
Last reviewed: 14 July 2026

## Budgets and targets

- 75th percentile LCP below 2.5 seconds;
- INP below 200 milliseconds;
- CLS below 0.1;
- mobile Lighthouse performance target 90+, accessibility/SEO target 95+.

Targets are not reported as achieved without measured hosted results.

## Implemented controls

- generated server-readable HTML with no public SPA hydration dependency;
- intrinsic media dimensions and stable card/media geometry;
- responsive AVIF/WebP/JPEG product pipeline with lazy loading below the fold;
- one justified eager hero image and no autoplay media;
- system/local font strategy without external font blocking;
- Brotli/gzip server compression and cache separation between public and private content;
- minimal browser JavaScript and no analytics/tag-manager payload;
- reduced-motion support and sub-500 ms interaction transitions;
- Application Insights server telemetry configured to exclude sensitive route payloads.

## Pending evidence

The licensed product assets were materialised by the controlled GitHub workflow as 24 responsive AVIF/WebP/JPEG derivatives at 1600x900, with checksums and byte sizes recorded in the asset register. Lighthouse, WebPageTest/Core Web Vitals and Azure response-time evidence still require the private staging origin. Record real mobile/desktop results, tested commit, region, cache state and trace before production approval.
