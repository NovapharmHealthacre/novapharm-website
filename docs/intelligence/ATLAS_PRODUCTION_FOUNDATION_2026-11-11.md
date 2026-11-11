# NovaPharm Intelligence | Production Atlas collection foundation

**Verified:** 2026-11-11, AWS Stockholm (eu-north-1)  
**Environment:** separate database on existing MongoDB Atlas Free cluster `npi-bootstrap`  
**Database:** `novapharm_intelligence_production`  
**State:** infrastructure-only candidate; **NOT production data acceptance or customer launch**

## Actual changes independently read back from Atlas

The following seven empty collections were created on the existing free cluster. Each has the standard MongoDB `_id` index and one additional **non-unique** classic query index:

| Collection | Exact secondary index | Key order |
| --- | --- | --- |
| `npi_medicine_identity` | `identity_lookup_by_scheme_code_jurisdiction` | `code_system: 1, normalized_code: 1, jurisdiction: 1, effective_from: -1` |
| `npi_medicine_evidence` | `medicine_evidence_by_source_period` | `medicine_id: 1, source_id: 1, reporting_period: -1` |
| `npi_source_registry` | `source_versions` | `source_id: 1, source_version: -1` |
| `npi_source_rights` | `rights_by_workspace_source_revision` | `workspace_id: 1, source_id: 1, source_version: 1, rights_revision: -1` |
| `npi_ingestion_runs` | `ingestion_history_by_source` | `source_id: 1, started_at: -1` |
| `npi_evidence_manifests` | `manifest_lookup` | `workspace_id: 1, medicine_id: 1, manifest_sha256: 1` |
| `npi_audit_events` | `workspace_audit_timeline` | `workspace_id: 1, recorded_at: -1` |

All seven collection names and all seven secondary indexes were verified by fresh read operations immediately after creation.

### Official-source metadata catalogue admitted to the empty production candidate

Four **metadata-only, explicitly unaccepted** source registry entries were subsequently copied from `novapharm_intelligence_preview.npi_source_registry_preview` into `novapharm_intelligence_production.npi_source_registry`. A fresh read confirmed these exact IDs:

- `nhsbsa_english_prescribing`: England monthly community prescribing metadata; OGL-3.0 listed; independent BNF/SNOMED terminology and publisher-use review pending
- `ons_population`: UK population/geography metadata; dataset version, licensing and denominator comparability review pending
- `openfda_drug`: United States regulatory-label metadata; third-party copyrighted fields and record-level reuse review pending
- `clinicaltrials_gov`: United States study-registry metadata; reuse, attribution and version policy review pending

Each copied document retains `ingestion_status: "metadata_only"`, `accepted_observations: 0`, `customer_publish_approved: false`, `data_persisted: false`, and a `rights_status` beginning `pending_`; added explicit `admission_status: "unaccepted"`, `source_rights_grant_active: false`, `environment: "production_candidate_metadata_only"`, and the preview-collection import provenance. No fresh resource rights were independently re-attested by this migration.

**Read-back after insertion:** source registry = 4 metadata documents; source-rights collection = 0 grants; medicine-evidence collection = 0 documents. No medicine identity, sample observation, clinical claim, grant, subscription, model approval, customer, charge or entitlement was inserted or accepted. This catalogue **must never be interpreted as a production medicine-data admission or publication permission**.

The pre-existing `novapharm_intelligence_preview` database was not migrated or altered. Its two existing application users remain preview-scoped (`readWrite` and `read`, respectively). A further Atlas **production-database read-only** principal was created in a separate attempted credentials setup, but secure parameter storage was blocked and no usable application credential was configured. The parameter was independently checked as absent. **This principal must be rotated into a verified secret-management workflow or removed; do not use it for production access.** Atlas network access and customer routes were not opened. Nothing was deployed to an application or made publicly reachable.

## Outstanding controls before production acceptance

1. **Architecture and connection:** independently approve Atlas as the production authority, provision a dedicated least-privilege production service identity and secret through a protected secret manager, establish approved private network egress/ingress, and test deny-by-default access. The production-name database does not establish production authority.
2. **Schema and consistency:** approve immutable canonical field contracts; add appropriate JSON schema validators, **unique** identity, rights and manifest constraints and transaction/revision fences. The indexes listed above are query indexes only and do not prevent duplicate authorities.
3. **Source permissions:** accept actual publisher/data-licence and third-party BNF/SNOMED rights with accountable legal/compliance approval. Store a signed/revocable source grant; do not infer a grant from official catalogue availability.
4. **Evidence admission:** ingest a versioned, rights-cleared source record from a private worker; prove publisher checksums, exact identity mapping, grain, geography, period, reconciliation, manifest and commit audit. Require zero customer visibility until the receipt is accepted.
5. **Security operations:** validate backups and a restoration rehearsal, capacity/retention, audit immutability, service account revocation, multi-tenant negative tests, and usage/cost SLOs. The Free cluster cannot be assumed equivalent to a dedicated production service.
6. **Product gates:** independently activate customer MFA and ownership, enforce Stripe subscription entitlements from their authoritative systems, then test the complete rights-scoped medicine search and cited NOVA answer, forecasting and exports before public customer release.

## Truth boundary

The database name includes `production` as the intended future environment, **not as a declaration of readiness**. Operational release remains blocked under #176. No production customer, subscription, active source-rights grant or accepted medicine observation is inferred from collection/index creation. Never send unsolicited emails or initiate payment while provisioning data infrastructure.
