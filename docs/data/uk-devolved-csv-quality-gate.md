# UK devolved nations — CSV quarantine schema and non-additive metrics gate

As of **21 November 2026**, this is a developer/Quality **pre-production candidate** in [PR #1030](https://github.com/NovapharmHealthacre/novapharm-website/pull/1030). It does not import official medicine rows or grant NHS/publication licences.

## Why this additional gate is required

The four nations do **not** publish interchangeably comparable observations:
- **Northern Ireland BSO GP Prescribing** has medicine-presentation rows with `Practice`, `Year`, `Month`, `Total Items`, `Total Quantity`, `Gross Cost (£)`, `Actual Cost (£)`, `BNF Code` and further published presentation fields. This dataset includes dispensed and paid prescriptions—not a count of prescriptions originally written. Cost is in GBP. Publisher caveats cover BNF changes, dose/quantity changes and reimbursement adjustments.
- **Northern Ireland BSO Dispensing by Contractor** is a GP-to-contractor item-flow dataset. It is not the same as BSO GP Prescribing and must not be added to it.
- **Scotland PHS Prescriptions in the Community** has at least `BNFItemCode`, `PaidQuantity`, `GrossIngredientCost`. Prescriber, dispenser and Board are **overlapping views** of the same prescribing activity and must never be summed together. The `PaidQuantity` measure changes interpretation in some products from May 2023 onward.
- **Scotland PHS Prescribed and Dispensed** instead represents quarterly prescriber-to-dispenser location flow with `NumberOfPaidItems`. It is not medicine-level demand.
- **Wales NWSSP** GP prescribing ZIP contains multiple distinct source files and the pharmacy/practice data uses workbooks. Neither has a proven exact 2026 row contract here. The CSV quality gate explicitly rejects their unqualified rows rather than guessing a parser.

## Implemented safeguards

`src/core/uk-devolved-csv-quality.mjs` requires exact publisher column headers, rejects missing/duplicate columns, enforces finite bounded numerical strings, prevents fractional item counts and malformed or outside-period NI monthly dates, flags negative accounting corrections instead of silently removing them, and preserves missing BNF codes as unresolved. For Scotland's community dataset, the caller must specify `board`, `prescriber` or `dispenser` view, and a separate method explicitly returns `canSumMeasures: false` for overlapping views.

The function assesses **in-memory samples only** (max 1,000 rows), returns no raw sample data, never contacts any publisher or private cloud service, and always returns `canIngest:false`, `canPublish:false`, `admittedMedicineRows:0`. A matching synthetic header does not establish a real publisher schema, an authorised source file, full-month completeness, or approval to reuse BNF/dm+d/SNOMED data. Version-specific schema review and record-level rights approval remain independent.

The schema tests are included in the protected, source-only offline GitHub workflow. They do not assert real national data QA has been completed.

**Official field evidence:**
- [NI GP Prescribing August 2026 CSV preview](https://www.data.gov.uk/dataset/a7b76920-bc0a-48fd-9abf-dc5ad0999886/gp-prescribing-data/datafile/2f8e6dd8-ef10-4442-94db-5e5f74b5c135/preview)
- [NI BSO GP Prescribing Dataset notes](https://www.opendatani.gov.uk/dataset/gp-prescribing-data)
- [PHS Prescriptions in the Community](https://www.opendata.nhs.scot/dataset/prescriptions-in-the-community)
- [PHS Board aggregation resource](https://www.opendata.nhs.scot/dataset/prescriptions-in-the-community/resource/1b2916be-017c-4b23-81f0-75971599464e)
- [NovaPharm full UK programme issue #1027](https://github.com/NovapharmHealthacre/novapharm-website/issues/1027)

**Next:** independently verify raw official source files, schema versions and permitted commercial/AI/terminology reuse; build private complete partition ingestion and row-level Quality reconciliation; only then admit records into tenant-isolated accepted production views and prove web/iOS/Android parity.

## 21 November 2026 — historical comparability breakpoints

The pure `src/core/uk-medicine-metric-comparability.mjs` contract tests **candidate** historical comparisons. It never reads clinical/medical data, changes the web/native UI, writes Atlas/AWS, or declares approved source rights. Its output always has `crossNationSumAllowed:false` and `productionApproved:false` even when a same-source pair is *potentially comparable*.

- **Northern Ireland BSO GP Prescribing**: code coverage differs before and after **September 2018**; some inhaler/spray/solution quantity meanings changed from **August 2021**; BNF chapters were reclassified around **October 2021**; late concessionary costs are included from **May 2024**. Historical comparisons crossing one of these boundaries are explicitly blocked pending independent normalization.
- **Scotland PHS**: the standardised PaidQuantity mapping was introduced from **May 2023**. `board`, `prescriber` and `dispenser` views are overlapping, not additive.
- **England**: EPD prescribed-in-community and PCA paid/reimbursement records are separate grains; same-named metrics are never assumed additive.
- Across any nations, cross-country summation is blocked until an independent harmonisation and denominator review establishes the right aggregation.

Source references: [BSO official dataset explanation](https://www.opendatani.gov.uk/dataset/gp-prescribing-data) and [PHS dataset and quantities mapping guidance](https://www.opendata.nhs.scot/dataset/prescriptions-in-the-community). Eight additional synthetic tests cover boundary and negative cases.

**Not yet connected to live analytics:** This is a source contract for future accepted evidence, not a declaration that production time-series are fixed or quality-accepted.

## 22 November 2026 — Wales GP ZIP member inventory

The [official NWSSP General Practice Prescribing Data Extract](https://nwssp.nhs.wales/ourservices/primary-care-services/general-information/data-and-publications/prescribing-data-extracts/general-practice-prescribing-data-extract/) says each monthly compressed source file contains three distinct members: GPDataFileCCYYMM (medicine presentation; 15-character BNF), ChemSubstance (9-character chemical prefix), and an Address file (practice/health board/locality). The true names, formats and contents of a chosen official archive still require an exact-source validation; this contract follows the documented naming only.

`src/core/uk-wales-gp-zip-inventory.mjs` examines a bounded ZIP central directory through an already-open file handle, never expanding the archive or reading pharmaceutical records. It checks the monthly GP member name, the two reference members, 3 exact files, no duplicate roles, encryption, path traversal, zip bombs or unexpected methods. ZIP64, unexpected publisher naming and member count fail closed pending Quality review. It verifies only the reported ZIP directory metadata; it does **not** independently authenticate the publisher, validate local file headers/CRC, approve licence/BNF rights, ingest or publish any medicine data.

The output is always `sourceRowsRead:0`, `admittedMedicineRows:0`, `canExtract:false`, `canIngest:false`, `canPublish:false`, `customerCountryLive:false`. Five additional synthetic tests are part of the protected source-only GitHub workflow. Passing these tests **is not proof that a real Wales ZIP archive has been obtained or accepted**.

### Wales ZIP local-header consistency hardening — 22 November 2026

The ZIP structural check now requires each central-directory entry to agree with
its own local header (compression method, declared sizes, encryption/data-descriptor
flags and exact member filename), bounds local payloads before the directory,
and forbids overlapping local member intervals. The scanner reads bounded ZIP
metadata only, not the medicine-file payloads. This still cannot replace CRC,
publisher-issued hash authentication, clinical row validation or rights review.
