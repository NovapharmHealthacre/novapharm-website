# Accessibility Report

Status: source and automated contract checks passed; WCAG 2.2 AA conformance not claimed  
Last reviewed: 14 July 2026

## Implemented

- semantic landmarks, one primary H1 and logical generated heading checks;
- skip links and visible keyboard focus;
- labelled fields, grouped access-type radios, error/status live regions and form summaries;
- keyboard-operable cookie controls with equal accept/reject/manage choices;
- responsive tables and forms, stable media dimensions and touch-friendly controls;
- reduced-motion rules that remove non-essential transforms without hiding content;
- meaningful image alternatives or empty alternatives for decorative pending assets;
- `lang="en-GB"`, British English and accessible legal-page structure;
- no colour-only status contract in tested templates.

## Automated evidence

`npm run validate`, `npm run syntax`, `npm run test:visual-contracts` and the form/portal integration suite pass locally. They check structure and behaviour but do not replace assistive-technology testing.

## Required hosted acceptance

Run axe in Chromium and WebKit at all required viewports; manually test keyboard-only navigation, focus order, menu/dialog focus, 200% and 400% zoom, mobile reflow, form errors, VoiceOver or another approved screen reader, contrast and reduced motion. Test public pages and authenticated portal states with realistic maximum-length data.

Until that matrix passes and an independent review is completed, the public accessibility statement correctly says NovaPharm targets WCAG 2.2 AA and does not claim full conformance.

