# NovaPharm Intelligence — Four-index production preflight

**Prepared 15 November 2026.** This is a *read-only schema inspection contract*, not a production migration, grant, backup, or customer release.

## Why one preflight matters

Atlas medicine admission depends on both the independently validated source-rights index and three transactional G2 indexes. A successful check of only the three G2 indexes is **not enough** to certify the database for G2 rights-backed medicine admission.

`src/data/atlas-four-index-preflight.mjs` derives its four exact ordered index specifications from the canonical rights and G2 atomic-store modules rather than maintaining parallel definitions.

The returned `novapharm.intelligence.atlas-four-index-preflight.v1` object includes:
- `schemaReady`: true only when **all four** exact named, unique, non-sparse, non-partial, non-TTL, simple-collation indexes exist.
- `mutationCandidate`: true only if at least one is missing, every collection is empty, and no conflict or inspection failure exists. This is **not** approval to mutate.
- `checks[]`: expected ordered keys, index name, whether the collection has any documents, and one of `verified`, `missing_unique_index`, `nonempty_collection_requires_review`, `conflicting_index_requires_review`, `inspection_unavailable`.
- `migrationApproved=false`, `independentBackupVerified=false`, `sourceRightsGranted=false`, `productionIngestionApproved=false`, `customerReleaseApproved=false` in **all** outputs.

Use only an independently established native MongoDB-driver connection to database `novapharm_intelligence_production`, via a server-side maintenance environment, with no user-supplied DB handle or browser access.

```js
import { inspectAtlasFourUniqueIndexes } from "./src/data/atlas-four-index-preflight.mjs";

// "database" is a privately authenticated MongoDB driver Db object,
// obtained through the approved operator's existing scoped connection.
// Never pass a browser-owned object, credentials, URL or synthetic fixture.
const preflight = await inspectAtlasFourUniqueIndexes({ database });
console.log({
  schemaReady: preflight.schemaReady,
  mutationCandidate: preflight.mutationCandidate,
  checks: preflight.checks.map(({ collection, indexName, status }) =>
    ({ collection, indexName, status }))
});
```

The call uses only `listIndexes()` and existence-only `countDocuments({}, {limit:1,maxTimeMS:3000})`. It **never** calls `createIndex`, inserts, exports rows, or enables API access. A failed inventory/count returns `inspection_unavailable` and refuses success. This plan is a snapshot; **recheck immediately before every approved write**.

## Exact required constraints

| Collection | Name | Ordered keys |
| --- | --- | --- |
| `npi_source_rights` | `rights_unique_exact_resource_revision` | `workspace_id, source_id, source_version, resource_id, resource_sha256, rights_revision` |
| `npi_medicine_evidence` | `g2_unique` | `workspace_id, source_id, source_version, resource_id, row_id` |
| `npi_evidence_manifests` | `g2_unique` | `workspace_id, manifest_sha256` |
| `npi_audit_events` | `g2_unique` | `workspace_id, event_id` |

Production rights and accepted medicine collections were all empty at the 15 November 2026 readback, with **no** required unique indexes; only four source-metadata records were present. The production Atlas database user discoverable through connected tooling has read-only rights; AWS currently has only a staging Atlas secret and preview URI parameters. These observations do not authorize creating broader network routes, copying secrets, provisioning a paid cluster or executing schema mutations.

## Mandatory separate migration controls

A named, MFA-backed production operator and independent reviewer must establish a schema-only change ticket, source SHA, maintenance window, verified backup/recovery and least-privilege production index-management credential. Use the existing guarded native migrators after approval; their writes are not an atomic four-collection transaction. Preserve successful prior indexes during partial failure. A fresh post-migration native index readback, reversible operator record, transaction tests, source-rights checks, identity validation and real tenant tests remain required.

**A preflight result of `schemaReady=true` never grants source rights, medicine acceptance, NOVA egress, a subscription, or customer release.** Keep production access flags false until all separate acceptance receipts pass.

Related: [#667](https://github.com/NovapharmHealthacre/novapharm-website/issues/667), [#497](https://github.com/NovapharmHealthacre/novapharm-website/issues/497), [#176](https://github.com/NovapharmHealthacre/novapharm-website/issues/176).
