# Change-impact shadow CI — live advisory pilot

The mandatory **Policy coverage and invariant verification** job now reports file-impact candidates, using the repository's existing registered domains. No new workflow is added, no additional runner is requested, and **no tests or deployment gates are skipped**. The companion unaltered **Cross-estate regulated, AI, Google, Apple and native contracts** job still builds both artifacts and runs the full registered test suite.

For pull requests, the shadow planner reads the public GitHub PR files REST endpoint without credentials, checking the expected immutable head SHA and base SHA before and after retrieval. Renames include old and new paths. Pagination is checked against GitHub's file count, and network, rate-limit, incomplete, malformed, changed-head or non-PR inputs fail closed to the full estate. Main pushes report full estate; this has no influence over the existing main-push CI checks.

Run:
- `node --test scripts/ci/test-change-impact.mjs`
- `node scripts/ci/plan-change-impact.mjs --github-event` (inside GitHub Actions with `GITHUB_EVENT_PATH`)
- `node scripts/ci/plan-change-impact.mjs BASE_SHA HEAD_SHA` (local full-history checkouts)

The existing `turbo.json` and pinned `turbo@2.10.7` already provide a JavaScript task graph. Do not install Nx in parallel merely to reimplement it. Bazel is not switched on: start with an isolated, reproducible target only after measuring a genuine multi-language build bottleneck.

**Promotion conditions:** build a verified transitive graph for generated assets, shared workspace dependencies, runtime fixtures, native toolchains, Stripe/payment boundaries, clinical/source gates and release workflows; measure shadow false negatives against full CI across a representative change history; preserve unconditional protected contexts; keep regulatory/security/payments/publishing required on every PR; verify no unsupported job skipping. None of these conditions is asserted by the advisory pilot.
