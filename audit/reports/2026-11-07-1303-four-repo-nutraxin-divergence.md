# Four-repository release watch | 2026-11-07 13:03 IST

This is an evidence record, not a deployment approval. No patient data, credentials, DNS, production login, AWS provisioning, or live Pages files are changed.

## Fresh inventory (GitHub search, 2026-11-07)
| Repository | Open PRs | Open issues |
| --- | ---: | ---: |
| NovapharmHealthacre/novapharm-website | 1 (#112) | 10 (including #106–#111) |
| NovapharmHealthacre/vishal-portfolio | 0 | 1 (#43) |
| NovapharmHealthacre/novapharm-innovation-technology | 1 (#3, temporary, do not merge) | 0 |
| NovapharmHealthacre/ak-online-services | 0 | 0 |

Search is a snapshot, not proof that no newly indexed item exists. Do not close issue #43 without qualified editorial sign-off or innovation PR #3 without the actual data artifact.

## Corporate release blocker: Nutraxin PR #112
- At inspection, main was `1553a91a5013f73cb8e7ee2428499c1bbf4342fb`: https://github.com/NovapharmHealthacre/novapharm-website/commit/1553a91a5013f73cb8e7ee2428499c1bbf4342fb
- Comparing `main...feat/nutraxin-publisher-19links-current-main-20261107` returned **diverged, 8 ahead, 12 behind**, merge base `f3b559e87fc90cb538d3158b4f20a1790b963dcc`. Six changed paths include the Nutraxin register, renderer, component, test, global CSS and Oncology editorial CSS. This is NOT the previously reported five-file clean comparison; the branch must be reconciled with current main before release.
- Source: https://github.com/NovapharmHealthacre/novapharm-website/pull/112
- Branch register `apps/corporate/data/nutraxin-uk-links.json` has **19** product keys, `verifiedOn: 2026-10-01`, and a publisher-information-only disclaimer. PR description separately asserts 19 URLs retrieved 2026-11-07. Preserve both facts; the later assertion is not independently substantiated by this register. Do not silently update the review date.
- Confirm the publisher's exact product identity/pack/URL against current primary pages, with dated URL response evidence. A publisher link is not UK approval, label, stock, NovaPharm supply or regulatory authorisation evidence.
- Inspect exact PR head and required production, supply-chain, CodeQL, SEO, browser and visual checks after reconciling branch. The commit workflow lookup for **main** returned no PR-triggered runs; this endpoint is PR-filtered and cannot establish main deployment success or failure.

## Release gates still open
1. Source-to-live `main`/Pages SHA and HTTPS custom-domain parity, including safe contact and credential-free static portal. Main source SHA is not a substitute for `gh-pages` or deployed artifact evidence.
2. AWS eu-north-1 application runtime, approved cost and rollback, Entra MFA/session/role isolation, Atlas private network path, SES real contact receipts and abuse protection (#107).
3. Image provenance and 8K source inventory, corporate entity graph, visual/accessibility audit (#109).
4. Security lockfile and current advisories (#108); preserve audit fail-closed.
5. Portfolio editorial approval (#43) and innovation PR #3 source artifact.

## Next narrow change
Rebase or merge **current main into PR #112's review branch** only after inspecting conflicts and preserving the Oncology CSS hotfix; rerun exact-head checks. No production merge until green and no live claim until separate deployment verification.
