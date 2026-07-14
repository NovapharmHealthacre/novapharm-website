# Azure Performance Readiness Report

Status: local performance acceptance passed; Azure-hosted and field evidence pending
Last reviewed: 14 July 2026

## Budgets and targets

- 75th percentile LCP below 2.5 seconds;
- INP below 200 milliseconds;
- CLS below 0.1;
- mobile Lighthouse performance 90+ and accessibility/SEO 95+ for intended public pages.

Local mobile Lighthouse recorded performance 98-100, accessibility 100, public-page SEO 100, LCP 1.4-2.3 seconds, CLS 0 and total blocking time 0 ms across Homepage, Products and Contact. The protected portal correctly scores 58 for SEO because indexing is prohibited. No field INP result exists yet.

## Implemented controls

- generated server-readable HTML with no public SPA hydration dependency;
- intrinsic media dimensions and stable card/media geometry;
- responsive AVIF/WebP/JPEG product images with lazy loading below the fold;
- one justified eager hero image and no autoplay media;
- system/local fonts without external font blocking;
- Brotli/gzip compression and separate public/private cache policy;
- minimal browser JavaScript and no analytics/tag-manager payload;
- reduced-motion support and short interaction transitions;
- telemetry exclusions for sensitive routes and payloads.

## Hosted boundary

The eight licensed product assets have 24 registered responsive derivatives with checksums and byte sizes. Local measurements validate application overhead, not Azure F1 cold stops, daily CPU quotas, Azure SQL auto-pause, public-network latency or real-user Core Web Vitals. Measure the generated Azure validation hostname after an eligible subscription passes the zero-charge gates and repeat on the later production domain.
