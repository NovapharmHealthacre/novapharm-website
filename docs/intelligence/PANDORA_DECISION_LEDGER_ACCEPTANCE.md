# Project PANDORA | Private decision ledger acceptance

**Date:** 12 November 2026
**Status:** Private, default-OFF **staging candidate**, NOT production-live.
**Master release:** #176. Prior foundations: #193 (routes), #407 (transition preflight).

## Observed facts at review

- GitHub main has 22 protected Medicines Terminal route definitions. The Decision Workspace is gated.
- Decision preflight returns proposals, not database commits or customer access.
- **Atlas Intelligence Production** `novapharm_intelligence_production`: at review time, `npi_medicine_identity`, `npi_medicine_evidence`, `npi_evidence_manifests`, `npi_source_rights`, `npi_ingestion_runs`, `npi_audit_events` each had **0 documents**. `npi_source_registry` had **4 metadata documents**.
- **Atlas staging**: `nova_medicine_evidence_staging`, `nova_source_rights_grants_staging`, `nova_graph_authority_sessions_staging`, `nova_graph_audit_staging` each had **0 documents**.
- These counts do not authorize a source, create a medicine decision or establish user identity.

## Added in this candidate

`src/core/intelligence-pandora-transactional-ledger.mjs` adds the **transactional commit path**, separate from the existing preflight. Its caller must supply a private MongoClient, a same-database Db handle, a server-verified actor, an explicitly approved release boundary, and a trusted database session. There is **no web route**, no model-generated decision, no autonomous action and no customer-access grant.

Inside one majority-acknowledged snapshot transaction the candidate:

1. Loads the current tenant-isolated decision case and rejects stale versions.
2. Checks a current MFA authority record, role and session expiry; writes a revocation-conflict fence on that record.
3. For progression, loads an accepted non-sample evidence manifest, verifies the current purpose-bound source grants, and fences each rights record against concurrent revocation.
4. Reuses the human state machine and enforces proposer/reviewer/approver separation.
5. Atomically compares and updates case state/version, sets reviewer/approver identity, and inserts an audit event chained by SHA-256. Any failure aborts all mutations.
6. Returns a restricted receipt with **externalActionAllowed=false** and **customerAccessGranted=false**.

This candidate is **not** a complete knowledge graph, collaboration engine, commercial recommendation service, approved real-data case, or production application.

## Staging provisioning performed 12 November 2026

The following five **empty** collections were created successfully in MongoDB Atlas
`novapharm_staging`: `nova_decision_cases_staging`, `nova_decision_manifests_staging`,
`nova_decision_authorities_staging`, `nova_decision_rights_staging` and
`nova_decision_events_staging`. No source grant, account, approved case, medicine
observation or audit event was inserted. The connected collection-index tool does
not expose the unique-index constraint required below; **index acceptance remains
open and the ledger remains default-OFF. The new
`src/data/atlas-pandora-staging-indexes.mjs` can provision six unique indexes
only from an approved private maintenance runtime explicitly setting
`PANDORA_STAGING_INDEX_PROVISION_ENABLED=true`. The commit path now checks
their actual `unique` status and exact keys before starting a transaction.
Do not turn on decision commits until those indexes are really installed and
the remaining security acceptance gates are met**.

## Private staging storage schema and mandatory indexes

Create only after assessing compatible MongoDB topology, service identity and storage privileges. These names are hard-coded in the candidate; **do not add broad wildcard application permissions**:

| Collection | Minimum unique index |
| --- | --- |
| `nova_decision_cases_staging` | `{tenant_id:1, case_id:1}` |
| `nova_decision_manifests_staging` | `{tenant_id:1, case_id:1, snapshot_sha256:1, rights_revision:1}` |
| `nova_decision_authorities_staging` | `{tenant_id:1, subject_id:1}` |
| `nova_decision_rights_staging` | `{tenant_id:1, source_id:1, source_version:1}` |
| `nova_decision_events_staging` | `{tenant_id:1, case_id:1, version:1}` AND globally unique `{event_id:1}` |

Grant security/audit operators independent access. Ordinary decision writers must not update or delete audit events. Rights/authority **revocation writers must modify the exact fenced documents in the same database**. If permissions or revocations use a separate system without a coherent fence, **do not enable this candidate**.

Enable in a private staging runtime only after verifying all conditions:

```
ATLAS_ENVIRONMENT=staging
PANDORA_STAGING_DECISION_LEDGER_ENABLED=true
PANDORA_STAGING_DECISION_AUDIT_ENABLED=true
```

Keep `PANDORA_ALLOW_PUBLIC_ACCESS` and `PANDORA_ALLOW_EXTERNAL_ACTIONS` unset/false. Never put credentials, user sessions, patient records or privileged business data in GitHub.

## Owner approval policy and verified 12 November 2026 NHSBSA licence

The owner has approved themselves as **final human decision authority**.
`PANDORA_OWNER_FINAL_APPROVAL_REQUIRED=true` is now mandatory for this
staging candidate. Approval/rejection requires `PANDORA_FINAL_APPROVER_SUBJECT_ID`
to equal the actor's **server-verified OIDC subject** and the actor must also
hold the independently verified `independent_approver` role with MFA.
**Do not set that subject value from a display name, raw request, e-mail
address or a ChatGPT message.** It is still unconfigured until the real owner
OIDC identity is verified. The independent reviewer must be a different
principal than both proposer and owner-approver, not automatically the CEO.
This user direction does not grant a role to any account and does not waive
privacy, source rights or security checks.

The NHSBSA English Prescribing Dataset with SNOMED Code publisher's live
dataset page identifies UK **Open Government Licence v3.0**, requires exact
attribution `NHSBSA Copyright 2021-2026`, and explicitly warns that
third-party content remains under third-party copyright. Use only rights-
approved NHSBSA-published fields and allow case review only after separate
BNF/SNOMED/dm+d rights assessment, where those fields are needed. Official
dataset: https://opendata.nhsbsa.net/dataset/english-prescribing-dataset-epd-with-snomed-code
Official BNF-SNOMED mapping:
https://opendata.nhsbsa.net/dataset/bnf-snomed-mapping
No blanket rights or source grant are created by this policy note.

## New readback implementation

`src/core/intelligence-pandora-audit-readback.mjs` verifies every committed
case event from genesis against the version sequence, permitted transitions,
SHA-256 event digest, previous event digest and stored audit head. It requires
a separate trusted, durable audit of each history read within the same
transaction and a current MFA authority row. It is default-OFF, private
staging-only, not a UI nor a production WORM audit. An attacker who can rewrite
*all* chain records and the head could still forge the chain unless independent
immutable retention and out-of-band anchors are enabled.

## Exit criteria before real deployment

- [ ] Approve one legitimate source licence specifically for internal decision review and approved AI/data processing, with traceable owner, version, territory, permitted uses and expiry/revocation.
- [ ] Reconcile one real canonical medicine (proposed: apixaban) to a source-accepted, provenance-hashed observation and immutable accepted snapshot; no invented demand/pricing/sales.
- [ ] Verify production session identity (Cognito/Entra), MFA freshness, tenant membership and role grants against the chosen system of record.
- [ ] Prove revocation transactions and rights fences against concurrent approve/revoke flows using the actual MongoDB topology; synthetic unit tests are insufficient.
- [ ] Prove dual-human reviewer and approver in the private portal with genuine accounts, including explicit reject/withdraw/revoke.
- [ ] Test event immutability, tamper detection, chain verification, audit export, backup/restore, retention and disaster recovery.
- [ ] Implement backend wiring and protected Decision Workspace UI with accessible state, alternative analysis and evidence citations.
- [ ] Conduct cross-tenant denial, XSS/injection, API security, performance, accessibility, privacy, dependency/security and incident-recovery acceptance.
- [ ] Verify exact deployed commit, private network, audit event and readback in production before calling anything **live**.

**No synthetic case or rights grant may be added to production to satisfy a completion percentage.** Models forecast. AI explains. Humans decide.
