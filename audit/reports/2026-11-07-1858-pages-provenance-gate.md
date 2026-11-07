# Pages publication and four-repository release evidence — 2026-11-07 18:58 IST

This is a non-production audit snapshot, not a deployment or editorial approval.

## Fresh inventory (connected GitHub searches)
- novapharm-website: 1 open PR (#118), 9 open issues (#54, #55, #86, #90, #106–110).
- vishal-portfolio: 0 open PRs, 1 open issue (#43; independent qualified editorial approval outstanding).
- novapharm-innovation-technology: 1 open PR (#3, temporary source-data collection; DO NOT merge or close without source artifact), 0 open issues.
- ak-online-services: 0 open PRs, 0 open issues.
- Search scope: repository-specific open PR and open issue queries; counts reflect connector results at this inspection.

## Corporate source and CI
- Current main SHA from GitHub compare(main,main): `3306de87ebbfb7d99a9e364819ded1e732da3998`.
- PR #118 prior inspected SHA `142f1d131f902ac5e7233081a94b3f0d263330d2`; **not confirmed current head**. Its six associated pull_request workflow runs: Supply chain 42353749208 SUCCESS; Production readiness 42353749232 FAILURE; Premium visual 42353749182 SUCCESS; CodeQL 42353749178 SUCCESS; Public Pages Chromium/WebKit 42353749187 SUCCESS; Unified Chromium/WebKit 42353749214 FAILURE. Do not merge on stale results.
- PR #118 issue describes contrast repair from #a0a0a6 to #66666d on white for large technology heading; actual deployed contrast unverified.

## Pages publication: concrete control and provenance gaps
- Inspected `.github/workflows/pages-live-publish.yml` on current main. It defines `push: main` and `workflow_dispatch`, requests `pages: write` and `id-token: write`, stages `_site`, and uses `actions/deploy-pages` with `github-pages` environment.
- Workflow attempts Pages configuration via `PAGES_ADMIN_TOKEN` only when present; whether GitHub Pages source is set to **GitHub Actions**, workflow is enabled, and environment permissions allow deployment is **not established**.
- Deployment verification uses characteristic text/CSS checks on Pages URL and custom domain, but these are **not cryptographic or exact-SHA artifact parity**. It interpolates GITHUB_SHA in cache-busting query only. Add a generated release manifest (source SHA, build run, artifact digest) to `_site`, verify identical digest on both Pages URL and custom domain, and retain rollback artifact before declaring parity.
- `compare(gh-pages, main)` returned GitHub 404 **No common ancestor**. The branch is not a valid linear source-parity proxy. Do not assume gh-pages SHA must equal main SHA or infer deployment failure solely from mismatch.
- No deployment was triggered, no DNS or Pages settings were modified, and live domain acceptance remains unverified.

## Next safe acceptance sequence
1. Fetch exact current head for #118 and its complete required checks; repair failing readiness/Unified tests without relaxing security, accessibility or image provenance.
2. Obtain authorized read of Pages source/build type, enabled workflow and `github-pages` environment protections; inspect latest push/dispatch workflow run, deploy job and Pages deployment.
3. Add a narrow review-branch release-manifest test, preserving public default-deny portal and mailto-only contact, and require source SHA + artifact digest agreement at deployed Pages URL and custom domain.
4. Preserve independent qualified review for portfolio #43 and source artifact gate for innovation #3. AWS eu-north-1 / Entra / Atlas / SES acceptance remains blocked pending approved cost, privacy, rollback and real runtime evidence.

**No claim of production readiness, live source parity, AWS connectivity or delivered contact email is made here.**
