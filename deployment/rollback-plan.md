# Unified Azure Rollback Plan

Status: repository procedure implemented; managed rollback not yet exercised
Last reviewed: 1 August 2026

## Before production promotion

No public rollback is required: GitHub Pages continues serving the three current public properties and the six Azure production packages remain in candidate slots. Redeploy an earlier accepted digest to the affected candidate only. Never direct an authenticated portal to GitHub Pages.

## During six-application promotion

Promote one application boundary at a time in this order: API, portal, corporate, Technology, founder, status. After each swap, run its health, security and route smoke checks. If one boundary fails:

1. stop further promotions;
2. swap that application back to its last accepted package;
3. confirm database schema compatibility before restarting writes;
4. rerun protected-route, form or public-route checks appropriate to that application; and
5. record the failure and decision.

## After DNS cutover

1. Prefer an App Service slot/package rollback while keeping the compatible current database.
2. If data restoration is required, stop writes and restore Azure SQL to a new isolated database first.
3. Reconcile records, constraints, authorised identities and private documents against the selected recovery point.
4. Rebind only after the restored candidate passes application and security acceptance.
5. During an approved public-site emergency window, restore the recorded corporate, Technology or founder DNS record to its previous GitHub Pages target. Keep portal and API closed rather than exposing a static imitation.
6. Preserve Microsoft 365 mail, verification and unrelated DNS records.

## Evidence

Record previous/current commit, six package digests, Azure deployment and slot IDs, database point, Blob version state, DNS snapshot, start/end time, decision owner and post-rollback results. Keep the release branch and previous candidate packages through the stabilisation period.
