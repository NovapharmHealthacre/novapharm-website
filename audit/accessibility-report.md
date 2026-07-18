# Accessibility Report

Status: automated and rendered local acceptance passed; full WCAG 2.2 AA conformance not claimed
Last reviewed: 14 July 2026

## Implemented

- semantic landmarks, one primary H1 and logical generated heading checks;
- skip links, visible focus and keyboard-operable navigation;
- labelled fields, grouped access-type controls, error summaries and live status regions;
- keyboard-operable cookie controls with equally available accept, reject and manage choices;
- responsive tables/forms, intrinsic media dimensions and touch-friendly controls;
- reduced-motion rules that remove non-essential movement without hiding content;
- meaningful image alternatives and decorative-image hiding;
- `lang="en-GB"`, British English and readable legal-page structure;
- status communication that does not depend on colour alone.

## Executed evidence

Playwright 1.61.1 and `@axe-core/playwright` 4.12.1 tested 44 routes in Chromium 149 and WebKit 26.5 at seven desktop, tablet and mobile viewports. All 616 final axe scans completed with zero violations. The first run identified 70 repeated contrast failures; all were corrected and the complete matrix was rerun successfully.

Backend activation was then exercised through the rendered Contact form, all four account-application stages, controlled document upload and administrator review in both engines. Required-field errors, live success messages and protected review content completed without a raw technical browser error. A real administrator-detail renderer defect found by this workflow was fixed and the workflow was rerun successfully.

Repository validation also passed semantic heading, image alternative, intrinsic-size, skip-link, form-label, cookie-dialog, focus, reduced-motion and responsive-overflow contracts. Human screenshot review covered representative public, legal, product, login and authenticated portal states in both engines.

## Remaining assurance

Automated tools cannot prove full conformance. A manual screen-reader pass, 200%/400% zoom review with assistive technology, and independent accessibility review remain required before NovaPharm may claim WCAG 2.2 AA conformance. The public accessibility statement therefore continues to say that WCAG 2.2 AA is the target, not a certified result.
