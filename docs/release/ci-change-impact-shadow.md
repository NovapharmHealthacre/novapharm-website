# CI change-impact shadow pilot

This branch implements an advisory planner using the existing cross-estate coverage register. It is not a test selector or a release authorization mechanism. Run from a checkout with both immutable Git commits available:

    node --test scripts/ci/test-change-impact.mjs
    node scripts/ci/plan-change-impact.mjs BASE_SHA HEAD_SHA

The planner uses the PR merge-base diff, includes both paths of renames, reports overlapping domains, and defaults to all domains for shared or unknown inputs, unavailable history or invalid paths. Actual required domains and critical workflows remain unchanged. No workflow triggers are modified.

Before enabling selective execution: build and verify a transitive dependency graph including source generators, browser fixtures, public assets, native toolchains, and release routing; collect shadow reports alongside full checks; establish a false-negative rate against complete CI; keep security, payments, source rights and publish gates mandatory; preserve required status names; test main and merge-group behavior; obtain the applicable repository settings. Do not promote shadow candidates to test skips merely because registered paths match.

Existing acceleration PRs should finish before opening this pilot as a pull request, to avoid additional runner contention.
