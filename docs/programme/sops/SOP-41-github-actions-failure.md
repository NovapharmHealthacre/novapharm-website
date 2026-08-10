# SOP-41 — GitHub Actions Failure

Execution status: **REPOSITORY_EXECUTABLE_REHEARSAL_REQUIRED**

## Owner
Platform Release Owner

## Purpose
Diagnose and repair CI/CD failures from the first causal error without weakening checks or manufacturing green status.

## Trigger
Required GitHub Actions workflow/check fails, hangs or reports conflicting evidence.

## Prerequisites
1. Exact commit SHA, run ID and failing job/step.
2. Workflow source at that exact SHA.
3. Known expected release mode/target.

## Permissions
- Read workflow/log evidence; code/workflow changes only through a branch/PR. Secret access is never required to read values.

## Steps
1. Confirm the failing run belongs to the exact candidate SHA; discard evidence from older heads.
2. Read the first causal failing step/log and classify deterministic code/test, dependency/toolchain, configuration/secret, external/transient or release-contract failure.
3. Reproduce with the same repository command/environment where possible.
4. Fix the underlying defect on a branch; do not use `continue-on-error`, delete coverage, relax thresholds, bypass tests or post fake statuses.
5. If logs expose a secret, invoke SOP-06 and SOP-38 before continuing.
6. Run the full applicable suite on the new exact head; discard prior greens after any code/config change.
7. Merge only when all real gates pass and the candidate head is unchanged.

## Evidence
SHA, workflow/run/job/step IDs, causal log excerpt without secrets, root-cause classification, fix commit and exact-head final results.

## Stop Conditions
Failure is unexplained; proposed fix weakens a guard; evidence belongs to another SHA; secret exposure; external dependency cannot be verified.

A STOP condition blocks merge/release.

## Escalation
Platform Release Owner; Security Lead for secret/security failures; dependency/service owner for external failure.

## Rollback
Revert the defective workflow/toolchain change through normal reviewed change control; never restore known-insecure tooling merely to go green.

## Recovery
Re-run all affected workflows on the corrected exact SHA and verify post-merge evidence where the release requires it.

## Review Cadence
After every material CI incident and after runner/action/toolchain changes.

### Authorities
- `docs/programme/post-pr16-release-control.md`
- `.github/workflows/`
- `docs/programme/security-governance-gates.md`

Repository procedure existence is **not** CI acceptance evidence for a specific SHA.
