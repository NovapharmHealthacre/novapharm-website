# Four-repository release watch — 2026-11-07 12:00 IST

## Fresh open inventory (GitHub connector)
- novapharm-website: PR #112; issues #54, #55, #86, #90, #106, #107, #108, #109, #110, #111 (10).
- vishal-portfolio: no open PR; issue #43 (editorial signoff outstanding).
- novapharm-innovation-technology: PR #3 only (temporary data collection; do not merge/close without verified source artifact).
- ak-online-services: no open PR or issues.

## Corporate PR #112: bounded Nutraxin publisher-link review
- https://github.com/NovapharmHealthacre/novapharm-website/pull/112
- Comparison at inspection: `main` = `f3b559e87fc90cb538d3158b4f20a1790b963dcc`, PR branch `feat/nutraxin-publisher-19links-current-main-20261107` **diverged** (6 ahead, 1 behind); six changed files: corporate CSS, component, page renderer, 19-link JSON, browser acceptance, link unit test. Do not merge without rebase/reconciliation and exact-head CI.
- Source file `apps/corporate/data/nutraxin-uk-links.json` contains 19 product mappings and states `verifiedOn: 2026-10-01`. PR description states 19 URLs individually retrieved 2026-11-07. **Provenance inconsistency to reconcile**: distinguish original publisher-map verification date from fresh URL retrieval; do not silently rewrite the date or infer live stock, approval or regulatory status.
- Browser helper change on PR #112 claims to skip CSS-hidden lazy images. Verify visible-image loading, zero broken images, console, HTTP errors, Axe and horizontal overflow in exact-head Chromium/WebKit before merge.

## Release constraints
- Closed PRs are not implemented unless merged; open issues preserve unaccepted scope.
- Corporate static GitHub Pages deployment SHA, source-to-live parity and HTTPS/custom-domain smoke test remain separate from main CI. Do not assert live publication based on main commit.
- Keep public contact mailto-only and static portal credential-free until AWS eu-north-1 / Entra / Atlas / SES verified runtime acceptance and owner approvals.
- No production DNS, paid AWS provisioning, MongoDB public allowlist, regulated data migration, CI bypass or unreviewed merge.

## Next executable action
1. Reconcile #112 with current main; verify each official publisher URL and dated evidence; correct ambiguous `verifiedOn` semantics with tests if appropriate.
2. Inspect exact-head CI after any branch change, especially public browser timeout repair.
3. Separately establish GitHub Pages deploy workflow run and live artifact SHA, with rollback.
4. Request qualified editorial signoff for portfolio #43; never auto-approve it.

Evidence: GitHub open PR/issue searches, compare_commits main...feat/nutraxin-publisher-19links-current-main-20261107 and fetched JSON at branch, 2026-11-07.
