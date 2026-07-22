# CRO Final Browser CI Diagnosis

- Reviewed: 18 July 2026
- Pull request: 11
- Failed run: [29639633509](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/29639633509)
- Tested commit: `c1d0bcd884191a835f954e830ccdc352628dc955`
- Conclusion: deterministic screenshot-harness failure, not a visual, accessibility, authentication or route defect

## Exact Failure

The `browser-acceptance` job began at 09:43:27 UTC and completed at 10:43:56 UTC. Dependency installation, browser installation, site generation, synthetic-runtime preparation and backend browser workflows all passed. The exhaustive matrix completed every Chromium viewport and every WebKit viewport through `mobile-360x800`.

At WebKit `mobile-320x568`, Playwright failed in `inspectPage()` while taking a full-page PNG:

```text
page.screenshot: Cannot take screenshot larger than 32767 pixels on any dimension
```

The failure occurred at the old harness screenshot call in `scripts/run-browser-acceptance.mjs:240`. Local reproduction at the failed head measured the CRO document at 33,362 CSS pixels high in WebKit at 320 pixels wide, exceeding WebKit's 32,767-pixel screenshot limit. The previous run created approximately 1.35 GB of evidence because it captured every public and protected route as a full-page PNG at all 24 engine/viewport combinations.

The GitHub log was sufficient to identify the failure, so the 1.35 GB artifact was not downloaded blindly.

## Root Cause

The monolithic harness combined three independent concerns in one long job:

1. complete route, layout and Axe inspection;
2. exhaustive full-page PNG capture;
3. both engines and all 12 viewports in a single process.

Route and accessibility coverage had reached the final WebKit viewport. The uncaught oversized-screenshot exception prevented the script from writing its normal JSON/Markdown issue summary.

## Correction

- The CRO page was editorially reduced from 1,996 to 1,478 visible words, a 25.9% reduction.
- The 1440-pixel document height reduced from 16,787 to 12,823 pixels.
- The WebKit 320-pixel document height reduced from 33,362 to 25,797 pixels.
- Screenshot capture now checks document dimensions and falls back to a viewport capture before an engine limit is exceeded.
- Routine evidence is high-quality JPEG rather than lossless PNG.
- Screenshots are limited to a curated public/protected evidence set; every route still receives layout, image, console and Axe inspection.
- CI is split into Chromium desktop/tablet/mobile and WebKit desktop/tablet/mobile shards.
- Each shard starts an isolated synthetic runtime, writes compact JSON and Markdown results, uploads separate screenshots, and records cleanup.
- A final aggregate gate requires all six reports, the exact expected head, 12 viewports, 95 routes per viewport, 2,280 page inspections, 2,280 Axe scans, zero issues, no credential material and successful runtime cleanup.
- No shard uses `continue-on-error`, and route coverage was not reduced.

## Local Verification

- Focused CRO acceptance: 170 rendered cases across Chromium and WebKit, 168 Axe scans, zero issues.
- Small-screen verification: 320 × 568 has zero horizontal overflow and both hero calls to action end above the fold.
- Browser-shard smoke test: two representative public routes, two Axe scans, four compact screenshots, zero issues.
- Full six-shard GitHub result: pending the final candidate push.

## Security and Data Handling

All browser validation uses generated synthetic identities and records. Credentials remain in a mode-`0600` temporary file outside the repository and are removed with the temporary runtime. Compact reports contain no username, password, token, session secret or CSRF token fields. Screenshots do not include the login form populated with credentials.
