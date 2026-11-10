# NovaPharm Intelligence | Governed Atlas evidence graph
**Implementation evidence:** 10 November 2026  
**Environment:** MongoDB Atlas staging, AWS Stockholm (eu-north-1)  
**Status:** staging storage and source contracts; **NOT production security acceptance**

## What exists
The Atlas `novapharm_staging` database now has three separate **empty** collections:
- `nova_source_rights_grants_staging`, indexed by `workspace_id, source_id, source_version`.
- `nova_graph_authority_sessions_staging`, indexed by `workspace_id, principal_id, authority_revision`.
- `nova_graph_audit_staging`, indexed by `event_id` and separately by `workspace_id, recorded_at`.

They were deliberately created without authorising any medicine data, source licence, customer session, model inference or payment. On inspection, `nova_medicine_evidence_staging` contained **zero** accepted metadata documents, while `nova_source_registry_staging` contained four metadata records. A source register is not a source-rights grant or ingested fact.

`src/data/atlas-graph-governance-staging.mjs` supplies separately enabled server-only, projected read adapters for source grants and session-revision checks, plus a write acknowledgement contract for an append-oriented security event. It can be passed into the already merged, board-scoped PANDORA graph prototype. Tests exercise current-grant revocation, tenant isolation, duplicate authoritative records, expired sessions, missing rights and audit failure.

## Explicitly not approved
- The new collections are not populated with real signed licensing decisions, verified workforce sessions, accepted medicine observations or historical PANDORA graph data.
- Current staging reads span multiple collections without a single transactional/snapshot revocation fence. Races between rights checks and output still require a tested, production-grade authority design. A code callback does **not** prove coherent distributed revocation.
- The live portal is not connected to these adapters. There is no public URL, browser-side credential, AI tool capability, customer subscription or customer data access.
- A majority write acknowledgement requires an independently validated MongoDB topology, retention, immutability/restricted update/delete roles, backup policy and actual write test before qualifying as a durable production audit trail.
- A normal index does not guarantee uniqueness: the adapter explicitly rejects two matching source-grant or session records. Unique-index policy should be accepted independently before activation.

## Required production gates
1. Reconcile production identity authority (Cognito/Entra), exact tenant membership, MFA and revocable session revision with the graph service.
2. Accept the source-rights registry through separately accountable licensing decisions; rights must include permitted use, jurisdiction, source version, publisher conditions, expiry and revocation.
3. Design a coherent transaction/revision fence spanning session and source-grant mutation; do not claim linearizable authorization from separate `find` calls.
4. Implement service-to-Atlas private network, least-privilege readers/writer, secrets management, zero patient data by default and egress controls.
5. Prove authenticated graph query, source-revocation race, concurrent write/read, majority audit storage, log retention, backup restore, monitoring, cross-tenant denial and browser acceptance on an approved production candidate.
6. Expose any customer-accessible view only after independent G0-G7 acceptance under master issue #176.

No external customer or supplier messages, real charges or privileged access upgrades are part of this change.
