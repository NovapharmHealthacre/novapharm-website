# NHSBSA EPD August 2026: measured publisher resource and storage preflight

**Status:** Publisher metadata checked only; no full CSV download, rights grant, accepted medicine observation, customer access or AI egress.

## Verified publisher metadata, 11 November 2026

- Publisher: NHS Business Services Authority
- Source: English Prescribing Dataset (EPD) with SNOMED Code
- Resource: `30b74257-9912-4b54-8990-8eec2a4b7f14`
- Period: 2026-08
- Format: CSV
- Publisher reported bytes: **7,432,815,985 (6.922 GiB)**
- Publisher advertised SHA-256: `1a3ee72477c8e999cabd3284544bf370f78eb3045529191c0062bf74c9a1017b`. **Not independently checked against full CSV.**
- Official publisher CKAN metadata JSON response SHA-256: `19734e62257df4bf940b82ad6bcf0dc5608765f45e5074ebf253c278ced6a1a5`. **This hashes the metadata response only, not the 7.43 GB resource.**
- Metadata provenance: AWS CodeBuild `novapharm-intelligence-production-image-candidate:13fb410e-4fda-4bd6-ab94-edad5ead27ac` SUCCEEDED, exact source `e116bc601e8424afb42f7151d00a0fe3c89b8e9d`; checked official domain, 6 MB response ceiling and exact resource identifier.
- Copy of reduced metadata retained privately in S3 `s3://novapharm-intelligence-analytics-review-250675045172-eu-north-1/source-review/publisher-metadata/v1/nhsbsa-epd-202608-20261111.json`, AES256, versioned, unapproved.
- Licence label OGL-UK-3.0 is **not** an independent third-party terminology/licensing grant.

## One-month storage planning estimate

The existing code function `estimateBackfillStorage` in `packages/medicines-intelligence/src/private-cloud.ts` defines the following conservative local volume allocations from `rawBytes` (not an AWS bill or measured ingestion result).

| Component | Bytes | GiB estimate |
| --- | ---: | ---: |
| Raw immutable publisher CSV | 7,432,815,985 | 6.92 |
| Curated facts / database overhead, 1.5x | 11,149,223,978 | 10.38 |
| Mart / indexes, 0.5x | 3,716,407,993 | 3.46 |
| Working volume, 0.25x | 1,858,203,997 | 1.73 |
| One raw-sized backup | 7,432,815,985 | 6.92 |
| **Governed required working-storage estimate** | **31,589,467,938** | **29.42** |
| Additional mandatory free-space reserve | 21,474,836,480 | 20.00 |
| **Minimum available bytes before download starts** | **53,064,304,418** | **49.42** |

Actual disk usage, table overhead, AWS storage prices, transfer speed and processing throughput must be measured separately; never substitute this estimate for a bill or production capacity test.

## Release conditions

1. Independent review of publisher, third-party BNF, SNOMED CT, dm+d, commercial reuse and AI egress rights; record reviewer identity, signed authority, allowed purposes, source terms hash and expiry/revocation handling.
2. Approve bounded temporary storage/compute and spend for the **full** source; use a governed volume with at least 53,064,304,418 **available** bytes after any existing files, based on current code assumptions. Never infer availability from nominal EBS volume size.
3. Only then run `scripts/data/download-medicines-resource.ts` with correct private data root; independently hash the full artifact and verify the resource ID, reported length, period and source URL.
4. Reconcile full partition grain, schema, duplicate/rejected rows, totals, Apixaban date-effective presentation codes and rights status before independent final evidence admission.
5. Maintain **zero accepted observations** until a separate rights authority and audited transaction verify the specific data and production access controls. Do not expose raw code/terminology to external models.

**No automated action in this report authorises a bulk download or recurring cloud spend.** Issues: #454, #176, #461.
