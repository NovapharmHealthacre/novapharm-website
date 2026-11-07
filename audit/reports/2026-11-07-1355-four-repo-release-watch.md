# Four-repository production release watch — 7 November 2026, 13:55 IST

## Fresh open-item inventory
- Corporate: **2 open PRs** (#112 Nutraxin publisher integration; #118 Intelligence heading contrast), **9 open issues** (#54, #55, #86, #90, #106, #107, #108, #109, #110).
- Portfolio: **0 open PRs**, **1 open issue** (#43 qualified regulatory editorial acceptance).
- Innovation Technology: **1 open PR** (#3 temporary pharmacy data acquisition; NOT for merge), **0 open issues**.
- AK Online Services: **0 open PRs**, **0 open issues**.
Search-derived counts; not a statement about deployment.

## Current main and Nutraxin integration risk
- GitHub compare main against PR #112's recorded commit `6107d89ec35aae20b985a0627e97399d1dcb66d9`: **main SHA `f51d42f1919aeb371871e6329ba61f87ff9048ca`**, branch **8 ahead / 13 behind**; six changed files include Oncology CSS. Source: GitHub compare endpoint. Rebase/merge carefully; do not assume old CI applies to rebased head.
- The PR's `apps/corporate/data/nutraxin-uk-links.json` still lists `verifiedOn: 2026-10-01`; the PR separately describes 7 Nov URL retrieval. Keep these distinct.
- PR #112 issue comment [6704054709](https://github.com/NovapharmHealthacre/novapharm-website/pull/112#issuecomment-6704054709) documents independent HTTP 404 for `https://nutraxin.uk.com/product/vitamin-c-chewable-tablets/` on 7 Nov. The exact source JSON at `6107d89` still contains that link. **Block merge until removed/disabled or independently verified**; do not substitute a different SKU or imply availability, registration or UK approval.
- The same comment reports five successful CI suites at that old head and a failed WebKit navigation in unified acceptance run [42347944828](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/42347944828). Rerun status is not independently confirmed in this report.

## Accessibility
- [PR #118](https://github.com/NovapharmHealthacre/novapharm-website/pull/118) proposes replacing low-contrast `#a0a0a6` with `#66666d` for `/technology/` large heading. The PR describes prior Axe failure on mobile 390px; do not infer green exact-head checks from a dependency-review bot comment.
- Required: validate actual computed text/background contrast (WCAG AA large text 3:1), 390/1440px Chromium/WebKit, no visual regression and exact-head readiness/image provenance gate before merge.

## Production release gate
- GitHub Pages exact live artifact SHA and HTTPS custom-domain parity not verified in this run. Main source SHA is **not** a proof of Pages deployment.
- AWS eu-north-1 six managed services, Entra MFA federation, Atlas network reachability, SES production sending and real contact receipts remain **unaccepted**; no DNS, public login, data intake or cloud resource changes authorized by this report.
- Portfolio #43 requires independent editorial/qualified approval. Innovation PR #3 must not merge absent the final source-data artifact.

## Next safe action
Resolve PR #112's broken official product destination and 13-commit divergence in a narrow reviewed patch; separately test PR #118's contrast fix. Require fresh exact-head CI and real Pages parity before any release. Preserve static credential-free portal, mailto-only public contact and Azure rollback.
