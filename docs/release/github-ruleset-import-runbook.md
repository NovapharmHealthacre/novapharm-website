# GitHub ruleset activation — source-controlled import proposals

**State: not installed.** These files are inert, version-controlled import proposals. A GitHub repository administrator must apply them through **Settings → Rules → Rulesets** after verifying the repository plan and exact required checks. A passing test or a merged PR does not alter GitHub protection or production access.

| Repository / branch | File | What it actually enforces *after* admin activation |
|---|---|---|
| NovaPharm website `main` | `config/ci/ruleset-proposals/website-main.json` | PR path, up-to-date unconditional CI, prevent deletion and force-push; **zero mandated independent approvals** |
| NovaPharm website `gh-pages` | `config/ci/ruleset-proposals/website-gh-pages-phase1.json` | Prevent deletion and force-push only; normal commits remain possible, **not full publishing protection** |
| NIT `main` | NIT PR #6, `config/ci/ruleset-proposals/nit-main.json` | PR/CI/deletion/force-push gates after NIT Pages migration |

## Activation and rollback sequence

1. **Owner** checks a green, recent PR with two exact job names from the *NovaPharm unified cross-estate CI gate*: `Policy coverage and invariant verification` and `Cross-estate regulated, AI, Google, Apple and native contracts`. Both run on every PR without path exclusions. Confirm status-context selection in GitHub and the effect of strict up-to-date checks.
2. Import `website-main.json` at https://github.com/NovapharmHealthacre/novapharm-website/settings/rules. Review all fields; initially save disabled, then activate only after a dry-run PR proves the required contexts are selectable. Require extra independent approvals only after an eligible second reviewer exists; a zero-review rule is **not** independent approval.
3. Import `website-gh-pages-phase1.json` separately. Inspect the **authorized publisher**, active Pages source and automatic staging workflows before activation. This *staged* first phase blocks history rewrites and branch deletion, but cannot stop every accidental ordinary publishing push. A second publisher-aware rule, with a narrowly scoped bypass if necessary, is required before claiming full `gh-pages` protection.
4. Perform a **negative push test** in a controlled way: verify that an unauthorized direct update or force-push to a protected test/ref is refused, without attempting a destructive push on the live branch. Then verify a valid reviewed PR merges, no old public build replaces the website, and the current contact/home/catalogue routes still match approved source.
5. For **NIT**, do not merge its PR #6 while its existing `Publish website` workflow writes generated files back to `main`. Migrate Settings → Pages → Build and deployment to GitHub Actions, configure the `github-pages` environment and approved-release variable, preserve rollback and check the actual live custom domain first. Only then enable the NIT ruleset and approve the migration.
6. Record live ruleset IDs, bypass actors, results of the negative push test and deployment smoke checks in GitHub issue #984 and NIT issue #7. If a rule blocks the verified legitimate publishing path, disable the new rule and restore that path before making other changes.

**No automatic import:** files in `config/ci/ruleset-proposals` are never processed by GitHub as active rulesets. CI validates their syntax and intended relationship to existing workflow jobs but cannot verify administrator settings or deploy public/regulated services.
