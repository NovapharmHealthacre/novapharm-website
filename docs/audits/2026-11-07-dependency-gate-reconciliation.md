# Dependency-gate reconciliation evidence — 2026-11-07

Scope: read-only diagnosis and controlled review planning. This file does not authorize deployment, merge, or security exceptions.

## Exact-head GitHub Actions observations

| PR | Head SHA | Production readiness run | Conclusion | Other evidence |
| --- | --- | --- | --- | --- |
| #89 | `a3b088d089077b39c16cf7d0927c3e58d320717a` | 42243987101 | success | Six other PR-triggered workflows succeeded |
| #85 | `8a4fed292b81a83580cd1c6500875de82e2cf4ea` | 42264773274 | failure | AWS migration contract, staging preflight, browser, supply-chain, CodeQL succeeded |
| #91 | `02c8debd20663267387500ac74ac863b4c2970e6` | 42266179506 | failure | Synthetic contact staging succeeded; unified browser acceptance cancelled |
| #92 | `3eabc399867aaa24e66081c5b5cd1c17b2e66d2c` | 42266919632 | failure | Forensic audit succeeded; unified browser acceptance cancelled |

Previous job-log investigation (2026-11-07) found the same production npm audit failure on #85/#91/#92: 11 vulnerabilities (1 critical, 7 high, 3 moderate), and a missing `/tmp/production-readiness.log` diagnostic artifact. These counts are **prior observations**, not a fresh npm audit rerun in this evidence update.

## Safe next change and acceptance criteria

1. Inspect the actual production-readiness workflow path and failure-step shell logic on the target branch before editing.
2. Preserve the audit exit code while capturing stdout/stderr to an always-created diagnostic file; upload with `if: always()` and avoid silently accepting critical/high findings.
3. Compare production manifests and lockfiles of #85/#91/#92 with #89; transplant only reviewed, applicable dependency updates into a **separate review branch**, never bulk merge.
4. Verify `npm ci`, production-only `npm audit`, build, supply-chain and browser tests against the **new full commit SHA**. Do not equate passing CI with live deployment.
5. Before any merge inspect branch protection, owner approvals, required checks, GitHub Pages auto-publish side effects, deployment SHA, and tested rollback.

## Infrastructure boundary

Atlas project `6aede4d2bedcc3f04ecc6eb5` has one FREE AWS EU_NORTH_1 cluster `novapharm-staging` (MongoDB 8.0.37), with **zero** IP access-list entries as observed on 2026-11-07. This does not demonstrate application connectivity. AWS API access required interactive authorization during this execution, so no fresh AWS state or CloudTrail delivery is asserted.

## Release constraints

Do not change public DNS, production Entra sign-in, public contact acceptance, patient/customer data, Atlas access lists, or billable AWS provisioning without reviewed acceptance. Preserve existing public site and historic Azure sources. Issue #93 remains closed absent new contrary live evidence.

## Reversibility

This documentation-only commit can be reverted without modifying runtime behavior. The next action is review of workflow source and lockfile differences, followed by a separately reviewed CI diagnostic fix.
