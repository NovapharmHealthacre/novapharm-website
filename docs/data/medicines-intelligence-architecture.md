# Medicines Intelligence Architecture

Status date: 2026-08-28

## Purpose

Medicines Intelligence is a protected NovaPharm decision-support capability. It combines authoritative medicine identity, prescribing and dispensing source contracts, pharmacy and practice identity, official geography, registered-population context, forecasting controls, and commercial-governance boundaries.

It does not create clinical advice, patient profiles, a medicine-authorisation claim, or a substitute for an NHS source. Prescribing, dispensing, NovaPharm sales, stock, customer activity, and commercial availability are separate facts.

## Runtime boundary

The module remains the governed Portal module `executive.nhs-data`, publicly labelled `Medicines Intelligence`. Its nine approved views are subordinate routes and do not increase the 54-module Portal count:

1. Overview
2. Medicine search
3. Geography
4. Prescribers
5. Pharmacies
6. Forecasts
7. Opportunities
8. Campaigns
9. Data sources

Board and administrator scopes can access the module. Customer and ordinary employee scopes cannot. Route visibility is not an authorisation control; the service enforces the role boundary.

`PUBLIC_ONLY` contains no Portal data, pharmacy contact intelligence, source credentials, national analytical facts, forecasts, opportunities, or campaigns. `FULL_PLATFORM` can expose protected views only through the managed Portal and API boundary.

## Data path

```text
first-party publisher
  -> resource discovery and release-period evidence
  -> immutable raw archive outside Git
  -> content hash and schema contract
  -> bounded streaming parser
  -> transaction-bound staging and reconciliation
  -> atomic curated publish
  -> analytical marts and model runs
  -> server-side service
  -> protected Portal view
```

Raw source files are never committed. Repository evidence contains metadata, row counts, schemas, hashes, caveats, and local-validation state only.

## Protected query contracts

The managed API exposes a versioned PharmaScope v1 read boundary while retaining the legacy Enterprise aliases for the current Portal. Each route requires an authenticated Board or Administrator scope and is rate limited independently:

| Route | Purpose | Governing boundary |
| --- | --- | --- |
| `GET /api/v1/pharmascope/medicines/search` | Resolve a current canonical medicine identity and governed aliases | Identity only; no demand, sales, stock, availability, or opportunity is inferred |
| `GET /api/v1/pharmascope/medicines/{medicineId}` | Return one canonical identity and code history | No unsupported clinical, regulatory or commercial interpretation |
| `GET /api/v1/pharmascope/analytics` | Query accepted EPD or PCA facts | EPD and PCA remain separate; only successful non-sample ingestion runs contribute; page size and trend history are bounded |
| `GET /api/v1/pharmascope/geography/nearby` | Locate governed pharmacy and practice records around a real postcode coordinate | Uses period-aware organisation validity and great-circle postcode-centroid distance; it returns only a business-email verification flag, never the email value |

The analytics contract accepts a canonical medicine or governed medicine filter before querying. Parameterised SQL applies medicine, source-supported hierarchy, supplier, geography, practice, postcode, month, and metric constraints. A validation-sample ingestion run can prove a parser but cannot make a source analytically available and cannot contribute a row or total. The complete June 2026 EPD publisher resource is accepted in the isolated local private cloud and can contribute to protected local analytics. An absent source or period still returns `source_not_ingested` or `no_matching_facts`, never invented zero demand.

The Portal provides progressive filter disclosure, one-action reset, loading, empty, error, pagination, source-period, reconciliation, and interpretation states. One accepted month is shown as a deliberately designed single-period state rather than a fabricated trend. A protected local Apixaban probe resolves indexed search in 407.15 ms, presentation analytics in 38.04 ms and full chemical-substance analytics in 3,796.77 ms, with exact table/series reconciliation. Sorting, governed export, complete filter coverage, accessible map agreement, sufficient history for forecasting, managed-environment concurrency evidence, and authoritative forecast output remain incomplete and are recorded as such in the 55-requirement ledger.

## Repository layers

| Layer | Current implementation |
| --- | --- |
| Source contracts | `packages/medicines-intelligence/src/source-registry.ts` and `schema-contracts.ts` |
| Upstream clients | CKAN, ONS postcode, ODS FHIR R4, and DoHS v3 clients in `packages/medicines-intelligence/src/` |
| Parsers | EPD, PCA, SCMD, BNF, prescriber, contractor, flow, and registered-population parsers |
| Identity and models | BNF temporal identity, pharmacy matching, geography, forecasting, and opportunity packages |
| Local validation store | Versioned SQLite migrations under `database/sqlite/` |
| Managed SQL design | Azure SQL parity migrations under `database/azure/` |
| Import jobs | `scripts/data/` |
| Protected service | `src/core/medicines-intelligence-service.mjs` |
| Portal UI | `apps/portal/components/medicines-intelligence.tsx` |
| Evidence | `docs/data/evidence/` |

## Storage zones

The governed production design uses three logical zones:

| Zone | Purpose | Mutability |
| --- | --- | --- |
| Raw immutable | Original publisher file plus hash, release, and retrieval evidence | Append-only |
| Curated | Validated identity, facts, geography, and temporal relationships | Versioned, transaction-published |
| Mart | Query-oriented aggregates, forecasts, and opportunity snapshots | Rebuildable from governed lineage |

Local validation uses SQLite and outside-Git raw files. The managed design uses private Blob Storage for immutable large objects and Azure SQL for curated relational authority. Azure SQL `geography` is the approved spatial type. PostgreSQL/PostGIS is not introduced as a competing source of truth.

## Current repository evidence

The integrated local validation database currently proves:

| Capability | Repository state |
| --- | --- |
| Source registry | 32 governed sources; 17 CKAN sources live-discovered without a failed discovery |
| Current BNF catalogue | 55,427 current presentations, 68,858 hierarchy nodes, 332,562 aliases |
| Temporal BNF | Historic and monthly-change sources ingested with governed rejection evidence |
| UK pharmacy seed | 12,936 pharmacies; every workbook row preserved |
| Pharmacy geography | 12,936 of 12,936 pharmacies have ONS postcode-centroid coordinates |
| Practice master | 11,787 practices from Prescriber Details; seven rejected rows recorded |
| Practice geography | 11,710 current practices geocoded; missing and non-UK identifiers retained truthfully |
| Registered population | August 2026: 6,129 totals, 325,811 age/sex rows, 6,129 mappings, total 63,237,908 |
| EPD | Complete June 2026 national publisher resource accepted locally: 18,374,449 input and accepted rows, zero rejected or duplicate rows, with exact source hash, source-row continuity, lineage-digest and source-semantics reconciliation |
| EPD source-scoped marts | June 2026 medicine/month, geography/month and presentation/month marts contain 21,404, 354,617 and 21,404 rows respectively; items, quantity, NIC and actual cost reconcile exactly to the accepted source facts |
| Protected national query | Apixaban search, presentation analytics and chemical-substance analytics return accepted June facts with exact table/series reconciliation; raw facts, contact values, forecasts and opportunities are excluded from evidence |
| PCA | Contract and 1,000-row validation sample only; no complete national monthly PCA period is accepted |
| Forecast output | Not computed because one accepted EPD month is insufficient for a truthful historical forecast |
| Opportunity output | Not scored because demand and commercial eligibility evidence is incomplete |
| Campaign output | No approved campaign; all imported contacts remain marketing-ineligible |

These are isolated local-private-cloud validation facts, not staging or production claims. The June EPD period is a complete national source resource, but it is one period rather than a historical backfill. August 2026 registered population is not used to normalise June 2026 EPD. The evidence records the base HEAD and correctly reports that the continuation worktree was dirty, so it makes no exact-candidate-SHA claim.

## Transaction and lineage controls

Every published row can retain source, resource, period, schema, ingestion run, source-row position, and lineage digest where applicable. Import jobs seed a `running` run first, publish curated rows inside one database transaction, and update the run to `succeeded` only after reconciliation. A failure rolls back the candidate data and leaves a safe failed-run record. Publisher-declared unidentified EPD rows remain facts without pseudo-practice dimensions; identified facts retain a governed practice relationship.

Discovery never overwrites `last_successfully_ingested_at`. A parser sample is classified as `sample_validated`, not `ingested`. The source-health view treats expected, discovered, and ingested periods as different fields.

## Production dependencies

Repository completion does not activate production. The following still require real managed-environment evidence:

- Private immutable Blob Storage and retention controls
- Azure SQL deployment, migration, backup, and restore rehearsal
- Key Vault references and managed identities
- Entra identity and production role assignments
- Approved ODS and DoHS API onboarding and server-side keys
- Scheduled ingestion compute, alert routing, and operator ownership
- Historical EPD plus complete PCA, SCMD, hospital-community, and four-nation backfills
- Staging security, browser, load, and restore acceptance
- Owner approval for commercial scoring, exports, and campaign use

No production activation or cost-bearing provisioning is claimed by this document.

## Primary evidence

- `docs/data/evidence/source-discovery.json`
- `docs/data/evidence/authoritative-source-samples.json`
- `docs/data/evidence/bnf-current-import.json`
- `docs/data/evidence/bnf-temporal-import.json`
- `docs/data/evidence/pharmacy-workbook-import.json`
- `docs/data/evidence/practice-master-import.json`
- `docs/data/evidence/pharmacy-geography.json`
- `docs/data/evidence/registered-population-import.json`
- `docs/data/evidence/backfill-storage-preflight.json`
- `docs/data/evidence/epd-six-month-storage-preflight.json`
- `docs/data/evidence/epd-one-month-storage-preflight.json`
- `docs/data/evidence/epd-2026-06-private-cloud-import.json`
- `docs/data/evidence/epd-2026-06-marts-private-cloud.json`
- `docs/data/evidence/epd-2026-06-private-cloud-query-benchmark-accepted.json`
- `docs/data/evidence/epd-2026-06-private-cloud-post-mart-acceptance.json`
- `docs/data/evidence/source-discovery-local-private-cloud.json`
- `docs/api/pharmascope-v1.openapi.yaml`
- `docs/data/medicines-intelligence-requirements.json`
- `docs/data/medicines-intelligence-requirements.md`
