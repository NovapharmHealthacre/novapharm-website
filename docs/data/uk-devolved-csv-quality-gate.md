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
