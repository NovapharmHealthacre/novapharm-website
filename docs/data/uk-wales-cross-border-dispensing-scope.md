# NWSSP Wales cross-border dispensing — source-scope guard (candidate)

**Status:** source-only proposal, offline synthetic tests, no source records parsed, no approved archive format/clinical schema/rights/production ingestion. This is not a finished UK integration.

## Publisher-supported scope (read-only references, 22 November 2026)

- [NWSSP General Practice Dispensing Data Extract](https://nwssp.nhs.wales/ourservices/primary-care-services/general-information/data-and-publications/dispensing-data-extracts2/general-practice-dispensing-data-extract/) describes Wales GP or delegated nonmedical prescribing dispensed in the community **within Wales or England**. Its source-level scope does not identify an individual row's dispensing location or patient residence.
- [NWSSP English Dispensing Data Extract](https://nwssp.nhs.wales/ourservices/primary-care-services/general-information/data-and-publications/dispensing-data-extracts2/english-dispensing-data-extract/) describes England-origin prescriptions dispensed in community pharmacies **within Wales**. This does not represent all English prescriptions or prove Wales patient residence.
- [NWSSP dispensing extract index](https://nwssp.nhs.wales/ourservices/primary-care-services/general-information/data-and-publications/dispensing-data-extracts2/) lists GP, hospital and English dispensing as distinct source categories. Do not conflate prescribing archives with dispensing archives.
- Publisher descriptions exclude unfilled and private prescriptions and describe monthly releases. Currency, rights, archival structure and source lineage must be validated separately.

## Implemented source-only boundary

The pure helper at src/core/uk-wales-dispensing-cross-border-scope.mjs accepts only sourceId, reportingPeriod (month) and a bounded sourceVersion label. It rejects unsupported sources, forged rights/observations/geography fields, malformed periods and malformed versions.

It returns **publisher-described scope metadata**, not a medicine observation:
- nwssp.gp-dispensing: prescribing jurisdiction GB-WLS; possible community dispensing jurisdictions GB-WLS and GB-ENG.
- nwssp.english-dispensing: prescribing jurisdiction GB-ENG; community dispensing jurisdiction GB-WLS.

Classification and pair assessment preserve canIngest=false, canPublish=false, canSumMetrics=false and admittedMedicineRows=0. They never establish archive format, actual row geography, patient residence, independent clinical Quality, terminology reuse rights or a source licence. Pair assessments classify duplicate/version candidates but never approve additive England/Wales totals or any denominator.

Run the dedicated offline tests with:

    node --test scripts/test-uk-wales-dispensing-cross-border-scope.mjs

CI uses a read-only checkout and a hosted Node.js runner. No source download, Atlas mutation or production route is included.

## Mandatory future acceptance (issues #1082, #1034, #1027)

1. Pin official publisher resources, exact original bytes, file type, ZIP members/CSV schema, edition, period and provenance checksums separately for both sources.
2. Obtain signed independent Legal/Quality decisions, including commercial redistribution, BNF/SNOMED/dm+d rights and source correction/revocation terms.
3. Reconcile prescribing origin, community dispensing location and any independently proven patient residence, with EPD/PCA and Welsh national totals. Different publisher-origin categories alone do not prove no overlap.
4. Complete private schema and archive acceptance, versioned history, row/denominator reconciliation, security review and authenticated web/iOS/Android acceptance before any production medicine admission.

**No original medicine file has been downloaded, parsed or ingested by this guard.** Source-only metadata is not customer-ready medicine evidence.
