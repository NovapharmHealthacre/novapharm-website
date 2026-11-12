# Drive source intake to MongoDB Atlas staging

Checked: 12 November 2026.
Scope: Google Drive governed source intake and MongoDB Atlas free staging.
Status: metadata-stage implementation, NOT authoritative ingest, clinical validation, commercial licence grant or customer release.

## Recorded implementation

- Google Drive governed intake: NovaPharm Intelligence - Governed Medicines Data Intake, including raw quarantine, rights, checksums, data quality, staging and release-evidence folders. Originals preserved.
- Connected Atlas project: Project 0, free cluster novapharm-staging, region EU_NORTH_1, database novapharm_staging.
- Staging collection created: nova_drive_quarantine_manifests_staging.
- Three receipt records inserted, all with customer_publish_approved=false, accepted_observations=0, ai_processing_approved=false, no source grant, and no production promotion.

| Record ID | Drive content | Snapshot / period | Source records | Admission |
| --- | --- | --- | ---: | --- |
| drive-fda-ndc-apx-20261009-e0b3b55faeba32a6 | openFDA NDC apixaban bounded sample | 2026-10-09 | 68 | Quarantined |
| drive-ema-shortages-20261009-dddf6c8008c37a5 | EMA shortage snapshot | 2026-10-09 | 85 | Quarantined |
| nhsbsa-epd-snomed-202608-official-resource-locator | NHSBSA EPD resource locator only, no CSV | 2026-08 | 0 ingested | Not downloaded |

The Drive-register review reports original file hashes:
- FDA sample SHA-256: e0b3b55faeba32a6d6a1b10921bc84e618d37dfdc1706642864ff19bb03fe046 (83,794 bytes).
- EMA shortages SHA-256: dddf6c8008c37a584794a9f059a7895c29f0d7403a167148e3f4e248b5b37793 (71,404 bytes).

These hashes attest to the recorded copies only; they do not independently authenticate publisher origin or grant reuse rights.

## Reproducible handoff contract

The module src/data/intelligence-drive-source-handoff.mjs builds private, metadata-only, deterministic manifests from actual caller-provided bounded raw bytes and source provenance. It calls the existing quarantine preflight to inspect a strict, source-specific envelope, size and SHA-256, rejects invalid Drive IDs and inconsistent dates and never serializes raw medicine records. It does not connect to Atlas automatically.

The EPD locator helper records the exact EPD resource name, period and UUID without declaring a downloaded or accepted dataset.

Run the fail-closed tests with:

    node --test scripts/test-intelligence-drive-source-handoff.mjs

The tests are also part of the test:medicines-intelligence npm script.

## Still required before real data ingestion

1. Recover actual EPD monthly CSV resources into a bounded isolated download target. Drive archive 2024/2025/2026 EPD folders were checked on 12 Nov and are empty. Publisher resource metadata cannot be counted as ingested rows. Avoid multi-gigabyte copying just to populate storage.
2. Capture live NHSBSA resource URL, exact source version, content length, raw SHA-256, schema/column and immutable resource provenance. The historical June 2026 SQLite row count is NOT proof of current Atlas data.
3. Review NHSBSA EPD OGL v3 and required NHSBSA Copyright 2021-2026 attribution, plus independently assess third-party BNF, SNOMED CT and dm+d reuse/AI permissions. Public availability is not a grant for every field or purpose.
4. Reconcile source grain, expected keys, missingness, period, GBP units and observed geography. Do not merge FDA product NDCs and EMA shortage events into a purported medicine count.
5. Establish signed, revocable rights grants and a verified identity crosswalk. Run isolated real-tenancy acceptance and rollback before an authenticated service can admit observations.
6. Keep customer access, paid inference, billing, charges and ALL outgoing customer/supplier emails outside the intake operation.

## Acceptance truth

Atlas nova_medicine_evidence_staging and nova_source_rights_grants_staging were observed empty on 12 November 2026. No accepted medicine observations were created in this work. The NHSBSA staging source registry already contained the August 2026 resource locator and a one-row API schema probe; neither represents a complete publisher CSV download. No new paid service or live customer endpoint was enabled.
