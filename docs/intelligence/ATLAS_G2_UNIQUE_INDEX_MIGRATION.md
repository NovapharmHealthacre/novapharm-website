# Intelligence G2 Atlas unique-index preflight and controlled migration

Related: #667, #454, #497, #517. This is **migration implementation**, not authorisation to ingest or publish medicines data.

## Production inventory, 14 November 2026

Production Atlas `novapharm_intelligence_production` currently has zero medicine-evidence, evidence-manifest and audit-event records. Its existing ordinary lookup indexes do not include the exact compound unique indexes required for the atomic admission store.

The canonical index specifications are exported from `src/data/atlas-medicine-g2-atomic-store.mjs`; the independent migration implementation is `src/data/atlas-g2-unique-index-migration.mjs`.

| Collection | Unique compound key order |
| --- | --- |
| `npi_medicine_evidence` | `workspace_id, source_id, source_version, resource_id, row_id` |
| `npi_evidence_manifests` | `workspace_id, manifest_sha256` |
| `npi_audit_events` | `workspace_id, event_id` |

Each must be a **non-sparse, non-partial, simple-collation `unique:true`** index. The required name in this migration is `g2_unique`.

## Safe deployment protocol

1. Obtain an independently authenticated change ticket and verified private production operator. Keep customer access and medicine publication disabled; quiesce writers. Do not paste Atlas credentials into GitHub or a browser.
2. Connect from the existing approved least-privilege, private runtime using a native MongoDB driver. The code intentionally does not create connections or read credentials from environment variables.
3. Inject that verified driver database into `inspectAtlasG2UniqueIndexes({ database })` and read the index/empty-collection preflight. If incompatible indexes or a non-empty collection need reconciliation, stop. No index drops or replacement are implemented.
4. After independently verified `verifyMigrationAuthority` confirms `authorized=true`, `productionWritesQuiesced=true`, `operatorId` and `changeTicket`, call `applyAtlasG2UniqueIndexes({ database, verifyMigrationAuthority, afterVerifiedIndex })`. The `afterVerifiedIndex` callback **must durably persist a nonsecret operator/change-ticket audit receipt** and return `{persisted:true}` for each index.
5. The routine creates only `unique:true` compound indexes and re-reads the exact index definitions after each operation. A partial failure does not drop a previously created index; the next approved invocation re-checks all three.
6. Independently re-read `listIndexes` from production and test atomic admission denial/rollback on a private synthetic fixture, without committing synthetic evidence into production.
7. Keep medicine source rights, dated canonical identity, resource hashes, G1 staging and independent G2 rights checks as separate blockers. Three indexes alone do not make a medicine available.

## Tests

```sh
node --test scripts/test-atlas-g2-unique-index-migration.mjs scripts/test-atlas-medicine-g2-atomic-store.mjs
```

The GitHub Actions workflow `Intelligence Atlas G2 unique index safety` runs these tests against isolated fake driver collections. They test approval denial, non-empty/unsafe index refusal, native `unique:true` options, readback, partial/retry, audit failure, exact index-key parity and the original atomic evidence-store transactions. This is repository acceptance only.

**Do not use the existing connected Atlas index-creation tool for this job:** its exposed contract cannot set `unique:true`; a non-unique substitute would leave the production atomic store correctly blocked.
