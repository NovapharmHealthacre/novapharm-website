# UK medicines — four-nation source acceptance matrix

Updated 21 November 2026. This is an **implementation and acceptance register**.
It does not certify live medicine records, an operational national data warehouse,
or public web/iOS/Android country access.

| Nation | Jurisdiction | Publisher | Source ID | Mode | Source granularity | Current claim |
| --- | --- | --- | --- | --- | --- | --- |
| England | GB-ENG | NHS Business Services Authority | `nhsbsa.epd` | CKAN package metadata, CSV bulk under separate acceptance | Retrospective prescribing per month | Metadata verification only; June 2026 complete isolated local ingestion is documented separately |
| Scotland | GB-SCT | Public Health Scotland | `phs.prescribed-dispensed` | CKAN package metadata; separate quarterly CSV bulk under acceptance | Community prescribed-and-dispensed, **quarterly** | Discovery contract only; no accepted production ingestion |
| Wales | GB-WLS | NHS Wales Shared Services Partnership | `nwssp.practice-pharmacy-flow` | Official publication page; monthly workbooks require separate adapter | Pharmacy by practice and practice by pharmacy flows | Page reachability only, no verified public bulk API |
| Northern Ireland | GB-NIR | Business Services Organisation / OpenDataNI | `bso.dispensing-contractor` | CKAN package metadata, monthly CSV under separate acceptance | Paid GP-practice to dispensing contractor items per month | Discovery contract only; no accepted production ingestion |

## Implementation in this candidate

1. `packages/medicines-intelligence/src/resource-discovery.ts` parses Jan–Mar, Apr–Jun, Jul–Sep and Oct–Dec ranges into quarterly periods. Scotland quarterly data must never be interpreted as a single month, mixed with England monthly rows, or denominated against arbitrary different periods.
2. `packages/medicines-intelligence/src/source-registry.ts` keeps Scotland and Northern Ireland source metadata discovery separate from DataStore medicine-row sampling during unapproved release work.
3. `src/core/uk-four-nation-source-metadata.mjs` implements one fixed, bounded GET per official publisher. CKAN responses validate exact dataset identity and dated resource metadata; Wales confirms public publisher webpage reachability only. **Never follows resource URLs, downloads workbooks/CSV files, or writes pharmaceutical records to AWS/Atlas.**
4. Exact-head CI records source-only evidence. A live network failure means **not verified**; a successful publisher response means **metadata verified**, not data ingested or legally licensed.
5. Mobile apps and protected web portals must access accepted, versioned facts only through an authenticated backend. No source API credentials or raw national data files are embedded in device builds.

## Remaining obligations for 100% independently production-verified coverage

- **Rights:** independently signed NHSBSA, PHS, NWSSP and BSO terms; third-party BNF/dm+d/SNOMED content rights, commercial/AI use, distribution, rehosting and attribution. Regulatory source rights separately for MHRA.
- **Ingestion:** publisher-version-aware complete historical backfills with file hashes, byte sizes, schema and source-period reconciliation, corrections and revocations. Store immutable originals only in private approved cloud zones.
- **Identity:** preserve nation, medicine identifier namespace, period, prescriber/dispenser definitions, units, and reported vs inferred values; missing mappings remain unresolved.
- **Coverage:** England EPD/PCA/BNF/dm+d/SCMD, Scotland prescribing and dispensing, Wales workbooks and contractor data, Northern Ireland BSO paid flows, ODS/ONS geography, MHRA regulatory data and UK shortage/pricing datasets.
- **Operations:** source availability/freshness alerts, retry/backoff, idempotent runs, signed run evidence, tenant-scoped views, production API deployment, web+iOS+Android logged-in acceptance, independent human release signoff.
- **Safety:** no clinical advice, real-time inventory, hospital sales, licensed marketing authorisation, stock availability or country-wide completeness inferred from prescribing claims.

Official publisher references:
- https://opendata.nhsbsa.net/dataset/english-prescribing-dataset-epd-with-snomed-code
- https://www.opendata.nhs.scot/dataset/prescribed-dispensed
- https://nwssp.nhs.wales/ourservices/primary-care-services/general-information/data-and-publications/pharmacy-practice-dispensing-data/
- https://admin.opendatani.gov.uk/dataset/dispensing-by-contractor

Related: [UK implementation tracker #1027](https://github.com/NovapharmHealthacre/novapharm-website/issues/1027), PR #1026.

## 21 November 2026 — essential medicine-presentation data additions

The original devolved source list was incomplete for medicine-level analyses.
These **distinct, official sources** were added to the registry as unapproved adapter candidates:

| Nation | Source ID | Official source | Data meaning | Stage |
| --- | --- | --- | --- | --- |
| Scotland | `phs.prescriptions-community` | Public Health Scotland Prescriptions in the Community | Monthly BNF/dm+d medicine/prescriber, dispenser or health-board presentation records | Metadata only; no rows imported |
| Wales | `nwssp.gp-prescribing` | NWSSP General Practice Prescribing Data Extract | Monthly ZIP with GPDataFileCCYYMM, ChemSubstance and practice addresses | Page reference only; no bulk API or rows |
| Northern Ireland | `bso.gp-prescribing` | BSO GP Prescribing Data / OpenDataNI | Monthly medicine presentation items, quantity, gross and actual costs | Metadata only; no rows imported |

PHS quarterly **Prescribed and Dispensed** (location flow) must never be conflated with monthly **Prescriptions in the Community** (medicine presentation). BSO monthly **Dispensing by Contractor** must never be conflated with **GP Prescribing Data**. The Wales GP data extract differs from the monthly **Pharmacy / Practice Dispensing** movement tables. Each has its own source ID, data grain and provenance.

Publisher references:
- https://www.opendata.nhs.scot/dataset/prescriptions-in-the-community
- https://nwssp.nhs.wales/ourservices/primary-care-services/general-information/data-and-publications/prescribing-data-extracts/general-practice-prescribing-data-extract/
- https://www.opendatani.gov.uk/dataset/gp-prescribing-data
