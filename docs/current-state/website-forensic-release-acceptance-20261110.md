# NovaPharm Healthcare: forensic website release acceptance

**Date:** 10 November 2026  
**Tracking issue:** #367  
**Evidence baseline:** [Browser audit 42851250465](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/42851250465)  
**Status:** remediation is source-complete only where explicitly stated below; no final custom-domain acceptance.

This document is a forward-looking release control. The historical August `corporate-release-truth.md` remains an immutable historical snapshot and MUST NOT be reinterpreted as current 2026-11-10 production evidence.

## Release order and no-downgrade boundaries

1. **PR #373, official logo and cache:** preserve the supplied PNG and the approved sunrise Earth artwork; reconcile the generated image inventory from its authoritative registered assets. Require the validated exact PR head to pass browser, CodeQL and production-readiness gates before merge.
2. **PR #379, forensic UX and provenance:** current-main port of #364. Contains the Capabilities breadcrumb, responsive in-flow cookie notice, Oncology spoken heading, small-label contrast, consistent brand-red tokens, portal sign-in/dashboard code splitting and a deterministic 40-character source-commit meta marker.
3. **PR #366, visual CSS and Distribution proof:** its useful staged and live primary-navigation checks have been ported to #379. Before closing #366, ensure no other unique correction is omitted and do not allow its former `logo-visible-v1` stylesheet expectations to revert #373's `official-header-logo-v2` controls.
4. **PR #130:** older sitewide copy/social/spacing work requires a reconciled source-only review, not a force merge. The generated social-card pipeline already normalises duplicate OG-image properties; verify that behaviour and avoid resurrecting stale source HTML.
5. **Production:** merge only exact heads with passing mandatory gates. Publish through `publish-aws-contact-production.yml`, not the public-only Pages job, once the AWS-backed Contact service has been confirmed. Never roll back to a noncollecting mailto form while the live API service is approved and serving customers.
6. Verify the actual custom domain with new cache-busting URLs in Safari/WebKit and Chromium and confirm that every critical page's `novapharm-source-sha` matches the deployed source commit. Preserve the validated `gh-pages` release identity for rollback, audit and incident response.

## F01-F18 acceptance evidence

| ID | Meaning | Evidence needed to mark complete |
| --- | --- | --- |
| F01 | Official red logo | Visible approved PNG in Home, Capabilities, Oncology, Products, Contact; Safari + mobile computed visibility; no pseudo-text |
| F02 | Navigation | Primary Distribution link/mega panel and secure portal on four critical routes; keyboard/mobile |
| F03 | Capabilities identity | Rendered breadcrumb and eyebrow say Capabilities, not About NovaPharm |
| F04 | Release provenance | Exact Git source marker in canonical source, staged output and five live pages; asset cache proof |
| F05 | Consent | No form/headline occlusion at 320/390/768/1440; preferences persist; no analytics without consent |
| F06 | AWS Contact | Exact endpoint health and synthetic, non-customer receipt; safe failure/consent; no downgrade |
| F07 | Social metadata | One OG image URL, secure_url, type, size and alt per generated and served canonical page |
| F08 | ESCO | 373-route catalogue on live site; owner-approved prices, stock, VAT and checkout evidence without live charges |
| F09 | Header/anchors | Verified no overlap and correct sticky offsets across desktop/tablet/mobile |
| F10 | Capabilities hero | Approved composition, crop, typography and A4 print proof in Chromium and WebKit |
| F11 | CSS ownership | No conflicting legacy/Next override creates a visual regression |
| F12 | Oncology semantics | Spoken H1 has word boundary and the approved portrait remains fully visible |
| F13 | WCAG AA | Computed contrast and keyboard focus at test breakpoints |
| F14 | Page hierarchy | Approved spacing rhythm, CTA hierarchy and consistently readable images |
| F15 | Business conversion | Qualified B2B opportunities discoverable and correctly routed without exposing personal/clinical information |
| F16 | CI + release | All mandatory checks pass at exact SHA; AWS Contact preserved; production verified |
| F17 | Colour tokens | Approved `#E3120B` identity red, `#B30E09` dark red, distinct `#0066CC` link/focus blue |
| F18 | Evidence + rollback | Current dated operational runbook, release commit, screenshot references and reversible deployment record |

**The 18 issue checkboxes remain open until each row has actual production evidence.** A passing source-level test or merged PR alone is not proof that a customer can see or operate the feature.

## Pre-merge gates

- Lockfile install with Node.js 24; source lint, TypeScript, explicit route/content/regulatory-boundary tests, CodeQL, supply-chain/dependency scan and SBOM.
- Both public/static and six managed Next.js applications must compile in isolation; measure actual login/dashboard Lighthouse performance rather than relaxing its >=95 threshold.
- Chromium and WebKit at 320, 360, 390, 430, 768, 1024, 1280, 1440 and 1920px, with zoom, keyboard, reduced motion, forced colours, privacy state, no horizontal overflow or broken images.
- No public payment charges, unsanctioned business emails, patient content, secret exposure, or assertion of permissions that are not documented as granted.

## Production verification

For each relevant URL, request the HTML with `Cache-Control: no-cache, no-store` and a unique query parameter. Verify the real red PNG binary, stylesheet response (and version), Earth asset, Distribution navigation, Capabilities/Oncology editorial composition, valid canonical/Open Graph tags, live Contact service and exact `novapharm-source-sha` meta. Read-only validation is preferred; test account/checkout changes only with synthetic approved fixtures.

## Recovery

On failure **do not** blindly republish an older public-only Pages artefact. Capture current production release commit and verified Contact API origin, then prepare a revert commit against the latest main and run the complete guarded AWS-contact-preserving publisher. Do not force-push main, silently disable the live Contact service, or assume prior successful CI proves an earlier artefact remains safe today.

## Operational ownership and truthful state

- Corporate visual / SEO: #367, PR #379.
- Official logo / Safari caching: PR #373.
- Remaining ESCO pricing and checkout: #211, requires approved commercial information and independently verified transaction safety.
- Managed production identity, portal and applications: #55, #86, #107, #139, #176.
- Mark progress against evidence, not arbitrary completion percentages.
