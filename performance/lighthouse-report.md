# Lighthouse Report

Status: NOT RUN against an Azure-hosted candidate  
Last reviewed: 14 July 2026

No Lighthouse score is reported. The repository implements the performance controls listed in `performance/performance-report.md`, but the current environment has no browser-accessible Azure staging origin and no accepted Chromium/WebKit matrix.

Run mobile and desktop Lighthouse with the materialised product media after the private Azure staging host is live. Record commit SHA, URL, viewport, network/CPU settings, cold/warm cache, Performance, Accessibility, Best Practices, SEO, LCP, CLS, total blocking time and any INP field data. Re-run on the final custom domain after cutover.
