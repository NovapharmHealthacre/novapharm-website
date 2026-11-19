# NovaPharm Intelligence — production Atlas unique-schema compatibility

**15 November 2026. Status: code contract and dry-run test only. Production migration has NOT run.**

## Why this repair exists

The current repository had two G2 schema migrators that required the same ordered compound keys but proposed *different index names*:

- `src/data/atlas-g2-unique-index-migration.mjs` requires exact name `g2_unique` on three collections.
- `src/data/atlas-private-medicine-rights-index.mjs` previously proposed names `g2_evidence_unique_source_row`, `g2_manifest_unique_digest`, and `g2_audit_unique_event` for those same collections, and treated any exact-field unique index as compliant.

That created a split-brain acceptance risk: one migrator could report ready after the other had installed indexes its own validator rejected. The current source contract now shares keys from the atomic store and requires `g2_unique` in both paths; historical alternative names are rejected for independent reconciliation.

## Exact migration specifications

| Collection | Index name | Ordered keys |
| --- | --- | --- |
| `npi_source_rights` | `rights_unique_exact_resource_revision` | `workspace_id`, `source_id`, `source_version`, `resource_id`, `resource_sha256`, `rights_revision` |
| `npi_medicine_evidence` | `g2_unique` | `workspace_id`, `source_id`, `source_version`, `resource_id`, `row_id` |
| `npi_evidence_manifests` | `g2_unique` | `workspace_id`, `manifest_sha256` |
| `npi_audit_events` | `g2_unique` | `workspace_id`, `event_id` |

All four are required to be **unique**, with nonsparse/nonpartial/non-TTL semantics and simple collation. Newly created G2 indexes use majority write concern. Existing query indexes must not be dropped.

## Production evidence from connected Atlas (15 November 2026)

Project `NovaPharm Intelligence Production`; free cluster `npi-bootstrap`; database `novapharm_intelligence_production`.

- `npi_source_registry`: four metadata records.
- `npi_source_rights`, `npi_medicine_identity`, `npi_medicine_evidence`, `npi_ingestion_runs`, `npi_evidence_manifests`, `npi_audit_events`: zero documents each.
- The four unique indexes listed above have **not been installed**.
- Existing Atlas principals: two preview-only principals and one production **read-only** principal. No approved production schema-write principal or trusted maintenance-network path was identified.

The connector's generic `create_index` operation does not expose a `unique: true` option and cannot replace the native driver migration. Do **not** create similarly named nonunique indexes through that interface.

## Controlled operator sequence (not automated by this PR)

1. Independently approve a schema-only change and maintenance window with a named MFA-backed operator and separate reviewer. Verify identity, namespace, backup/recovery reference, and that admission and customer traffic are OFF. The existing GitHub PR and user request alone are not a source-rights approval.
2. Establish a *temporary*, least-privilege production schema-maintenance credential and narrowly scoped private network route. Never use preview credentials, embed secrets in Git, open `0.0.0.0/0`, or add chargeable infrastructure by default.
3. Run a native MongoDB-driver read-only preflight against all four collections, including exact counts, existing indexes, key order and uniqueness. Stop on any data or conflicting indexes.
4. Only after the independent authority and backup checks, run the approved native migrators. Schema writes are not a cross-collection transaction; preserve any created indexes if later steps fail, reconcile and retry idempotently.
5. Perform a **native** `listIndexes()` readback proving `unique:true`, correct names and exact key order for all four. Record a durable audit receipt with operator, source SHA, change ticket, before/after evidence, and rollback plan.
6. Re-run G2 atomic/rights negative tests and perform separate data-rights and actual user/MFA acceptance. No source observation, rights grant, customer access or paid subscription is created by this schema-only step.

## CI acceptance and boundaries

`.github/workflows/intelligence-g2-schema-compatibility.yml` checks both migration implementations, the rights index and the atomic-store contract on Node 24. It uses synthetic in-memory collections; it performs **zero** real Atlas writes or privilege changes. This contract is a prerequisite to the production schema migration—not evidence that indexes exist.

References: [G2 unique-index blocker #667](https://github.com/NovapharmHealthacre/novapharm-website/issues/667), [Medicines Terminal #497](https://github.com/NovapharmHealthacre/novapharm-website/issues/497), [master #176](https://github.com/NovapharmHealthacre/novapharm-website/issues/176).
