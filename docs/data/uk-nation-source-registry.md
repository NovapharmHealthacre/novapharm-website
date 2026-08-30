# UK Nation Source Registry

Status date: 2026-08-24

UK sources are not forced into one false common schema. Nation, publisher, measure, release cadence, and caveats remain visible throughout ingestion and analysis.

## England and cross-UK context

| Source ID | Authority | Latest evidence | Repository state | Production dependency |
| --- | --- | --- | --- | --- |
| `nhse.registered-patients` | NHS England | 2026-08 | Full local import: 6,129 totals, 325,811 age/sex rows, 6,129 mappings | Scheduled managed ingestion and staging acceptance |
| `nhse.qof` | NHS England | 2024-25 | Source documented; adapter pending | Annual adapter and clinically governed feature approval |
| `nhse.ods-fhir-r4` | NHS England | FHIR 4.0.1 service | Bounded client and sandbox tests complete | NHS API onboarding and server-side key |
| `nhse.dohs-v3` | NHS England | v3 REST service | Bounded client and contract tests complete | NHS API onboarding and server-side key |
| `nhse.dmd` | NHS England/NHSBSA | Weekly publisher cadence | Not integrated | Terminology Server or licensed TRUD access |
| `ons.onspd-live` | ONS | Live service checked 2026-08-24 | Full pharmacy/practice postcode enrichment locally validated | Managed refresh and production storage |
| `ons.onspd-quarterly` | ONS | 2026-05 | Temporal fallback locally validated | Managed quarterly refresh |
| `ons.small-area-population` | ONS | Mid-2024 edition | Adapter pending | File adapter and temporal geography reconciliation |
| `mhclg.imd2025` | MHCLG | Corrected IoD25 v2 | Adapter pending | Validate corrected File 7 and join by official LSOA |
| `ons.rural-urban-2021` | ONS | RUC21 | Adapter pending | Validate the correct geography-level lookup |
| `gphc.premises` | GPhC | Daily/weekly subscription service | Licence blocked | Owner-approved subscription and reuse terms |

The registered-population publication is a practice-list denominator and is not patient residence. QOF is contextual prevalence only and must not be used as an inferred diagnosis or proof of causation.

## Scotland

| Source ID | Authority | Latest discovered period | Repository state | Caveat |
| --- | --- | --- | --- | --- |
| `phs.prescribed-dispensed` | Public Health Scotland | 2026-01 | Live CKAN discovery and exact representative parser validation | Paid items and prescriber-to-dispenser flows are not NovaPharm sales; data from May 2023 onward is provisional |

The full Scottish history has not been backfilled.

## Wales

| Source ID | Authority | Repository state | Caveat |
| --- | --- | --- | --- |
| `nwssp.pharmacies` | NHS Wales Shared Services Partnership | Public source documented; adapter pending | Public ownership reflects information supplied to Primary Care Services; restricted databases are not accessed |
| `nwssp.practice-pharmacy-flow` | NHS Wales Shared Services Partnership | Workbook structure documented; adapter pending | Four logical sheets and limited retained financial-year history require version-aware ingestion |

No Welsh national flow or contractor backfill is claimed.

## Northern Ireland

| Source ID | Authority | Latest discovered period | Repository state | Caveat |
| --- | --- | --- | --- | --- |
| `bso.dispensing-contractor` | Business Services Organisation | 2026-06 | CKAN discovery and documented parser contract; live sample retrieval was blocked by the source | Paid claims are not sales; full backfill pending |
| `psni.premises` | Pharmaceutical Society of Northern Ireland | Not yet resolved | Monthly register adapter pending | Monthly snapshot must be checked against the live register |

The inability to retrieve a Northern Ireland sample is not represented as sample validation.

## Four-nation comparison rules

1. Preserve the publisher's measure and unit.
2. Never add prescribing, dispensing, paid items, or issued quantities without an explicit harmonisation definition.
3. Retain nation-specific geography and organisation identifiers.
4. Display provisional or management-information status.
5. Use cross-nation comparisons only where coverage, period, unit, and denominator genuinely align.
6. Never fill a missing nation with synthetic values or a weaker convenience source.

## Primary sources

- [Patients Registered at a GP Practice](https://digital.nhs.uk/data-and-information/publications/statistical/patients-registered-at-a-gp-practice)
- [Quality and Outcomes Framework](https://digital.nhs.uk/data-and-information/publications/statistical/quality-and-outcomes-framework-achievement-prevalence-and-exceptions-data)
- [ODS FHIR R4](https://digital.nhs.uk/developer/api-catalogue/organisation-data-terminology)
- [DoHS v3](https://digital.nhs.uk/developer/api-catalogue/directory-of-healthcare-services/version-3)
- [ONS small-area population estimates](https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/datasets/lowersuperoutputareamidyearpopulationestimatesnationalstatistics)
- [English indices of deprivation 2025](https://www.gov.uk/government/statistics/english-indices-of-deprivation-2025)
- [ONS 2021 Rural Urban Classification](https://www.ons.gov.uk/methodology/geography/geographicalproducts/ruralurbanclassifications/2021ruralurbanclassification)
- [Public Health Scotland Open Data](https://www.opendata.nhs.scot/)
- [NHS Wales pharmacy publications](https://nwssp.nhs.wales/ourservices/primary-care-services/general-information/data-and-publications/)
- [OpenDataNI](https://www.opendatani.gov.uk/)
