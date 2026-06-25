# Performance Audit

## Issues Found
- Large duplicated inline CSS on every page.
- No shared cached CSS bundle.
- No server cache policy.
- No optimized corporate hero imagery.
- No build or validation workflow.

## Implemented
- Shared CSS file at `/assets/css/novapharm.css`.
- Shared JavaScript files with `defer`.
- Optimized JPEG hero asset and 1200x630 Open Graph image.
- Long-lived immutable caching for static assets in the Node runtime.
- Lightweight static HTML pages without frontend framework overhead.

## Expected Outcome
The public site should be capable of Lighthouse 95+ with image compression, HTTPS hosting and production cache headers.
