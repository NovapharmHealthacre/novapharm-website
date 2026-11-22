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
