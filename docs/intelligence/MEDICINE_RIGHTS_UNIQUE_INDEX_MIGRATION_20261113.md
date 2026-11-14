# Medicine source rights — reviewed unique-index migration

Status: code candidate only; dry-run by default; not executed against live Atlas.

The production collection novapharm_intelligence_production.npi_source_rights has zero
rights-grant records and only the _id_ and a nonunique query index. The separate
private rights verifier in PR #583 requires the exact six-key unique compound
index named rights_unique_exact_resource_revision, without sparse/partial/TTL
options or non-simple collation.

The existing MongoDB connector index action cannot express unique:true.
This code requires a trusted MongoDB driver in an independently approved private
operator service. Do not confuse the default dry-run with an approved migration.

Procedure:
1. Confirm signed independent rights/data-governance and database-migration
   change approval, MFA-backed operator identity, backup/restore and no active writers.
2. Run apply=false, check no conflicts and verify the collection is empty.
3. Only after independent signed change approval, apply=true with a reviewed
   change ticket and external trusted authorizeMigration callback.
4. Verify fresh listIndexes metadata for exact unique keys, simple collation
   and majority write acknowledgment. Record a protected audit receipt.
5. Release operator migration credentials. The rights reader must still deny:
   no independently authorised third-party rights are in production.
6. Separately complete exact Apixaban identity, control reconciliation,
   real G2 atomic staging commit, two MFA tenants and cited NOVA acceptance.

No rights, customer entitlement, medicine observations, payments, emails,
public API routes or model processing are enabled by this change.


## G2 evidence/manifest/audit unique-index migration

The G2 atomic store (PR #587) independently requires real MongoDB unique indexes
for npi_medicine_evidence (workspace/source/version/resource/row_id),
npi_evidence_manifests (workspace/manifest SHA), and npi_audit_events
(workspace/event_id). All three currently lack the required unique constraints,
and their production collection counts were zero at the last live readback.

The additional ensureG2PrivateMedicineUniqueIndexes helper checks all three
collections **without writing by default**. It refuses conflicting/nonunique
indexes, nonempty collections and missing separate authority, and creates only
missing indexes with explicit unique:true and majority acknowledgment after
independent approval. Every new index receives an independent listIndexes
readback. Multi-index creation is not a single atomic migration: on any error,
stop and reconcile partially created indexes; never blindly drop one.
No real source rights, records, identities, customer access or billing are
created by this helper.

## Concurrent writer / approval-window safety

The migration helpers repeat both `listIndexes` and the empty-collection check **after** independent operator approval and immediately before each index write. This rejects observed new grants, G2 evidence or conflicting indexes that arrive after the first preflight. Three CI regression cases simulate grants, index conflicts and medicine evidence arriving during the approval window. This is a **time-of-check/time-of-use mitigation, not an atomic lock**: the authorised maintenance process must independently fence every writer (including jobs and change streams), verify a backup/restore plan and repeat post-creation index inspection. No live index migration has been performed by this code change.
