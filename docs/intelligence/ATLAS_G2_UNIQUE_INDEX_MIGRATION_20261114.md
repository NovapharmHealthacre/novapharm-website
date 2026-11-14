# NovaPharm Intelligence — G2 Atlas unique-index migration candidate
**Prepared 14 November 2026. Status: source-only, not applied or accepted in production.**

This change prepares the four MongoDB unique indexes required by [PR #583](https://github.com/NovapharmHealthacre/novapharm-website/pull/583) (source-rights reader) and [PR #587](https://github.com/NovapharmHealthacre/novapharm-website/pull/587) (G2 admission storage). The connected MongoDB Atlas index creation action **does not expose the `unique: true` parameter**, so an ordinary nonunique index is not a substitute. The migration is implemented as a private, injected JavaScript MongoDB-driver module, **not** a public web endpoint or auto-deployer.

## Required exact unique indexes
| Collection | Ordered keys | Reason |
| --- | --- | --- |
| `npi_source_rights` | `workspace_id`, `source_id`, `source_version`, `resource_id`, `resource_sha256`, `rights_revision` | One authoritative revision per exact source resource |
| `npi_medicine_evidence` | `workspace_id`, `source_id`, `source_version`, `resource_id`, `row_id` | Reject duplicate source observations |
| `npi_evidence_manifests` | `workspace_id`, `manifest_sha256` | Idempotent publisher manifest |
| `npi_audit_events` | `workspace_id`, `event_id` | Unique security audit receipt |

All index specifications require `unique: true`, no sparse or partial filter and simple collation. The migration enforces exact ordered key matching, not merely index-name existence. Other existing nonunique query indexes are preserved.

## Operator sequence — **do not skip**
1. Independently confirm the target Atlas project and cluster, the live connected namespace `novapharm_intelligence_production`, operator authority, security change ID, approved maintenance window and an independently checked backup/recovery reference. The function does not cryptographically prove the cluster identity from a caller-provided database handle.
2. Confirm production admission, customer access, subscriptions and model inference remain OFF. Verify the **four target collections are empty**, and that no ingestion worker can write during migration.
3. With an existing private MongoDB Driver `Db` handle, first run `planAtlasG2UniqueIndexes({ database })`. It only inspects `listCollections`, `listIndexes` and `countDocuments`, without creating anything.
4. An independently authorised operator may run `applyAtlasG2UniqueIndexes({ database, approval, productionAdmissionEnabled: false })` with a reviewed `approval` object whose `changeId`, `independentReviewerVerified` and `operatorConfirmedBackup` have been established **out of band**. The JS flags are not signatures or proofs of the reviewer's identity.
5. Record exact prior/after index readback, collection counts, reviewer and operator identities, migration run ID, and backup/restore outcome in the private change record. A failure can create a **partial** set of indexes; never call it an atomic cross-collection migration. Investigate and rerun idempotently after correcting the blocker.
6. Independently test replica-set majority reads, real transactions, source-rights and identity revisions, revocation race, audit, quarantine, and two-tenant isolation. **No source-rights grants or medicine rows are inserted here.**

### Example private adapter usage (illustrative, not a runnable deployment)
```js
import {
  planAtlasG2UniqueIndexes,
  applyAtlasG2UniqueIndexes
} from "./src/data/atlas-g2-unique-index-migration.mjs";

// database is the independently authenticated, least-privileged MongoDB
// Driver Db object delivered by the private, operator-managed runtime.
const plan = await planAtlasG2UniqueIndexes({ database });
// Stop for independent review of the plan and change approval.
// Only in a separately approved schema maintenance window:
// const receipt = await applyAtlasG2UniqueIndexes({
//   database, productionAdmissionEnabled: false,
//   approval: {
//     environment: "private_schema_only",
//     changeId: "EXAMPLE_CHANGE_ID_REPLACE",
//     customerAccessEnabled: false, ingestionEnabled: false,
//     independentReviewerVerified: true, operatorConfirmedBackup: true
//   }
// });
```

## Verified starting point, 13–14 November 2026
The four collections had **zero documents** and only nonunique secondary indexes in the previous direct Atlas inspection. Production source-rights grants, medicine identities, evidence, manifests, ingestion and audits were zero; source registry held four **metadata-only** records. The additional independent source-rights decision register in Drive remains **REVIEW REQUIRED**, and the archive's checksum verification is not permission to publish. Nothing in this migration creates a licence, opens customer data, sends emails, makes payments or certifies any of the 22 workspaces as released.

## Release block
Independent dataset/terminology rights approval, real founder MFA and two-tenant acceptance, source reconciliation, trusted private identity/signer adapters, operational rollback and human code review remain mandatory. Never promote based on a successful synthetic test alone.
