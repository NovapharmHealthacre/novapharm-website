# UK source-file archive preflight — England, Scotland, Wales and Northern Ireland

**Status:** implementation candidate, read-only private-quarantine file integrity checking. No accepted medicine observations, no production/API/mobile activation, no approval or evidence of commercial/AI/BNF/SNOMED rights. **Never interpret a successful preflight receipt as source licence or medicine safety approval.**

This package extends the existing England-focused EPD/PCA ingestion scripts with a separate source-file integrity boundary for all four nations. The twelve supported **candidate archive format profiles** (eight original plus four publisher-confirmed candidate types) are:

| Jurisdiction | Registry source ID | Publisher file type | Exact source grain | Period |
| --- | --- | --- | --- | --- |
| GB-ENG | `nhsbsa.epd` | CSV | England observed community prescribing | Month |
| GB-ENG | `nhsbsa.pca` | CSV | England dispensing/reimbursement, NOT additive to EPD | Month |
| GB-ENG (publisher) | `nhsbsa.bnf-snomed-map` | CSV | Monthly BNF↔SNOMED crosswalk reference, **no prescribing volumes**; geography not applicable to reference mappings | Month |
| GB-SCT | `phs.prescribed-dispensed` | CSV | Prescriber-to-dispenser location flow, not medicines | **Quarter** |
| GB-SCT | `phs.prescriptions-community` | CSV | Prescription-payment records: board, prescriber or dispenser views are different grains | Month |
| GB-WLS | `nwssp.practice-pharmacy-flow` | XLS/XLSX | Practice ↔ pharmacy flows; no national medicine content implied | Month |
| GB-WLS | `nwssp.gp-prescribing` | ZIP | GP presentation-level prescribing; contains main CSV, ChemSubstance and addresses | Month |
| GB-WLS | `nwssp.hospital-prescribing` | ZIP candidate | Hospital-origin community-dispensed presentation data: main HospitalDataFileCCYYMM, ChemSubstance, Address | Month |
| GB-WLS | `nwssp.dental-prescribing` | ZIP candidate | Dental-origin community-dispensed presentation data: main DentalDataFileCCYYMM, ChemSubstance, Address | Month |
| GB-WLS | `nwssp.independent-pharmacist-prescribing` | ZIP candidate | Independent-pharmacist presentation data: four CSV members IPDataCCYYMM, BNF, ChemSubstance, Address | Month |
| GB-NIR | `bso.dispensing-contractor` | CSV | Paid dispensing contractor flow, not medicine demand | Month |
| GB-NIR | `bso.gp-prescribing` | CSV | Medicine-presentation items/quantity/cost, not contractor flow | Month |

## What is implemented

- An immutable deterministic source contract per nation and publisher dataset, including disjoint jurisdiction, period precision, approved publisher hosts, delivery format and fact grain.
- A fail-closed manifest validator that **does not accept** any supplied rights-grant or live-publication booleans, and refuses extra metadata fields, HTTP/unsafe origins, malformed months/quarters, oversized files, missing SHA256 or invalid file formats.
- A private local integrity checker that validates real file byte count and SHA-256 via streaming read-only file descriptor, enforces in-root containment and refuses symlinks; receipt does not expose file paths or raw rows. The candidate manifest hash must still be independently checked against authentic publisher evidence. Comparing a local file to an attacker-provided manifest alone does not establish publisher authenticity.
- Non-additivity enforcement: duplicate versions, across-nation totals, EPD/PCA double counting, mismatched grains or incompatible reporting time periods cannot pass the `verifyNationalComparisonBoundary` guard. Only same-source version comparison is reported; summation remains disabled.
- Zero database writes and zero medical record parsing, no HTTPS calls, no pricing/clinical inferences, no public route updates.

## How to run with a privately obtained, independently approved archive candidate

In a private, controlled local workspace, prepare a JSON manifest (never include source rows or credentials in Git):

```json
{
  "contract": "novapharm.uk.source-archive-candidate.v1",
  "sourceId": "bso.gp-prescribing",
  "jurisdiction": "GB-NIR",
  "reportingPeriod": "2026-09",
  "format": "CSV",
  "publisherUrl": "https://www.opendatani.gov.uk/dataset/gp-prescribing-data",
  "publisherResourceId": "OFFICIAL_RESOURCE_ID_FROM_VERIFIED_RECEIPT",
  "publisherFileName": "source.csv",
  "sha256": "REPLACE_WITH_VERIFIED_64_CHARACTER_HEX_DIGEST",
  "byteSize": 12345,
  "sourceVersion": "official-2026-09",
  "discoveredAt": "2026-11-21T00:00:00.000Z"
}
```

*Above is a documentation template, **not a real publisher manifest**. Exact checksum, byte size, file name, resource ID and current licence state must be verified externally and must never be invented to run a real download.*

```sh
node scripts/data/verify-uk-national-source-archive.mjs \
  --manifest /private/manifests/bso-202609.json \
  --archive /private/quarantine/bso-202609.csv \
  --root /private/quarantine
```

A passed integrity receipt remains `canIngest: false`, `canPublish: false`, `customerCountryLive: false` until separate independent rights, clinical/Quality, publisher dataset schema, durable data lineage, cross-nation metrics and production acceptance are completed.

## Next gate to implement, not waived by this preflight

1. Independent source licence and commercial/AI/derivative redistribution approvals by exact publisher version and territories; external signed evidence validated outside user-controlled file.
2. Publisher-verified original source hash and immutable private archive; periodic file revisions and corrections, including PHS quantity mapping discontinuity from May 2023 and NI inhaler quantity changes in August 2021.
3. Source-specific **real sample** schema validation; no guessing column names, no silent CSV columns, versioned identity and BNF/dm+d rights; Wales ZIP three-file structure and PHS prescriber/dispenser/board mutually non-additive views.
4. Full monthly/quarterly backfill with independent counts, unit and cost reconciliations, breakpoints, effective dates, proper jurisdiction-bound joins and provenance.
5. Source-rights-signed Atlas staging acceptance, formal security/Quality review and verified protected web + iOS + Android user reads before any production declaration.

References: `docs/data/uk-four-nation-source-acceptance-20261121.md` in draft PR #1026, GitHub issue #1027, and official NHSBSA/PHS/NWSSP/BSO publisher pages.


## 22 November — Welsh GP ZIP structural gate is enforced by the archive verifier

Following source-file hash and byte-size verification, the exact same open
quarantine archive file handle is passed into the Welsh GP ZIP directory
inspector. The archive command must refuse structurally invalid ZIP member
sets even if a caller supplies a matching SHA-256 in their manifest. The
receipt contains a sanitized walesGpZipDirectory field, with no extracted
medicine observations or source-file paths.

The additional offline regression tests exercise the real CLI and reject
incorrect months, missing reference members, path traversal and wrong
archive hash. They use synthetic ZIP fixtures only. Passing this guard does
NOT establish that the expected hash originated from NHS Wales; publisher
authenticity, file CRC, full row quality, terminology rights and full historical
backfill remain separate gates.

## 22 November — private historical partition candidate completeness

The pure four-nation historical coverage validator identifies source-specific missing months/quarters,
unverified quarantine receipts, duplicate/version conflicts and wrongly mixed national or source grains.
It deliberately does not infer a historical start period from the existence of an official dataset.
The caller must explicitly provide a period window and the applicable source id.
Even full receipt coverage returns `canIngest:false`, `canPublish:false`,
`sourceRightsIndependentlyApproved:false`, and zero clinical rows reconciled.
This is a manifest completeness preflight for future independently verified backfills,
not evidence that all historical archive files have been obtained or authenticated.


## 22 November — private source-file batch re-verification (read only)

The standalone private backfill batch tool now rechecks actual quarantine file bytes against each source manifest before calculating gaps, version conflicts, or locally complete month/quarter ranges. The command is:

    node scripts/data/verify-uk-private-backfill-file-batch.mjs --root PRIVATE_ROOT --plan batch-plan.json

Example batch plan (all filenames are flat basenames inside the private root):

    {"contract":"novapharm.uk.private-backfill-file-batch.v1","sourceId":"nhsbsa.epd","startPeriod":"2026-08","endPeriod":"2026-09","entries":[{"period":"2026-08","manifestFile":"aug.json","archiveFile":"aug.csv"}]}

The program permits at most 24 files in a batch, refuses path traversal, symlinked manifests, wrong sources or periods, and tampered archive bytes. It invokes the Wales GP structural ZIP inspector through the same archive verification call. Results contain only sanitized source and period coverage counts, not file contents or private local paths. It does not independently authenticate the claimed publisher digest, check clinical completeness, acquire source licences, ingest records or enable any live API. All results remain canIngest=false and canPublish=false.



### Distinct-period file identity guard — 22 November 2026

The private backfill batch preflight now refuses reuse of a manifest filename or archive filename across batch entries. It also refuses an identical claimed archive SHA-256 digest across two different reporting months or quarters: those identical bytes cannot independently demonstrate two period-specific source partitions without publisher and Quality reconciliation. This is a conservative integrity guard, not an assertion that different digests prove authentic publisher files. Revisions within one period remain version conflicts that must be resolved separately. Two additional synthetic regression tests cover the reused-path and reused-digest conditions. No source data was imported or published by this change.

### Two-pass private batch safety and bounded disk I/O

The batch validates the source period window, every period and every manifest **before** reading any source archive payload. Total declared compressed/source file bytes are bounded at 16 GiB per invocation, in addition to the 24-file cap and per-file manifest cap. This prevents a later invalid manifest from causing earlier large files to be unnecessarily streamed. Independent publisher hash provenance and all clinical rights remain unapproved.


## 22 November — additional reference and Welsh origin-specific private archive contracts

The quarantine-only archive manifest registry now additionally recognises NHSBSA monthly BNF–SNOMED mapping CSV (as a **reference crosswalk, not a prescribing metric**), and three separate Welsh community-dispensed prescription-origin ZIP candidates: hospital, dental and independent-pharmacist. Their data grains must not be added to GP prescribing or English-dispensed-in-Wales records by assumption. The Wales scanner is bound to the **same already-hash-checked open file descriptor** as the existing GP directory inspector. It requires exactly three main/chemical/address entries for hospital and dental, and exactly four CSV entries including BNF for independent-pharmacist, with period-qualified main file naming, safe local and central headers, no extra entries, no traversal, no symlinks, bounded inflation, and no record extraction. Synthetic positive/negative tests cover the added profiles.

Official publisher documentation:
- https://opendata.nhsbsa.net/dataset/bnf-snomed-mapping (monthly CSV with third-party rights reserved; not one-to-one mapping guaranteed)
- https://nwssp.nhs.wales/ourservices/primary-care-services/general-information/data-and-publications/prescribing-data-extracts/hospital-prescribing-data-extract/
- https://nwssp.nhs.wales/ourservices/primary-care-services/general-information/data-and-publications/prescribing-data-extracts/dental-prescribing-data-extract/
- https://nwssp.nhs.wales/ourservices/primary-care-services/general-information/data-and-publications/prescribing-data-extracts/independent-prescribing-pharmacist/

**Important limitations:** Published descriptions specify compressed archive members, but a selected real archived file and its precise container/extension have not yet been independently verified. A ZIP candidate profile does not establish that every historic publisher version will match ZIP format. Fail closed for alternate formats until independently authenticated and reviewed. No original Welsh data files, commercial rights, BNF/SNOMED/dm+d permissions, full-version clinical schemas, production history or customer-facing reads are admitted. `nwssp.gp-dispensing` and `nwssp.english-dispensing` remain uncontracted pending exact verified file formats, and must not be counted as ingested.


### Strict UTC source discovery timestamps — 22 November 2026

Archive candidate manifests now require an actual Gregorian UTC instant for `discoveredAt`: the parser round-trips the canonical timestamp to reject nonexistent calendar days, leap-day errors, invalid clock times, timezone-offset forms and overprecision. A date accepted by JavaScript's permissive `Date.parse` normalisation is **not** enough. Offline positive/negative tests verify valid leap years and fractional seconds as well as invalid source dates. This check prevents malformed provenance metadata from looking credible, but **does not independently authenticate the timestamp, publisher signature, archive SHA-256, licence, or medicine data**.


## 22 November — NHSBSA BNF–SNOMED 13-column reference quality preflight

The **official NHSBSA data dictionary** for the BNF–SNOMED mapping resource enumerates these 13 source fields, which are now tested in a separate bounded, non-publishing quality module `src/core/uk-bnf-snomed-reference-quality.mjs`: `PRESENTATION_PACK_LEVEL`, `VMP_VMPP_AMP_AMPP`, `BNF_CODE`, `BNF_NAME`, `SNOMED_CODE`, `DMD_PRODUCT_DESC`, `STRENGTH`, `UNIT_OF_MEASURE`, `DMD_PRODUCT_PACK_DESC`, `PACK`, `SUB_PACK`, `VTM`, `VTM_NAME`. Evidence: https://opendata.nhsbsa.net/dataset/bnf-snomed-mapping/resource/bafa30b6-4426-4578-a128-935d13b228e5 .

The validator accepts at most 1,000 **in-memory sample** rows and 1 MiB cumulative UTF-8 sample content, checks exact required headers and field-width bounds, keeps BNF/SNOMED/VTM identifiers as strings, distinguishes presentation VMP/AMP from pack VMPP/AMPP, detects missing unresolved codes and flags one-to-many BNF→SNOMED mappings **without choosing or deduplicating an identity**. It also flags pack-only fields when present on presentation rows. It emits only aggregate diagnostic counts and non-release flags; no sample medicine names, IDs or raw rows are returned or written to a store.

**Explicit exclusions:** this is *not* an approved clinical vocabulary, no completed full-month row-quality or source-period verification, no authorised SNOMED/dm+d/BNF licence, no live medicine identity joins, no web/iOS/Android product data. A matching synthetic or private sample never establishes that any CSV is authentic, complete, clinically correct, or licensed. A publisher's OGL notice does not automatically grant embedded third-party BNF, dm+d or SNOMED rights. The reference has no applicable geography; it must not be used as prescribing activity or inferred national supply.

The publisher reports that it is monthly retrospective data, usually with a two-month lag, and not a one-to-one crosswalk: https://opendata.nhsbsa.net/dataset/bnf-snomed-mapping . Exact-head CI tests for the bounded reference gate are added to the existing UK private archive workflow; the latest test outcome must be checked at the current PR commit before claiming success.


### 22 November — resource-version numeric dictionary reconciliation (source-only)

Independently rechecked the official NHSBSA [September 2026 BNF–SNOMED mapping resource](https://opendata.nhsbsa.net/dataset/bnf-snomed-mapping/resource/638b7dc9-1eac-4495-9fc5-423fc52483e2) alongside [August 2026](https://opendata.nhsbsa.net/dataset/bnf-snomed-mapping/resource/624eadfc-5125-489d-b292-8bccbad6e657), [July 2026](https://opendata.nhsbsa.net/dataset/bnf-snomed-mapping/resource/bafa30b6-4426-4578-a128-935d13b228e5), and [June 2026](https://opendata.nhsbsa.net/dataset/ba1799d5-fac1-4432-8f76-ab7dfbb3e2f8/resource/aa0b2fef-ea4e-4f8f-9df1-269cecc7e293). Although the 13 field **names** are consistent on these listed releases, the portal's declared field **types** vary: June and August/September declare `STRENGTH` and `PACK` as number, while July describes `STRENGTH` as integer and `PACK` as string. These metadata differences **are not evidence of full clinical file schema acceptance**.

The private sample checker now accepts strictly bounded plain decimal text for `STRENGTH` and `PACK`, without floating-point coercion, exponent notation or silently converting SNOMED/VTM/BNF identifiers. It separately counts decimal-valued strength/pack sample rows, emits no actual values, and still returns `canIngest:false`, `canPublish:false`. Full archive acceptance must pin the **specific resource ID and reporting period** and reconcile the exact publisher file independently; this generic sample contract does not normalize source revisions or approve terminology rights. Additional synthetic tests protect decimal measures, malformed numerics and preserved identifier boundaries.


### 22 November — exact monthly NHSBSA resource identity gate

The local, non-admitting NHSBSA sample-quality validator now requires the **source-period-specific public CKAN resource UUID** (not just a monthly label or website). These official resource identities were verified on 22 November 2026:

| Publisher period | Official CKAN resource | Declared STRENGTH | Declared PACK | Declared VTM |
| --- | --- | --- | --- | --- |
| 2026-06 | `aa0b2fef-ea4e-4f8f-9df1-269cecc7e293` | number | number | string |
| 2026-07 | `bafa30b6-4426-4578-a128-935d13b228e5` | integer | string | integer |
| 2026-08 | `624eadfc-5125-489d-b292-8bccbad6e657` | number | number | string |
| 2026-09 | `638b7dc9-1eac-4495-9fc5-423fc52483e2` | number | number | string |

The list is explicit and versioned in `BNF_SNOMED_PUBLIC_RESOURCE_RELEASES` and is not automatically expanded. Unknown months and claimed resource IDs from another period fail closed. July requires integer-valued strength and preserves `PACK` as **bounded text**, reporting nonnumeric lexical values as diagnostics without guessing what they represent. Other pinned months use bounded plain-decimal lexical values for strength and pack. Identifiers always remain strings.

Original official public resource metadata:
- https://opendata.nhsbsa.net/dataset/bnf-snomed-mapping/resource/aa0b2fef-ea4e-4f8f-9df1-269cecc7e293
- https://opendata.nhsbsa.net/dataset/bnf-snomed-mapping/resource/bafa30b6-4426-4578-a128-935d13b228e5
- https://opendata.nhsbsa.net/dataset/bnf-snomed-mapping/resource/624eadfc-5125-489d-b292-8bccbad6e657
- https://opendata.nhsbsa.net/dataset/bnf-snomed-mapping/resource/638b7dc9-1eac-4495-9fc5-423fc52483e2

**No source row was downloaded to derive these identities:** only official public release metadata was reviewed. A pinned resource ID is not a proof of bytes, archive authenticity, rights, source completeness, identity-level crosswalk acceptance or a permission for production. Even an accurate resource version still returns zero admissions with `canIngest=false` and `canPublish=false`; any new month requires independent publisher-metadata validation and code review before being added.


The **outer private source archive manifest** now also checks the source-period-to-resource UUID pairing for `nhsbsa.bnf-snomed-map`, before it can return a quarantine candidate receipt. This complements the bounded reference sample checker, and protects private batch candidates from cross-period resource substitutions. Existing non-BNF source manifests retain their independently documented source rules. The resource check authenticates neither downloaded file content nor the requester's asserted checksum; that still needs independent publisher-file provenance and review.
