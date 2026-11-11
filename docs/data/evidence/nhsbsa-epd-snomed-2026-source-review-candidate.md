# NHSBSA EPD with SNOMED CT: source-rights and Apixaban first-investigation candidate

**Status:** discovered public source metadata; **no new observations accepted**, no ingest, no AI egress, no customer publication. This note is not licence counsel sign-off.

**Reviewed:** 2026-11-11. Product research programme #451; release #176.

## Official publisher evidence

- Publisher dataset: [English Prescribing Dataset (EPD) with SNOMED Code](https://opendata.nhsbsa.net/dataset/english-prescribing-dataset-epd-with-snomed-code).
- Publisher information page: [English prescribing data](https://www.nhsbsa.nhs.uk/prescription-data/prescribing-data/english-prescribing-data-epd).
- Publisher transition notice: [EPD with SNOMED CT codes, 22 May 2025](https://opendata.nhsbsa.net/news/updated-dataset-available-epd-with-snomed-ct-codes-on-the-open-data-portal).
- The dataset page identifies **Open Government Licence 3.0 (United Kingdom)** and asks reusers to include: **NHSBSA Copyright 2021-2026**.
- The publisher warns that third-party copyright is not necessarily covered by NHSBSA's terms. **Do not assume BNF, dm+d, SNOMED CT or other terminology redistribution/commercial/AI rights** from the EPD's OGL declaration.
- Monthly EPD is a *prescribing and community dispensing* dataset, not proof of medicine sales, wholesaler inventory, patient demand, clinical efficacy or regulatory marketing authorisation.
- Historic EPD without SNOMED was retired; do not silently mix old and new schema versions.
- The live catalogue page lists an August 2026 EPD-with-SNOMED resource, but this document makes **no unverified assertion about the newest resource or warehouse state**. Discovery must record exact resource ID, publisher revision, resource hash and reporting period at execution time.

## Proposed first scientific investigation

Medicine: **Apixaban**, at exact BNF product/presentation and SNOMED/dm+d code level with valid-time and match confidence. Jurisdiction: England (not the entire UK). First allowed observational lens: EPD items/quantity/cost by accepted region, selected reporting periods and valid denominators. The platform must distinguish prescribed/dispensed items from unique patients, units sold or clinical treatment outcomes.

## Existing integration points: use, do not bypass

- Source discovery: `scripts/data/discover-medicines-sources.ts`
- Capacity and immutable resource manifest: `scripts/data/plan-medicines-backfill.ts` and `scripts/data/download-medicines-resource.ts`
- Offline CSV import: `scripts/data/ingest-medicines-resource.ts`
- Staging evidence admission: `src/core/medicine-evidence-admission.mjs`
- Medicine Investigation Passport and NOVA gated research plan: `src/core/medicine-investigation-passport.mjs`, `src/core/ai/nova-investigation-planner.mjs`
- External AI answer gate: `src/core/ai/nova-governed-medicine-answer.mjs`

## Admission checks (all required; no synthetic substitution)

1. Confirm current publisher terms, exact source rights (including commercial use and external AI use separately), attribution, third-party codes, permitted redistribution, and reviewer/approval record. Record immutable licence-terms digest and expiry/revocation policy. An OGL dataset label does **not** constitute automatically verified third-party or external-model rights.
2. Discover exact publisher resource period, dataset schema, BNF/SNOMED changes and authoritative source-revision metadata, then create an immutable download manifest with verified file hash.
3. Run isolated storage/compute-capacity preflight before selecting full monthly EPD partitions, which can be large. No public repo storage, patient data or automatic cloud spending.
4. Validate Apixaban exact identity mappings and effective dates. Resolve ambiguous/changed presentations explicitly; never conflate formulations, strengths or generic/brand relationships.
5. Reconcile source row count, zero/negative/rejected record handling, units, source totals, reporting-period lag, and geographical coverage. Keep all original publisher metrics and derived results separate.
6. Admit candidate evidence in private staging using independently verified source, terminology and purpose-bound rights. The candidate stage still has **zero accepted observations** until the governed final approval/audit transaction.
7. Test tenant isolation, source-rights revocation, provenance, contradictory facts, abstention and human review before any NOVA model request or customer-facing publication.

## Acceptance evidence to attach

- Source revision and independent rights/terminology approval, with exact permitted purposes.
- Publisher resource manifest, hash, schema fingerprint, row-count reconciliation and ingestion-run result.
- At least one exact Apixaban resolved presentation and accepted source observation, with source period and citation.
- A complete rights-filtered investigation and reproducible metric computation.
- Independent expert verification of evidence and a recorded audit receipt.
- No regulatory, stock, forecast or patient-level claims that the underlying source does not establish.

**No source ingestion, licensed data use, approval record, AI action or live deployment was performed by writing this document.**
