# UK source-file archive preflight — England, Scotland, Wales and Northern Ireland

**Status:** implementation candidate, read-only private-quarantine file integrity checking. No accepted medicine observations, no production/API/mobile activation, no approval or evidence of commercial/AI/BNF/SNOMED rights. **Never interpret a successful preflight receipt as source licence or medicine safety approval.**

This package extends the existing England-focused EPD/PCA ingestion scripts with a separate source-file integrity boundary for all four nations. The eight supported *source types* are:

| Jurisdiction | Registry source ID | Publisher file type | Exact source grain | Period |
| --- | --- | --- | --- | --- |
| GB-ENG | `nhsbsa.epd` | CSV | England observed community prescribing | Month |
| GB-ENG | `nhsbsa.pca` | CSV | England dispensing/reimbursement, NOT additive to EPD | Month |
| GB-SCT | `phs.prescribed-dispensed` | CSV | Prescriber-to-dispenser location flow, not medicines | **Quarter** |
| GB-SCT | `phs.prescriptions-community` | CSV | Prescription-payment records: board, prescriber or dispenser views are different grains | Month |
| GB-WLS | `nwssp.practice-pharmacy-flow` | XLS/XLSX | Practice ↔ pharmacy flows; no national medicine content implied | Month |
| GB-WLS | `nwssp.gp-prescribing` | ZIP | GP presentation-level prescribing; contains main CSV, ChemSubstance and addresses | Month |
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
