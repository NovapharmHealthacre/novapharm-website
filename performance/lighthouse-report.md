# Lighthouse Readiness Report

## Targets

- Performance: 95+
- Accessibility: 100
- Best Practices: 100
- SEO: 100

## Implemented

- Static semantic HTML without a client framework or external font dependency.
- Preloaded LCP media with intrinsic dimensions and `fetchpriority="high"`.
- Lazy loading and asynchronous decoding below the fold.
- Brotli/gzip compression, CDN-aware public caching and `no-store` on private or transactional responses.
- Responsive layouts, focus indicators, skip links, reduced motion and one-H1 page structure.
- Unique metadata, structured data, sitemap, robots and RSS.
- Private routes, previews and controlled files excluded from indexing.

## Repository Verification

- 33 intended public pages: the 26 corporate/content pages plus seven legal and responsibility pages.
- Six original 900-1,400-word Insight articles.
- 40 data-free protected shells.
- 1,890 valid local links, assets and anchors.
- Valid JSON-LD and no missing required files.
- Build, route, domain, claims, security, integration and persistence checks pass locally on Node 24.

## Measurement Status

Lighthouse has not been run. The sandbox rejects a local server and the in-app browser's URL policy rejects local-file navigation, while no owner-approved private preview or WebKit runtime is available. Run mobile and desktop Lighthouse against the private Render preview, then against the final HTTPS domain. Record the real scores, LCP, INP and CLS here; do not substitute estimates.
