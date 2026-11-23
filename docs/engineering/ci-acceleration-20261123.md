# NovaPharm CI acceleration — safe Phase 1 (23 November 2026)

## Goal
Reduce PR critical-path latency while retaining protected source acceptance,
CodeQL/security, release ownership, the FDA/UK rights boundaries, browser/native
acceptance and independent production signoff. **This PR is source-only.**

## Implemented changes
1. The two existing required `main` status contexts in
   `.github/workflows/novapharm-unified-ci-gate.yml` now execute
   **concurrently**, rather than contracts waiting for policy to finish.
   Both statuses still must succeed under ruleset 27825634. No job conditions,
   path filters or security/release exemptions were added.
2. Four existing dependency-installing workflows retain locked `npm ci` and
   `--ignore-scripts`, adding only `--prefer-offline` to reuse verified npm
   cache contents when present. Missing packages still download normally and
   integrity checks remain enforced by the lockfile.
3. The always-on policy job runs new deterministic regression tests so future
   changes cannot silently convert the two required checks to optional or
   silently remove the full cross-estate regression suite.
4. A **manual-only**, read-only `CI latency telemetry` workflow samples
   completed PR runs' job creation, runner start and finish times. The script
   writes an Actions job summary and 7-day report artifacts; it cannot cancel
   runs, change branch protection, publish builds or access production systems.

## How to obtain a baseline
In GitHub Actions, select **CI latency telemetry (read-only)** on the
optimization branch, then **Run workflow** with 25 or 50 recent completed
PR workflow runs. Review job scheduling p50/p95, execution p50/p95 and the
slowest workflows. A job queue observation is *not* evidence, by itself, that
GitHub runner concurrency is the bottleneck. Retest against a comparable
post-merge sample before claiming acceleration.

## Explicit non-changes
- No workflows disabled; no required status renamed.
- No branch rules or reviewer requirements modified.
- No `main`, `gh-pages` or live infrastructure changes.
- No changes to protected customer, FDA, UK or AWS activation settings.
- No removal of browser suites, native builds, security checks or regressions.
- No new vendor service, paid runner or incremental infrastructure allocation.

## Gates before merge and any future Phase 2
1. Validate exact-head CI, both required statuses, CodeQL and regression
   suites and confirm no required check is skipped.
2. Obtain any mandatory qualified independent security/release review.
3. Inspect baseline queue/step timings; distinguish runner wait, workflow
   dependencies, repeated builds, flaky retries and approval waiting.
4. Only then consider larger changes (reusable build artifacts, isolated
   test shards, dependency-driven selection with always-running fail-closed
   aggregator, runner scaling). Prove equivalent test coverage first.
5. Production release is a **separate** owner-authorized process with
   independent rights, quality, deployment and live verification gates.

## Success criteria
Lower p50/p95 PR turnaround and queue latency, with **zero reduction** in
mandatory test coverage, security findings or review enforcement. Actual
performance improvements must be measured; no time guarantee is implied.
