# NHSBSA Source Registry

Status date: 2026-08-24

The live discovery evidence is `docs/data/evidence/source-discovery.json`. Resource UUIDs are resolved through the NHSBSA CKAN Action API and are not pinned in ingestion code. Periods below came from the live publisher metadata review, not from an assumed calendar.

## Current sources

| Source ID | Dataset | Discovered period | Contract | Local repository state | Next action |
| --- | --- | --- | --- | --- | --- |
| `nhsbsa.epd` | English Prescribing Dataset with SNOMED | 2026-06 | Exact | 1,000-row validation sample only | Run national monthly backfill and reconciliation |
| `nhsbsa.pca` | PCA Monthly Administrative Data | 2026-06 | Exact | 1,000-row validation sample only | Run national monthly backfill and reconciliation |
| `nhsbsa.bnf-current` | BNF Code Information - Current Year | 2026-07 | Exact | Full current catalogue locally ingested | Monitor next release |
| `nhsbsa.bnf-historic` | BNF Code Information - Historic | 2025 | Exact | Full 2025 file locally ingested with one governed rejection | Review the rejected source record and retain evidence |
| `nhsbsa.bnf-changes` | BNF Code Information - Monthly Changes | 2026-07 | Exact | Full change file locally ingested | Monitor next release |
| `nhsbsa.prescriber-details` | Prescriber Details | 2026-07 | Exact | Full file parsed into a practice-only master; seven rows rejected | Maintain rejection evidence; do not retain clinician identity in the curated master |
| `nhsbsa.hospital-community` | Hospital Prescribing Dispensed in the Community | 2026-06 | Not yet validated | Discovery only | Implement contract and backfill |
| `nhsbsa.scmd-provisional` | Provisional Secondary Care Medicines Data | 2026-06 | Parser supports the governed schema variants | Discovery only | Validate current full resource and units before backfill |
| `nhsbsa.scmd-final` | Finalised Secondary Care Medicines Data | 2026-03 | Parser supports final state | Discovery only | Validate and backfill according to finalisation cycle |
| `nhsbsa.contractor-details` | Contractor Details | 2026-07 | Exact representative source row | Discovery and parser complete | Run full contractor-master reconciliation |
| `nhsbsa.pharmacy-activity` | Pharmacy and appliance contractor dispensing data | 2026-04 | Exact representative source row | Discovery and parser complete | Backfill as activity facts, not medicine-level sales |
| `nhsbsa.practice-dispensing` | Dispensing Practices dispensing data | 2026-04 | Exact representative source row | Discovery and parser complete | Backfill practice-to-contractor item flows |
| `nhsbsa.padm` | Dispensing doctor and personally administered data | 2026-04 | Not yet validated | Discovery only | Add and validate a source-specific contract |
| `nhsbsa.pharmacy-open-close` | Pharmacy Openings and Closures | 2026-07 | Not yet validated | Discovery only | Use as estate movement aggregates only |
| `nhsbsa.consolidated-pharmacy` | Consolidated Pharmaceutical List | 2026/06-Q1 | Not yet validated | Discovery only | Reconcile premise, ownership, and opening-hour semantics |
| `nhsbsa.bnf-snomed-map` | BNF / SNOMED mapping | Not discovered through CKAN | Pending | File adapter pending | Implement current ZIP/workbook adapter; re-evaluate the announced CKAN move |

## Meaning boundaries

- EPD is practice-level prescribing. It is not pharmacy dispensing, NovaPharm sales, or patient residence.
- PCA is community dispensing and reimbursement-oriented management information. It is not EPD and the two sources must not be naively summed.
- SCMD indicative cost is not hospital acquisition cost.
- Hospital-community data is distinct from EPD and secondary-care issues.
- Pharmacy activity and practice-dispensing flows do not provide a complete medicine-by-pharmacy national fact.
- BNF identity and code changes do not create demand or commercial facts.

## CKAN controls

The reusable client supports `package_search`, `package_show`, bounded `datastore_search`, restricted read-only `datastore_search_sql`, and direct resource downloads. It enforces timeouts, bounded retries, content-type and success-envelope checks, checksums where supplied, schema fingerprints, cancellation, and file-size limits.

The 2026-08-24 discovery resolved all configured CKAN packages. Four resources advertised DataStore availability but did not accept the bounded probe; they remain usable only through their governed bulk-resource path until the publisher state changes.

## Backfill truth

Only BNF current, BNF historic, BNF changes, and Prescriber Details have complete local source-file imports. EPD and PCA are samples. Every other source above is discovery-only or adapter-pending. None is claimed as a production backfill.

## Primary publisher

[NHSBSA Open Data Portal](https://opendata.nhsbsa.net/)
