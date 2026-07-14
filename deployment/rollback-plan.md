# Azure Rollback Plan

Status: design complete; live rollback not yet exercised

## Before DNS cutover

Rollback is a candidate-slot redeploy or no action: GitHub Pages continues serving the public site. Do not direct portal traffic to GitHub Pages.

## After slot swap, before DNS cutover

Swap back to the last accepted slot/package. Confirm database compatibility first. Run health and protected-route smoke tests.

## After DNS cutover

1. Prefer Azure slot/package rollback while retaining the current database.
2. If data must be restored, stop writes and restore to a new isolated Azure SQL database first.
3. Validate the restored candidate before rebinding the runtime.
4. During the approved emergency window only, restore recorded public website DNS to GitHub Pages; authenticated services remain closed until Azure is safe.
5. Never remove Microsoft 365 mail or verification records.

## Evidence

Record previous/current commit, Azure deployment ID, slot, database point, Blob version state, DNS snapshot, start/end time, decision owner and post-rollback acceptance. Keep the feature/source branch until the stabilisation period is complete.

