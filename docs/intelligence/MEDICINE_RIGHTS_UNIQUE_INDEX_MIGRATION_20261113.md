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
