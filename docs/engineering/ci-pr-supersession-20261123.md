# CI Phase 2 candidate: PR supersession without losing assurance

**Status:** Source-only candidate, not production or merge approval.

To reduce wasted runner time, add GitHub Actions concurrency only where previously
missing and where repeated PR commits can supersede older runs. Covered workflows:

- Public Pages Chromium and WebKit acceptance
- Supply chain dependency review and SBOM
- NOVA governed model egress contract
- Intelligence subscriptions and tenancy boundaries

The concurrency group is scoped to the current workflow and the PR number on
pull-request events. Every manual `workflow_dispatch` or main-branch `push`
receives its unique run ID and is explicitly **not cancelled** by newer PR
events. No changes to test commands, dependency integrity, permissions,
workflow triggers, security checks, token grants or deployment constraints.

A regression test is imported by `scripts/test-unified-ci-policy.mjs`, which
is already executed by the mandatory `Policy coverage and invariant
verification` job. No additional on-PR workflow has been added.

## Important trade-offs
- Superseded PR runs are cancelled; the newest exact head must still succeed
  on all checks. A cancelled old SHA is never a valid release receipt.
- GitHub will queue jobs; no reduction in actual runner allocation is
  guaranteed. Do not infer the queue bottleneck from this change alone.
- The required unified CI remains fully unconditional. A separate release
  policy might require security review of cancellation behavior.
- No broad cancellation of unrelated branches, production runs, manual
  checks or other PRs is permitted.
- Do not merge this until the previous Phase 1 PR is merged or the independent
  review ensures any needed integration and exact-head full CI are complete.

## Acceptance
1. Validate GitHub Actions syntax, exact-head protected statuses, security and
   browser/native checks on the isolated PR.
2. Confirm two commits to *the same test PR* cancel only superseded runs;
   check that a manual dispatch and a main push remain unaffected.
3. Measure pre/post redundant queued-run count, waiting time and PR lead time.
4. Make no changes to approval requirements or production activation flags.
