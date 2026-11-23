# Protected UK source-only merge routing — 22 November 2026

Status: **source-only release guard candidate; not merged or deployed.**

## Actual failure mode found on current protected main
The GitHub Actions workflow `.github/workflows/dispatch-approved-aws-contact-release.yml` runs on **every main-branch push**, regardless of paths. The separately triggered `publish-aws-contact-production.yml` has selected public file paths, but this is **not** enough to prevent the main-push dispatcher from attempting a public contact release for unrelated new UK source-only files. A public release attempt can occur after the owner-production hold is lifted and AWS health checks pass. All three UK PRs were still unmerged when the risk was identified.

## Exact, bounded protection
The dispatcher and publisher have identical, explicit case matchers for reviewed source-only files. This change adds the exact currently reviewed **14 files from UK metadata PR #1026**, **19 files from offline archive PR #1030**, **4 files from rights/identity draft PR #1059**, plus this evidence document. Source files are not altered.

The classifier sets the existing internal `found_ml=true` (meaning any private source change, not just ML) while preserving `private_only=true` only when **every** changed file is explicitly recognized private or an existing neutral release-control file. An empty change set and policy-only change set do not qualify. This prevents broad `src/core/*` / `packages/*` / `docs/data/*` exemptions.

A mixed commit with genuine public contact, Nutraxin product, site builder or CSS files MUST NOT be suppressed; it follows the independently verified normal public release path. Both dispatch and publisher must agree on classification. Their original owner approval and health checks still apply.

## Regression and independent acceptance
The updated `scripts/aws/contact-release-routing.test.mjs` exercises the real path-classification cases of both workflows for each exact PR file, each full PR source-only merge, the routing guard repair itself, empty/policy-only sets, and mixed changes with five distinct real-public paths. The owner/independent reviewer must verify the exact Git SHA and current protected main before approving. GitHub CI and the live route guard are not proven until a complete exact-head run passes.

This PR should be **reviewed and merged before** any of #1026/#1030/#1059, because it is the protection allowing source-only merges without unrelated AWS contact publication. Its own main merge contains this explicit private document, so both main-push dispatch and dedicated publisher should classify it as a private-only guard repair. No production data, permissions, licensing or customer API activation is performed.

## Explicit remaining gates
- Independent qualified security/code reviewer for release routing and source-only UK PRs
- Protected branch checks, CodeQL, cross-estate CI, regression and browser verdicts
- Separately, human Legal/Quality and BNF/SNOMED/dm+d rights; publisher archive provenance; clinical data admission; protected web and mobile acceptance
- Main push publication behaviour must be independently observed after a controlled source-only merge; pre-merge code inspection is not production verification

Related programme: #1027. UK source PRs: #1026, #1030, #1059. Previous CI execution blockage: #1049 (closed only for #1026/#1030).


## 23 November 2026 — source-only Welsh cross-border #1111 guard extension

**Earlier #1074 routing guard is merged** on protected main at `330c42485b60e8c7a213dac1c1fc7fb5ad783b35`. The text above describes its original candidate status as of 22 November, not the current release status. This follow-on change is a separate candidate and **not merged yet**.

PR #1111 introduces four new reviewed, data-free source-only paths which the existing exact-path AWS Contact dispatch and publish classifiers do **not** recognize. Without this change, a future #1111-only main merge could be misclassified as public release scope once the independent owner production hold is lifted:

- .github/workflows/uk-wales-cross-border-dispensing-scope.yml
- docs/data/uk-wales-cross-border-dispensing-scope.md
- scripts/test-uk-wales-dispensing-cross-border-scope.mjs
- src/core/uk-wales-dispensing-cross-border-scope.mjs

The new routing candidate adds **only these four literal filenames** to both exact-path classifiers. It does not add a broad `src/core/*`, `docs/data/*`, or .github workflow exemption; it does not change owner holds, permissions, customer routes, AWS resources, or live production flags.

The routing regression suite now tests these four paths in isolation, the routing guard-repair itself, empty/policy-only changes, and mixed commits containing genuine Contact, Nutraxin, site builder or website CSS changes. In a mixed commit, public-release gates remain necessary and must **not** be suppressed. The original source-only PRs #1026, #1030 and #1059 and their existing path exemptions are unchanged.

**Merge order:** verify full exact-head CI and independent release-security review for this routing-repair PR, then merge it **before** independently reviewed PR #1111. Rebase or synchronize #1111 with the resulting main and rerun its required exact-head CI. This repair is not permission to import Welsh dispensing records, grant terminology licences, publish medicines, spend money, or deploy the public Contact site. Production remains restricted by owner-controlled release holds.

Independent acceptance must still verify post-merge dispatcher and publisher skip behavior; a green source test does not prove live publishing was skipped.


## 23 November 2026 — published-image audit #1010 source-only routing

[PR #1010](https://github.com/NovapharmHealthacre/novapharm-website/pull/1010) is merged into protected `main` as `73c99d4c74c75a29ecbce6ce434dc4ac3be02a6c`. Its five files implement **read-only** SHA-256 equality testing of published images and static HTML image-alt attribute presence. They are neither a public Contact form change nor permission to publish a new site.

Both managed AWS Contact dispatch and publisher classifiers must recognize **exactly** these five source-only files. No wildcard such as `scripts/*`, `.github/workflows/*`, or `assets/*` is permitted. This narrowly prevents an audit-only merge from being classified as a public release once the independent owner production hold is eventually lifted.

The regression suite checks pure audit commits; audit plus reviewed release-routing controls; empty/control-only commits; and mixed commits touching genuine Contact, Nutraxin, page builder or CSS files. Mixed public changes must **never** be excluded from normal publication gates. Existing review, branch protection, production holds, data-rights and protected-service limits are unchanged. A passing source test does not replace post-merge workflow-run verification.
