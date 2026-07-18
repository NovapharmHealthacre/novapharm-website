# Enterprise Portal Accessibility Report

**Target:** WCAG 2.2 AA
**Review date:** 18 July 2026
**Status:** Structural and automated rendered checks passed; independent/manual conformance review remains pending

## Implemented Controls

- Semantic page landmarks, headings, navigation labels and table headers.
- Visible labels for search, forms, selection controls and numeric inputs.
- Status and error regions use `role="status"` and `aria-live` where appropriate.
- Customer quality forms warn against patient information and adverse-event submission.
- Portal data tables use labelled, keyboard-scrollable regions.
- Responsive layouts avoid fixed text sizing and preserve stable control dimensions.
- Focus styles, high-contrast states and minimum interactive sizes are retained by the portal design system.
- Motion respects `prefers-reduced-motion`.
- API data is inserted as text nodes rather than unsafe markup.
- Empty, loading, blocked-integration and error states remain understandable without colour alone.

## Automated Results

`npm run check` passed syntax, CSS, visual contracts, generated-page validation, link validation and the application test suite. The expanded acceptance harness now covers:

- 38 public/error routes, including the Nutraxin catalogue;
- all 18 customer modules;
- all 13 employee modules;
- all 18 executive modules and the Executive Platform index;
- all five administrator modules;
- four independently authenticated access modes;
- Chromium and WebKit;
- seven desktop, tablet and mobile viewports;
- Axe WCAG 2 A/AA, 2.1 A/AA and 2.2 AA rules.

## Rendered Results

The current candidate completed 1,316 Axe scans across Chromium and WebKit, 94 routes and seven viewports with zero final violations. The first run exposed repeated caption/owner-label contrast and mobile text-width issues; each was corrected and re-rendered. A focused 56-page regression passed with zero findings, followed by the complete 1,316-page zero-issue run.

Contact and account-application interactions were also completed in both engines with accessible validation summaries, success messages, controlled upload status and administrator review. No raw technical browser error appeared.

No full WCAG conformance claim is made. Manual screen-reader sampling, 200%/400% zoom review and an independent accessibility assessment remain appropriate before a formal conformance statement.
