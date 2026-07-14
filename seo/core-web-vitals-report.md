# Core Web Vitals and Performance Authority Report

## Targets

The repository uses the current good-experience thresholds as release targets where field data can be measured at the 75th percentile:

- LCP: no more than 2.5 seconds
- INP: below 200 milliseconds
- CLS: below 0.1

These are targets, not invented field results. Real-user values require sufficient traffic and Search Console/CrUX or an approved RUM source.

## Enforced budgets

- initial public JavaScript: 180 KB
- initial public CSS: 180 KB
- hero media: 900 KB
- individual image: 450 KB where a justified exception is not documented
- initial transfer: 1.8 MB

The SEO authority validator checks the principal public JavaScript and CSS budget. Existing production readiness, Chromium/WebKit acceptance and Lighthouse evidence remain part of the release gate.

## Performance controls

- Important text and links remain in server-generated/static HTML.
- Optional attribution adds no external vendor request and activates storage/events only after analytics consent.
- Images retain intrinsic dimensions to prevent layout shift.
- Responsive derivatives and modern image formats are used where available.
- Social metadata does not create additional in-page downloads.
- No video, tracker, tag manager, heatmap or advertising script is activated by this phase.
- New homepage motion must respect reduced motion and use a compressed poster/fallback.
- Third-party scripts must be deferred and approved against privacy and performance budgets.

## Known evidence

The previous validated website candidate recorded high Lighthouse performance and clean cross-browser acceptance. This branch changes discovery metadata, JSON-LD, small first-party attribution code, sitemaps and editorial content controls rather than introducing heavy visual runtime dependencies.

## Field monitoring after merge

Track by template and device:

- homepage LCP element and image transfer;
- leadership/profile CLS;
- article LCP and long-task/INP behaviour;
- consent-banner CLS and interaction delay;
- mobile navigation interaction;
- form interaction and validation;
- third-party script cost after an analytics provider is approved.

Do not optimise for synthetic scores by hiding useful content or delaying essential accessibility behaviour. Investigate regressions using both lab diagnostics and field data.
