# NovaPharm engineering platform: speed with release integrity

Date: 2026-11-27

## Decision and current evidence

The repository has 238 workflow definitions and a broad multi-language estate. During PR #1327, the observed repository backlog exceeded 160 queued workflow runs, including 93 sampled runs from a single GitHub Actions Dependabot update. This is queue congestion, not evidence that every individual test is slow. The previous successful Portal browser step comparison was 1,365 seconds versus 948 seconds (30.5% lower execution time; non-controlled sample).

PRs #1318, #1320, #1321, #1324, #1325 and #1327 were merged. #1327 uses a bounded native npm scheduler, not a new Turbo or pnpm dependency. Merged does not mean every ancillary workflow or post-merge release check passed. The required cross-estate contexts are currently only:
- Policy coverage and invariant verification
- Cross-estate regulated, AI, Google, Apple and native contracts

No release authority follows merely from a merged commit. The repository is publicly visible and personally owned, not organisation-owned; the native GitHub merge queue is therefore not available under the documented eligibility criteria.

## Operating architecture

1. **Admission and queue:** routine dependency version updates grouped by compatibility and ecosystem, majors separate, bounded open PRs, staggered schedules. Security update settings and security remediation are not disabled. Current PRs and in-flight jobs are not deleted by this change.
2. **Fast feedback:** pinned toolchain, exact commit, policy, formatting, type and unit checks; declare each workspace's dependency and generated-source inputs explicitly. Fail early on invalid inputs.
3. **Affected graph:** extend the existing change-impact shadow report with forward and reverse dependencies, cross-language generators and shared contracts. Unknown or shared inputs expand coverage. Compare predictions with full CI; never skip a required check merely on path matching. Security, clinical/regulatory, checkout, financial data, identity and publishing gates require explicit independent review before any routing changes.
4. **Build and artifact plane:** build from exact, clean source with locked dependencies and toolchains. Identify outputs with source SHA, input digest, build mode, dependency lock, platform and compiler version. Separate full-platform from public-only artifacts; no public exposure of private artifacts, records, secrets, protected Portal outputs or credentials. Cache deterministic tasks only; read-only/untrusted PR cache boundaries; trusted writers; integrity verification and forced clean rebuild fallback.
5. **Validation and release:** keep mandatory branch protection. Define a required release-admission decision that checks exact candidate evidence, security/audit, applicable integration/browser/contract suites and immutable provenance before publication. Validate merged integration state, not just the PR head. Use small canary rollouts, health checks and explicit rollback; AWS permissions and deployment environments remain isolated.
6. **Execution:** bounded parallelism first, consolidate duplicated setup where proven safe, isolate slow browser/native tasks, use existing npm workspaces and Turborepo where compatible. Evaluate Bazel or Buck2 on a single deterministic multi-language target after measuring a bottleneck. Do not replace the working monorepo build wholesale or add Nx solely for tool parity.
7. **Merge coordination:** avoid needless branch syncs; protect main and use serialized integration admission with full exact-candidate evidence. A native merge queue requires an eligible organisation-owned repository and merge_group-compatible required workflows; ownership migration or ruleset changes require a planned review, not a silent switch.
8. **Monitoring:** report per-workflow p50/p95 queue and execution durations, PR time to first useful result, completion latency, cancellation/retry counts, flaky test rate, cache hit rate, cost per successful release, change failure rate and recovery time. Measure on a representative sample, with queue separate from execution. Never report goals as achieved results.

## Initial engineering objectives (targets, not measured SLOs)

| Metric | Proposed target |
| --- | --- |
| PR first useful feedback | p95 <= 5 minutes under normal runner capacity |
| Routine low-risk PR validation | p95 <= 15 minutes after graph verification |
| Full cross-estate validation | p95 <= 35 minutes after bottleneck work |
| Required test coverage | 100% of applicable required checks, no blind skips |
| Release provenance | 100% of releases matched to a verified immutable commit/artifact |
| Critical security/clinical/checkout boundaries | No automatic relaxation |
| Cache integrity | Zero accepted unverifiable artifacts |

Record baselines before changing runner capacity or caching. Targets must be revised against measured workload, especially mobile and browser matrix duration.

## Phased delivery and safeguards

- Phase A: routine dependency admission, stable main/PR concurrency, queue and latency visibility. This change handles only routine dependency admission.
- Phase B: run the shadow dependency planner on representative changes; compare with full suites and extend the graph. Keep required contexts unconditional.
- Phase C: eliminate proven duplicate tasks; add verified local caching, then limited private remote caching for deterministic inputs only. Benchmark and test failure recovery before broad rollout.
- Phase D: enforce release admission against exact artifact and candidate evidence; test rollout and rollback on non-production environments. Review repository protection and ownership eligibility before native merge queue adoption.
- Phase E: evaluate additional runner capacity or distributed execution with cost caps and security boundaries only if measurement justifies it.

Each optimisation needs a rollback path, regression proof, a before/after metric and a declared security/release impact. One coherent change at a time when the queue is congested.

## Reference architecture sources

- Google SRE release engineering: https://sre.google/sre-book/release-engineering/
- Google SRE canarying: https://sre.google/workbook/canarying-releases/
- Bazel remote execution: https://bazel.build/remote/rbe
- Meta Buck2: https://engineering.fb.com/2023/04/06/open-source/buck2-open-source-large-scale-build-system/
- GitHub merge queues: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue
- GitHub Dependabot configuration: https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference
